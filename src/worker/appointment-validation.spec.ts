import { validateAppointmentRequest } from './appointment-validation';

const NOW = new Date('2026-10-05T12:00:00Z');

const valid = {
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '(916) 555-0100',
  email: 'jane@example.com',
  service: 'Loan Signing',
  locationZip: '95814',
  preferredDate: '2026-10-20',
  timePreference: 'morning',
  specificTime: null,
  contactConsent: true,
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
      expect(result.value.contactConsent).toBe(true);
      expect(result.value.additionalDetails).toBeUndefined();
      expect(result.value.locationZip).toBe('95814');
    }
  });

  it('accepts a fully populated request', () => {
    const result = run({
      numberOfSigners: 2,
      preferredLanguage: 'Ukrainian',
      additionalDetails: 'Line one\nLine two',
    });
    expect(result.ok).toBe(true);
  });

  it.each([
    'firstName',
    'lastName',
    'phone',
    'email',
    'service',
    'locationZip',
    'preferredDate',
    'timePreference',
    'turnstileToken',
  ])('rejects a missing required field: %s', (field) => {
    const body: Record<string, unknown> = { ...valid };
    delete body[field];
    const result = validateAppointmentRequest(body, NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.invalidFields).toContain(field);
  });

  it('rejects the old single fullName shape (no firstName / lastName)', () => {
    const { firstName: _f, lastName: _l, ...rest } = valid;
    const result = validateAppointmentRequest({ ...rest, fullName: 'Jane Doe' }, NOW);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.invalidFields).toEqual(
      expect.arrayContaining(['firstName', 'lastName']),
    );
  });

  it('rejects whitespace-only required fields', () => {
    expect(invalidFields({ firstName: '   ' })).toContain('firstName');
    expect(invalidFields({ lastName: '\t ' })).toContain('lastName');
    expect(invalidFields({ email: '  ' })).toContain('email');
  });

  describe('names', () => {
    it.each(["O'Connor", 'Anne-Marie', 'Мирослава', 'José', 'Van der Berg', '李'])(
      'accepts %s',
      (name) => {
        expect(run({ firstName: name, lastName: name }).ok).toBe(true);
      },
    );

    it.each(['---', "'", '1234', '!!!'])('rejects a name without any letter: %s', (name) => {
      expect(invalidFields({ firstName: name })).toContain('firstName');
      expect(invalidFields({ lastName: name })).toContain('lastName');
    });

    it('limits each name to 80 characters', () => {
      expect(run({ firstName: 'a'.repeat(80) }).ok).toBe(true);
      expect(invalidFields({ firstName: 'a'.repeat(81) })).toContain('firstName');
      expect(invalidFields({ lastName: 'a'.repeat(81) })).toContain('lastName');
    });

    it('trims names before storing them', () => {
      const result = run({ firstName: '  Jane ', lastName: ' Doe  ' });
      expect(result.ok && [result.value.firstName, result.value.lastName]).toEqual(['Jane', 'Doe']);
    });
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
    expect(invalidFields({ firstName: 'Jane\r\nBcc: attacker@example.com' })).toContain(
      'firstName',
    );
    expect(invalidFields({ lastName: 'Doe\nX: 1' })).toContain('lastName');
    expect(invalidFields({ email: 'jane@example.com\nBcc: x@y.com' })).toContain('email');
  });

  it('rejects over-long values', () => {
    expect(invalidFields({ phone: '1'.repeat(41) })).toContain('phone');
    expect(invalidFields({ locationZip: '9'.repeat(11) })).toContain('locationZip');
    expect(invalidFields({ additionalDetails: 'a'.repeat(3001) })).toContain('additionalDetails');
    expect(invalidFields({ email: `${'a'.repeat(250)}@x.com` })).toContain('email');
  });

  it('accepts values at the limits', () => {
    expect(run({ additionalDetails: 'a'.repeat(3000) }).ok).toBe(true);
  });

  it.each(['9167590383', '916-759-0383', '(916) 759-0383', '+1 916 759 0383', '+380 44 123 4567'])(
    'accepts human phone formatting: %s',
    (phone) => {
      expect(run({ phone }).ok).toBe(true);
    },
  );

  it.each(['123', '916759038', '1'.repeat(16), 'call me maybe', '916-759-0383 ext 5'])(
    'rejects an invalid phone: %s',
    (phone) => {
      expect(invalidFields({ phone })).toContain('phone');
    },
  );

  describe('ZIP code', () => {
    it.each(['95814', '95630', '95742', '95624'])('accepts a Sacramento County ZIP: %s', (zip) => {
      expect(run({ locationZip: zip }).ok).toBe(true);
    });

    it('takes the exact 5-digit ZIP as sent', () => {
      const result = run({ locationZip: '95814' });
      expect(result.ok && result.value.locationZip).toBe('95814');
    });

    it.each([
      '95814-1234',
      ' 95814 ',
      '95814 ',
      ' 95814',
      '9',
      '95',
      '958',
      '9581',
      '958140',
      '123456789',
      'ABCDE',
      'abcde',
      '9581A',
      '95814-12',
      'Sacramento, CA 95814',
      '',
    ])('rejects a malformed ZIP (no ZIP+4, no trimming, no coercion): %j', (zip) => {
      expect(invalidFields({ locationZip: zip })).toContain('locationZip');
    });

    it.each(['90210', '10001', '95604'])(
      'rejects a well-formed ZIP that is not in the confirmed service area: %s',
      (zip) => {
        expect(invalidFields({ locationZip: zip })).toContain('locationZip');
      },
    );

    it.each([
      '95602',
      '95603',
      '95605',
      '95616',
      '95617',
      '95618',
      '95648',
      '95650',
      '95661',
      '95677',
      '95678',
      '95682',
      '95691',
      '95695',
      '95746',
      '95747',
      '95762',
      '95765',
      '95776',
    ])('accepts the confirmed nearby-community ZIP %s', (zip) => {
      const result = run({ locationZip: zip });
      expect(result.ok && result.value.locationZip).toBe(zip);
    });
  });

  it('validates dates', () => {
    expect(invalidFields({ preferredDate: '10/20/2026' })).toContain('preferredDate');
    expect(invalidFields({ preferredDate: '2026-02-31' })).toContain('preferredDate');
    expect(invalidFields({ preferredDate: '2020-01-01' })).toContain('preferredDate');
    expect(invalidFields({ preferredDate: '2031-01-01' })).toContain('preferredDate');
    expect(run({ preferredDate: '2026-10-05' }).ok).toBe(true);
    // Yesterday is tolerated on purpose (time-zone boundary).
    expect(run({ preferredDate: '2026-10-04' }).ok).toBe(true);
  });

  it('validates counts', () => {
    expect(invalidFields({ numberOfSigners: 0 })).toContain('numberOfSigners');
    expect(invalidFields({ numberOfSigners: 1.5 })).toContain('numberOfSigners');
    expect(invalidFields({ numberOfSigners: '2' })).toContain('numberOfSigners');
    expect(invalidFields({ numberOfSigners: 51 })).toContain('numberOfSigners');
    expect(run({ numberOfSigners: 50 }).ok).toBe(true);
  });

  it('no longer knows about a document count: it is ignored, never copied', () => {
    const result = run({ numberOfDocuments: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty('numberOfDocuments');
    }
  });

  it.each([undefined, false, 'true', 'on', 1, 'yes', null])(
    'requires contactConsent to be the boolean true (rejects %j)',
    (consent) => {
      const body: Record<string, unknown> = { ...valid, contactConsent: consent };
      if (consent === undefined) {
        delete body['contactConsent'];
      }
      const result = validateAppointmentRequest(body, NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.invalidFields).toContain('contactConsent');
      }
    },
  );

  describe('preferred time', () => {
    it.each(['morning', 'afternoon', 'evening', 'flexible'])(
      'accepts %s without a time',
      (pref) => {
        const result = run({ timePreference: pref, specificTime: null });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.timePreference).toBe(pref);
          expect(result.value.specificTime).toBeNull();
        }
      },
    );

    it('treats an absent specificTime like null for non-specific choices', () => {
      const body: Record<string, unknown> = { ...valid, timePreference: 'evening' };
      delete body['specificTime'];
      expect(validateAppointmentRequest(body, NOW).ok).toBe(true);
    });

    it.each(['00:00', '09:30', '14:30', '23:59'])('accepts a specific time of %s', (time) => {
      const result = run({ timePreference: 'specific', specificTime: time });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.specificTime).toBe(time);
      }
    });

    it.each([
      undefined,
      null,
      '',
      '2ish',
      'after lunch',
      '24:00',
      '12:60',
      '9:30',
      '14:30:00',
      1430,
    ])('rejects a specific preference with specificTime %j', (time) => {
      expect(invalidFields({ timePreference: 'specific', specificTime: time })).toContain(
        'specificTime',
      );
    });

    it.each(['whenever', 'Morning', 'specific ', '', null, 5, undefined, ['morning']])(
      'rejects unknown time preference %j',
      (pref) => {
        expect(invalidFields({ timePreference: pref })).toContain('timePreference');
      },
    );

    it.each(['14:30', 'whenever', '', 0])(
      'rejects injected specificTime %j on a non-specific preference',
      (time) => {
        const fields = invalidFields({ timePreference: 'morning', specificTime: time });
        // null/undefined are fine; anything else is rejected, never silently kept
        expect(fields).toContain('specificTime');
      },
    );

    it('no longer accepts a free-text preferredTime', () => {
      const body: Record<string, unknown> = { ...valid, preferredTime: 'after lunch maybe 2' };
      delete body['timePreference'];
      delete body['specificTime'];
      expect(validateAppointmentRequest(body, NOW).ok).toBe(false);

      const result = run({ preferredTime: 'whenever' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).not.toHaveProperty('preferredTime');
      }
    });
  });

  describe('urgent / same-day / Sunday', () => {
    // NOW = Mon 2026-10-05 12:00Z (05:00 in Los Angeles). 2026-10-11 is a Sunday.
    it('accepts urgent true and false on a normal future weekday', () => {
      const urgent = run({ urgent: true });
      expect(urgent.ok).toBe(true);
      if (urgent.ok) {
        expect(urgent.value.urgent).toBe(true);
      }
      const normal = run({ urgent: false });
      expect(normal.ok && normal.value.urgent).toBe(false);
      expect(run().ok && (run() as { value: { urgent: boolean } }).value.urgent).toBe(false);
    });

    it('forces urgent when the date is today in Los Angeles, even if the client sent false', () => {
      const result = run({ preferredDate: '2026-10-05', urgent: false });
      expect(result.ok && result.value.urgent).toBe(true);
    });

    it('uses the Los Angeles calendar day, not UTC', () => {
      // 2026-10-06T05:00Z is still Mon 2026-10-05 22:00 in Los Angeles
      const lateEvening = new Date('2026-10-06T05:00:00Z');
      const today = validateAppointmentRequest(
        { ...valid, preferredDate: '2026-10-05', urgent: false },
        lateEvening,
      );
      expect(today.ok && today.value.urgent).toBe(true);
      const tomorrow = validateAppointmentRequest(
        { ...valid, preferredDate: '2026-10-06', urgent: false },
        lateEvening,
      );
      expect(tomorrow.ok && tomorrow.value.urgent).toBe(false);
    });

    it('forces urgent for a Sunday date, without rejecting it', () => {
      const result = run({ preferredDate: '2026-10-11', urgent: false });
      expect(result.ok).toBe(true);
      expect(result.ok && result.value.urgent).toBe(true);
    });

    it('rejects a non-boolean urgent', () => {
      expect(invalidFields({ urgent: 'true' })).toContain('urgent');
      expect(invalidFields({ urgent: 1 })).toContain('urgent');
      expect(invalidFields({ urgent: 'yes' })).toContain('urgent');
    });

    it('still requires consent for urgent requests', () => {
      expect(invalidFields({ urgent: true, contactConsent: false })).toContain('contactConsent');
    });
  });

  it('rejects non-object bodies', () => {
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
