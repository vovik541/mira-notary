import {
  APPOINTMENT_LANGUAGES,
  APPOINTMENT_LIMITS,
  APPOINTMENT_SERVICES,
  AppointmentLanguage,
  AppointmentRequestPayload,
  AppointmentService,
} from '../shared/appointment.model';
import {
  TimePreference,
  classifyDate,
  isTimePreference,
  isWithinStandardHours,
  DateTiming,
} from '../shared/appointment-timing';
import { checkZip } from '../shared/service-area';
import {
  BAD_TEXT_CHARS,
  CONTROL_CHARS,
  formatPhone,
  isMeaningfulName,
  normalizePhone,
  isPlausibleDate,
  isValidEmail,
} from '../shared/validation';

export type ValidationResult =
  | {
      ok: true;
      value: AppointmentRequestPayload;
      /** Same-day / Sunday status, derived from the date (never from the request body). */
      timing: DateTiming;
    }
  | { ok: false; invalidFields: string[] };

export function validateAppointmentRequest(
  input: unknown,
  now: Date = new Date(),
): ValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, invalidFields: ['body'] };
  }
  const body = input as Record<string, unknown>;
  const invalid: string[] = [];

  /** Trimmed single-line string, or undefined (recording the field as invalid when required/bad). */
  const line = (key: string, max: number, required: boolean): string | undefined => {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === '') {
      if (required) {
        invalid.push(key);
      }
      return undefined;
    }
    if (typeof raw !== 'string') {
      invalid.push(key);
      return undefined;
    }
    const value = raw.trim();
    if (value === '') {
      if (required) {
        invalid.push(key);
      }
      return undefined;
    }
    if (value.length > max || CONTROL_CHARS.test(value)) {
      invalid.push(key);
      return undefined;
    }
    return value;
  };

  // Names are checked exactly as sent: surrounding whitespace is invalid, never silently trimmed.
  const name = (key: 'firstName' | 'lastName'): string | undefined => {
    const raw = body[key];
    if (typeof raw !== 'string' || !isMeaningfulName(raw)) {
      invalid.push(key);
      return undefined;
    }
    return raw;
  };
  const firstName = name('firstName');
  const lastName = name('lastName');

  // Phone: ten digits, formatting limited to spaces ( ) -; stored in one canonical format.
  const phoneRaw = line('phone', APPOINTMENT_LIMITS.phone, true);
  const phoneDigits = phoneRaw === undefined ? null : normalizePhone(phoneRaw);
  if (phoneRaw !== undefined && phoneDigits === null) {
    invalid.push('phone');
  }
  const phone = phoneDigits === null ? undefined : formatPhone(phoneDigits);

  const email = line('email', APPOINTMENT_LIMITS.email, true);
  if (email !== undefined && !isValidEmail(email)) {
    invalid.push('email');
  }

  const service = line('service', 100, true);
  if (service !== undefined && !(APPOINTMENT_SERVICES as readonly string[]).includes(service)) {
    invalid.push('service');
  }

  // ZIP: exactly five digits (taken as-is: no trimming, no ZIP+4 normalization). A well-formed ZIP
  // outside the confirmed service area is NOT an error: the request is accepted and the email
  // tells Mira to confirm availability and the travel fee.
  let locationZip: string | undefined;
  const check = checkZip(typeof body['locationZip'] === 'string' ? body['locationZip'] : null);
  if (check.status === 'invalid') {
    invalid.push('locationZip');
  } else {
    locationZip = check.zip;
  }

  const preferredDate = line('preferredDate', 10, true);
  if (preferredDate !== undefined && !isPlausibleDate(preferredDate, now)) {
    invalid.push('preferredDate');
  }

  // Structured time only: a known preference, plus an HH:mm value exactly when "specific".
  const rawPreference = body['timePreference'];
  let timePreference: TimePreference | undefined;
  if (isTimePreference(rawPreference)) {
    timePreference = rawPreference;
  } else {
    invalid.push('timePreference');
  }
  const rawSpecific = body['specificTime'];
  let specificTime: string | null = null;
  if (timePreference === 'specific') {
    if (isWithinStandardHours(rawSpecific)) {
      specificTime = rawSpecific;
    } else {
      invalid.push('specificTime');
    }
  } else if (rawSpecific !== undefined && rawSpecific !== null) {
    // Only "specific" may carry a time: injected values are rejected, never silently kept.
    invalid.push('specificTime');
  }

  const numberOfSigners = optionalCount(
    body,
    'numberOfSigners',
    APPOINTMENT_LIMITS.maxSigners,
    invalid,
  );

  const preferredLanguage = line('preferredLanguage', 50, false);
  if (
    preferredLanguage !== undefined &&
    !(APPOINTMENT_LANGUAGES as readonly string[]).includes(preferredLanguage)
  ) {
    invalid.push('preferredLanguage');
  }

  let additionalDetails: string | undefined;
  const rawDetails = body['additionalDetails'];
  if (rawDetails !== undefined && rawDetails !== null && rawDetails !== '') {
    if (
      typeof rawDetails !== 'string' ||
      rawDetails.length > APPOINTMENT_LIMITS.additionalDetails ||
      BAD_TEXT_CHARS.test(rawDetails)
    ) {
      invalid.push('additionalDetails');
    } else {
      additionalDetails = rawDetails.trim() || undefined;
    }
  }

  // Consent must be the boolean `true`: no `"true"`, `1`, `"on"`, missing or false.
  if (body['contactConsent'] !== true) {
    invalid.push('contactConsent');
  }

  const turnstileToken = line('turnstileToken', APPOINTMENT_LIMITS.turnstileToken, true);

  if (invalid.length > 0) {
    return { ok: false, invalidFields: [...new Set(invalid)] };
  }

  return {
    ok: true,
    timing: classifyDate(preferredDate as string, now),
    value: {
      firstName: firstName as string,
      lastName: lastName as string,
      phone: phone as string,
      email: email as string,
      service: service as AppointmentService,
      locationZip: locationZip as string,
      preferredDate: preferredDate as string,
      timePreference: timePreference as TimePreference,
      specificTime,
      ...(numberOfSigners !== undefined ? { numberOfSigners } : {}),
      ...(preferredLanguage ? { preferredLanguage: preferredLanguage as AppointmentLanguage } : {}),
      ...(additionalDetails ? { additionalDetails } : {}),
      contactConsent: true,
      turnstileToken: turnstileToken as string,
    },
  };
}

function optionalCount(
  body: Record<string, unknown>,
  key: string,
  max: number,
  invalid: string[],
): number | undefined {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > max) {
    invalid.push(key);
    return undefined;
  }
  return raw;
}
