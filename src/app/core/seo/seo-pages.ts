/**
 * Single source of truth for per-page SEO: title, description, indexability and which structured
 * data a page carries. Routes, the sitemap, the Worker and the tests all read this registry, so a
 * page cannot be indexable without a title / description / sitemap entry.
 *
 * Wording follows docs/seo/KEYWORD-MAP.md (one primary intent per page; natural phrasing first).
 * No `<meta name="keywords">` — Google ignores it.
 */

export type ServiceKey = 'mobile-notary' | 'loan-signing' | 'apostille' | 'translation';

export type SeoPageKey =
  | 'home'
  | 'services'
  | 'mobileNotary'
  | 'loanSigning'
  | 'apostille'
  | 'translation'
  | 'about'
  | 'pricing'
  | 'reviews'
  | 'serviceArea'
  | 'faq'
  | 'contact'
  | 'notFound';

export interface BreadcrumbItem {
  readonly name: string;
  readonly path: string;
}

export interface SeoPage {
  readonly key: SeoPageKey;
  /** Canonical router path ('/' for home). Query strings are never part of it. */
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly indexable: boolean;
  /** WebSite + Organization nodes (home page). */
  readonly organization?: boolean;
  readonly website?: boolean;
  /** Person node for Mira (About page). */
  readonly person?: boolean;
  /** Service node for a service detail page. */
  readonly service?: ServiceKey;
  /** Visible breadcrumb trail (ending with the page itself) — also emitted as BreadcrumbList. */
  readonly breadcrumbs?: readonly BreadcrumbItem[];
}

const HOME: BreadcrumbItem = { name: 'Home', path: '/' };
const SERVICES: BreadcrumbItem = { name: 'Services', path: '/services' };

export const SEO_PAGES: Readonly<Record<SeoPageKey, SeoPage>> = {
  home: {
    key: 'home',
    path: '/',
    title: 'Mobile Notary in Sacramento | Local Notary Signings by Mira Derkach',
    description:
      'Mobile notary and loan signing agent serving Sacramento County and confirmed nearby communities in Greater Sacramento. English, Ukrainian and Russian. Request an appointment online or call.',
    indexable: true,
    website: true,
    organization: true,
  },
  services: {
    key: 'services',
    path: '/services',
    title: 'Notary, Loan Signing, Apostille & Translation Services | Sacramento',
    description:
      'Mobile notary, loan signing, California apostille and document translation from Mira Derkach in the Greater Sacramento area. Compare the services and choose the right one.',
    indexable: true,
  },
  mobileNotary: {
    key: 'mobileNotary',
    path: '/services/mobile-notary',
    title: 'Mobile Notary Services in Sacramento | Home, Office & Hospital Visits',
    description:
      'A traveling notary public who comes to your home, office, hospital or another agreed location in Sacramento and confirmed nearby communities. Acknowledgments, jurats, powers of attorney and more.',
    indexable: true,
    service: 'mobile-notary',
    breadcrumbs: [HOME, SERVICES, { name: 'Mobile Notary', path: '/services/mobile-notary' }],
  },
  loanSigning: {
    key: 'loanSigning',
    path: '/services/loan-signing',
    title: 'Loan Signing Agent in Sacramento | NNA Certified Notary Signing Agent',
    description:
      'NNA Certified notary signing agent for buyer, seller, refinance, HELOC, reverse mortgage and loan modification signings in Greater Sacramento, with mobile printing, scanbacks and courier drop-offs.',
    indexable: true,
    service: 'loan-signing',
    breadcrumbs: [HOME, SERVICES, { name: 'Loan Signing', path: '/services/loan-signing' }],
  },
  apostille: {
    key: 'apostille',
    path: '/services/apostille',
    title: 'California Apostille Services in Sacramento | Local Notary Signings',
    description:
      'Help with California apostille processing for documents used outside the United States: document review, pickup, submission and return. Pricing is confirmed before service.',
    indexable: true,
    service: 'apostille',
    breadcrumbs: [HOME, SERVICES, { name: 'California Apostille', path: '/services/apostille' }],
  },
  translation: {
    key: 'translation',
    path: '/services/translation',
    title: 'Ukrainian & Russian Document Translation | Sacramento | Mira Derkach',
    description:
      'Document translation for Ukrainian ↔ English and Russian ↔ English, plus a professional network for other languages. Tell Mira about your document and request a quote.',
    indexable: true,
    service: 'translation',
    breadcrumbs: [HOME, SERVICES, { name: 'Document Translation', path: '/services/translation' }],
  },
  about: {
    key: 'about',
    path: '/about',
    title: 'About Mira Derkach | Sacramento Mobile Notary & Signing Agent',
    description:
      'Meet Mira Derkach, a California Notary Public and NNA Certified Signing Agent with a banking, lending and real estate background, serving the Greater Sacramento area in English, Ukrainian and Russian.',
    indexable: true,
    organization: true,
    person: true,
  },
  pricing: {
    key: 'pricing',
    path: '/pricing',
    title: 'Mobile Notary Pricing in Sacramento | Fees & Travel Rates',
    description:
      'Posted prices for notarial fees, mobile travel, after-hours and hospital visits, and California apostille service. Final pricing is confirmed before service.',
    indexable: true,
  },
  reviews: {
    key: 'reviews',
    path: '/reviews',
    title: 'Client Reviews | Mira Derkach, Sacramento Mobile Notary',
    description:
      'Google reviews from clients, lenders and title professionals who have worked with Mira Derkach, a mobile notary and loan signing agent in Greater Sacramento.',
    indexable: true,
  },
  serviceArea: {
    key: 'serviceArea',
    path: '/service-area',
    title: 'Mobile Notary Service Area | Sacramento County & Nearby Communities',
    description:
      'Mira travels throughout Sacramento County and confirmed nearby communities in Placer, Yolo and El Dorado counties. Check your ZIP code, or ask about an area not listed.',
    indexable: true,
  },
  faq: {
    key: 'faq',
    path: '/faq',
    title: 'Mobile Notary FAQ | Appointments, Pricing & Apostille | Sacramento',
    description:
      'Answers about what to bring to a notary appointment, travel, same-day requests, service hours, pricing, payment, languages and California apostille.',
    indexable: true,
  },
  contact: {
    key: 'contact',
    path: '/contact',
    title: 'Request a Notary Appointment | Mira Derkach, Sacramento',
    description:
      'Request a mobile notary, loan signing, apostille or translation appointment with Mira Derkach in the Sacramento area, or call (279) 529-8754.',
    indexable: true,
  },
  notFound: {
    key: 'notFound',
    path: '/404',
    title: 'Page Not Found | Local Notary Signings by Mira Derkach',
    description: 'The page you were looking for could not be found.',
    indexable: false,
  },
};

export const SEO_PAGE_LIST: readonly SeoPage[] = Object.values(SEO_PAGES);

/** Pages that belong in the XML sitemap. */
export const INDEXABLE_PAGES: readonly SeoPage[] = SEO_PAGE_LIST.filter((page) => page.indexable);
