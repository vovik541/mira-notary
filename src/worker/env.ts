/**
 * Minimal, hand-written shapes for the Cloudflare bindings / configuration this Worker uses.
 * (Kept local instead of pulling in @cloudflare/workers-types, which clashes with the DOM
 * typings Angular needs.)
 */

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface WorkerEnv {
  /** Static assets (prerendered pages, JS, CSS, images). */
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** Optional Workers Rate Limiting binding. */
  APPOINTMENT_RATE_LIMIT?: RateLimiter;

  /** SECRET. Turnstile server-side validation. Never ship to the browser. */
  TURNSTILE_SECRET_KEY?: string;
  /** SECRET. Resend API key (`wrangler secret put RESEND_API_KEY`). Never log, never ship. */
  RESEND_API_KEY?: string;

  /** Non-secret runtime config: sender on the Resend-verified sending domain. */
  EMAIL_FROM_ADDRESS?: string;
  EMAIL_FROM_NAME?: string;
  /** Non-secret runtime config: where appointment notifications are delivered. Server-only. */
  APPOINTMENT_RECIPIENT?: string;
}
