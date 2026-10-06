import { validateAppointmentRequest } from './appointment-validation';

const NOW = new Date('2026-10-05T12:00:00Z');

const valid = {
  fullName: 'Jane Doe',
  phone: '(916) 555-0100',
  service: 'Loan Signing',
  locationZip: '95814',
  preferredDate: '2026-10-20',
  preferredTime: 'Morning',
  turnstileToken: 'token',
};

const run = (overrides: Record<string, unknown> = {}) =>
  validateAppointmentRequest({ ...valid, ...overrides }, NOW);

const invalidFields = (overrides: Record<string, unknown>): string[] => {
  const result = run(overrides);
  return result.ok ? [] : result.invalidFields;
};

describe('validateAppointmentRequest', () => {
  it('accepts a minimal valid request and normalizes optional fields', () => {
    const result = run();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.urgent).toBe(false);
      expect(result.value.email).toBeUndefined();
      expect(result.value.additionalDetails).toBeUndefined();
    }
  });

  it('accepts a fully populated request', () => {
    const result = run({
      email: 'jane@example.com',
      numberOfSigners: 2,
      numberOfDocuments: 10,
      preferredLanguage: 'Ukrainian',
      additionalDetails: 'Line one\nLine two',
      urgent: true,
    });
    expect(result.ok).toBe(true);
  });

  it.each([
    'fullName',
    'phone',
    'service',
    'locationZip',
    'preferredDate',
    'preferredTime',
    'turnstileToken',
  ])('rejects a missing required field: %s', (field) => {
    const body: Record<string, unknown> = { ...valid };
    delete body[field];
    const result = validateAppointmentRequest(body, NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.invalidFields).toContain(field);
  });

  it('rejects whitespace-only required fields', () => {
    expect(invalidFields({ fullName: '   ' })).toContain('fullName');
  });

  it('rejects a service that is not in the allowed list', () => {
    expect(invalidFields({ service: 'Mortgage Advice' })).toContain('service');
  });

  it('rejects a language that is not in the allowed list', () => {
    expect(invalidFields({ preferredLanguage: 'French' })).toContain('preferredLanguage');
  });

  it.each(['not-an-email', 'a@b', 'two@@example.com', 'spaces in@example.com', 'a@b.c'])(
    'rejects an invalid email: %s',
    (email) => {
      expect(invalidFields({ email })).toContain('email');
    },
  );

  it('rejects header-injection attempts in single-line fields', () => {
    expect(invalidFields({ fullName: 'Jane\r\nBcc: attacker@example.com' })).toContain('fullName');
    expect(invalidFields({ email: 'jane@example.com\nBcc: x@y.com' })).toContain('email');
    expect(invalidFields({ preferredTime: 'Morning\nX-Header: 1' })).toContain('preferredTime');
  });

  it('rejects over-long values', () => {
    expect(invalidFields({ fullName: 'a'.repeat(101) })).toContain('fullName');
    expect(invalidFields({ phone: '1'.repeat(41) })).toContain('phone');
    expect(invalidFields({ locationZip: 'a'.repeat(151) })).toContain('locationZip');
    expect(invalidFields({ additionalDetails: 'a'.repeat(3001) })).toContain('additionalDetails');
    expect(invalidFields({ email: `${'a'.repeat(250)}@x.com` })).toContain('email');
  });

  it('accepts values at the limits', () => {
    expect(run({ fullName: 'a'.repeat(100), additionalDetails: 'a'.repeat(3000) }).ok).toBe(true);
  });

  it('validates phone digits', () => {
    expect(invalidFields({ phone: '123' })).toContain('phone');
    expect(invalidFields({ phone: 'call me maybe' })).toContain('phone');
    expect(run({ phone: '+1 916-555-0100' }).ok).toBe(true);
  });

  it('validates dates', () => {
    expect(invalidFields({ preferredDate: '10/20/2026' })).toContain('preferredDate');
    expect(invalidFields({ preferredDate: '2026-02-31' })).toContain('preferredDate');
    expect(invalidFields({ preferredDate: '2020-01-01' })).toContain('preferredDate');
    expect(invalidFields({ preferredDate: '2031-01-01' })).toContain('preferredDate');
    expect(run({ preferredDate: '2026-10-05' }).ok).toBe(true);
  });

  it('validates counts', () => {
    expect(invalidFields({ numberOfSigners: 0 })).toContain('numberOfSigners');
    expect(invalidFields({ numberOfSigners: 1.5 })).toContain('numberOfSigners');
    expect(invalidFields({ numberOfSigners: '2' })).toContain('numberOfSigners');
    expect(invalidFields({ numberOfDocuments: 501 })).toContain('numberOfDocuments');
  });

  it('rejects non-boolean urgent and non-object bodies', () => {
    expect(invalidFields({ urgent: 'yes' })).toContain('urgent');
    expect(validateAppointmentRequest(null, NOW).ok).toBe(false);
    expect(validateAppointmentRequest([valid], NOW).ok).toBe(false);
    expect(validateAppointmentRequest('string', NOW).ok).toBe(false);
  });

  it('does not pass through unknown properties', () => {
    const result = run({ to: 'attacker@example.com', from: 'x@y.com', subject: 'hacked' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty('to');
      expect(result.value).not.toHaveProperty('from');
      expect(result.value).not.toHaveProperty('subject');
    }
  });
});
