export interface PhoneNumber {
  readonly display: string;
  readonly href: string;
}

export const BUSINESS = {
  name: 'Local Notary Signings',
  ownerName: 'Mira Derkach',
  tagline: 'Mobile Notary & Loan Signing Agent',
  roleTitle: 'Mobile Notary Public & Loan Signing Agent',
  commissionNumber: '2479804',
  phones: {
    primary: { display: '(916) 759-0383', href: 'tel:+19167590383' } satisfies PhoneNumber,
    secondary: { display: '(279) 529-8754', href: 'tel:+12795298754' } satisfies PhoneNumber,
  },
  email: 'MiraNotary@gmail.com',
  languages: ['English', 'Ukrainian', 'Russian'],
  credentials: ['NNA Certified Signing Agent', 'Background Screened', '$1M E&O Insurance'],
  disclaimer:
    'I am not an attorney licensed to practice law in California and may not give legal advice or accept fees for legal advice.',
  logo: {
    src: 'assets/brand/local-notary-signings-logo.webp',
    width: 800,
    height: 332,
    alt: 'Local Notary Signings',
  },
} as const;

export const LANGUAGES_LABEL = BUSINESS.languages.join(' • ');
export const EMAIL_HREF = `mailto:${BUSINESS.email}`;
