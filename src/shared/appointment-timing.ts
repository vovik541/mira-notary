/**
 * Preferred-time model and same-day / Sunday rules shared by the Angular form and the Worker.
 * Pure TypeScript (no Angular, no Workers types). "Today" is always evaluated in Mira's time
 * zone, so the browser and the server agree regardless of where the visitor or the edge is.
 */

export const BUSINESS_TIME_ZONE = 'America/Los_Angeles';

export const TIME_PREFERENCES = [
  'morning',
  'afternoon',
  'evening',
  'flexible',
  'specific',
] as const;

export type TimePreference = (typeof TIME_PREFERENCES)[number];

export const TIME_PREFERENCE_LABELS: Record<TimePreference, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  flexible: 'Flexible / Any Time',
  specific: 'Specific Time',
};

export const isTimePreference = (value: unknown): value is TimePreference =>
  typeof value === 'string' && (TIME_PREFERENCES as readonly string[]).includes(value);

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `HH:mm`, 24-hour, exactly as produced by `<input type="time">`. */
export const isValidTimeOfDay = (value: unknown): value is string =>
  typeof value === 'string' && HH_MM.test(value);

/** `14:30` → `2:30 PM`. */
export function formatTimeOfDay(value: string): string {
  const match = HH_MM.exec(value);
  if (!match) {
    return value;
  }
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
}

/** Human-readable preferred time: "Morning", "Specific Time — 2:30 PM". */
export function describeTimePreference(
  preference: TimePreference,
  specificTime: string | null,
): string {
  if (preference === 'specific' && specificTime) {
    return `${TIME_PREFERENCE_LABELS.specific} — ${formatTimeOfDay(specificTime)}`;
  }
  return TIME_PREFERENCE_LABELS[preference];
}

/** The calendar date (`YYYY-MM-DD`) it currently is in Mira's time zone. */
export function todayInBusinessZone(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** `true` for a valid `YYYY-MM-DD` that falls on a Sunday (calendar arithmetic, no time zone). */
export function isSunday(isoDate: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return false;
  }
  return (
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay() === 0
  );
}

export interface DateTiming {
  /** The preferred date is today in Mira's time zone. */
  readonly sameDay: boolean;
  readonly sunday: boolean;
  /** Same-day or Sunday: availability can only be confirmed by phone. */
  readonly phoneConfirmation: boolean;
}

export function classifyDate(isoDate: string, now: Date = new Date()): DateTiming {
  const sameDay = isoDate !== '' && isoDate === todayInBusinessZone(now);
  const sunday = isSunday(isoDate);
  return { sameDay, sunday, phoneConfirmation: sameDay || sunday };
}
