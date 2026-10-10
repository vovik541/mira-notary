import { SEO_PAGES, SEO_PAGE_LIST } from './seo-pages';
import {
  PROFILE_URLS,
  areaServed,
  breadcrumbSchema,
  organizationSchema,
  pageGraph,
  personSchema,
  serviceSchema,
  websiteSchema,
} from './structured-data';

const BASE = 'https://www.example.test';
const nodesOf = (graph: Record<string, unknown> | null): Record<string, unknown>[] =>
  (graph?.['@graph'] ?? []) as Record<string, unknown>[];

describe('structured data builders', () => {
  it('serializes every page graph (with and without a configured domain) as valid JSON', () => {
    for (const page of SEO_PAGE_LIST) {
      for (const origin of ['', BASE]) {
        const graph = pageGraph(page, origin);
        if (graph) {
          expect(() => JSON.parse(JSON.stringify(graph))).not.toThrow();
        }
      }
    }
  });

  it('never publishes an address, geo, hours, price range, ratings, reviews or LocalBusiness types', () => {
    const text = JSON.stringify(SEO_PAGE_LIST.map((page) => pageGraph(page, BASE)));
    expect(text).not.toMatch(
      /"(address|geo|openingHours|openingHoursSpecification|priceRange|aggregateRating|review|streetAddress|postalCode)"/,
    );
    expect(text).not.toMatch(
      /"@type":"(LocalBusiness|Notary|LegalService|ProfessionalService|FAQPage)"/,
    );
  });

  it('uses the primary 279 number and no 916 number anywhere', () => {
    expect(organizationSchema(BASE)['telephone']).toBe('+12795298754');
    const text = JSON.stringify(SEO_PAGE_LIST.map((page) => pageGraph(page, BASE)));
    expect(text).not.toMatch(/916|759-0383|\+19167590383/);
  });

  it('Organization: stable @id, full business name, logo, sameAs, languages', () => {
    const org = organizationSchema(BASE);
    expect(org['@id']).toBe(`${BASE}/#organization`);
    expect(org['name']).toBe('Local Notary Signings by Mira Derkach');
    expect((org['logo'] as { url: string }).url).toBe(
      `${BASE}/assets/brand/local-notary-signings-logo.webp`,
    );
    expect(org['knowsLanguage']).toEqual(['en', 'uk', 'ru']);
    expect(org['sameAs']).toEqual(PROFILE_URLS);
    expect(org['email']).toBe('MiraNotary@gmail.com');
  });

  it('before a domain exists no absolute URL is invented (relative @id fragments only)', () => {
    expect(organizationSchema('')['@id']).toBe('#organization');
    expect(organizationSchema('')).not.toHaveProperty('url');
    expect(organizationSchema('')).not.toHaveProperty('logo');
    expect(websiteSchema('')).toBeNull();
    expect(breadcrumbSchema(SEO_PAGES.apostille, '')).toBeNull();
    expect(serviceSchema('apostille', '/services/apostille', '')).not.toHaveProperty('url');
  });

  it('WebSite (home): canonical url, site name, publisher reference', () => {
    expect(websiteSchema(BASE)).toMatchObject({
      '@type': 'WebSite',
      name: 'Local Notary Signings by Mira Derkach',
      url: BASE,
      publisher: { '@id': `${BASE}/#organization` },
    });
    const home = nodesOf(pageGraph(SEO_PAGES.home, BASE)).map((n) => n['@type']);
    expect(home).toEqual(['WebSite', 'Organization']);
  });

  it('Person (About): truthful, no legal-professional claims', () => {
    const person = personSchema(BASE);
    expect(person).toMatchObject({ '@type': 'Person', name: 'Mira Derkach' });
    expect(JSON.stringify(person)).not.toMatch(/attorney|lawyer|licensed/i);
    const about = nodesOf(pageGraph(SEO_PAGES.about, BASE)).map((n) => n['@type']);
    expect(about).toEqual(['Organization', 'Person']);
  });

  it('service pages: Service + BreadcrumbList; provider is the Organization; confirmed area only', () => {
    const graph = nodesOf(pageGraph(SEO_PAGES.apostille, BASE));
    expect(graph.map((n) => n['@type'])).toEqual(['Service', 'BreadcrumbList']);
    const service = graph[0] as { provider: { '@id': string }; areaServed: unknown; url: string };
    expect(service.provider['@id']).toBe(`${BASE}/#organization`);
    expect(service.url).toBe(`${BASE}/services/apostille`);
    expect(service.areaServed).toEqual(areaServed());
    const crumbs = (graph[1]['itemListElement'] as { position: number; item: string }[]).map(
      (c) => [c.position, c.item],
    );
    expect(crumbs).toEqual([
      [1, BASE],
      [2, `${BASE}/services`],
      [3, `${BASE}/services/apostille`],
    ]);
  });

  it('areaServed claims only Sacramento County countywide', () => {
    const counties = areaServed()
      .filter((a) => a['@type'] === 'AdministrativeArea')
      .map((a) => a['name']);
    expect(counties).toEqual(['Sacramento County']);
    expect(JSON.stringify(areaServed())).not.toMatch(/Placer County|Yolo County|El Dorado County/);
  });

  it('pages without structured data (pricing, contact, 404 …) have no graph', () => {
    for (const page of [SEO_PAGES.pricing, SEO_PAGES.contact, SEO_PAGES.notFound]) {
      expect(pageGraph(page, BASE)).toBeNull();
    }
  });
});
