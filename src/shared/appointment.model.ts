import { TimePreference } from './appointment-timing';

/**
 * Appointment request contract shared by the Angular form and the Cloudflare Worker API.
 * Pure TypeScript only (no Angular, no Workers types) so both bundles can import it.
 */

export const APPOINTMENT_SERVICES = [
  'General Notary',
  'Loan Signing',
  'California Apostille',
  'Document Translation',
  'Living Trust / Estate Documents',
  'Power of Attorney',
  'Other',
] as const;

export type AppointmentService = (typeof APPOINTMENT_SERVICES)[number];

export const DEFAULT_APPOINTMENT_SERVICE: AppointmentService = 'General Notary';

/**
 * Stable, human-readable `?service=` values for `/contact`. Strict whitelist: any other value
 * (unknown, malformed, hostile) resolves to {@link DEFAULT_APPOINTMENT_SERVICE}.
 */
export const APPOINTMENT_SERVICE_SLUGS = {
  'general-notary': 'General Notary',
  'loan-signing': 'Loan Signing',
  'california-apostille': 'California Apostille',
  'document-translation': 'Document Translation',
  'living-trust-estate': 'Living Trust / Estate Documents',
  'power-of-attorney': 'Power of Attorney',
} as const satisfies Record<string, AppointmentService>;

export type AppointmentServiceSlug = keyof typeof APPOINTMENT_SERVICE_SLUGS;

export function serviceFromSlug(slug: string | null | undefined): AppointmentService {
  if (typeof slug === 'string' && Object.hasOwn(APPOINTMENT_SERVICE_SLUGS, slug)) {
    return APPOINTMENT_SERVICE_SLUGS[slug as AppointmentServiceSlug];
  }
  return DEFAULT_APPOINTMENT_SERVICE;
}

export const APPOINTMENT_LANGUAGES = ['English', 'Ukrainian', 'Russian'] as const;

export type AppointmentLanguage = (typeof APPOINTMENT_LANGUAGES)[number];

export const APPOINTMENT_LIMITS = {
  firstName: 80,
  lastName: 80,
  phone: 40,
  email: 254,
  zip: 5,
  additionalDetails: 3000,
  turnstileToken: 2048,
  maxSigners: 50,
} as const;

/** Body of `POST /api/appointments`. */
export interface AppointmentRequestPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: AppointmentService;
  /** 5-digit ZIP inside the confirmed service area. */
  locationZip: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  preferredDate: string;
  /** Structured choice; replaces the former free-text time. */
  timePreference: TimePreference;
  /** `HH:mm`; required when `timePreference` is `specific`, otherwise `null`. */
  specificTime: string | null;
  numberOfSigners?: number;
  preferredLanguage?: AppointmentLanguage;
  additionalDetails?: string;
  /**
   * Same-day / urgent request. Submitting it does not confirm anything: Mira confirms by phone.
   * The Worker also forces it to `true` for a same-day or Sunday date, whatever the client sent.
   */
  urgent: boolean;
  /** Must be exactly boolean `true` (permission to contact the visitor about this request). */
  contactConsent: true;
  turnstileToken: string;
}

/** Machine-readable failure reasons returned by the API (never internal details). */
export type AppointmentErrorCode =
  'validation' | 'verification' | 'rate_limited' | 'delivery' | 'unavailable';

export interface AppointmentSuccessResponse {
  success: true;
  /** Same-day, urgent or Sunday: the visitor must still phone Mira to confirm availability. */
  phoneConfirmationRequired?: boolean;
}

export interface AppointmentErrorResponse {
  success: false;
  error: AppointmentErrorCode;
  message: string;
}

export type AppointmentApiResponse = AppointmentSuccessResponse | AppointmentErrorResponse;

export const APPOINTMENT_ENDPOINT = '/api/appointments';

/**
 * `POST /api/appointments` is `multipart/form-data`: one text part with the JSON payload (typed
 * values, so booleans and numbers stay unambiguous) plus zero to five repeated photo files.
 */
export const APPOINTMENT_PAYLOAD_FIELD = 'payload';
export const APPOINTMENT_PHOTOS_FIELD = 'photos';

/** Largest accepted JSON `payload` part (the text fields are tiny; photos are separate parts). */
export const APPOINTMENT_PAYLOAD_MAX_BYTES = 32 * 1024;
