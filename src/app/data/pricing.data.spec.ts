import { NOTARIAL_FEES, TRAVEL_FEES, TRAVEL_FEE_NOTE } from './pricing.data';

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

  it('keeps the statutory notarial fees unchanged', () => {
    expect(NOTARIAL_FEES.find((row) => row.label === 'Acknowledgment')?.price).toBe('$15');
    expect(NOTARIAL_FEES.find((row) => row.label === 'Jurat')?.price).toBe('$15');
  });

  it('the travel fee note sets expectations without alarming wording', () => {
    expect(TRAVEL_FEE_NOTE).toBe(
      'Travel fees may vary based on the meeting location. Mira & Team will confirm the applicable travel fee before the appointment.',
    );
  });
});
