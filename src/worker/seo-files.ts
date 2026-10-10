import { INDEXABLE_PAGES, SeoPage } from '../app/core/seo/seo-pages';
import { canonicalUrl, isProductionHost, normalizeBase } from '../app/core/seo/site-url';

/** Headers shared by robots.txt / sitemap.xml: short cache, never indexed as pages themselves. */
const FILE_HEADERS = {
  'cache-control': 'public, max-age=3600',
  'x-content-type-options': 'nosniff',
} as const;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * robots.txt. Only the configured production host is crawlable; workers.dev, previews and any other
 * host (or an unconfigured domain) answer `Disallow: /` so duplicates never compete with the
 * canonical site. API paths are not search content. Nothing needed for rendering is blocked.
 */
export function buildRobotsTxt(base: string, requestHost: string): string {
  if (!isProductionHost(base, requestHost)) {
    return 'User-agent: *\nDisallow: /\n';
  }
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${normalizeBase(base)}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * XML sitemap of canonical, indexable, public pages only. No priority / changefreq (Google ignores
 * them) and no lastmod: there is no reliable per-page modification date, and a fake "deploy time"
 * lastmod would teach Google to distrust the field.
 */
export function buildSitemapXml(base: string, pages: readonly SeoPage[] = INDEXABLE_PAGES): string {
  const urls = pages
    .filter((page) => page.indexable)
    .map((page) => canonicalUrl(base, page.path))
    .filter((url): url is string => url !== null);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

export function robotsResponse(base: string, requestHost: string): Response {
  return new Response(buildRobotsTxt(base, requestHost), {
    headers: { 'content-type': 'text/plain; charset=utf-8', ...FILE_HEADERS },
  });
}

/** 404 unless this is the configured production host (previews must not advertise a sitemap). */
export function sitemapResponse(base: string, requestHost: string): Response {
  if (!isProductionHost(base, requestHost)) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
  }
  return new Response(buildSitemapXml(base), {
    headers: { 'content-type': 'application/xml; charset=utf-8', ...FILE_HEADERS },
  });
}

/** Adds `X-Robots-Tag: noindex, nofollow` to a response served from a non-production host. */
export function withIndexingPolicy(
  response: Response,
  base: string,
  requestHost: string,
): Response {
  if (isProductionHost(base, requestHost)) {
    return response;
  }
  const copy = new Response(response.body, response);
  copy.headers.set('x-robots-tag', 'noindex, nofollow');
  return copy;
}

/**
 * `/robots.txt` and `/sitemap.xml` for a request, or null for any other path. Kept separate from
 * the Worker entry so the host / indexing matrix can be tested without Angular SSR.
 */
export function seoFileResponse(pathname: string, host: string, base: string): Response | null {
  if (pathname === '/robots.txt') {
    return robotsResponse(base, host);
  }
  if (pathname === '/sitemap.xml') {
    return sitemapResponse(base, host);
  }
  return null;
}
