/**
 * Field validation rules shared by the Angular form and the Cloudflare Worker, so browser and
 * server stay semantically aligned. The Worker remains authoritative.
 */

export const NAME_MAX_LENGTH = 80;
export const PHONE_MAX_LENGTH = 40;
export const EMAIL_MAX_LENGTH = 254;

// Any ASCII control character (CR/LF/NUL/…): never allowed in single-line fields (header injection).
// eslint-disable-next-line no-control-regex
export const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
// Control characters other than TAB / LF / CR: rejected even in multi-line text.
// eslint-disable-next-line no-control-regex
export const BAD_TEXT_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE_CHARS = /^[+()\-.\s\d]+$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_FUTURE_DAYS = 730;

/**
 * A person's name part: non-empty after trimming and containing at least one letter (any
 * script). Spaces, hyphens, apostrophes and Unicode letters (O'Connor, Anne-Marie, José,
 * Мирослава) are all fine.
 */
export function isMeaningfulName(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= NAME_MAX_LENGTH &&
    !CONTROL_CHARS.test(trimmed) &&
    /\p{L}/u.test(trimmed)
  );
}

/** Human-formatted phone: 10–15 digits, only digits and `+ ( ) - . space` allowed. */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > PHONE_MAX_LENGTH || !PHONE_CHARS.test(trimmed)) {
    return false;
  }
  const digits = trimmed.replace(/\D/g, '').length;
  return digits >= 10 && digits <= 15;
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(trimmed);
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
