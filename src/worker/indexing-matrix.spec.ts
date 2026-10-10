import { readFileSync } from 'node:fs';
import { INDEXABLE_PAGES, SEO_PAGES } from '../app/core/seo/seo-pages';
import { buildSitemapXml, seoFileResponse, withIndexingPolicy } from './seo-files';

/**
 * Explicit indexing matrix. Behaviour is exercised through the same functions the Worker entry
 * calls (`seoFileResponse`, `withIndexingPolicy`), for three deployment states.
 */
const PRODUCTION = 'https://www.example.test';
const PROD_HOST = 'www.example.test';
const WORKERS_DEV = 'mira-notary.account.workers.dev';
const PREVIEW = 'abcd1234-mira-notary.account.workers.dev';

const html = (): Response =>
  new Response('<html></html>', { headers: { 'content-type': 'text/html' } });
const robots = (host: string, base: string): Promise<string> =>
  (seoFileResponse('/robots.txt', host, base) as Response).text();

describe('indexing matrix — production custom host', () => {
  it.each(['/', '/services/mobile-notary', '/contact'])(
    '%s is indexable (no noindex header)',
    (path) => {
      expect(path).toBeTruthy();
      expect(
        withIndexingPolicy(html(), PRODUCTION, PROD_HOST).headers.get('x-robots-tag'),
      ).toBeNull();
    },
  );

  it('indexable registry pages carry no noindex; the 404 page is noindex in the registry', () => {
    expect(INDEXABLE_PAGES.every((page) => page.indexable)).toBe(true);
    expect(SEO_PAGES.notFound.indexable).toBe(false);
  });

  it('robots.txt allows crawling and points at the sitemap', async () => {
    const text = await robots(PROD_HOST, PRODUCTION);
    expect(text).toContain('Allow: /');
    expect(text).toContain(`Sitemap: ${PRODUCTION}/sitemap.xml`);
    expect(text).not.toMatch(/^Disallow: \/\s*$/m);
  });

  it('sitemap.xml is available with canonical production URLs only', async () => {
    const res = seoFileResponse('/sitemap.xml', PROD_HOST, PRODUCTION) as Response;
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain(`<loc>${PRODUCTION}</loc>`);
    expect(xml).toContain(`<loc>${PRODUCTION}/services/mobile-notary</loc>`);
    expect(xml).not.toContain('workers.dev');
  });
});

describe.each([WORKERS_DEV, PREVIEW])('indexing matrix — workers.dev / preview host %s', (host) => {
  it('every HTML response served by the Worker is noindex, nofollow', () => {
    expect(withIndexingPolicy(html(), PRODUCTION, host).headers.get('x-robots-tag')).toBe(
      'noindex, nofollow',
    );
  });

  it('robots.txt disallows everything and has no sitemap line', async () => {
    const text = await robots(host, PRODUCTION);
    expect(text).toBe('User-agent: *\nDisallow: /\n');
    expect(text).not.toContain('Sitemap');
  });

  it('sitemap.xml is not served', () => {
    expect((seoFileResponse('/sitemap.xml', host, PRODUCTION) as Response).status).toBe(404);
  });
});

describe('indexing matrix — no production domain configured (fail closed)', () => {
  it.each([PROD_HOST, WORKERS_DEV, 'localhost:8788'])(
    'host %s: noindex, Disallow, no sitemap',
    async (host) => {
      expect(withIndexingPolicy(html(), '', host).headers.get('x-robots-tag')).toBe(
        'noindex, nofollow',
      );
      expect(await robots(host, '')).toBe('User-agent: *\nDisallow: /\n');
      expect((seoFileResponse('/sitemap.xml', host, '') as Response).status).toBe(404);
    },
  );

  it('an empty base can never produce sitemap URLs', () => {
    expect(buildSitemapXml('')).not.toContain('<loc>');
  });

  it('other paths are not handled by the SEO file router', () => {
    expect(seoFileResponse('/services', PROD_HOST, PRODUCTION)).toBeNull();
    expect(seoFileResponse('/robots.txt.bak', PROD_HOST, PRODUCTION)).toBeNull();
  });
});

describe('public/_headers (static assets only)', () => {
  const lines = readFileSync('public/_headers', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
  const rules = lines.filter((line) => !/^\s/.test(line));
  const headers = lines.filter((line) => /^\s/.test(line)).map((line) => line.trim());

  it('has only host-specific, workers.dev-only rules (never a generic /* noindex)', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule).toMatch(/^https:\/\/[^/]*\.workers\.dev\/\*$/);
      expect(rule).not.toMatch(/^\/?\*/);
    }
  });

  it('the only header it sets is X-Robots-Tag: noindex', () => {
    expect(headers).toEqual(['X-Robots-Tag: noindex, nofollow']);
  });

  it('cannot match the production custom domain', () => {
    const rule = rules[0];
    // translate Cloudflare placeholders to a host regex: :name matches one DNS label
    const host = rule.replace('https://', '').replace('/*', '');
    const pattern = new RegExp(`^${host.replace(/:[a-z]+/g, '[^.]+').replace(/\./g, '\\.')}$`);
    expect(pattern.test(WORKERS_DEV)).toBe(true);
    expect(pattern.test(PREVIEW)).toBe(true);
    expect(pattern.test(PROD_HOST)).toBe(false);
    expect(pattern.test('example.test')).toBe(false);
    expect(pattern.test('workers.dev.example.test')).toBe(false);
  });
});
