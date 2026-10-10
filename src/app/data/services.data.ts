import { IconName } from '../shared/components/icon/icon.component';

export interface ServiceSummary {
  readonly slug: string;
  readonly path: string;
  readonly title: string;
  readonly icon: IconName;
  readonly summary: string;
  readonly note?: string;
  readonly highlights: readonly string[];
  readonly homeLinkLabel: string;
  readonly overviewHeading: string;
  readonly overviewHighlights: readonly string[];
  readonly overviewLinkLabel: string;
}

export const SERVICES: readonly ServiceSummary[] = [
  {
    slug: 'mobile-notary',
    path: '/services/mobile-notary',
    title: 'Mobile Notary',
    icon: 'document',
    summary: 'Convenient notarization at your home, office, hospital, or another agreed location.',
    highlights: [
      'Acknowledgments',
      'Jurats',
      'Powers of Attorney',
      'Living Trust Documents',
      'Affidavits',
    ],
    homeLinkLabel: 'View Mobile Notary Services',
    overviewHeading: 'Common Examples',
    overviewHighlights: [
      'Acknowledgments & Jurats',
      'Powers of Attorney',
      'Living Trust Documents',
      'Affidavits & Oaths',
      'Parental Travel Consent',
    ],
    overviewLinkLabel: 'Explore Mobile Notary',
  },
  {
    slug: 'loan-signing',
    path: '/services/loan-signing',
    title: 'Loan Signing Services',
    icon: 'building',
    summary: 'Professional signing support for real estate and lending transactions.',
    highlights: [
      'Buyer & Seller Packages',
      'Refinance',
      'HELOC',
      'Reverse Mortgage',
      'Loan Modification',
    ],
    homeLinkLabel: 'View Loan Signing Services',
    overviewHeading: 'Common Examples',
    overviewHighlights: [
      'Buyer & Seller Packages',
      'Refinance Transactions',
      'Home Equity Lines of Credit (HELOC)',
      'Reverse Mortgages',
      'Scanbacks & Courier Drop-Offs',
    ],
    overviewLinkLabel: 'Explore Loan Signings',
  },
  {
    slug: 'apostille',
    path: '/services/apostille',
    title: 'California Apostille',
    icon: 'flag',
    summary:
      'Assistance with California apostille processing for documents intended for international use.',
    highlights: ['Document Pickup', 'Submission', 'Return Delivery', 'Multiple Documents'],
    homeLinkLabel: 'View Apostille Services',
    overviewHeading: 'Service Details',
    overviewHighlights: [
      'Document Review',
      'Pickup Coordination',
      'Submission Coordination',
      'Return Delivery',
    ],
    overviewLinkLabel: 'Explore Apostille Services',
  },
  {
    slug: 'translation',
    path: '/services/translation',
    title: 'Document Translation',
    icon: 'translate',
    summary:
      'Document translation services available for Ukrainian ↔ English and Russian ↔ English.',
    note: 'Additional languages may be available through a professional translation network.',
    highlights: [],
    homeLinkLabel: 'View Translation Services',
    overviewHeading: 'Common Examples',
    overviewHighlights: [
      'Vital Records',
      'Diplomas & Transcripts',
      'Personal & Business Documents',
    ],
    overviewLinkLabel: 'Explore Translation Services',
  },
];

export const COMMON_NOTARY_SERVICES: readonly string[] = [
  'Acknowledgments',
  'Jurats',
  'Affidavits',
  'Powers of Attorney',
  'Living Trust Documents',
  'Parental Travel Consent',
  'Oaths & Affirmations',
  'Certified Copy of Power of Attorney',
  'Proof of Execution / Subscribing Witness',
];

export const LOAN_SIGNING_ITEMS: readonly string[] = [
  'Buyer Packages',
  'Seller Packages',
  'Refinance',
  'HELOC',
  'Reverse Mortgage',
  'Loan Modification',
];

export const ADDITIONAL_SIGNING_SUPPORT: readonly string[] = ['Scanbacks', 'Courier Drop-Offs'];

export const MOBILE_OFFICE_ITEMS: readonly string[] = [
  'Dual-Tray Laser Printer',
  'Mobile Scanner',
  'Scanbacks',
  'Courier Drop-Offs',
];

export interface ProcessStep {
  readonly title: string;
  readonly description: string;
}

export const APOSTILLE_STEPS: readonly ProcessStep[] = [
  {
    title: 'Share Document Info',
    description: 'Share information about your document and target country.',
  },
  {
    title: 'Review & Confirmation',
    description: 'Mira reviews the service request and confirms what can be handled.',
  },
  {
    title: 'Pickup / Submission',
    description: 'Document pickup and submission is coordinated.',
  },
  {
    title: 'Document Return',
    description: 'Completed documents are returned according to the agreed arrangement.',
  },
];

export interface WhyMiraItem {
  readonly title: string;
  readonly description: string;
}

export const WHY_MIRA: readonly WhyMiraItem[] = [
  {
    title: 'Banking & Lending Background',
    description: 'More than 16 years of professional experience in banking and consumer lending.',
  },
  {
    title: 'Real Estate Experience',
    description:
      'Experience working with buyers, sellers, title and escrow professionals, appraisers, inspectors, and other real estate vendors.',
  },
  {
    title: 'Trilingual Service',
    description: 'Professional communication in English, Ukrainian, and Russian.',
  },
  {
    title: 'Fully Mobile',
    description: 'Mobile printing, scanning, scanbacks, and courier drop-offs when required.',
  },
];
