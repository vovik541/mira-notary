/**
 * Field validation rules shared by the Angular form and the Cloudflare Worker, so browser and
 * server stay semantically aligned. The Worker remains authoritative.
 */

/** Limits shared by the Angular form and the Worker (so they cannot drift). */
export const NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 120;
/** A U.S. number without country code: exactly ten digits once formatting is removed. */
export const PHONE_DIGIT_COUNT = 10;
/** Raw characters: the longest accepted formatting is `(279) 555-0100`. */
export const PHONE_INPUT_MAX_LENGTH = 14;
export const MIN_SIGNERS = 1;
export const MAX_SIGNERS = 50;
export const SIGNERS_INPUT_MAX_LENGTH = 3;

// Any ASCII control character (CR/LF/NUL/…): never allowed in single-line fields (header injection).
// eslint-disable-next-line no-control-regex
export const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
// Control characters other than TAB / LF / CR: rejected even in multi-line text.
// eslint-disable-next-line no-control-regex
export const BAD_TEXT_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE_CHARS = /^[\d ()-]+$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_FUTURE_DAYS = 730;

/**
 * Name part: Unicode letters (any script, combining marks allowed) with single spaces or
 * apostrophes (' or ’) or hyphens BETWEEN letter groups (never two separators in a row). No digits,
 * included), no leading/trailing space or apostrophe, at most NAME_MAX_LENGTH characters. Not
 * trimmed here: surrounding whitespace is invalid.
 */
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ '’-][\p{L}\p{M}]+)*$/u;

export function isMeaningfulName(value: string): boolean {
  return value.length > 0 && value.length <= NAME_MAX_LENGTH && NAME_PATTERN.test(value);
}

/**
 * Physical name-input filter: keeps Unicode letters/marks, spaces, hyphens and straight/curly apostrophes;
 * drops everything else (digits, symbols); caps the length. Never changes case or script.
 */
export function sanitizeNameInput(value: string): string {
  return value.replace(/[^\p{L}\p{M} '’-]/gu, '').slice(0, NAME_MAX_LENGTH);
}

/**
 * Ten digits after removing spaces, parentheses and hyphens — and nothing else: no `+`, no country
 * code (`+1 …`, `1 …` is 11 digits), no letters. Returns the digits, or `null` when invalid.
 */
export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > PHONE_INPUT_MAX_LENGTH ||
    !PHONE_CHARS.test(trimmed)
  ) {
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  return digits.length === PHONE_DIGIT_COUNT ? digits : null;
}

export const isValidPhone = (value: string): boolean => normalizePhone(value) !== null;

/** `2795550100` → `(279) 555-0100`. */
export function formatPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(trimmed);
}

/** Keeps digits only, at most `max` of them (typing / pasting into a numeric text field). */
export function sanitizeDigits(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

/**
 * Number of signers from the text field: 1–50 as plain digits (leading zeros are fine and are
 * normalized: `007` → 7). `null` when not a valid number.
 */
export function parseSigners(value: string): number | null {
  if (!/^\d{1,3}$/.test(value)) {
    return null;
  }
  const count = Number(value);
  return count >= MIN_SIGNERS && count <= MAX_SIGNERS ? count : null;
}

/**
 * Real calendar date `YYYY-MM-DD`, from yesterday (time-zone slack) to two years ahead (UTC).
 */
export function isPlausibleDate(value: string, now: Date = new Date()): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return (
    date.getTime() >= todayUtc - DAY_MS && date.getTime() <= todayUtc + MAX_FUTURE_DAYS * DAY_MS
  );
}
