import {
  TIME_PREFERENCES,
  classifyDate,
  describeTimePreference,
  formatTimeOfDay,
  isSunday,
  isTimePreference,
  isValidTimeOfDay,
  STANDARD_HOURS,
  STANDARD_HOURS_LABEL,
  isWithinStandardHours,
  minutesSinceMidnight,
  todayInBusinessZone,
} from './appointment-timing';

describe('time preference helpers', () => {
  it('knows the five structured preferences and rejects anything else', () => {
    expect(TIME_PREFERENCES).toEqual(['morning', 'afternoon', 'evening', 'flexible', 'specific']);
    expect(isTimePreference('specific')).toBe(true);
    for (const bad of ['Morning', 'whenever', '', null, undefined, 3]) {
      expect(isTimePreference(bad)).toBe(false);
    }
  });

  it('validates HH:mm strictly', () => {
    for (const ok of ['00:00', '09:05', '12:00', '23:59']) {
      expect(isValidTimeOfDay(ok)).toBe(true);
    }
    for (const bad of ['24:00', '12:60', '9:05', '12:00:00', '1230', '', 'noon', null, 1200]) {
      expect(isValidTimeOfDay(bad)).toBe(false);
    }
  });

  it('formats 24-hour times for people', () => {
    expect(formatTimeOfDay('00:00')).toBe('12:00 AM');
    expect(formatTimeOfDay('09:05')).toBe('9:05 AM');
    expect(formatTimeOfDay('12:00')).toBe('12:00 PM');
    expect(formatTimeOfDay('14:30')).toBe('2:30 PM');
    expect(formatTimeOfDay('23:59')).toBe('11:59 PM');
  });

  it('describes a preference without exposing raw enum values', () => {
    expect(describeTimePreference('morning', null)).toBe('Morning');
    expect(describeTimePreference('flexible', null)).toBe('Flexible / Any Time');
    expect(describeTimePreference('specific', '14:30')).toBe('Specific Time — 2:30 PM');
  });
});

describe('date rules (Los Angeles)', () => {
  it('computes today in the business time zone, not UTC', () => {
    expect(todayInBusinessZone(new Date('2026-10-05T19:00:00Z'))).toBe('2026-10-05');
    expect(todayInBusinessZone(new Date('2026-10-06T05:00:00Z'))).toBe('2026-10-05');
    expect(todayInBusinessZone(new Date('2026-10-06T07:30:00Z'))).toBe('2026-10-06');
    // winter time (PST, UTC-8)
    expect(todayInBusinessZone(new Date('2027-01-15T07:59:00Z'))).toBe('2027-01-14');
    expect(todayInBusinessZone(new Date('2027-01-15T08:00:00Z'))).toBe('2027-01-15');
  });

  it('detects Sundays by calendar date', () => {
    expect(isSunday('2026-10-11')).toBe(true);
    expect(isSunday('2026-10-12')).toBe(false);
    expect(isSunday('2027-03-14')).toBe(true);
    expect(isSunday('')).toBe(false);
    expect(isSunday('not-a-date')).toBe(false);
  });

  it('classifies same-day, Sunday and normal dates', () => {
    const now = new Date('2026-10-05T19:00:00Z'); // Monday in Los Angeles
    expect(classifyDate('2026-10-05', now)).toEqual({
      sameDay: true,
      sunday: false,
      phoneConfirmation: true,
    });
    expect(classifyDate('2026-10-11', now)).toEqual({
      sameDay: false,
      sunday: true,
      phoneConfirmation: true,
    });
    expect(classifyDate('2026-10-20', now).phoneConfirmation).toBe(false);
    expect(classifyDate('', now).phoneConfirmation).toBe(false);
    const sundayNow = new Date('2026-10-11T19:00:00Z');
    expect(classifyDate('2026-10-11', sundayNow)).toEqual({
      sameDay: true,
      sunday: true,
      phoneConfirmation: true,
    });
  });
});

describe('standard hours (08:00–20:00)', () => {
  it('converts HH:mm to minutes without any locale-dependent parsing', () => {
    expect(minutesSinceMidnight('00:00')).toBe(0);
    expect(minutesSinceMidnight('08:00')).toBe(480);
    expect(minutesSinceMidnight('20:00')).toBe(1200);
    expect(minutesSinceMidnight('23:59')).toBe(1439);
    expect(minutesSinceMidnight('8:00')).toBeNaN();
    expect(minutesSinceMidnight('24:00')).toBeNaN();
    expect(minutesSinceMidnight('25:99')).toBeNaN();
  });

  it('is 8:00 AM–8:00 PM, both ends inclusive', () => {
    expect(STANDARD_HOURS).toEqual({ start: '08:00', end: '20:00' });
    expect(STANDARD_HOURS_LABEL).toBe('8:00 AM–8:00 PM');
    for (const ok of ['08:00', '08:01', '12:00', '14:00', '19:59', '20:00']) {
      expect(isWithinStandardHours(ok)).toBe(true);
    }
  });

  it('treats everything else as outside (advisory), and malformed values as not within', () => {
    for (const outside of ['07:59', '07:30', '00:00', '20:01', '20:30', '23:00', '23:59']) {
      expect(isWithinStandardHours(outside)).toBe(false);
      expect(isValidTimeOfDay(outside)).toBe(true); // still a perfectly valid time
    }
    for (const bad of ['25:99', '12:60', '8:00', '', null]) {
      expect(isWithinStandardHours(bad)).toBe(false);
      expect(isValidTimeOfDay(bad)).toBe(false);
    }
  });
});
