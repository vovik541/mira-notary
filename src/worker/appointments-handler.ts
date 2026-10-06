import { BUSINESS } from '../app/core/config/business.config';
import {
  AppointmentApiResponse,
  AppointmentErrorCode,
  AppointmentRequestPayload,
} from '../shared/appointment.model';
import { buildAppointmentEmail, sanitizeForSubject } from './appointment-email';
import { validateAppointmentRequest } from './appointment-validation';
import { EmailAddress, EmailProvider, OutboundEmail } from './email-provider';
import { WorkerEnv } from './env';
import { ResendEmailSender } from './resend-email-sender';
import { FetchLike, verifyTurnstileToken } from './turnstile';

const MAX_BODY_BYTES = 16 * 1024;
const FALLBACK = `Please call or text Mira at ${BUSINESS.phones.primary.display}.`;

const MESSAGES: Record<AppointmentErrorCode, string> = {
  validation: 'Please check the form and try again.',
  verification: "We couldn't verify the submission. Please try again.",
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  delivery: `We couldn't send your request right now. ${FALLBACK}`,
  unavailable: `We couldn't send your request right now. ${FALLBACK}`,
};

const STATUS: Record<AppointmentErrorCode, number> = {
  validation: 400,
  verification: 403,
  rate_limited: 429,
  delivery: 502,
  unavailable: 503,
};

const SIMPLE_EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export interface HandlerDeps {
  /** Turnstile siteverify transport (tests). */
  fetchFn?: FetchLike;
  /** Email provider override (tests). Defaults to Resend, built from `env.RESEND_API_KEY`. */
  emailProvider?: EmailProvider;
  now?: () => Date;
}

function json(body: AppointmentApiResponse, status: number, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

function failure(code: AppointmentErrorCode): Response {
  return json({ success: false, error: code, message: MESSAGES[code] }, STATUS[code]);
}

/**
 * Handles `POST /api/appointments`: validate → rate limit → Turnstile → email → discard.
 *
 * Nothing is persisted. Logs contain only categories, field names, provider status codes, the
 * provider message id and the Cloudflare ray id — never visitor data or secrets.
 */
export async function handleAppointmentRequest(
  request: Request,
  env: WorkerEnv,
  deps: HandlerDeps = {},
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  }

  const ray = request.headers.get('cf-ray');
  const tag = ray ? ` ray=${ray}` : '';

  // Same-origin only: a browser form on another site must not be able to drive this endpoint.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }

  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return failure('validation');
  }

  const remoteIp = request.headers.get('cf-connecting-ip');

  if (env.APPOINTMENT_RATE_LIMIT) {
    try {
      const { success } = await env.APPOINTMENT_RATE_LIMIT.limit({ key: remoteIp ?? 'unknown' });
      if (!success) {
        console.warn(`appointment: rate_limited${tag}`);
        return failure('rate_limited');
      }
    } catch {
      // A broken limiter must not take the form down; Turnstile still protects the endpoint.
      console.warn(`appointment: rate_limit_binding_error${tag}`);
    }
  }

  let payloadText: string;
  try {
    payloadText = await request.text();
  } catch {
    return failure('validation');
  }
  if (new TextEncoder().encode(payloadText).length > MAX_BODY_BYTES) {
    return failure('validation');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    return failure('validation');
  }

  const validation = validateAppointmentRequest(parsed, deps.now?.());
  if (!validation.ok) {
    console.warn(
      `appointment: validation_failed fields=${validation.invalidFields.join(',')}${tag}`,
    );
    return failure('validation');
  }
  const appointment = validation.value;

  if (!env.TURNSTILE_SECRET_KEY) {
    console.error(`appointment: turnstile_secret_missing${tag}`);
    return failure('unavailable');
  }
  const turnstile = await verifyTurnstileToken(
    appointment.turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    remoteIp,
    deps.fetchFn,
  );
  if (!turnstile.success) {
    console.warn(`appointment: turnstile_failed codes=${turnstile.errorCodes.join(',')}${tag}`);
    return failure('verification');
  }

  // Sender and recipient come exclusively from trusted Worker configuration.
  const config = resolveEmailConfig(env);
  if (!config.ok) {
    console.error(`appointment: email_not_configured missing=${config.missing.join(',')}${tag}`);
    return failure('unavailable');
  }
  const provider = deps.emailProvider ?? new ResendEmailSender(config.apiKey);

  const result = await provider.send(buildMessage(appointment, config.to, config.from));
  if (!result.ok) {
    console.error(
      `appointment: email_failed category=${result.category}` +
        `${result.status ? ` status=${result.status}` : ''}${tag}`,
    );
    return failure('delivery');
  }

  console.info(`appointment: email_sent id=${result.id}${tag}`);
  return json({ success: true }, 200);
}

type EmailConfig =
  { ok: true; apiKey: string; from: EmailAddress; to: string } | { ok: false; missing: string[] };

function resolveEmailConfig(env: WorkerEnv): EmailConfig {
  const missing: string[] = [];

  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    missing.push('RESEND_API_KEY');
  }

  const fromAddress = env.EMAIL_FROM_ADDRESS?.trim();
  if (!fromAddress || !SIMPLE_EMAIL.test(fromAddress)) {
    missing.push('EMAIL_FROM_ADDRESS');
  }

  const to = env.APPOINTMENT_RECIPIENT?.trim();
  if (!to || !SIMPLE_EMAIL.test(to)) {
    missing.push('APPOINTMENT_RECIPIENT');
  }

  if (missing.length > 0 || !apiKey || !fromAddress || !to) {
    return { ok: false, missing };
  }

  const name = sanitizeForSubject(env.EMAIL_FROM_NAME ?? '', 100).replace(/["<>\\]/g, '');
  return {
    ok: true,
    apiKey,
    to,
    from: name ? { email: fromAddress, name } : { email: fromAddress },
  };
}

function buildMessage(
  appointment: AppointmentRequestPayload,
  to: string,
  from: EmailAddress,
): OutboundEmail {
  const content = buildAppointmentEmail(appointment);
  return {
    from,
    to,
    // Reply-To is the visitor's (validated) address; From always stays the verified business sender.
    ...(appointment.email ? { replyTo: appointment.email } : {}),
    subject: content.subject,
    html: content.html,
    text: content.text,
  };
}
