import { routes } from '../../app.routes';
import { SITE } from '../config/site.config';
import { INDEXABLE_PAGES, SEO_PAGES, SEO_PAGE_LIST } from './seo-pages';
import { normalizePath } from './site-url';

describe('SEO page registry', () => {
  it('gives every page a unique title and a unique description', () => {
    const titles = SEO_PAGE_LIST.map((page) => page.title);
    const descriptions = SEO_PAGE_LIST.map((page) => page.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const page of INDEXABLE_PAGES) {
      expect(page.title.trim()).not.toBe('');
      expect(page.description.length).toBeGreaterThan(60);
    }
  });

  it('has unique, normalized canonical paths without query strings', () => {
    const paths = SEO_PAGE_LIST.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path).toBe(normalizePath(path));
      expect(path).not.toContain('?');
    }
  });

  it('every indexable page is a real route using its registry entry; the wildcard is noindex', () => {
    for (const page of INDEXABLE_PAGES) {
      const route = routes.find((r) => normalizePath(r.path ?? '') === page.path);
      expect(route, page.path).toBeDefined();
      expect(route?.data?.['seo']).toBe(page);
    }
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard?.data?.['seo']).toBe(SEO_PAGES.notFound);
    expect(SEO_PAGES.notFound.indexable).toBe(false);
  });

  it('uses the primary 279 number and never leaks the 916 number or placeholder domains', () => {
    const text = JSON.stringify(SEO_PAGE_LIST);
    expect(text).not.toMatch(/916|759-0383/);
    expect(text).not.toMatch(/workers\.dev|example\.(com|org)|localhost/);
    expect(SEO_PAGES.contact.description).toContain('(279) 529-8754');
  });

  it('does not use outdated service-area wording or unsupported claims', () => {
    const text = JSON.stringify(SEO_PAGE_LIST);
    expect(text).not.toMatch(/Placer and Yolo|surrounding communities/i);
    expect(text).not.toMatch(
      /\b(federal notary|licensed notary|(?<!of )attorney|legal advice|24\/7|24 hours|guaranteed|certified translat)/i,
    );
  });

  it('SITE.url is either unset or a real https origin (never workers.dev or a placeholder)', () => {
    const url: string = SITE.url;
    if (url !== '') {
      expect(url).toMatch(/^https:\/\/[a-z0-9.-]+$/);
      expect(url).not.toMatch(/workers\.dev|example|localhost/);
    }
  });
});
