import {
  APOSTILLE_FEES,
  NOTARIAL_FEES,
  NOTARIAL_FEE_NOTE,
  TRAVEL_FEES,
  TRAVEL_FEE_NOTE,
} from './pricing.data';

describe('pricing data', () => {
  it('Sacramento travel fee is approximately ~$50 (8:00 AM–8:00 PM), no longer $70', () => {
    const sacramento = TRAVEL_FEES.find((row) => row.label === 'Sacramento Travel Fee');
    expect(sacramento?.price).toBe('~$50');
    expect(sacramento?.price).not.toBe('$70');
    expect(sacramento?.detail).toBe('8:00 AM–8:00 PM');
  });

  it('leaves the other travel fees unchanged (after-hours +$70, hospital +$10)', () => {
    expect(TRAVEL_FEES.find((row) => row.label === 'After-Hours Travel')?.price).toBe('+$70');
    expect(TRAVEL_FEES.find((row) => row.label === 'Hospital Travel')?.price).toBe('+$10');
  });

  it('has ONE clear notarial fee: up to $15 per applicable signature or notarial act, travel separate', () => {
    expect(NOTARIAL_FEES).toEqual([
      {
        label: 'Notarial Fee',
        detail: '+ applicable travel fee, charged separately',
        price: 'Up to $15',
        unit: 'per applicable signature or notarial act',
      },
    ]);
  });

  it('Depositions is no longer offered or priced', () => {
    expect(
      JSON.stringify([NOTARIAL_FEES, NOTARIAL_FEE_NOTE, TRAVEL_FEES, APOSTILLE_FEES]),
    ).not.toMatch(/deposition/i);
  });

  it('the supporting note names the common notarial acts and says travel is separate', () => {
    expect(NOTARIAL_FEE_NOTE).toBe(
      'Common notarial services include acknowledgments, jurats, oaths and affirmations, proofs of execution, and certified copies of powers of attorney. California notarial fees are charged per applicable notarized signature or notarial act. Mobile travel fees are separate and vary by meeting location and appointment time.',
    );
  });

  it('apostille pricing is unchanged', () => {
    expect(APOSTILLE_FEES).toEqual([
      { label: 'First California Apostille', price: '$125' },
      { label: 'Each Additional Document', price: '$60' },
    ]);
  });

  it('the travel fee note sets expectations without alarming wording', () => {
    expect(TRAVEL_FEE_NOTE).toBe(
      'Travel fees may vary based on the meeting location. Mira & Team will confirm the applicable travel fee before the appointment.',
    );
  });
});
