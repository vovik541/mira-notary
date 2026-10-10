import { BUSINESS } from '../core/config/business.config';

export type FaqId =
  | 'bring-to-appointment'
  | 'service-area'
  | 'same-day'
  | 'service-hours'
  | 'pricing'
  | 'payment-methods'
  | 'languages'
  | 'foreign-language-document'
  | 'apostille-timing'
  | 'apostille-original-document';

/** A phrase inside `answer` that is rendered as a link (plain-text model, no HTML). */
export interface FaqLink {
  readonly text: string;
  /** Internal path (`/pricing`) or `tel:` URI. */
  readonly href: string;
}

export interface FaqItem {
  readonly id: FaqId;
  readonly question: string;
  /** Plain text. Rendered by the FAQ page and the Home preview. */
  readonly answer: string;
  readonly links?: readonly FaqLink[];
}

const PHONE = BUSINESS.phones.primary;
const phoneLink: FaqLink = { text: PHONE.display, href: PHONE.href };
const textLink: FaqLink = { text: 'text the same number', href: PHONE.smsHref };

/** The single FAQ dataset: the /faq page and the Home preview both use it. */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'bring-to-appointment',
    question: 'What should I bring to my notary appointment?',
    answer:
      "Please bring the document or documents that need notarization and a valid, government-issued photo ID for each signer, such as a driver's license or passport. If you are unsure what you need, contact Mira before your appointment.",
  },
  {
    id: 'service-area',
    question: 'Does Mira travel to my location?',
    answer:
      'Yes. Mira provides mobile notary service throughout Sacramento County and in confirmed nearby communities across the Greater Sacramento area. Use the Service Area page to check your ZIP code, or contact Mira to confirm availability.',
    links: [{ text: 'Service Area page', href: '/service-area' }],
  },
  {
    id: 'same-day',
    question: 'Can I request a same-day appointment?',
    answer: `Same-day and urgent appointments must be booked by phone. Call Mira & Team at ${PHONE.display} to check availability, or text the same number.`,
    links: [phoneLink, textLink],
  },
  {
    id: 'service-hours',
    question: 'What are your service hours?',
    answer: `Mira is available Monday through Saturday. Sunday appointments may be available for urgent requests and must be arranged by phone. Call Mira & Team at ${PHONE.display}, or text the same number.`,
    links: [phoneLink, textLink],
  },
  {
    id: 'pricing',
    question: 'How much does a mobile notary appointment cost?',
    answer:
      'Pricing may include the applicable notarial service fee and a mobile travel fee. Common prices are listed on the Pricing page, and final pricing is confirmed before service.',
    links: [{ text: 'Pricing page', href: '/pricing' }],
  },
  {
    id: 'payment-methods',
    question: 'How can I pay?',
    answer: 'We can accept payment by Zelle, Cash App, Venmo, and cash.',
  },
  {
    id: 'languages',
    question: 'What languages does Mira speak?',
    answer:
      'Mira is fluent in English, Ukrainian, and Russian. For other languages, Mira may be able to refer you to an affiliated notary who speaks your language.',
  },
  {
    id: 'foreign-language-document',
    question: 'Can a notary notarize a foreign-language document?',
    answer:
      'Yes. A California notary may notarize a signature on a document written in another language. Mira must be able to communicate directly with the signer, and the document must appear complete. If you also need the document translated, ask Mira about translation services.',
    links: [{ text: 'translation services', href: '/services/translation' }],
  },
  {
    id: 'apostille-timing',
    question: 'How long does a California apostille take?',
    answer:
      'Timing depends on the document, destination, and processing requirements. In some cases, a California apostille may be completed the same day, but timing is not guaranteed. Contact Mira & Team to confirm the options for your document.',
  },
  {
    id: 'apostille-original-document',
    question: 'Do I need the original document for an apostille?',
    answer:
      'It depends on the document. Most apostille requests require an original notarized document, an original public document, or an appropriately certified copy. A regular photocopy may not be sufficient. Contact Mira before submitting your documents if you are unsure what is required.',
  },
];

/** Home preview: the three questions people ask before booking (area, same-day, cost). */
export const HOME_FAQ_IDS: readonly FaqId[] = ['service-area', 'same-day', 'pricing'];

/** Picks items from the shared dataset (same objects, in the requested order). */
export function selectFaqItems(ids: readonly FaqId[]): readonly FaqItem[] {
  return ids.map((id) => {
    const item = FAQ_ITEMS.find((candidate) => candidate.id === id);
    if (!item) {
      throw new Error(`Unknown FAQ id: ${id}`);
    }
    return item;
  });
}

export interface FaqSegment {
  readonly text: string;
  readonly href?: string;
}

/** Splits a plain answer into text / link segments (first occurrence of each link phrase). */
export function faqSegments(item: FaqItem): readonly FaqSegment[] {
  let segments: FaqSegment[] = [{ text: item.answer }];
  for (const link of item.links ?? []) {
    segments = segments.flatMap((segment) => {
      if (segment.href !== undefined) {
        return [segment];
      }
      const index = segment.text.indexOf(link.text);
      if (index < 0) {
        return [segment];
      }
      return [
        { text: segment.text.slice(0, index) },
        { text: link.text, href: link.href },
        { text: segment.text.slice(index + link.text.length) },
      ].filter((part) => part.text !== '');
    });
  }
  return segments;
}
