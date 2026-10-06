/**
 * ZIP data for the service-area check. Two deliberately separate concepts:
 *
 * 1. SACRAMENTO_COUNTY_ZIP_CODES — REFERENCE data: every ZIP assigned to Sacramento County in the
 *    State of California county-by-ZIP lookup (standard, PO Box, unique, government and special
 *    ZIPs, including the 942xx range). Exactly 131 codes; never edited to change coverage.
 *
 * 2. SUPPORTED_SERVICE_ZIP_CODES — Mira's confirmed ONLINE service area: the ZIPs for which the
 *    booking form is accepted automatically. It is the union of the Sacramento County set and the
 *    ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES derived from CONFIRMED_NEARBY_COMMUNITIES (below). To
 *    extend coverage, edit only that community table — no validator or component changes.
 *
 * Shared by the Angular app (Contact form, Service Area page) and the Cloudflare Worker. Static,
 * immutable, in-memory data: no database, no external ZIP API. A ZIP missing from the supported
 * set is NOT a place Mira does not serve: availability outside the confirmed area is arranged by
 * contacting her.
 */
const SACRAMENTO_COUNTY_ZIP_LIST = [
  '94203',
  '94204',
  '94205',
  '94206',
  '94207',
  '94208',
  '94209',
  '94211',
  '94229',
  '94230',
  '94232',
  '94234',
  '94235',
  '94236',
  '94237',
  '94239',
  '94240',
  '94244',
  '94245',
  '94247',
  '94248',
  '94249',
  '94250',
  '94252',
  '94254',
  '94256',
  '94257',
  '94258',
  '94259',
  '94261',
  '94262',
  '94263',
  '94267',
  '94268',
  '94269',
  '94271',
  '94273',
  '94274',
  '94277',
  '94278',
  '94279',
  '94280',
  '94282',
  '94283',
  '94284',
  '94285',
  '94287',
  '94288',
  '94289',
  '94290',
  '94291',
  '94293',
  '94294',
  '94295',
  '94296',
  '94297',
  '94298',
  '94299',

  '95608',
  '95609',
  '95610',
  '95611',
  '95615',
  '95621',
  '95624',
  '95626',
  '95628',
  '95630',
  '95632',
  '95638',
  '95639',
  '95641',
  '95652',
  '95655',
  '95660',
  '95662',
  '95670',
  '95671',
  '95673',
  '95680',
  '95683',
  '95690',
  '95693',

  '95741',
  '95742',
  '95757',
  '95758',
  '95759',
  '95763',

  '95811',
  '95812',
  '95813',
  '95814',
  '95815',
  '95816',
  '95817',
  '95818',
  '95819',
  '95820',
  '95821',
  '95822',
  '95823',
  '95824',
  '95825',
  '95826',
  '95827',
  '95828',
  '95829',
  '95830',
  '95831',
  '95832',
  '95833',
  '95834',
  '95835',
  '95836',
  '95837',
  '95838',
  '95840',
  '95841',
  '95842',
  '95843',
  '95851',
  '95852',
  '95853',
  '95860',
  '95864',
  '95865',
  '95866',
  '95867',
  '95894',
  '95899',
] as const;

export const SACRAMENTO_COUNTY_ZIP_CODES: ReadonlySet<string> = new Set(SACRAMENTO_COUNTY_ZIP_LIST);

/** Exposed so tests can detect accidental duplicates (a Set would hide them). */
export const SACRAMENTO_COUNTY_ZIP_LIST_LENGTH: number = SACRAMENTO_COUNTY_ZIP_LIST.length;

export type ConfirmedCounty = 'Placer County' | 'Yolo County' | 'El Dorado County';

export interface ConfirmedCommunity {
  readonly county: ConfirmedCounty;
  readonly name: string;
  readonly zips: readonly string[];
}

/**
 * Nearby Greater Sacramento communities Mira confirmed (outside Sacramento County), with their
 * ZIP codes. This table is the ONLY place to edit to extend coverage: the extra ZIP set below, the
 * "Confirmed Service Area" UI groups and the structured data are all derived from it, so there is
 * no second list to keep in sync. Only these communities are confirmed — not whole counties.
 * (Auburn 95604 is deliberately absent: it is a PO Box ZIP, not a physical service location.)
 */
export const CONFIRMED_NEARBY_COMMUNITIES: readonly ConfirmedCommunity[] = [
  { county: 'Placer County', name: 'Roseville', zips: ['95661', '95678', '95747'] },
  { county: 'Placer County', name: 'Rocklin', zips: ['95677', '95765'] },
  { county: 'Placer County', name: 'Lincoln', zips: ['95648'] },
  { county: 'Placer County', name: 'Loomis', zips: ['95650'] },
  { county: 'Placer County', name: 'Granite Bay', zips: ['95746'] },
  { county: 'Placer County', name: 'Auburn', zips: ['95602', '95603'] },
  { county: 'Yolo County', name: 'West Sacramento', zips: ['95605', '95691'] },
  { county: 'Yolo County', name: 'Davis', zips: ['95616', '95617', '95618'] },
  { county: 'Yolo County', name: 'Woodland', zips: ['95695', '95776'] },
  { county: 'El Dorado County', name: 'El Dorado Hills', zips: ['95762'] },
  { county: 'El Dorado County', name: 'Cameron Park', zips: ['95682'] },
];

const ADDITIONAL_CONFIRMED_SERVICE_ZIP_LIST: readonly string[] =
  CONFIRMED_NEARBY_COMMUNITIES.flatMap((community) => community.zips);

/** ZIPs outside Sacramento County that Mira has confirmed (derived from the table above). */
export const ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES: ReadonlySet<string> = new Set(
  ADDITIONAL_CONFIRMED_SERVICE_ZIP_LIST,
);

/** Exposed so tests can detect accidental duplicates (a Set would hide them). */
export const ADDITIONAL_CONFIRMED_SERVICE_ZIP_LIST_LENGTH: number =
  ADDITIONAL_CONFIRMED_SERVICE_ZIP_LIST.length;

/**
 * ZIPs accepted automatically by the booking form: Sacramento County + the confirmed nearby
 * communities. Built from the two sources only — ZIP values are never repeated here.
 */
export const SUPPORTED_SERVICE_ZIP_CODES: ReadonlySet<string> = new Set([
  ...SACRAMENTO_COUNTY_ZIP_CODES,
  ...ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES,
]);

/** The confirmed nearby community a ZIP belongs to (`null` for Sacramento County / unknown ZIPs). */
export function confirmedCommunityForZip(zip: string): ConfirmedCommunity | null {
  return CONFIRMED_NEARBY_COMMUNITIES.find((community) => community.zips.includes(zip)) ?? null;
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

/** Reference lookup: is this ZIP assigned to Sacramento County? (Not a service-area decision.) */
export function isSacramentoCountyZip(value: string | null | undefined): boolean {
  const zip = normalizeZipCode(value);
  return zip !== null && SACRAMENTO_COUNTY_ZIP_CODES.has(zip);
}

/** Service-area decision: is this ZIP in Mira's confirmed online service area? */
export function isSupportedServiceZip(value: string | null | undefined): boolean {
  const zip = normalizeZipCode(value);
  return zip !== null && SUPPORTED_SERVICE_ZIP_CODES.has(zip);
}

/**
 * - `invalid`: not a ZIP at all
 * - `supported`: in the confirmed online service area
 * - `unconfirmed`: a valid ZIP that is not (currently) in that set — NOT "Mira does not serve it"
 */
export type ZipCheck =
  | { status: 'invalid' }
  | { status: 'supported'; zip: string }
  | { status: 'unconfirmed'; zip: string };

/** Decision against an explicit set (exported so tests can prove the sets are independent). */
export function checkZipAgainst(
  value: string | null | undefined,
  supported: ReadonlySet<string>,
): ZipCheck {
  const zip = normalizeZipCode(value);
  if (zip === null) {
    return { status: 'invalid' };
  }
  return supported.has(zip) ? { status: 'supported', zip } : { status: 'unconfirmed', zip };
}

/** Single decision used by the Contact form, the Service Area page and the Worker. */
export function checkZip(value: string | null | undefined): ZipCheck {
  return checkZipAgainst(value, SUPPORTED_SERVICE_ZIP_CODES);
}
