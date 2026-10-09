import {
  caretPositionAfterFormat,
  countDigits,
  extractPhoneDigits,
  formatPhoneDisplay,
} from './phone';

describe('formatPhoneDisplay', () => {
  it.each([
    ['', ''],
    ['2', '(2'],
    ['27', '(27'],
    ['279', '(279)'],
    ['2795', '(279) 5'],
    ['27955', '(279) 55'],
    ['279555', '(279) 555'],
    ['2795550', '(279) 555-0'],
    ['27955501', '(279) 555-01'],
    ['279555010', '(279) 555-010'],
    ['2795550100', '(279) 555-0100'],
  ])('%s → %s', (digits, display) => {
    expect(formatPhoneDisplay(digits)).toBe(display);
  });

  it('never shows more than ten digits', () => {
    expect(formatPhoneDisplay('27955501009999')).toBe('(279) 555-0100');
  });
});

describe('digit helpers', () => {
  it('extracts and counts digits only', () => {
    expect(extractPhoneDigits('(279) 555-0100')).toBe('2795550100');
    expect(extractPhoneDigits('+1 279 abc')).toBe('1279');
    expect(countDigits('(27')).toBe(2);
    expect(countDigits('')).toBe(0);
  });
});

describe('caretPositionAfterFormat', () => {
  const full = '(279) 555-0100';

  it('puts the caret at the very end when it is past the last digit (appending)', () => {
    expect(caretPositionAfterFormat(full, 10)).toBe(14);
    expect(caretPositionAfterFormat('(279)', 3)).toBe(5);
    expect(caretPositionAfterFormat('(2', 1)).toBe(2);
  });

  it('puts it just before the next digit in the middle of the number', () => {
    expect(caretPositionAfterFormat(full, 3)).toBe(6); // "(279) |555"
    expect(caretPositionAfterFormat(full, 4)).toBe(7);
    expect(caretPositionAfterFormat(full, 6)).toBe(10); // "(279) 555-|0100"
    expect(caretPositionAfterFormat(full, 1)).toBe(2);
  });

  it('puts it at the start when no digit precedes it', () => {
    expect(caretPositionAfterFormat(full, 0)).toBe(0);
  });
});
