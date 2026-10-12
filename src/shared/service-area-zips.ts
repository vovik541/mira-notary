/**
 * GENERATED DATA — the confirmed service area as ZIP Code Tabulation Areas (ZCTAs).
 *
 * Source of truth: the "Service Area" polygon in Mira's Google My Maps (see
 * docs/seo/SERVICE-AREA-MAP-AUDIT.md for the map id, processing date, dataset, matching rule and
 * the edge ZIPs that were deliberately NOT included). Regenerate with
 * scripts/service-area/derive-zips.mjs whenever the polygon changes — the map and this list do not
 * synchronize automatically, and nothing here is fetched at runtime.
 *
 * Rule: a 2020 Census ZCTA is included when its internal (representative) point lies inside the
 * polygon. County = the ZCTA's largest-area county; community = its largest-overlap Census place,
 * shown only when the ZCTA has at least 5,000 residents (small rural / PO-box-like areas stay in the
 * ZIP checker but are not advertised as named communities).
 *
 * Row: [ZIP, county, community | null]. Sorted by ZIP, no duplicates.
 */
export type ServiceAreaCountyName =
  'Sacramento County' | 'Placer County' | 'Yolo County' | 'El Dorado County' | 'Sutter County';

export const SERVICE_AREA_ZIP_ROWS: readonly (readonly [
  string,
  ServiceAreaCountyName,
  string | null,
])[] = [
  ['95603', 'Placer County', 'Auburn'],
  ['95605', 'Yolo County', 'West Sacramento'],
  ['95608', 'Sacramento County', 'Carmichael'],
  ['95610', 'Sacramento County', 'Citrus Heights'],
  ['95616', 'Yolo County', 'Davis'],
  ['95618', 'Yolo County', 'Davis'],
  ['95621', 'Sacramento County', 'Citrus Heights'],
  ['95624', 'Sacramento County', 'Elk Grove'],
  ['95626', 'Sacramento County', 'Elverta'],
  ['95628', 'Sacramento County', 'Fair Oaks'],
  ['95630', 'Sacramento County', 'Folsom'],
  ['95639', 'Sacramento County', null],
  ['95648', 'Placer County', 'Lincoln'],
  ['95650', 'Placer County', 'Loomis'],
  ['95652', 'Sacramento County', null],
  ['95655', 'Sacramento County', null],
  ['95658', 'Placer County', 'Newcastle'],
  ['95659', 'Sutter County', null],
  ['95660', 'Sacramento County', 'North Highlands'],
  ['95661', 'Placer County', 'Roseville'],
  ['95662', 'Sacramento County', 'Orangevale'],
  ['95663', 'Placer County', null],
  ['95664', 'El Dorado County', null],
  ['95668', 'Sutter County', null],
  ['95670', 'Sacramento County', 'Rancho Cordova'],
  ['95671', 'Sacramento County', 'Folsom'],
  ['95673', 'Sacramento County', 'Rio Linda'],
  ['95677', 'Placer County', 'Rocklin'],
  ['95678', 'Placer County', 'Roseville'],
  ['95681', 'Placer County', null],
  ['95683', 'Sacramento County', 'Rancho Murieta'],
  ['95691', 'Yolo County', 'West Sacramento'],
  ['95742', 'Sacramento County', 'Rancho Cordova'],
  ['95746', 'Placer County', 'Granite Bay'],
  ['95747', 'Placer County', 'Roseville'],
  ['95758', 'Sacramento County', 'Elk Grove'],
  ['95762', 'El Dorado County', 'El Dorado Hills'],
  ['95765', 'Placer County', 'Rocklin'],
  ['95776', 'Yolo County', 'Woodland'],
  ['95811', 'Sacramento County', 'Sacramento'],
  ['95814', 'Sacramento County', 'Sacramento'],
  ['95815', 'Sacramento County', 'Sacramento'],
  ['95816', 'Sacramento County', 'Sacramento'],
  ['95817', 'Sacramento County', 'Sacramento'],
  ['95818', 'Sacramento County', 'Sacramento'],
  ['95819', 'Sacramento County', 'Sacramento'],
  ['95820', 'Sacramento County', 'Sacramento'],
  ['95821', 'Sacramento County', 'Arden-Arcade'],
  ['95822', 'Sacramento County', 'Sacramento'],
  ['95823', 'Sacramento County', 'Sacramento'],
  ['95824', 'Sacramento County', 'Sacramento'],
  ['95825', 'Sacramento County', 'Arden-Arcade'],
  ['95826', 'Sacramento County', 'Sacramento'],
  ['95827', 'Sacramento County', 'Rancho Cordova'],
  ['95828', 'Sacramento County', 'Florin'],
  ['95829', 'Sacramento County', 'Vineyard'],
  ['95830', 'Sacramento County', null],
  ['95831', 'Sacramento County', 'Sacramento'],
  ['95832', 'Sacramento County', 'Sacramento'],
  ['95833', 'Sacramento County', 'Sacramento'],
  ['95834', 'Sacramento County', 'Sacramento'],
  ['95835', 'Sacramento County', 'Sacramento'],
  ['95837', 'Sacramento County', null],
  ['95838', 'Sacramento County', 'Sacramento'],
  ['95841', 'Sacramento County', 'North Highlands'],
  ['95842', 'Sacramento County', 'Foothill Farms'],
  ['95843', 'Sacramento County', 'Antelope'],
  ['95864', 'Sacramento County', 'Arden-Arcade'],
];

/**
 * LIMITED coverage: ZCTAs that are NOT confirmed (internal point outside the polygon) but have at
 * least 1% of their area inside it — computed by scripts/service-area/derive-zips.mjs as geodesic
 * area(ZCTA ∩ polygon) / area(ZCTA). Operational information only: never shown as a confirmed city
 * and never used for marketing or SEO copy.
 *
 * Row: [ZIP, county, place label, overlap % of the ZCTA inside the polygon]. Sorted by ZIP, and
 * disjoint from SERVICE_AREA_ZIP_ROWS.
 */
export const SERVICE_AREA_LIMITED_ZIP_ROWS: readonly (readonly [string, string, string, number])[] =
  [
    ['95602', 'Placer County', 'Auburn area', 43.45],
    ['95612', 'Yolo County', 'Clarksburg', 46.65],
    ['95614', 'El Dorado County', 'Auburn Lake Trails', 1.59],
    ['95620', 'Solano County', 'Dixon', 16.9],
    ['95645', 'Yolo County', 'Knights Landing', 5.46],
    ['95672', 'El Dorado County', 'Cameron Park / El Dorado Hills area', 9.59],
    ['95674', 'Sutter County', 'Rio Oso', 25.39],
    ['95693', 'Sacramento County', 'Wilton', 35.13],
    ['95695', 'Yolo County', 'Woodland', 24.93],
    ['95757', 'Sacramento County', 'Elk Grove', 37.95],
    ['95949', 'Nevada County', 'Grass Valley area', 2.25],
  ];
