export interface PhoneNumber {
  readonly display: string;
  readonly href: string;
  /** `sms:` link for the same number (a separate, real Text action). */
  readonly smsHref: string;
}

/** External profile links (open in a new tab with `rel="noopener noreferrer"`). */
export const EXTERNAL_LINKS = {
  nnaSigningAgentProfile: 'https://www.signingagent.com/profile/160327553',
  googleReview: 'https://g.page/r/CR77WhvSyXIGEBM/review',
  /**
   * Website-development credit (commercial: rel="sponsored"). Switch to
   * https://reiskra.com/ref/mira-notary once that route exists on the ReIskra site (it returned
   * 404 on 2026-10-12).
   */
  reiskraReferral: 'https://reiskra.com/',
  /** Translation partner referral (commission link: rel="sponsored", no UTM — attribution is in the path). */
  idiomaticReferral: 'https://idiomaticaffiliates.com/order-a-translation/ref/eo11r/',
} as const;

/**
 * Google My Maps service-area map (public view/embed only — never the editor URL). The polygon is
 * the geographic source of truth; the ZIP list in src/shared/service-area-zips.ts was derived from
 * it (docs/seo/SERVICE-AREA-MAP-AUDIT.md) and does not sync automatically.
 */
const SERVICE_AREA_MAP_ID = '1ng1VSm4xqVtoWQ-JoSgasdx6ww7p86g';
export const SERVICE_AREA_MAP = {
  id: SERVICE_AREA_MAP_ID,
  embedUrl: `https://www.google.com/maps/d/embed?mid=${SERVICE_AREA_MAP_ID}&ehbc=2E312F`,
  viewerUrl: `https://www.google.com/maps/d/viewer?mid=${SERVICE_AREA_MAP_ID}`,
  title: 'Local Notary Signings by Mira service area map',
} as const;

/** Google Business Profile page URL: no verified public URL exists in the project yet. */
export const GOOGLE_BUSINESS_PROFILE_URL: string | null = null;

export const BUSINESS = {
  name: 'Local Notary Signings',
  ownerName: 'Mira Derkach',
  tagline: 'Mobile Notary & Loan Signing Agent',
  roleTitle: 'Mobile Notary Public & Loan Signing Agent',
  commissionNumber: '2479804',
  /**
   * `primary` is the number used everywhere on the site. `secondary` is shown ONLY in the Contact
   * page direct-contact panel (labelled Secondary) — never in the header, footer, CTAs, messages
   * or structured data.
   */
  phones: {
    primary: {
      display: '(279) 529-8754',
      href: 'tel:+12795298754',
      smsHref: 'sms:+12795298754',
    } satisfies PhoneNumber,
    secondary: {
      display: '(916) 759-0383',
      href: 'tel:+19167590383',
      smsHref: 'sms:+19167590383',
    } satisfies PhoneNumber,
  },
  email: 'contact@miranotary.com',
  languages: ['English', 'Ukrainian', 'Russian'],
  credentials: ['NNA Certified Signing Agent', 'Background Screened', '$1M E&O Insurance'],
  disclaimer:
    'I am not an attorney licensed to practice law in California and may not give legal advice or accept fees for legal advice.',
  logo: {
    src: 'assets/brand/local-notary-signings-logo.webp',
    width: 800,
    height: 332,
    alt: 'Local Notary Signings by Mira Derkach',
  },
} as const;

export const LANGUAGES_LABEL = BUSINESS.languages.join(' • ');
export const EMAIL_HREF = `mailto:${BUSINESS.email}`;
