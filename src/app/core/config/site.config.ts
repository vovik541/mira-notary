/**
 * Public site configuration.
 *
 * TODO(production): set `url` to the real production origin (no trailing slash), e.g.
 * 'https://www.example.com'. While empty, canonical / Open Graph URLs and JSON-LD `url`
 * are intentionally omitted rather than invented.
 */
export const SITE = {
  url: '',
  name: 'Local Notary Signings by Mira Derkach',
  locale: 'en_US',
  /**
   * Cloudflare Turnstile PUBLIC site key (safe to ship to the browser; the matching secret lives
   * only in the Worker as TURNSTILE_SECRET_KEY).
   *
   * TODO(production): paste the site key of the Turnstile widget created for the production
   * hostname. While empty, the production form shows the "please call Mira" fallback instead of
   * submitting.
   */
  turnstileSiteKey: '' as string,
} as const;

/** Cloudflare's published "always passes" dummy site key — used only in dev mode (`ng serve`). */
export const TURNSTILE_DEV_SITE_KEY = '1x00000000000000000000AA';
