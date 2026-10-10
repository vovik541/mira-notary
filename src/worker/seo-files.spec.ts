import { INDEXABLE_PAGES, SEO_PAGES } from '../app/core/seo/seo-pages';
import {
  buildRobotsTxt,
  buildSitemapXml,
  escapeXml,
  robotsResponse,
  sitemapResponse,
  withIndexingPolicy,
} from './seo-files';

const BASE = 'https://www.example.test';
const HOST = 'www.example.test';

describe('robots.txt', () => {
  it('allows crawling on the production host and references the canonical sitemap', () => {
    const robots = buildRobotsTxt(BASE, HOST);
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${BASE}/sitemap.xml`);
    expect(robots).not.toMatch(/^Disallow: \/\s*$/m);
    // rendering assets are never blocked
    expect(robots).not.toMatch(/Disallow:.*(assets|\.js|\.css|\.webp)/);
  });

  it('blocks every other host (workers.dev, previews) and an unconfigured domain', () => {
    expect(buildRobotsTxt(BASE, 'mira-notary.acct.workers.dev')).toBe(
      'User-agent: *\nDisallow: /\n',
    );
    expect(buildRobotsTxt('', HOST)).toBe('User-agent: *\nDisallow: /\n');
  });

  it('is served as text/plain', () => {
    expect(robotsResponse(BASE, HOST).headers.get('content-type')).toContain('text/plain');
  });
});

describe('sitemap.xml', () => {
  const xml = buildSitemapXml(BASE);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const locs = Array.from(doc.getElementsByTagName('loc')).map((n) => n.textContent ?? '');

  it('is well-formed XML', () => {
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.documentElement.nodeName).toBe('urlset');
  });

  it('lists exactly the indexable pages, as canonical https URLs, without duplicates', () => {
    expect(locs).toHaveLength(INDEXABLE_PAGES.length);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toContain(BASE);
    for (const page of INDEXABLE_PAGES) {
      expect(locs).toContain(page.path === '/' ? BASE : `${BASE}${page.path}`);
    }
    for (const loc of locs) {
      expect(loc).toMatch(/^https:\/\//);
      expect(loc).not.toMatch(/[?#]/);
    }
  });

  it('excludes the 404 page, API paths and preview hosts; no priority / changefreq / lastmod', () => {
    expect(xml).not.toContain('/404');
    expect(xml).not.toContain('/api');
    expect(xml).not.toContain('workers.dev');
    expect(xml).not.toMatch(/<(priority|changefreq|lastmod)>/);
    expect(buildSitemapXml(BASE, [SEO_PAGES.notFound])).not.toContain('<url>');
  });

  it('is only served on the production host', () => {
    expect(sitemapResponse(BASE, HOST).status).toBe(200);
    expect(sitemapResponse(BASE, HOST).headers.get('content-type')).toContain('application/xml');
    expect(sitemapResponse(BASE, 'x.workers.dev').status).toBe(404);
    expect(sitemapResponse('', HOST).status).toBe(404);
  });

  it('escapes XML special characters', () => {
    expect(escapeXml(`a&b<c>"d'`)).toBe('a&amp;b&lt;c&gt;&quot;d&apos;');
  });
});

describe('indexing policy for duplicate hosts', () => {
  it('adds X-Robots-Tag: noindex everywhere except the production host', () => {
    const page = (): Response => new Response('<html></html>');
    expect(withIndexingPolicy(page(), BASE, 'x.workers.dev').headers.get('x-robots-tag')).toBe(
      'noindex, nofollow',
    );
    expect(withIndexingPolicy(page(), '', HOST).headers.get('x-robots-tag')).toBe(
      'noindex, nofollow',
    );
    expect(withIndexingPolicy(page(), BASE, HOST).headers.get('x-robots-tag')).toBeNull();
  });
});
