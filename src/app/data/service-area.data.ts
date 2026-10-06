import { CONFIRMED_NEARBY_COMMUNITIES } from '../../shared/service-area';

export const SERVICE_AREA_COUNTY = 'Sacramento County';

export interface ServiceAreaGroup {
  readonly county: string;
  /** Countywide service is confirmed only for Sacramento County. */
  readonly countywide: boolean;
  /** Confirmed communities (empty for the countywide group). */
  readonly communities: readonly string[];
}

const NEARBY_COUNTIES = ['Placer County', 'Yolo County', 'El Dorado County'] as const;

/**
 * "Confirmed Service Area" groups for the UI, derived from the shared community table so there is
 * a single list: Sacramento County countywide, then the confirmed communities of each nearby county.
 */
export const SERVICE_AREA_GROUPS: readonly ServiceAreaGroup[] = [
  { county: SERVICE_AREA_COUNTY, countywide: true, communities: [] },
  ...NEARBY_COUNTIES.map((county): ServiceAreaGroup => ({
    county,
    countywide: false,
    communities: CONFIRMED_NEARBY_COMMUNITIES.filter((c) => c.county === county).map((c) => c.name),
  })),
];

/** Every confirmed community outside Sacramento County, in display order. */
export const SERVICE_AREA_COMMUNITIES: readonly string[] = SERVICE_AREA_GROUPS.flatMap(
  (group) => group.communities,
);

/** Compact pills for the Home preview: the county first, then every confirmed community. */
export const SERVICE_AREA_CHIPS: readonly string[] = [
  SERVICE_AREA_COUNTY,
  ...SERVICE_AREA_COMMUNITIES,
];

/** "Placer, Yolo and El Dorado" — the counties that have individually confirmed communities. */
export const SERVICE_AREA_NEARBY_COUNTIES_LABEL: string = ((): string => {
  const names = SERVICE_AREA_GROUPS.filter((group) => !group.countywide).map((group) =>
    group.county.replace(/ County$/, ''),
  );
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
})();

/**
 * Home / marketing summary. Names the nearby counties but only ever says "confirmed nearby
 * communities" — never that a whole county is served. `/service-area` stays the authority.
 */
export const SERVICE_AREA_SUMMARY = `Mira serves Sacramento County and confirmed nearby communities across ${SERVICE_AREA_NEARBY_COUNTIES_LABEL} Counties.`;
