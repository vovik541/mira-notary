import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { normalizeZipCode } from '../../../shared/service-area';
import {
  MAX_FUTURE_DAYS,
  isMeaningfulName,
  isPlausibleDate,
  isValidEmail,
  isValidPhone,
  parseSigners,
} from '../../../shared/validation';

/**
 * Angular wrappers around the SAME rules the Worker enforces (`src/shared/*`). Each validator
 * ignores empty values so that `requiredTrimmed` is the only source of the "required" error.
 */

const isEmpty = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

/** Like `Validators.required`, but whitespace-only counts as empty. */
export const requiredTrimmed: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) ? { required: true } : null;

export const nameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || isMeaningfulName(String(control.value)) ? null : { name: true };

export const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || isValidPhone(String(control.value)) ? null : { phone: true };

export const emailValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || isValidEmail(String(control.value)) ? null : { email: true };

/** Format only: a ZIP is exactly five digits (`zipFormat` otherwise). Empty is left to `required`. */
export const zipFormatValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null =>
  isEmpty(control.value) || normalizeZipCode(String(control.value)) !== null
    ? null
    : { zipFormat: true };

const localToday = (now: Date): string =>
  [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

/**
 * Preferred date: a real calendar date, not before today (local time), within the same
 * two-year window the Worker accepts. Evaluated at validation time, never at build time.
 */
export const preferredDateValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  if (isEmpty(control.value)) {
    return null;
  }
  const value = String(control.value);
  const now = new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { dateFormat: true };
  }
  if (value < localToday(now)) {
    return { pastDate: true };
  }
  const limit = new Date(now.getTime() + MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000);
  if (value > localToday(limit)) {
    return { tooFar: true };
  }
  return isPlausibleDate(value, now) ? null : { dateFormat: true };
};

/** Number of Signers (text field): empty is fine, otherwise 1–50 as plain digits. */
export const signersValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  isEmpty(control.value) || parseSigners(String(control.value)) !== null ? null : { signers: true };

/** Optional whole-number field (empty is fine). */
export const wholeNumberValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  if (control.value === null || control.value === undefined || control.value === '') {
    return null;
  }
  return Number.isInteger(Number(control.value)) ? null : { wholeNumber: true };
};
