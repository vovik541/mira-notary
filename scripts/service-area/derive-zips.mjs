// Re-derives the service-area ZCTA list from the public Google My Maps KML. Offline tooling only:
// nothing here runs at build or runtime, and the site never fetches Google at request time.
//
//   npm i --no-save @turf/turf   (not a project dependency)
//   node scripts/service-area/derive-zips.mjs [map.kml]
//
// Rules (every ZCTA that intersects the polygon is classified):
//   CONFIRMED  the ZCTA's Census internal (representative) point lies inside the polygon.
//   LIMITED    not confirmed, but at least 1% of the ZCTA's area lies inside the polygon.
//   OUTSIDE    everything else (overlap < 1%, or no overlap) — never stored.
// Overlap % = geodesic area(ZCTA ∩ polygon) / geodesic area(ZCTA) × 100 (turf.area: spherical,
// WGS84 — not raw degree area).
// County / community labels come from the Census 2020 ZCTA→County and ZCTA→Place relationship
// files (largest land-area overlap); see docs/seo/SERVICE-AREA-MAP-AUDIT.md.
import { readFileSync } from 'node:fs';
import * as turf from '@turf/turf';

const MAP_ID = '1ng1VSm4xqVtoWQ-JoSgasdx6ww7p86g';
const TIGERWEB =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query';

const kml = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : await (await fetch(`https://www.google.com/maps/d/kml?mid=${MAP_ID}&forcekml=1`)).text();

const coords = kml
  .match(/<coordinates>([\s\S]*?)<\/coordinates>/)[1]
  .trim()
  .split(/\s+/)
  .map((c) => c.split(',').slice(0, 2).map(Number));
const polygon = turf.polygon([coords]);

const response = await fetch(TIGERWEB, {
  method: 'POST',
  body: new URLSearchParams({
    f: 'geojson',
    where: '1=1',
    geometry: JSON.stringify({ rings: [coords], spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPolygon',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'ZCTA5,INTPTLAT,INTPTLON,POP100',
    outSR: '4326',
    returnGeometry: 'true',
  }),
});
const { features } = await response.json();

const LIMITED_MIN_OVERLAP_PERCENT = 1;

const rows = features
  .map((f) => {
    const point = turf.point([Number(f.properties.INTPTLON), Number(f.properties.INTPTLAT)]);
    const shared = turf.intersect(turf.featureCollection([polygon, f]));
    const overlapPercent = shared ? (turf.area(shared) / turf.area(f)) * 100 : 0;
    const confirmed = turf.booleanPointInPolygon(point, polygon);
    const status = confirmed
      ? 'confirmed'
      : overlapPercent >= LIMITED_MIN_OVERLAP_PERCENT
        ? 'limited'
        : 'outside';
    return {
      zip: f.properties.ZCTA5,
      status,
      overlapPercent: +overlapPercent.toFixed(2),
      population: f.properties.POP100,
    };
  })
  .sort((a, b) => a.zip.localeCompare(b.zip));

const zips = (status) => rows.filter((r) => r.status === status);
console.log('intersecting ZCTAs:', rows.length);
console.log(
  'confirmed (%d):',
  zips('confirmed').length,
  zips('confirmed')
    .map((r) => r.zip)
    .join(' '),
);
console.log('limited (%d):', zips('limited').length);
for (const r of zips('limited')) console.log('  ', r.zip, r.overlapPercent + '%');
console.log('outside, intersecting (%d):', zips('outside').length);
for (const r of zips('outside')) console.log('  ', r.zip, r.overlapPercent + '%');
