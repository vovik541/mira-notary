import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { INDEXABLE_PAGES, SEO_PAGES } from './seo-pages';
import { SeoService } from './seo.service';

const BASE = 'https://www.example.test';

describe('SeoService', () => {
  let seo: SeoService;
  let title: Title;
  let meta: Meta;
  const canonical = (): string | null =>
    document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    seo = TestBed.inject(SeoService);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
  });

  afterEach(() => {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.getElementById('ld-page')?.remove();
  });

  it('applies title, description and robots', () => {
    seo.apply(SEO_PAGES.about, '/about', BASE);
    expect(title.getTitle()).toBe(SEO_PAGES.about.title);
    expect(meta.getTag('name="description"')?.content).toBe(SEO_PAGES.about.description);
    expect(meta.getTag('name="robots"')?.content).toBe('index, follow');
    expect(meta.getTag('property="og:title"')?.content).toBe(SEO_PAGES.about.title);
    expect(meta.getTag('name="keywords"')).toBeNull();
  });

  it('fails closed: with no production domain configured every page is noindex', () => {
    for (const page of INDEXABLE_PAGES) {
      seo.apply(page, page.path, '');
      expect(meta.getTag('name="robots"')?.content, page.path).toBe('noindex, follow');
    }
  });

  it('marks the 404 page noindex and never gives it a canonical', () => {
    seo.apply(SEO_PAGES.notFound, '/nope', BASE);
    expect(meta.getTag('name="robots"')?.content).toBe('noindex, follow');
    expect(canonical()).toBeNull();
    expect(document.getElementById('ld-page')).toBeNull();
  });

  it('does not invent a canonical URL or social image while no site URL is configured', () => {
    seo.apply(SEO_PAGES.about, '/about', '');
    expect(canonical()).toBeNull();
    expect(meta.getTag('property="og:url"')).toBeNull();
    expect(meta.getTag('property="og:image"')).toBeNull();
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary');
  });

  it('sets one https canonical, og:url and a large social image once a base is configured', () => {
    seo.apply(SEO_PAGES.pricing, '/pricing', BASE);
    expect(canonical()).toBe(`${BASE}/pricing`);
    expect(meta.getTag('property="og:url"')?.content).toBe(`${BASE}/pricing`);
    expect(meta.getTag('property="og:image"')?.content).toBe(
      `${BASE}/assets/brand/social-share.png`,
    );
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it('canonicalizes a query-prefilled Contact URL to /contact', () => {
    seo.apply(SEO_PAGES.contact, '/contact?service=apostille&zip=95630', BASE);
    expect(canonical()).toBe(`${BASE}/contact`);
    expect(meta.getTag('property="og:url"')?.content).toBe(`${BASE}/contact`);
  });

  it.each([
    '/contact',
    '/contact?service=apostille',
    '/contact?zip=95630',
    '/contact?service=apostille&zip=95630',
  ])('canonicalizes %s to /contact', (url) => {
    seo.apply(SEO_PAGES.contact, url, BASE);
    expect(canonical()).toBe(`${BASE}/contact`);
    expect(meta.getTag('property="og:url"')?.content).toBe(`${BASE}/contact`);
  });

  it('every indexable route has exactly ONE https canonical: no query, no fragment, no trailing slash', () => {
    for (const page of INDEXABLE_PAGES) {
      seo.apply(page, page.path, BASE);
      const links = document.head.querySelectorAll('link[rel="canonical"]');
      expect(links, page.path).toHaveLength(1);
      const href = links[0].getAttribute('href') ?? '';
      expect(href).toMatch(/^https:\/\//);
      expect(href).not.toMatch(/[?#]/);
      expect(href === BASE || !href.endsWith('/')).toBe(true);
      expect(href).toBe(page.path === '/' ? BASE : `${BASE}${page.path}`);
    }
  });

  it('with no site URL: no canonical, og:url, og:image or absolute JSON-LD URL (fail closed)', () => {
    for (const page of INDEXABLE_PAGES) {
      seo.apply(page, page.path, '');
      expect(canonical(), page.path).toBeNull();
      expect(meta.getTag('property="og:url"')).toBeNull();
      expect(meta.getTag('property="og:image"')).toBeNull();
      const ld = document.getElementById('ld-page')?.textContent ?? '';
      expect(ld).not.toMatch(/https?:\/\/(?!schema\.org|www\.signingagent\.com|notarycafe\.com)/);
      expect(ld).not.toMatch(/workers\.dev|example|localhost/);
    }
  });

  it('the home canonical is the bare origin', () => {
    seo.apply(SEO_PAGES.home, '/', BASE);
    expect(canonical()).toBe(BASE);
  });
});
