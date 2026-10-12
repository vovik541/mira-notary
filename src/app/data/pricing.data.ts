export interface PriceRow {
  readonly label: string;
  readonly detail?: string;
  readonly price: string;
  readonly unit?: string;
}

export const TRAVEL_FEES: readonly PriceRow[] = [
  { label: 'Sacramento Travel Fee', detail: '8:00 AM–8:00 PM', price: '~$50' },
  { label: 'After-Hours Travel', price: '+$70' },
  { label: 'Hospital Travel', price: '+$10' },
];

/** Quiet expectation-setting note shown next to the travel fees. */
export const TRAVEL_FEE_NOTE =
  'Travel fees may vary based on the meeting location. Mira & Team will confirm the applicable travel fee before the appointment.';

/** One clear notarial fee; the travel fee is always separate (see TRAVEL_FEES). */
export const NOTARIAL_FEES: readonly PriceRow[] = [
  {
    label: 'Notarial Fee',
    detail: '+ applicable travel fee, charged separately',
    price: 'Up to $15',
    unit: 'per applicable signature or notarial act',
  },
];

/** Plain-language clarification under the notarial fee (also the natural home of the act names). */
export const NOTARIAL_FEE_NOTE =
  'Common notarial services include acknowledgments, jurats, oaths and affirmations, proofs of execution, and certified copies of powers of attorney. California notarial fees are charged per applicable notarized signature or notarial act. Mobile travel fees are separate and vary by meeting location and appointment time.';

export const APOSTILLE_FEES: readonly PriceRow[] = [
  { label: 'First California Apostille', price: '$125' },
  { label: 'Each Additional Document', price: '$60' },
];

export const APOSTILLE_NOTE =
  '48-hour rush service may be available, except weekends. Final pricing is confirmed before service.';

export const PAYMENT_METHODS: readonly string[] = ['Zelle', 'Cash App', 'Venmo', 'Cash'];
