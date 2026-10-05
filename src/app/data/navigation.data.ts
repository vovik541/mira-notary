export interface NavLink {
  readonly label: string;
  readonly path: string;
}

export const SERVICE_LINKS: readonly NavLink[] = [
  { label: 'Mobile Notary', path: '/services/mobile-notary' },
  { label: 'Loan Signing Services', path: '/services/loan-signing' },
  { label: 'California Apostille', path: '/services/apostille' },
  { label: 'Document Translation', path: '/services/translation' },
];

export const MAIN_NAV: readonly NavLink[] = [
  { label: 'About', path: '/about' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Reviews', path: '/reviews' },
  { label: 'Service Area', path: '/service-area' },
];

export const MOBILE_NAV_PRIMARY: readonly NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'Services Overview', path: '/services' },
];

export const MOBILE_NAV_SECONDARY: readonly NavLink[] = [
  { label: 'About Mira', path: '/about' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Reviews', path: '/reviews' },
  { label: 'Service Area', path: '/service-area' },
  { label: 'FAQ', path: '/faq' },
];
