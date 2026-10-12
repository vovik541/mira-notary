import {
  SERVICE_AREA_LIMITED_ZIP_ROWS,
  SERVICE_AREA_ZIP_ROWS,
  type ServiceAreaCountyName,
} from './service-area-zips';

export type { ServiceAreaCountyName } from './service-area-zips';

/**
 * Mira's confirmed ONLINE service area, derived from the polygon drawn in her Google My Maps (see
 * service-area-zips.ts and docs/seo/SERVICE-AREA-MAP-AUDIT.md). This module is the single source of
 * truth for the Service Area ZIP checker, the Contact form advisory, the Worker and the displayed
 * counties/communities. ZIPs outside it stay submittable — they just get a travel-confirmation
 * advisory ("not confirmed", never "not served").
 */
export interface ServiceAreaZip {
  readonly zip: string;
  readonly county: ServiceAreaCountyName;
  /** Customer-friendly community name, `null` for small rural / low-population ZIPs. */
  readonly community: string | null;
}

export const SERVICE_AREA_ZIPS: readonly ServiceAreaZip[] = SERVICE_AREA_ZIP_ROWS.map(
  ([zip, county, community]) => ({ zip, county, community }),
);

/** Exposed so tests can detect accidental duplicates (a Set would hide them). */
export const SERVICE_AREA_ZIP_LIST_LENGTH: number = SERVICE_AREA_ZIPS.length;

/** ZIPs in the confirmed service area (representative point inside the polygon). */
export const SUPPORTED_SERVICE_ZIP_CODES: ReadonlySet<string> = new Set(
  SERVICE_AREA_ZIPS.map((row) => row.zip),
);

export interface LimitedServiceAreaZip {
  readonly zip: string;
  readonly county: string;
  readonly label: string;
  /** Share of the ZCTA's area inside the polygon (always >= 1). */
  readonly overlapPercent: number;
}

/** ZIPs with partial coverage: >= 1% of the ZCTA inside the polygon, but not confirmed. */
export const LIMITED_SERVICE_AREA_ZIPS: readonly LimitedServiceAreaZip[] =
  SERVICE_AREA_LIMITED_ZIP_ROWS.map(([zip, county, label, overlapPercent]) => ({
    zip,
    county,
    label,
    overlapPercent,
  }));

export const LIMITED_SERVICE_AREA_ZIP_CODES: ReadonlySet<string> = new Set(
  LIMITED_SERVICE_AREA_ZIPS.map((row) => row.zip),
);

export interface ConfirmedCommunity {
  readonly county: ServiceAreaCountyName;
  readonly name: string;
  readonly zips: readonly string[];
}

/** Named communities (county → community → ZIPs), derived from the ZIP table — no second list. */
export const CONFIRMED_COMMUNITIES: readonly ConfirmedCommunity[] = (() => {
  const byKey = new Map<string, { county: ServiceAreaCountyName; name: string; zips: string[] }>();
  for (const row of SERVICE_AREA_ZIPS) {
    if (row.community === null) {
      continue;
    }
    const key = `${row.county}|${row.community}`;
    const entry = byKey.get(key) ?? { county: row.county, name: row.community, zips: [] };
    entry.zips.push(row.zip);
    byKey.set(key, entry);
  }
  return [...byKey.values()];
})();

/** The county and (when it has one) community a supported ZIP belongs to. */
export function serviceAreaZipInfo(zip: string): ServiceAreaZip | null {
  return SERVICE_AREA_ZIPS.find((row) => row.zip === zip) ?? null;
}

/** The ONLY valid ZIP syntax: exactly five digits. No ZIP+4, no whitespace, no punctuation. */
export const ZIP_PATTERN = /^\d{5}$/;
export const ZIP_LENGTH = 5;

/**
 * Validation: returns the ZIP when it is exactly five digits, otherwise `null`. Nothing is
 * trimmed or coerced (`95814-1234` and ` 95814 ` are invalid, not silently converted).
 */
export function normalizeZipCode(value: string | null | undefined): string | null {
  return typeof value === 'string' && ZIP_PATTERN.test(value) ? value : null;
}

/**
 * Input sanitization (kept separate from validation): drops every non-digit and caps the result
 * at five characters. Used for typing and pasting in the UI, never to decide validity.
 */
export function sanitizeZipInput(value: string | null | undefined): string {
  return typeof value === 'string' ? value.replace(/\D/g, '').slice(0, ZIP_LENGTH) : '';
}

/** Service-area decision: is this ZIP in Mira's confirmed online service area? */
export function isSupportedServiceZip(value: string | null | undefined): boolean {
  const zip = normalizeZipCode(value);
  return zip !== null && SUPPORTED_SERVICE_ZIP_CODES.has(zip);
}

/**
 * - `invalid`: not a ZIP at all
 * - `confirmed`: in the confirmed service area (representative point inside the polygon)
 * - `limited`: at least 1% of the ZIP lies inside the polygon — availability varies by location
 * - `outside`: a valid ZIP with less than 1% overlap (or unknown) — NOT "Mira does not serve it"
 */
export type ZipCheck =
  | { status: 'invalid' }
  | { status: 'confirmed'; zip: string }
  | { status: 'limited'; zip: string }
  | { status: 'outside'; zip: string };

/** Decision against explicit sets (exported so tests can prove the sets are independent). */
export function checkZipAgainst(
  value: string | null | undefined,
  confirmed: ReadonlySet<string>,
  limited: ReadonlySet<string> = new Set(),
): ZipCheck {
  const zip = normalizeZipCode(value);
  if (zip === null) {
    return { status: 'invalid' };
  }
  if (confirmed.has(zip)) {
    return { status: 'confirmed', zip };
  }
  return limited.has(zip) ? { status: 'limited', zip } : { status: 'outside', zip };
}

/** Single decision used by the Contact form, the Service Area page and the Worker. */
export function checkZip(value: string | null | undefined): ZipCheck {
  return checkZipAgainst(value, SUPPORTED_SERVICE_ZIP_CODES, LIMITED_SERVICE_AREA_ZIP_CODES);
}
