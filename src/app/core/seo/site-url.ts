/**
 * Pure helpers for the canonical site origin. `base` is `SITE.url` (no trailing slash) or '' while
 * the production domain is not configured — in that case no absolute URL is ever invented.
 */

/** Strips whitespace and trailing slashes so `https://x.example/` and `https://x.example` agree. */
export function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Router path -> normalized path: no query / hash, leading slash, no trailing slash (except "/"). */
export function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0] || '/';
  const withSlash = clean.startsWith('/') ? clean : `/${clean}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/';
}

/**
 * Absolute canonical URL for a path, or null when no base is configured. The home page is the bare
 * origin (`https://example.com`), every other page is `origin + /path` (no trailing slash).
 */
export function canonicalUrl(base: string, path: string): string | null {
  const origin = normalizeBase(base);
  if (!origin) {
    return null;
  }
  const normalized = normalizePath(path);
  return normalized === '/' ? origin : `${origin}${normalized}`;
}

/** Host (with port, if any) of the configured production origin, or '' when unconfigured. */
export function productionHost(base: string): string {
  try {
    return base.trim() ? new URL(normalizeBase(base)).host.toLowerCase() : '';
  } catch {
    return '';
  }
}

/**
 * True only for requests addressed to the configured production host. With no configured domain
 * (or for workers.dev / preview / any other host) this is false, which makes the Worker answer
 * with `Disallow: /` and `X-Robots-Tag: noindex`, so duplicate hosts never compete with the
 * canonical site.
 */
export function isProductionHost(base: string, requestHost: string): boolean {
  const expected = productionHost(base);
  return expected !== '' && requestHost.trim().toLowerCase() === expected;
}
