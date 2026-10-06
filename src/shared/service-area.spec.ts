import {
  SACRAMENTO_COUNTY_ZIP_CODES,
  SACRAMENTO_COUNTY_ZIP_LIST_LENGTH,
  ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES,
  ADDITIONAL_CONFIRMED_SERVICE_ZIP_LIST_LENGTH,
  CONFIRMED_NEARBY_COMMUNITIES,
  SUPPORTED_SERVICE_ZIP_CODES,
  ZIP_LENGTH,
  ZIP_PATTERN,
  checkZip,
  checkZipAgainst,
  confirmedCommunityForZip,
  isSacramentoCountyZip,
  isSupportedServiceZip,
  normalizeZipCode,
  sanitizeZipInput,
} from './service-area';

describe('Sacramento County ZIP data', () => {
  it('contains exactly 131 ZIP codes', () => {
    expect(SACRAMENTO_COUNTY_ZIP_CODES.size).toBe(131);
  });

  it('has no accidental duplicates in the source list', () => {
    expect(SACRAMENTO_COUNTY_ZIP_LIST_LENGTH).toBe(SACRAMENTO_COUNTY_ZIP_CODES.size);
  });

  it('only holds well-formed 5-digit ZIPs', () => {
    for (const zip of SACRAMENTO_COUNTY_ZIP_CODES) {
      expect(zip).toMatch(/^\d{5}$/);
    }
  });

  it('keeps the 942xx, PO Box and special ZIPs (nothing silently removed)', () => {
    for (const zip of ['94203', '94299', '95899', '95894', '95860']) {
      expect(SACRAMENTO_COUNTY_ZIP_CODES.has(zip)).toBe(true);
    }
  });

  it.each(['95814', '95630', '95742', '95624'])('includes %s', (zip) => {
    expect(isSacramentoCountyZip(zip)).toBe(true);
  });

  it.each(['90210', '10001', '95603', '95712'])('does not include %s', (zip) => {
    expect(isSacramentoCountyZip(zip)).toBe(false);
  });
});

describe('ZIP syntax: exactly five digits', () => {
  it('uses the strict pattern ^\d{5}$', () => {
    expect(ZIP_PATTERN.source).toBe('^\\d{5}$');
    expect(ZIP_LENGTH).toBe(5);
  });
});

describe('normalizeZipCode (validation only: no trimming, no ZIP+4, no coercion)', () => {
  it.each(['95814', '95630', '00501', '90210'])('accepts exactly five digits: %s', (input) => {
    expect(normalizeZipCode(input)).toBe(input);
  });

  it.each([
    '',
    '9',
    '95',
    '958',
    '9581',
    '958140',
    '123456789',
    'ABCDE',
    '9581A',
    '95814-1234',
    '95814-12',
    '95814-',
    '95814 1234',
    ' 95814',
    '95814 ',
    ' 95814 ',
    '\t95814\n',
    '   ',
    'x95814',
    '95.14',
    '9e814',
    '+5814',
    '95814\n',
  ])('rejects %j without converting it into a ZIP', (input) => {
    expect(normalizeZipCode(input)).toBeNull();
  });

  it('rejects non-strings', () => {
    expect(normalizeZipCode(null)).toBeNull();
    expect(normalizeZipCode(undefined)).toBeNull();
  });
});

describe('sanitizeZipInput (typing / paste only; separate from validation)', () => {
  it.each([
    ['95814', '95814'],
    ['95a81-4', '95814'],
    ['123456', '12345'],
    ['123456789', '12345'],
    ['95814-1234', '95814'],
    [' 95 814 ', '95814'],
    ['9581A', '9581'],
    ['abc', ''],
    ['', ''],
    ['9', '9'],
    ['e+-.', ''],
  ])('sanitizes %j → %j', (input, expected) => {
    expect(sanitizeZipInput(input)).toBe(expected);
  });

  it('handles non-strings', () => {
    expect(sanitizeZipInput(null)).toBe('');
    expect(sanitizeZipInput(undefined)).toBe('');
  });

  it('never decides validity: a sanitized partial value is still not a valid ZIP', () => {
    expect(normalizeZipCode(sanitizeZipInput('9581'))).toBeNull();
    expect(normalizeZipCode(sanitizeZipInput('95a81-4'))).toBe('95814');
  });
});

describe('checkZip', () => {
  it('classifies invalid, supported and unconfirmed ZIPs', () => {
    expect(checkZip('abc')).toEqual({ status: 'invalid' });
    expect(checkZip('')).toEqual({ status: 'invalid' });
    expect(checkZip('9581')).toEqual({ status: 'invalid' });
    expect(checkZip('958140')).toEqual({ status: 'invalid' });
    expect(checkZip('95814')).toEqual({ status: 'supported', zip: '95814' });
    expect(checkZip('95630')).toEqual({ status: 'supported', zip: '95630' });
    expect(checkZip('90210')).toEqual({ status: 'unconfirmed', zip: '90210' });
  });

  it('no longer supports ZIP+4 or padded input (they are invalid, not converted)', () => {
    expect(checkZip('95814-0001')).toEqual({ status: 'invalid' });
    expect(checkZip(' 95630 ')).toEqual({ status: 'invalid' });
  });

  it('checks the format BEFORE the service area: malformed input is never "unconfirmed"', () => {
    expect(checkZip('9581').status).toBe('invalid');
    expect(checkZip('90210').status).toBe('unconfirmed');
  });
});

const ADDITIONAL_ZIPS = [
  '95602',
  '95603',
  '95605',
  '95616',
  '95617',
  '95618',
  '95648',
  '95650',
  '95661',
  '95677',
  '95678',
  '95682',
  '95691',
  '95695',
  '95746',
  '95747',
  '95762',
  '95765',
  '95776',
] as const;

describe('confirmed nearby communities (Greater Sacramento)', () => {
  it('has exactly the 19 confirmed additional ZIPs (no duplicates)', () => {
    expect(ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES.size).toBe(19);
    expect(ADDITIONAL_CONFIRMED_SERVICE_ZIP_LIST_LENGTH).toBe(19);
    expect([...ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES].sort()).toEqual([...ADDITIONAL_ZIPS]);
  });

  it('keeps the Sacramento County reference set untouched at exactly 131 ZIPs', () => {
    expect(SACRAMENTO_COUNTY_ZIP_CODES.size).toBe(131);
    for (const zip of ADDITIONAL_ZIPS) {
      expect(SACRAMENTO_COUNTY_ZIP_CODES.has(zip)).toBe(false);
    }
  });

  it('has no overlap between the Sacramento County set and the additional set', () => {
    const overlap = [...ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES].filter((zip) =>
      SACRAMENTO_COUNTY_ZIP_CODES.has(zip),
    );
    expect(overlap).toEqual([]);
  });

  it('builds the supported set as the exact union: 131 + 19 = 150 (actual Set size)', () => {
    const union = new Set([
      ...SACRAMENTO_COUNTY_ZIP_CODES,
      ...ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES,
    ]);
    expect(SUPPORTED_SERVICE_ZIP_CODES.size).toBe(150);
    expect(SUPPORTED_SERVICE_ZIP_CODES.size).toBe(union.size);
    for (const zip of union) {
      expect(SUPPORTED_SERVICE_ZIP_CODES.has(zip)).toBe(true);
    }
  });

  it('does not include Auburn PO Box ZIP 95604', () => {
    expect(SUPPORTED_SERVICE_ZIP_CODES.has('95604')).toBe(false);
    expect(checkZip('95604')).toEqual({ status: 'unconfirmed', zip: '95604' });
  });

  it.each([
    [
      'Placer County',
      ['95661', '95678', '95747', '95677', '95765', '95648', '95650', '95746', '95602', '95603'],
    ],
    ['Yolo County', ['95605', '95691', '95616', '95617', '95618', '95695', '95776']],
    ['El Dorado County', ['95762', '95682']],
  ] as [string, string[]][])('supports every confirmed %s ZIP', (_county, zips) => {
    for (const zip of zips) {
      expect(checkZip(zip)).toEqual({ status: 'supported', zip });
      expect(isSupportedServiceZip(zip)).toBe(true);
    }
  });

  it.each([
    ['95691', 'West Sacramento'],
    ['95616', 'Davis'],
    ['95695', 'Woodland'],
    ['95603', 'Auburn'],
    ['95762', 'El Dorado Hills'],
    ['95682', 'Cameron Park'],
  ])('%s (%s) is supported but is NOT a Sacramento County ZIP', (zip, community) => {
    expect(isSacramentoCountyZip(zip)).toBe(false);
    expect(isSupportedServiceZip(zip)).toBe(true);
    expect(confirmedCommunityForZip(zip)?.name).toBe(community);
  });

  it('keeps 90210 valid-format but unconfirmed', () => {
    expect(checkZip('90210')).toEqual({ status: 'unconfirmed', zip: '90210' });
  });

  it('maps no Sacramento County ZIP to a nearby community', () => {
    expect(confirmedCommunityForZip('95814')).toBeNull();
  });

  it('only confirms communities in the three nearby counties', () => {
    const counties = new Set(CONFIRMED_NEARBY_COMMUNITIES.map((c) => c.county));
    expect([...counties].sort()).toEqual(['El Dorado County', 'Placer County', 'Yolo County']);
    expect(CONFIRMED_NEARBY_COMMUNITIES).toHaveLength(11);
  });
});

describe('county membership vs. confirmed service area (separate concepts)', () => {
  it('keeps the reference set separate from the service set', () => {
    expect(SACRAMENTO_COUNTY_ZIP_CODES.size).toBe(131);
    expect(SACRAMENTO_COUNTY_ZIP_CODES).not.toBe(SUPPORTED_SERVICE_ZIP_CODES);
    expect(SUPPORTED_SERVICE_ZIP_CODES.size).toBeGreaterThan(SACRAMENTO_COUNTY_ZIP_CODES.size);
  });

  it('accepts every Sacramento County ZIP online (the service set is a superset)', () => {
    for (const zip of SACRAMENTO_COUNTY_ZIP_CODES) {
      expect(SUPPORTED_SERVICE_ZIP_CODES.has(zip)).toBe(true);
    }
  });

  it('decides via the SERVICE set, not the county set: a county ZIP can be unconfirmed', () => {
    const onlyOneZip: ReadonlySet<string> = new Set(['95630']);
    expect(isSacramentoCountyZip('95814')).toBe(true);
    expect(checkZipAgainst('95814', onlyOneZip)).toEqual({ status: 'unconfirmed', zip: '95814' });
    expect(checkZipAgainst('95630', onlyOneZip)).toEqual({ status: 'supported', zip: '95630' });
  });

  it('still never coerces malformed input into a supported ZIP', () => {
    for (const bad of ['9581', '958140', 'ABCDE', '']) {
      expect(checkZipAgainst(bad, new Set(['9581', '958140', 'ABCDE', '']))).toEqual({
        status: 'invalid',
      });
    }
  });
});
