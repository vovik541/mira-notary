import { CONFIRMED_COMMUNITIES, SUPPORTED_SERVICE_ZIP_CODES } from '../../shared/service-area';
import {
  SERVICE_AREA_CHIPS,
  SERVICE_AREA_COMMUNITIES,
  SERVICE_AREA_COUNTIES_LABEL,
  SERVICE_AREA_GROUPS,
  SERVICE_AREA_SUMMARY,
} from './service-area.data';

describe('service-area UI data', () => {
  it('groups key communities by county, with no countywide claim', () => {
    expect(SERVICE_AREA_GROUPS.map((g) => g.county)).toEqual([
      'Sacramento County',
      'Placer County',
      'Yolo County',
      'El Dorado County',
    ]);
    expect(SERVICE_AREA_GROUPS.every((g) => g.communities.length > 0)).toBe(true);
    expect(JSON.stringify(SERVICE_AREA_GROUPS)).not.toMatch(/countywide/i);
  });

  it('lists the polygon-confirmed communities per county', () => {
    const byCounty = Object.fromEntries(SERVICE_AREA_GROUPS.map((g) => [g.county, g.communities]));
    expect(byCounty['Placer County']).toEqual([
      'Auburn',
      'Granite Bay',
      'Lincoln',
      'Loomis',
      'Newcastle',
      'Rocklin',
      'Roseville',
    ]);
    expect(byCounty['Yolo County']).toEqual(['Davis', 'West Sacramento', 'Woodland']);
    expect(byCounty['El Dorado County']).toEqual(['El Dorado Hills']);
    expect(byCounty['Sacramento County']).toContain('Sacramento');
    expect(byCounty['Sacramento County']).toContain('Elk Grove');
  });

  it('does not display communities outside the polygon', () => {
    for (const name of ['Cameron Park', 'Galt', 'Placerville', 'Sutter']) {
      expect(SERVICE_AREA_COMMUNITIES).not.toContain(name);
    }
  });

  it('derives every list from the single shared ZIP table', () => {
    expect([...SERVICE_AREA_COMMUNITIES].sort()).toEqual(
      CONFIRMED_COMMUNITIES.map((c) => c.name).sort(),
    );
    for (const community of CONFIRMED_COMMUNITIES) {
      expect(community.zips.every((zip) => SUPPORTED_SERVICE_ZIP_CODES.has(zip))).toBe(true);
    }
    expect(SERVICE_AREA_CHIPS.every((c) => SERVICE_AREA_COMMUNITIES.includes(c))).toBe(true);
    expect(SERVICE_AREA_CHIPS).toHaveLength(10);
    expect(SERVICE_AREA_COUNTIES_LABEL).toBe('Sacramento, Placer, Yolo and El Dorado');
  });

  it('names communities, never whole counties', () => {
    expect(SERVICE_AREA_SUMMARY).toBe(
      'Mira serves Sacramento and nearby communities across the Greater Sacramento area.',
    );
    expect(SERVICE_AREA_SUMMARY).not.toMatch(/all of|entire|whole|countywide|County/i);
  });
});
