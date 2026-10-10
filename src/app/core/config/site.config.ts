/**
 * Public site configuration.
 *
 * TODO(production): set `url` to the real production origin (https, no trailing slash). It drives
 * canonical / Open Graph URLs, absolute JSON-LD URLs, robots.txt and sitemap.xml. While empty none
 * of them is invented, robots.txt answers `Disallow: /` and sitemap.xml answers 404, so an
 * unconfigured deployment can never be indexed by accident. Also add the host to
 * `security.allowedHosts` in angular.json.
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
