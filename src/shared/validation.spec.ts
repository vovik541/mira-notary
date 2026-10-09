import {
  EMAIL_MAX_LENGTH,
  MAX_SIGNERS,
  NAME_MAX_LENGTH,
  PHONE_DIGIT_COUNT,
  PHONE_INPUT_MAX_LENGTH,
  SIGNERS_INPUT_MAX_LENGTH,
  formatPhone,
  isMeaningfulName,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  parseSigners,
  sanitizeDigits,
  sanitizeNameInput,
} from './validation';

describe('shared validation constants', () => {
  it('are the agreed limits', () => {
    expect(NAME_MAX_LENGTH).toBe(50);
    expect(EMAIL_MAX_LENGTH).toBe(120);
    expect(PHONE_DIGIT_COUNT).toBe(10);
    expect(PHONE_INPUT_MAX_LENGTH).toBe('(279) 555-0100'.length);
    expect(SIGNERS_INPUT_MAX_LENGTH).toBe(3);
    expect(MAX_SIGNERS).toBe(50);
  });
});

describe('isMeaningfulName', () => {
  it.each([
    'Mira',
    "O'Connor",
    'O’Connor',
    'Anne-Marie',
    'Mary-Kate',
    'Smith-Jones',
    'Anna Maria',
    'José',
    'Мирослава',
    'Володимир',
    'a'.repeat(50),
  ])('accepts %s', (name) => expect(isMeaningfulName(name)).toBe(true));
  it.each([
    'John123',
    'Mira@',
    'John_Doe',
    '12345',
    '!!!',
    "'John",
    "John'",
    ' John',
    'John ',
    '-John',
    'John-',
    'John--Smith',
    "John''Smith",
    'John  Smith',
    "John-'Smith",
    '-',
    '',
    'a'.repeat(51),
  ])('rejects %j', (name) => expect(isMeaningfulName(name)).toBe(false));
});

describe('sanitizeNameInput', () => {
  it('keeps letters, spaces, hyphens and both apostrophes; drops the rest; never changes case', () => {
    expect(sanitizeNameInput("mIRa O'Neil")).toBe("mIRa O'Neil");
    expect(sanitizeNameInput('O’Connor')).toBe('O’Connor');
    expect(sanitizeNameInput('John123!@#')).toBe('John');
    expect(sanitizeNameInput('Мирослава-2')).toBe('Мирослава-');
    expect(sanitizeNameInput('Anne-Marie')).toBe('Anne-Marie');
    expect(sanitizeNameInput('John_Doe.')).toBe('JohnDoe');
    expect(sanitizeNameInput('José')).toBe('José');
    expect(sanitizeNameInput('a'.repeat(70))).toHaveLength(50);
  });
});

describe('normalizePhone', () => {
  it.each([
    ['2795550100', '2795550100'],
    ['279-555-0100', '2795550100'],
    ['(279) 555-0100', '2795550100'],
    ['279 555 0100', '2795550100'],
  ])('%s → %s', (input, digits) => expect(normalizePhone(input)).toBe(digits));

  it.each([
    '+1 279 555 0100',
    '12795550100',
    '279555010',
    '27955501000',
    'abcdefghij',
    '279.555.0100',
    '',
  ])('rejects %j (no country code, no other symbols)', (input) => {
    expect(normalizePhone(input)).toBeNull();
    expect(isValidPhone(input)).toBe(false);
  });

  it('formats ten digits', () => {
    expect(formatPhone('2795550100')).toBe('(279) 555-0100');
  });
});

describe('isValidEmail', () => {
  it('enforces the 120-character maximum without weakening the syntax checks', () => {
    expect(isValidEmail(`${'a'.repeat(108)}@example.com`)).toBe(true);
    expect(isValidEmail(`${'a'.repeat(109)}@example.com`)).toBe(false);
    expect(isValidEmail('jane@example.com')).toBe(true);
    expect(isValidEmail('a b@example.com')).toBe(false);
    expect(isValidEmail('plain')).toBe(false);
  });
});

describe('signers helpers', () => {
  it('sanitizes to digits with a cap', () => {
    expect(sanitizeDigits('1a2.', 3)).toBe('12');
    expect(sanitizeDigits('-5e+3', 3)).toBe('53');
    expect(sanitizeDigits('99999', 3)).toBe('999');
  });

  it.each([
    ['1', 1],
    ['50', 50],
    ['050', 50],
    ['007', 7],
    ['12', 12],
  ])('parses %s as %i', (text, value) => expect(parseSigners(text)).toBe(value));

  it.each(['', '0', '000', '51', '999', '1.5', '-1', '1e1', '+2', ' 2', 'abc', '1234'])(
    'rejects %j',
    (text) => expect(parseSigners(text)).toBeNull(),
  );
});
