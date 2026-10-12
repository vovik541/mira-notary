import { CONFIRMED_COMMUNITIES, type ServiceAreaCountyName } from '../../shared/service-area';

export interface ServiceAreaGroup {
  readonly county: ServiceAreaCountyName;
  /** Named communities inside the drawn service-area polygon (never a whole-county claim). */
  readonly communities: readonly string[];
}

const COUNTY_ORDER: readonly ServiceAreaCountyName[] = [
  'Sacramento County',
  'Placer County',
  'Yolo County',
  'El Dorado County',
];

/**
 * "Confirmed Service Area" groups for the UI, derived from the shared polygon-derived ZIP table:
 * county → key communities. Counties without a named community (Sutter: rural edge ZIPs only) are
 * not advertised, and no county is ever described as served countywide.
 */
export const SERVICE_AREA_GROUPS: readonly ServiceAreaGroup[] = COUNTY_ORDER.map(
  (county): ServiceAreaGroup => ({
    county,
    communities: CONFIRMED_COMMUNITIES.filter((c) => c.county === county)
      .map((c) => c.name)
      .sort((a, b) => a.localeCompare(b)),
  }),
).filter((group) => group.communities.length > 0);

/** Every confirmed community, in display order. */
export const SERVICE_AREA_COMMUNITIES: readonly string[] = SERVICE_AREA_GROUPS.flatMap(
  (group) => group.communities,
);

/** Compact pills for the Home preview: a short list of key communities from the confirmed set. */
const KEY_COMMUNITIES = [
  'Sacramento',
  'Elk Grove',
  'Roseville',
  'Rocklin',
  'Folsom',
  'Rancho Cordova',
  'Citrus Heights',
  'West Sacramento',
  'Davis',
  'El Dorado Hills',
] as const;

export const SERVICE_AREA_CHIPS: readonly string[] = KEY_COMMUNITIES.filter((name) =>
  SERVICE_AREA_COMMUNITIES.includes(name),
);

/** "Sacramento, Placer, Yolo and El Dorado" — counties that contain confirmed communities. */
export const SERVICE_AREA_COUNTIES_LABEL: string = ((): string => {
  const names = SERVICE_AREA_GROUPS.map((group) => group.county.replace(/ County$/, ''));
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
})();

/**
 * Home / marketing summary. Names only the communities inside the drawn service area — never a
 * whole county. `/service-area` stays the authority.
 */
export const SERVICE_AREA_SUMMARY =
  'Mira serves Sacramento and nearby communities across the Greater Sacramento area.';
