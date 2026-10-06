import { CONFIRMED_NEARBY_COMMUNITIES } from '../../shared/service-area';
import {
  SERVICE_AREA_CHIPS,
  SERVICE_AREA_COMMUNITIES,
  SERVICE_AREA_GROUPS,
  SERVICE_AREA_SUMMARY,
} from './service-area.data';

describe('service-area UI data', () => {
  it('has the four groups, with only Sacramento County countywide', () => {
    expect(SERVICE_AREA_GROUPS.map((g) => [g.county, g.countywide])).toEqual([
      ['Sacramento County', true],
      ['Placer County', false],
      ['Yolo County', false],
      ['El Dorado County', false],
    ]);
    expect(SERVICE_AREA_GROUPS[0].communities).toEqual([]);
  });

  it('lists the confirmed communities per county in display order', () => {
    const byCounty = Object.fromEntries(SERVICE_AREA_GROUPS.map((g) => [g.county, g.communities]));
    expect(byCounty['Placer County']).toEqual([
      'Roseville',
      'Rocklin',
      'Lincoln',
      'Loomis',
      'Granite Bay',
      'Auburn',
    ]);
    expect(byCounty['Yolo County']).toEqual(['West Sacramento', 'Davis', 'Woodland']);
    expect(byCounty['El Dorado County']).toEqual(['El Dorado Hills', 'Cameron Park']);
  });

  it('derives every list from the single shared community table (no contradictory copies)', () => {
    expect(SERVICE_AREA_COMMUNITIES).toEqual(CONFIRMED_NEARBY_COMMUNITIES.map((c) => c.name));
    expect(SERVICE_AREA_COMMUNITIES).toHaveLength(11);
    expect(SERVICE_AREA_CHIPS).toEqual(['Sacramento County', ...SERVICE_AREA_COMMUNITIES]);
    expect(SERVICE_AREA_CHIPS).toHaveLength(12);
  });

  it('describes the area without whole-county claims for Placer / Yolo / El Dorado', () => {
    expect(SERVICE_AREA_SUMMARY).toBe(
      'Serving Sacramento County and confirmed nearby communities across the Greater Sacramento area.',
    );
    expect(SERVICE_AREA_SUMMARY).not.toMatch(/Placer|Yolo|El Dorado/);
  });
});
