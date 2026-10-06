import { EmailAddress, EmailProvider, EmailSendResult, OutboundEmail } from './email-provider';
import { FetchLike } from './turnstile';

export const RESEND_ENDPOINT = 'https://api.resend.com/emails';
export const RESEND_TIMEOUT_MS = 8000;

/**
 * Resend adapter using the plain REST API (POST /emails, snake_case fields) over `fetch`; no SDK.
 * Exactly one attempt per message: retries could deliver duplicates.
 */
export class ResendEmailSender implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: FetchLike = (input, init) => fetch(input, init),
    private readonly timeoutMs: number = RESEND_TIMEOUT_MS,
  ) {}

  async send(message: OutboundEmail): Promise<EmailSendResult> {
    const body = {
      from: formatAddress(message.from),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    };

    let response: Response;
    try {
      response = await this.fetchFn(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
          // Protects against duplicate delivery if the same request were ever replayed.
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const name = (error as { name?: unknown } | null)?.name;
      return {
        ok: false,
        category: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
      };
    }

    if (response.status >= 500) {
      return { ok: false, category: 'server_error', status: response.status };
    }
    if (!response.ok) {
      return { ok: false, category: 'client_error', status: response.status };
    }

    try {
      const data = (await response.json()) as { id?: unknown };
      if (typeof data.id === 'string' && data.id.length > 0) {
        return { ok: true, id: data.id };
      }
    } catch {
      // fall through: unreadable body
    }
    return { ok: false, category: 'bad_response', status: response.status };
  }
}

/** RFC 5322 display-name form: `"Name" <address>` (name is quoted and escaped). */
export function formatAddress(address: EmailAddress): string {
  if (!address.name) {
    return address.email;
  }
  const escaped = address.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}" <${address.email}>`;
}
