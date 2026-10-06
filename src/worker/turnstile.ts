export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface TurnstileOutcome {
  success: boolean;
  /** Cloudflare error codes (safe to log; never contain visitor data). */
  errorCodes: string[];
}

/**
 * Server-side Turnstile validation. Any failure (rejected token, network error, malformed
 * response) yields `success: false`: the endpoint fails closed.
 */
export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIp: string | null,
  fetchFn: FetchLike = (input, init) => fetch(input, init),
): Promise<TurnstileOutcome> {
  const body = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: crypto.randomUUID(),
  });
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  try {
    const response = await fetchFn(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return { success: false, errorCodes: [`http_${response.status}`] };
    }
    const data = (await response.json()) as { success?: unknown; 'error-codes'?: unknown };
    const codes = Array.isArray(data['error-codes'])
      ? data['error-codes'].filter((code): code is string => typeof code === 'string')
      : [];
    return { success: data.success === true, errorCodes: codes };
  } catch {
    return { success: false, errorCodes: ['siteverify_unreachable'] };
  }
}
