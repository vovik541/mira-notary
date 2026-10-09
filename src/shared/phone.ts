/**
 * Pure helpers for the live-formatted U.S. phone field (no DOM, no Angular), adapted from the
 * personal-page project's phone input (strip to digits, cap, reformat, restore the caret from the
 * number of digits before it). Mira's form differs on purpose: no country code, and an over-long
 * entry is never truncated into a different number — it is refused.
 */
import { PHONE_DIGIT_COUNT } from './validation';

/** Digits only, uncapped (callers decide what to do with more than ten). */
export const extractPhoneDigits = (raw: string): string => raw.replace(/\D/g, '');

export const countDigits = (raw: string): number => extractPhoneDigits(raw).length;

/**
 * Progressive display of up to ten digits:
 * 2 → (2 · 279 → (279) · 2795 → (279) 5 · 2795550 → (279) 555-0 · 2795550100 → (279) 555-0100.
 * (Three digits already show the closing parenthesis.)
 */
export function formatPhoneDisplay(digits: string): string {
  const d = digits.slice(0, PHONE_DIGIT_COUNT);
  if (d.length === 0) {
    return '';
  }
  if (d.length < 3) {
    return `(${d}`;
  }
  if (d.length === 3) {
    return `(${d})`;
  }
  if (d.length <= 6) {
    return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  }
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Where the caret belongs in the formatted text when the given number of digits precede it: just
 * before the next digit (so "(279) |555" stays after the space rather than jumping back before the
 * parenthesis), or at the very end when it is past the last digit (appending).
 */
export function caretPositionAfterFormat(formatted: string, digitsBeforeCaret: number): number {
  if (digitsBeforeCaret <= 0) {
    return 0;
  }
  const total = countDigits(formatted);
  if (digitsBeforeCaret >= total) {
    return formatted.length;
  }
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      if (seen === digitsBeforeCaret) {
        return i;
      }
      seen++;
    }
  }
  return formatted.length;
}
