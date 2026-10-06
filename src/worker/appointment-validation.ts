import {
  APPOINTMENT_LANGUAGES,
  APPOINTMENT_LIMITS,
  APPOINTMENT_SERVICES,
  AppointmentLanguage,
  AppointmentRequestPayload,
  AppointmentService,
} from '../shared/appointment.model';

export type ValidationResult =
  { ok: true; value: AppointmentRequestPayload } | { ok: false; invalidFields: string[] };

// Any ASCII control character (CR/LF/NUL/…): rejected in single-line fields to prevent header injection.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
// Control characters other than TAB / LF / CR, rejected even in multi-line text.
// eslint-disable-next-line no-control-regex
const BAD_TEXT_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE_CHARS = /^[+()\-.\s\d]+$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function validateAppointmentRequest(
  input: unknown,
  now: Date = new Date(),
): ValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, invalidFields: ['body'] };
  }
  const body = input as Record<string, unknown>;
  const invalid: string[] = [];

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

  const fullName = line('fullName', APPOINTMENT_LIMITS.fullName, true);

  const phone = line('phone', APPOINTMENT_LIMITS.phone, true);
  if (phone !== undefined) {
    const digits = phone.replace(/\D/g, '').length;
    if (!PHONE_CHARS.test(phone) || digits < 10 || digits > 15) {
      invalid.push('phone');
    }
  }

  const email = line('email', APPOINTMENT_LIMITS.email, false);
  if (email !== undefined && !EMAIL_PATTERN.test(email)) {
    invalid.push('email');
  }

  const service = line('service', 100, true);
  if (service !== undefined && !(APPOINTMENT_SERVICES as readonly string[]).includes(service)) {
    invalid.push('service');
  }

  const locationZip = line('locationZip', APPOINTMENT_LIMITS.locationZip, true);

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
  const numberOfDocuments = optionalCount(
    body,
    'numberOfDocuments',
    APPOINTMENT_LIMITS.maxDocuments,
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

  const urgentRaw = body['urgent'];
  if (urgentRaw !== undefined && typeof urgentRaw !== 'boolean') {
    invalid.push('urgent');
  }

  const turnstileToken = line('turnstileToken', APPOINTMENT_LIMITS.turnstileToken, true);

  if (invalid.length > 0) {
    return { ok: false, invalidFields: [...new Set(invalid)] };
  }

  return {
    ok: true,
    value: {
      fullName: fullName as string,
      phone: phone as string,
      ...(email ? { email } : {}),
      service: service as AppointmentService,
      locationZip: locationZip as string,
      preferredDate: preferredDate as string,
      preferredTime: preferredTime as string,
      ...(numberOfSigners !== undefined ? { numberOfSigners } : {}),
      ...(numberOfDocuments !== undefined ? { numberOfDocuments } : {}),
      ...(preferredLanguage ? { preferredLanguage: preferredLanguage as AppointmentLanguage } : {}),
      ...(additionalDetails ? { additionalDetails } : {}),
      urgent: urgentRaw === true,
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

/** Real calendar date, from yesterday (time-zone slack) to two years ahead. */
function isPlausibleDate(value: string, now: Date): boolean {
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
  return date.getTime() >= todayUtc - DAY_MS && date.getTime() <= todayUtc + 730 * DAY_MS;
}
