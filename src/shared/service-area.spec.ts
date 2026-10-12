import {
  CONFIRMED_COMMUNITIES,
  LIMITED_SERVICE_AREA_ZIPS,
  LIMITED_SERVICE_AREA_ZIP_CODES,
  SERVICE_AREA_ZIPS,
  SERVICE_AREA_ZIP_LIST_LENGTH,
  SUPPORTED_SERVICE_ZIP_CODES,
  ZIP_LENGTH,
  ZIP_PATTERN,
  checkZip,
  checkZipAgainst,
  isSupportedServiceZip,
  normalizeZipCode,
  sanitizeZipInput,
  serviceAreaZipInfo,
} from './service-area';

/** The 2020 Census ZCTAs whose internal point lies inside the Google My Maps polygon. */
const POLYGON_ZIPS = [
  '95603',
  '95605',
  '95608',
  '95610',
  '95616',
  '95618',
  '95621',
  '95624',
  '95626',
  '95628',
  '95630',
  '95639',
  '95648',
  '95650',
  '95652',
  '95655',
  '95658',
  '95659',
  '95660',
  '95661',
  '95662',
  '95663',
  '95664',
  '95668',
  '95670',
  '95671',
  '95673',
  '95677',
  '95678',
  '95681',
  '95683',
  '95691',
  '95742',
  '95746',
  '95747',
  '95758',
  '95762',
  '95765',
  '95776',
  '95811',
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
  '95837',
  '95838',
  '95841',
  '95842',
  '95843',
  '95864',
] as const;

describe('polygon-derived service-area ZIP data', () => {
  it('is the exact 68-ZCTA list derived from the drawn polygon', () => {
    expect(SERVICE_AREA_ZIPS.map((row) => row.zip)).toEqual([...POLYGON_ZIPS]);
    expect(SUPPORTED_SERVICE_ZIP_CODES.size).toBe(68);
  });

  it('has no duplicates and only well-formed, sorted 5-digit ZIPs', () => {
    expect(SERVICE_AREA_ZIP_LIST_LENGTH).toBe(SUPPORTED_SERVICE_ZIP_CODES.size);
    const zips = SERVICE_AREA_ZIPS.map((row) => row.zip);
    expect(zips.every((zip) => /^[0-9]{5}$/.test(zip))).toBe(true);
    expect(zips).toEqual([...zips].sort());
  });

  it.each(['95658', '95659', '95663', '95664', '95668', '95681'])(
    'newly includes %s (inside the polygon, absent from the old county list)',
    (zip) => {
      expect(checkZip(zip)).toEqual({ status: 'confirmed', zip });
    },
  );

  it.each(['94203', '95615', '95617', '95682', '95692', '95759', '95812', '95836', '95899'])(
    'is outside for %s (< 1% overlap, or no polygon geography)',
    (zip) => {
      expect(checkZip(zip)).toEqual({ status: 'outside', zip });
    },
  );

  it.each(['95814', '95630', '95742', '95624', '95661', '95762', '95616'])(
    'still includes %s',
    (zip) => {
      expect(isSupportedServiceZip(zip)).toBe(true);
    },
  );

  it('keeps edge ZIPs (polygon intersects, internal point outside) out of the list', () => {
    for (const zip of ['95602', '95612', '95620', '95674', '95693', '95695', '95757']) {
      expect(SUPPORTED_SERVICE_ZIP_CODES.has(zip)).toBe(false);
    }
  });

  it('derives communities and counties from the ZIP table only', () => {
    expect(serviceAreaZipInfo('95630')).toEqual({
      zip: '95630',
      county: 'Sacramento County',
      community: 'Folsom',
    });
    expect(serviceAreaZipInfo('95762')?.county).toBe('El Dorado County');
    expect(serviceAreaZipInfo('90210')).toBeNull();
    for (const community of CONFIRMED_COMMUNITIES) {
      for (const zip of community.zips) {
        expect(serviceAreaZipInfo(zip)?.community).toBe(community.name);
      }
    }
  });

  it('does not confirm whole counties: no Cameron Park and no countywide Sacramento ZIPs', () => {
    expect(CONFIRMED_COMMUNITIES.some((c) => c.name === 'Cameron Park')).toBe(false);
    expect(SUPPORTED_SERVICE_ZIP_CODES.has('95757')).toBe(false);
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
    expect(checkZip('95814')).toEqual({ status: 'confirmed', zip: '95814' });
    expect(checkZip('95630')).toEqual({ status: 'confirmed', zip: '95630' });
    expect(checkZip('90210')).toEqual({ status: 'outside', zip: '90210' });
  });

  it('no longer supports ZIP+4 or padded input (they are invalid, not converted)', () => {
    expect(checkZip('95814-0001')).toEqual({ status: 'invalid' });
    expect(checkZip(' 95630 ')).toEqual({ status: 'invalid' });
  });

  it('checks the format BEFORE the service area: malformed input is never "outside"', () => {
    expect(checkZip('9581').status).toBe('invalid');
    expect(checkZip('90210').status).toBe('outside');
  });
});

describe('limited (partial) coverage: >= 1% of the ZIP inside the polygon', () => {
  const EXPECTED_LIMITED = [
    '95602',
    '95612',
    '95614',
    '95620',
    '95645',
    '95672',
    '95674',
    '95693',
    '95695',
    '95757',
    '95949',
  ];

  it('is the exact derived list of 11 ZIPs, sorted, 5 digits, no duplicates', () => {
    const zips = LIMITED_SERVICE_AREA_ZIPS.map((row) => row.zip);
    expect(zips).toEqual(EXPECTED_LIMITED);
    expect(new Set(zips).size).toBe(zips.length);
    expect(zips.every((zip) => /^[0-9]{5}$/.test(zip))).toBe(true);
    expect(LIMITED_SERVICE_AREA_ZIP_CODES.size).toBe(11);
  });

  it('is disjoint from the confirmed list', () => {
    for (const row of LIMITED_SERVICE_AREA_ZIPS) {
      expect(SUPPORTED_SERVICE_ZIP_CODES.has(row.zip)).toBe(false);
    }
  });

  it('only holds ZIPs with at least 1% overlap', () => {
    for (const row of LIMITED_SERVICE_AREA_ZIPS) {
      expect(row.overlapPercent).toBeGreaterThanOrEqual(1);
      expect(row.overlapPercent).toBeLessThanOrEqual(100);
    }
  });

  it.each(['95602', '95757', '95614', '95949'])('classifies %s as limited', (zip) => {
    expect(checkZip(zip)).toEqual({ status: 'limited', zip });
  });

  it('keeps the old "Cameron Park" ZIP 95682 (0.94% overlap) outside, not limited', () => {
    expect(checkZip('95682')).toEqual({ status: 'outside', zip: '95682' });
  });

  it('never weakens a confirmed ZIP into limited', () => {
    expect(checkZip('95814')).toEqual({ status: 'confirmed', zip: '95814' });
    expect(checkZip('95762')).toEqual({ status: 'confirmed', zip: '95762' });
  });

  it('classifies via the supplied sets and treats a ZIP in both as confirmed', () => {
    const both: ReadonlySet<string> = new Set(['95630']);
    expect(checkZipAgainst('95630', both, both)).toEqual({ status: 'confirmed', zip: '95630' });
    expect(checkZipAgainst('95602', both, new Set(['95602']))).toEqual({
      status: 'limited',
      zip: '95602',
    });
  });
});

describe('service-area decision', () => {
  it('decides only via the supplied set and never coerces malformed input', () => {
    const onlyOneZip: ReadonlySet<string> = new Set(['95630']);
    expect(checkZipAgainst('95814', onlyOneZip)).toEqual({ status: 'outside', zip: '95814' });
    expect(checkZipAgainst('95630', onlyOneZip)).toEqual({ status: 'confirmed', zip: '95630' });
    for (const bad of ['9581', '958140', 'ABCDE', '']) {
      expect(checkZipAgainst(bad, new Set([bad]))).toEqual({ status: 'invalid' });
    }
  });
});
