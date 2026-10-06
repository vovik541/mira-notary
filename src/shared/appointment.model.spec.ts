import {
  APPOINTMENT_SERVICES,
  APPOINTMENT_SERVICE_SLUGS,
  DEFAULT_APPOINTMENT_SERVICE,
  serviceFromSlug,
} from './appointment.model';

describe('serviceFromSlug', () => {
  it.each([
    ['general-notary', 'General Notary'],
    ['loan-signing', 'Loan Signing'],
    ['california-apostille', 'California Apostille'],
    ['document-translation', 'Document Translation'],
    ['living-trust-estate', 'Living Trust / Estate Documents'],
    ['power-of-attorney', 'Power of Attorney'],
  ])('maps %s → %s', (slug, service) => {
    expect(serviceFromSlug(slug)).toBe(service);
  });

  it.each([
    'invalid',
    'DROP-TABLE',
    "'; DROP TABLE users;--",
    '',
    'LOAN-SIGNING',
    'loan-signing ',
    '__proto__',
    'constructor',
    'toString',
    'hasOwnProperty',
    'other',
  ])('falls back to General Notary for %j', (slug) => {
    expect(serviceFromSlug(slug)).toBe('General Notary');
  });

  it('falls back for null / undefined', () => {
    expect(serviceFromSlug(null)).toBe(DEFAULT_APPOINTMENT_SERVICE);
    expect(serviceFromSlug(undefined)).toBe(DEFAULT_APPOINTMENT_SERVICE);
  });

  it('only ever yields an allowed service value', () => {
    for (const slug of Object.keys(APPOINTMENT_SERVICE_SLUGS)) {
      expect(APPOINTMENT_SERVICES as readonly string[]).toContain(serviceFromSlug(slug));
    }
  });
});
