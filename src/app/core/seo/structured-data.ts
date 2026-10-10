import { BUSINESS, EXTERNAL_LINKS } from '../config/business.config';
import { SITE } from '../config/site.config';
import { SERVICE_AREA_COMMUNITIES, SERVICE_AREA_GROUPS } from '../../data/service-area.data';
import { SeoPage, ServiceKey } from './seo-pages';
import { canonicalUrl, normalizeBase } from './site-url';

/**
 * Pure JSON-LD builders. Conservative by design:
 *  - Organization / Person / Service / WebSite / BreadcrumbList only. NOT LocalBusiness / Notary /
 *    LegalService: Mira is a mobile, service-area business without a public address, Google's
 *    LocalBusiness markup requires a physical address, and "Notary" is a LegalService subtype.
 *  - No address, geo, opening hours, price range, AggregateRating or Review markup.
 *  - Absolute URLs (and the WebSite / BreadcrumbList nodes that need them) appear only once
 *    `SITE.url` is configured — no domain is ever invented.
 */

export type JsonLd = Record<string, unknown>;

export const BUSINESS_FULL_NAME = `${BUSINESS.name} by ${BUSINESS.ownerName}`;

/** Public professional profiles (sameAs). */
export const PROFILE_URLS: readonly string[] = [
  EXTERNAL_LINKS.nnaSigningAgentProfile,
  'https://notarycafe.com/Miroslava.Derkach',
];

const LANGUAGE_CODES: Readonly<Record<string, string>> = {
  English: 'en',
  Ukrainian: 'uk',
  Russian: 'ru',
};

const SERVICE_DEFINITIONS: Readonly<
  Record<ServiceKey, { name: string; serviceType: string; description: string }>
> = {
  'mobile-notary': {
    name: 'Mobile Notary',
    serviceType: 'Mobile notary public service',
    description:
      'Notarization at your home, office, hospital or another agreed location, including acknowledgments, jurats, powers of attorney and affidavits.',
  },
  'loan-signing': {
    name: 'Loan Signing',
    serviceType: 'Loan signing agent service',
    description:
      'Notary signing agent services for buyer, seller, refinance, HELOC, reverse mortgage and loan modification signings.',
  },
  apostille: {
    name: 'California Apostille',
    serviceType: 'Apostille processing assistance',
    description:
      'Assistance with California apostille processing for documents intended for use outside the United States.',
  },
  translation: {
    name: 'Document Translation',
    serviceType: 'Document translation',
    description:
      'Document translation for Ukrainian to English and Russian to English, with a professional network for other languages.',
  },
};

const base = (): string => normalizeBase(SITE.url);

/** Stable entity id: absolute once the domain is known, a document-relative fragment before. */
export function entityId(origin: string, fragment: string): string {
  return origin ? `${origin}/#${fragment}` : `#${fragment}`;
}

export function areaServed(): JsonLd[] {
  return [
    // Countywide only where confirmed; every other county only through its confirmed communities.
    ...SERVICE_AREA_GROUPS.filter((group) => group.countywide).map((group) => ({
      '@type': 'AdministrativeArea',
      name: group.county,
    })),
    ...SERVICE_AREA_COMMUNITIES.map((name) => ({ '@type': 'City', name })),
  ];
}

export function organizationSchema(origin: string = base()): JsonLd {
  return {
    '@type': 'Organization',
    '@id': entityId(origin, 'organization'),
    name: BUSINESS_FULL_NAME,
    ...(origin ? { url: origin } : {}),
    ...(origin
      ? {
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/${BUSINESS.logo.src}`,
            width: BUSINESS.logo.width,
            height: BUSINESS.logo.height,
          },
        }
      : {}),
    description:
      'Mobile notary public and loan signing agent serving Sacramento County and confirmed nearby communities in the Greater Sacramento area.',
    telephone: BUSINESS.phones.primary.href.replace('tel:', ''),
    email: BUSINESS.email,
    knowsLanguage: BUSINESS.languages.map((language) => LANGUAGE_CODES[language] ?? language),
    areaServed: areaServed(),
    sameAs: PROFILE_URLS,
  };
}

export function websiteSchema(origin: string = base()): JsonLd | null {
  if (!origin) {
    return null;
  }
  return {
    '@type': 'WebSite',
    '@id': entityId(origin, 'website'),
    name: BUSINESS_FULL_NAME,
    url: origin,
    inLanguage: 'en',
    publisher: { '@id': entityId(origin, 'organization') },
  };
}

export function personSchema(origin: string = base()): JsonLd {
  return {
    '@type': 'Person',
    '@id': entityId(origin, 'mira-derkach'),
    name: BUSINESS.ownerName,
    jobTitle: BUSINESS.roleTitle,
    worksFor: { '@id': entityId(origin, 'organization') },
    knowsLanguage: BUSINESS.languages.map((language) => LANGUAGE_CODES[language] ?? language),
    ...(origin
      ? { image: `${origin}/assets/images/mira-portrait.webp`, url: `${origin}/about` }
      : {}),
    sameAs: PROFILE_URLS,
  };
}

export function serviceSchema(key: ServiceKey, path: string, origin: string = base()): JsonLd {
  const definition = SERVICE_DEFINITIONS[key];
  const url = canonicalUrl(origin, path);
  return {
    '@type': 'Service',
    '@id': entityId(origin, `service-${key}`),
    name: definition.name,
    serviceType: definition.serviceType,
    description: definition.description,
    provider: {
      '@type': 'Organization',
      '@id': entityId(origin, 'organization'),
      name: BUSINESS_FULL_NAME,
    },
    areaServed: areaServed(),
    ...(url ? { url } : {}),
  };
}

export function breadcrumbSchema(page: SeoPage, origin: string = base()): JsonLd | null {
  if (!origin || !page.breadcrumbs?.length) {
    return null; // every ListItem needs an absolute `item` URL
  }
  return {
    '@type': 'BreadcrumbList',
    itemListElement: page.breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: canonicalUrl(origin, crumb.path),
    })),
  };
}

/** One `@graph` for a page, or null when the page carries no structured data. */
export function pageGraph(page: SeoPage, origin: string = base()): JsonLd | null {
  const nodes: (JsonLd | null)[] = [
    page.website ? websiteSchema(origin) : null,
    page.organization ? organizationSchema(origin) : null,
    page.person ? personSchema(origin) : null,
    page.service ? serviceSchema(page.service, page.path, origin) : null,
    breadcrumbSchema(page, origin),
  ];
  const graph = nodes.filter((node): node is JsonLd => node !== null);
  return graph.length > 0 ? { '@context': 'https://schema.org', '@graph': graph } : null;
}
