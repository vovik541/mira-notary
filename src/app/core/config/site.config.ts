import { isProductionHost } from '../seo/site-url';

/**
 * Public site configuration.
 *
 * `url` is the canonical production origin (https, no trailing slash, no www). It is the single
 * source of truth for the production hostname: it drives canonical / Open Graph URLs, absolute
 * JSON-LD URLs, robots.txt, sitemap.xml and the hostnames allowed to use the production Turnstile
 * key. If it were empty everything would fail closed (noindex, `Disallow: /`, no sitemap, no
 * production Turnstile). The host must also be in `security.allowedHosts` in angular.json.
 */
export const SITE = {
  url: 'https://miranotary.com',
  name: 'Local Notary Signings by Mira Derkach',
  locale: 'en_US',
  /**
   * Cloudflare Turnstile PUBLIC site key of Mira's production widget (safe to ship to the browser).
   * The matching SECRET lives only in the Worker (`wrangler secret put TURNSTILE_SECRET_KEY`) and
   * must never appear in code, config, tests or docs. The widget must list the production
   * hostname(s) in the Cloudflare dashboard.
   */
  turnstileSiteKey: '0x4AAAAAAFS5AbednFEQBsq4',
} as const;

/** Cloudflare's published "always passes" dummy site key — used only on local hosts. */
export const TURNSTILE_DEV_SITE_KEY = '1x00000000000000000000AA';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|::1|[^.]+\.localhost)$/i;

/**
 * The Turnstile site key for a browser hostname, or '' when the hostname is not supported.
 *  - localhost / 127.0.0.1 / [::1] / *.localhost → Cloudflare's dummy key (the dummy secret in
 *    .dev.vars accepts it);
 *  - the production host of `SITE.url` → Mira's production key;
 *  - anything else (www, workers.dev, previews, unknown domains) → '' : the form then fails safe
 *    (the "please call Mira" fallback) instead of using the production widget on an arbitrary host.
 * The server-side Siteverify check is unaffected. The widget is browser-only, so no fetch is needed.
 */
export function turnstileSiteKeyFor(hostname: string | null | undefined): string {
  if (!hostname) {
    return '';
  }
  if (LOCAL_HOST.test(hostname)) {
    return TURNSTILE_DEV_SITE_KEY;
  }
  return isProductionHost(SITE.url, hostname) ? SITE.turnstileSiteKey : '';
}
