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
  preferredTime: 100,
  additionalDetails: 3000,
  turnstileToken: 2048,
  maxSigners: 50,
  maxDocuments: 500,
} as const;

/** Body of `POST /api/appointments`. */
export interface AppointmentRequestPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: AppointmentService;
  /** Normalized 5-digit Sacramento County ZIP code. */
  locationZip: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  preferredDate: string;
  preferredTime: string;
  numberOfSigners?: number;
  numberOfDocuments?: number;
  preferredLanguage?: AppointmentLanguage;
  additionalDetails?: string;
  urgent: boolean;
  turnstileToken: string;
}

/** Machine-readable failure reasons returned by the API (never internal details). */
export type AppointmentErrorCode =
  'validation' | 'verification' | 'rate_limited' | 'delivery' | 'unavailable';

export interface AppointmentSuccessResponse {
  success: true;
}

export interface AppointmentErrorResponse {
  success: false;
  error: AppointmentErrorCode;
  message: string;
}

export type AppointmentApiResponse = AppointmentSuccessResponse | AppointmentErrorResponse;

export const APPOINTMENT_ENDPOINT = '/api/appointments';
