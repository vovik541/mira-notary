import {
  APPOINTMENT_LANGUAGES,
  APPOINTMENT_LIMITS,
  APPOINTMENT_SERVICES,
  AppointmentLanguage,
  AppointmentRequestPayload,
  AppointmentService,
} from '../shared/appointment.model';
import { checkZip } from '../shared/service-area';
import {
  BAD_TEXT_CHARS,
  CONTROL_CHARS,
  isMeaningfulName,
  isPlausibleDate,
  isValidEmail,
  isValidPhone,
} from '../shared/validation';

export type ValidationResult =
  { ok: true; value: AppointmentRequestPayload } | { ok: false; invalidFields: string[] };

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

  const firstName = line('firstName', APPOINTMENT_LIMITS.firstName, true);
  if (firstName !== undefined && !isMeaningfulName(firstName)) {
    invalid.push('firstName');
  }

  const lastName = line('lastName', APPOINTMENT_LIMITS.lastName, true);
  if (lastName !== undefined && !isMeaningfulName(lastName)) {
    invalid.push('lastName');
  }

  const phone = line('phone', APPOINTMENT_LIMITS.phone, true);
  if (phone !== undefined && !isValidPhone(phone)) {
    invalid.push('phone');
  }

  const email = line('email', APPOINTMENT_LIMITS.email, true);
  if (email !== undefined && !isValidEmail(email)) {
    invalid.push('email');
  }

  const service = line('service', 100, true);
  if (service !== undefined && !(APPOINTMENT_SERVICES as readonly string[]).includes(service)) {
    invalid.push('service');
  }

  // ZIP: exactly five digits (taken as-is: no trimming, no ZIP+4 normalization), THEN membership
  // in the shared confirmed service-area set.
  let locationZip: string | undefined;
  const check = checkZip(typeof body['locationZip'] === 'string' ? body['locationZip'] : null);
  if (check.status === 'supported') {
    locationZip = check.zip;
  } else {
    invalid.push('locationZip');
  }

  const preferredDate = line('preferredDate', 10, true);
  if (preferredDate !== undefined && !isPlausibleDate(preferredDate, now)) {
    invalid.push('preferredDate');
  }

  const preferredTime = line('preferredTime', APPOINTMENT_LIMITS.preferredTime, true);

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

  // Same-day / urgent requests are phone-only: only an explicit boolean `false` (or absence) is
  // accepted here. (The handler also short-circuits on `true` before any other work.)
  const urgentRaw = body['urgent'];
  if (urgentRaw !== undefined && urgentRaw !== false) {
    invalid.push('urgent');
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
    value: {
      firstName: firstName as string,
      lastName: lastName as string,
      phone: phone as string,
      email: email as string,
      service: service as AppointmentService,
      locationZip: locationZip as string,
      preferredDate: preferredDate as string,
      preferredTime: preferredTime as string,
      ...(numberOfSigners !== undefined ? { numberOfSigners } : {}),
      ...(preferredLanguage ? { preferredLanguage: preferredLanguage as AppointmentLanguage } : {}),
      ...(additionalDetails ? { additionalDetails } : {}),
      urgent: false,
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

/** `true` when the (untrusted) body asks for a same-day / urgent appointment. */
export function isUrgentRequest(input: unknown): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    !Array.isArray(input) &&
    (input as Record<string, unknown>)['urgent'] === true
  );
}
