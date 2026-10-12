# Service Area Map & ZIP Audit

Processed: 2026-10-11. Source of truth for geography: the **public** Google My Maps service-area
polygon (map id `1ng1VSm4xqVtoWQ-JoSgasdx6ww7p86g`, embed/viewer only — no editor URL, no private
account data, no home address).

## What this is

The map is Mira's drawn service area. The site's ZIP checker, Contact-form advisory, Worker and
the displayed counties/communities all read ONE list: `src/shared/service-area-zips.ts`
(re-exported through `src/shared/service-area.ts`). That list was **derived from the polygon**, not
copied from the previous Sacramento County list.

**The polygon and the ZIP list do NOT synchronize automatically.** If the polygon is edited in
Google My Maps, re-run the derivation (below) and update `service-area-zips.ts`. The site never
fetches Google at runtime.

## Method

1. KML downloaded from the public map (`https://www.google.com/maps/d/kml?mid=<id>&forcekml=1`):
   one polygon, 9 vertices, ≈ 3,800 km².
2. Dataset: **US Census Bureau TIGERweb 2020 ZIP Code Tabulation Areas (ZCTA5)**, queried for every
   ZCTA intersecting the polygon (82 ZCTAs).
3. Three statuses, computed for every intersecting ZCTA:
   - **confirmed** — the ZCTA's Census internal (representative) point lies inside the polygon
     (turf.js `booleanPointInPolygon`);
   - **limited** — not confirmed, but overlap ≥ 1.0%, where overlap = geodesic area(ZCTA ∩ polygon) ÷
     geodesic area(ZCTA) × 100 (`turf.area`: spherical WGS84 area, not raw degree area);
   - **outside** — overlap < 1.0% or no intersection (not stored).
4. Labels: county = largest land-area county of the ZCTA, community = largest-overlap Census place,
   from the Census 2020 ZCTA→County and ZCTA→Place relationship files. A community name is shown
   publicly only when the ZCTA has ≥ 5,000 residents and is not unincorporated; rural/low-population
   ZCTAs stay in the ZIP checker but are not advertised as named communities.
5. Reproduce: `node scripts/service-area/derive-zips.mjs` (needs `npm i --no-save @turf/turf`).

Caveat: USPS ZIP Codes have no official polygons; ZCTAs are the Census approximation. PO-box-only
and unique ZIPs have no ZCTA geography and therefore cannot be placed in a polygon (the old list
contained many, e.g. 942xx, 95812, 95813, 95899). Customers in those ZIPs still see "ask about
availability", never "not served".

## Result

- Previous supported ZIPs: **150** (131 Sacramento County reference ZIPs + 19 nearby-community ZIPs).
- New **confirmed** ZIPs (ZCTAs): **68**. Kept from the old list: 62. Plus **11 limited** ZIPs (below).
- **Added (6)**: 95658, 95659, 95663, 95664, 95668, 95681 (Newcastle, Sutter-County rural ZCTAs 95659/95668, El Dorado 95664, Sheridan, Penryn).
- **No longer confirmed (88)** (of which 95602, 95693, 95695 and 95757 are now _limited_): 94203, 94204, 94205, 94206, 94207, 94208, 94209, 94211, 94229, 94230, 94232, 94234, 94235, 94236, 94237, 94239, 94240, 94244, 94245, 94247, 94248, 94249, 94250, 94252, 94254, 94256, 94257, 94258, 94259, 94261, 94262, 94263, 94267, 94268, 94269, 94271, 94273, 94274, 94277, 94278, 94279, 94280, 94282, 94283, 94284, 94285, 94287, 94288, 94289, 94290, 94291, 94293, 94294, 94295, 94296, 94297, 94298, 94299, 95602, 95609, 95611, 95615, 95617, 95632, 95638, 95641, 95680, 95682, 95690, 95693, 95695, 95741, 95757, 95759, 95763, 95812, 95813, 95836, 95840, 95851, 95852, 95853, 95860, 95865, 95866, 95867, 95894, 95899.
  Notable: Cameron Park 95682 (0.94% inside, still outside), Davis 95617 (outside), Woodland 95695,
  Elk Grove 95757 and Auburn 95602 (now limited), all 942xx / PO-box / unique ZIPs (outside).
- Moved outside → limited in this revision (previously treated as outside): 95602, 95612, 95614,
  95620, 95645, 95672, 95674, 95693, 95695, 95757, 95949.

### Displayed counties and communities

- **Placer County**: Auburn, Granite Bay, Lincoln, Loomis, Newcastle, Rocklin, Roseville
- **Yolo County**: Davis, West Sacramento, Woodland
- **Sacramento County**: Antelope, Arden-Arcade, Carmichael, Citrus Heights, Elk Grove, Elverta, Fair Oaks, Florin, Folsom, Foothill Farms, North Highlands, Orangevale, Rancho Cordova, Rancho Murieta, Rio Linda, Sacramento, Vineyard
- **El Dorado County**: El Dorado Hills

Sutter County has two ZCTAs inside the polygon (95659, 95668) but no named community; they remain
accepted by the ZIP checker and are not advertised.

### "Countywide service"

**Removed.** The polygon covers only part of Sacramento County (Galt 95632 does not touch the
polygon; Wilton 95693 and Elk Grove 95757 are only partly inside), so a countywide claim is
unsupported. No other county is claimed either; only named communities are listed.

### Included ZCTAs (68)

| ZIP   | County            | Displayed community | Population (2020) |
| ----- | ----------------- | ------------------- | ----------------- |
| 95603 | Placer County     | Auburn              | 28021             |
| 95605 | Yolo County       | West Sacramento     | 14204             |
| 95608 | Sacramento County | Carmichael          | 65367             |
| 95610 | Sacramento County | Citrus Heights      | 46592             |
| 95616 | Yolo County       | Davis               | 51003             |
| 95618 | Yolo County       | Davis               | 27472             |
| 95621 | Sacramento County | Citrus Heights      | 42941             |
| 95624 | Sacramento County | Elk Grove           | 66575             |
| 95626 | Sacramento County | Elverta             | 5766              |
| 95628 | Sacramento County | Fair Oaks           | 42824             |
| 95630 | Sacramento County | Folsom              | 74787             |
| 95639 | Sacramento County | —                   | 273               |
| 95648 | Placer County     | Lincoln             | 54483             |
| 95650 | Placer County     | Loomis              | 13446             |
| 95652 | Sacramento County | —                   | 914               |
| 95655 | Sacramento County | —                   | 4767              |
| 95658 | Placer County     | Newcastle           | 6532              |
| 95659 | Sutter County     | —                   | 724               |
| 95660 | Sacramento County | North Highlands     | 35368             |
| 95661 | Placer County     | Roseville           | 32847             |
| 95662 | Sacramento County | Orangevale          | 32688             |
| 95663 | Placer County     | —                   | 2905              |
| 95664 | El Dorado County  | —                   | 1329              |
| 95668 | Sutter County     | —                   | 872               |
| 95670 | Sacramento County | Rancho Cordova      | 57988             |
| 95671 | Sacramento County | Folsom              | 5667              |
| 95673 | Sacramento County | Rio Linda           | 16290             |
| 95677 | Placer County     | Rocklin             | 28351             |
| 95678 | Placer County     | Roseville           | 45136             |
| 95681 | Placer County     | —                   | 1324              |
| 95683 | Sacramento County | Rancho Murieta      | 6550              |
| 95691 | Yolo County       | West Sacramento     | 39849             |
| 95742 | Sacramento County | Rancho Cordova      | 16260             |
| 95746 | Placer County     | Granite Bay         | 22166             |
| 95747 | Placer County     | Roseville           | 75019             |
| 95758 | Sacramento County | Elk Grove           | 64517             |
| 95762 | El Dorado County  | El Dorado Hills     | 47354             |
| 95765 | Placer County     | Rocklin             | 43120             |
| 95776 | Yolo County       | Woodland            | 26612             |
| 95811 | Sacramento County | Sacramento          | 12463             |
| 95814 | Sacramento County | Sacramento          | 12208             |
| 95815 | Sacramento County | Sacramento          | 27838             |
| 95816 | Sacramento County | Sacramento          | 18606             |
| 95817 | Sacramento County | Sacramento          | 14270             |
| 95818 | Sacramento County | Sacramento          | 22375             |
| 95819 | Sacramento County | Sacramento          | 20812             |
| 95820 | Sacramento County | Sacramento          | 36848             |
| 95821 | Sacramento County | Arden-Arcade        | 39310             |
| 95822 | Sacramento County | Sacramento          | 45215             |
| 95823 | Sacramento County | Sacramento          | 81212             |
| 95824 | Sacramento County | Sacramento          | 31524             |
| 95825 | Sacramento County | Arden-Arcade        | 36081             |
| 95826 | Sacramento County | Sacramento          | 39902             |
| 95827 | Sacramento County | Rancho Cordova      | 21566             |
| 95828 | Sacramento County | Florin              | 63116             |
| 95829 | Sacramento County | Vineyard            | 32123             |
| 95830 | Sacramento County | —                   | 1015              |
| 95831 | Sacramento County | Sacramento          | 43099             |
| 95832 | Sacramento County | Sacramento          | 11930             |
| 95833 | Sacramento County | Sacramento          | 40195             |
| 95834 | Sacramento County | Sacramento          | 35617             |
| 95835 | Sacramento County | Sacramento          | 41399             |
| 95837 | Sacramento County | —                   | 242               |
| 95838 | Sacramento County | Sacramento          | 41340             |
| 95841 | Sacramento County | North Highlands     | 21873             |
| 95842 | Sacramento County | Foothill Farms      | 34196             |
| 95843 | Sacramento County | Antelope            | 48234             |
| 95864 | Sacramento County | Arden-Arcade        | 24249             |

### Limited coverage (>= 1% overlap, internal point outside — status = limited)

| ZIP   | City / label                        | County     | Overlap | Status  |
| ----- | ----------------------------------- | ---------- | ------- | ------- |
| 95602 | Auburn area                         | Placer     | 43.45%  | limited |
| 95612 | Clarksburg                          | Yolo       | 46.65%  | limited |
| 95614 | Auburn Lake Trails                  | El Dorado  | 1.59%   | limited |
| 95620 | Dixon                               | Solano     | 16.90%  | limited |
| 95645 | Knights Landing                     | Yolo       | 5.46%   | limited |
| 95672 | Cameron Park / El Dorado Hills area | El Dorado  | 9.59%   | limited |
| 95674 | Rio Oso                             | Sutter     | 25.39%  | limited |
| 95693 | Wilton                              | Sacramento | 35.13%  | limited |
| 95695 | Woodland                            | Yolo       | 24.93%  | limited |
| 95757 | Elk Grove                           | Sacramento | 37.95%  | limited |
| 95949 | Grass Valley area                   | Nevada     | 2.25%   | limited |

Limited ZIPs live in `SERVICE_AREA_LIMITED_ZIP_ROWS` (same file as the confirmed table). They appear
only in the ZIP checker, the appointment-form advisory and the appointment email; they are NOT shown
as confirmed cities and are not used in metadata or SEO copy.

### Intersecting ZCTAs that stay OUTSIDE (< 1% overlap)

| ZIP                  | Overlap |
| -------------------- | ------- |
| 95615 (Courtland)    | 0.06%   |
| 95682 (Cameron Park) | 0.94%   |
| 95692 (Wheatland)    | 0.11%   |

All 82 ZCTAs that intersect the polygon were re-classified: 68 confirmed + 11 limited + 3 outside.

## Public Google actions

- Map viewer: `https://www.google.com/maps/d/viewer?mid=<id>` (centralized in `SERVICE_AREA_MAP`).
- Google review: reused `EXTERNAL_LINKS.googleReview`.
- Google Business Profile: **no verified public URL exists in the project**; `GOOGLE_BUSINESS_PROFILE_URL`
  is `null` and the button is not rendered until one is supplied. The polygon is not the Business
  Profile service-area configuration; edit that separately in Google Business Profile.
