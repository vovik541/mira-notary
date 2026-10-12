import { LOAN_SIGNING_ITEMS, SERVICES } from './services.data';

describe('loan signing service names', () => {
  const loan = SERVICES.find((service) => service.slug === 'loan-signing');

  it('says "Home Equity" (no HELOC wording) and lists "Commercial Loans" directly after it', () => {
    for (const list of [
      LOAN_SIGNING_ITEMS,
      loan?.highlights ?? [],
      loan?.overviewHighlights ?? [],
    ]) {
      const index = list.indexOf('Home Equity');
      expect(index, JSON.stringify(list)).toBeGreaterThanOrEqual(0);
      expect(list[index + 1]).toBe('Commercial Loans');
    }
    expect(JSON.stringify([LOAN_SIGNING_ITEMS, SERVICES])).not.toMatch(/HELOC|Home Equity Lines/i);
  });
});
