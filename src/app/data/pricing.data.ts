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

export const NOTARIAL_FEES: readonly PriceRow[] = [
  { label: 'Acknowledgment', price: '$15', unit: 'per signature' },
  { label: 'Jurat', price: '$15', unit: 'per signature' },
  { label: 'Oath or Affirmation', price: '$15' },
  { label: 'Certified Copy of Power of Attorney', price: '$15', unit: 'per copy' },
  { label: 'Proof of Execution / Subscribing Witness', price: '$15', unit: 'per signature' },
  { label: 'Depositions', price: '$30', unit: '+ $7 for witnessing an oath' },
];

export const APOSTILLE_FEES: readonly PriceRow[] = [
  { label: 'First California Apostille', price: '$125' },
  { label: 'Each Additional Document', price: '$60' },
];

export const APOSTILLE_NOTE =
  '48-hour rush service may be available, except weekends. Final pricing is confirmed before service.';

export const PAYMENT_METHODS: readonly string[] = ['Zelle', 'Cash App', 'Venmo', 'Cash'];
