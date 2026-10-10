import { webcrypto } from 'node:crypto';
import { TestBed } from '@angular/core/testing';
import {
  AppointmentDraftService,
  DRAFT_TTL_MS,
  DRAFT_VERSION,
  DraftPlain,
  DraftSensitive,
  KEY_STORAGE_KEY,
  PLAIN_STORAGE_KEY,
  SECRET_STORAGE_KEY,
} from './appointment-draft.service';

const NOW = 1_800_000_000_000;

const plain = (overrides: Partial<DraftPlain> = {}): DraftPlain => ({
  version: DRAFT_VERSION,
  savedAt: NOW,
  step: 2,
  service: 'Loan Signing',
  zip: '95814',
  preferredDate: '2027-03-02',
  timePreference: 'specific',
  specificTime: '14:30',
  signers: '2',
  language: 'Ukrainian',
  photosSelected: true,
  ...overrides,
});

const sensitive: DraftSensitive = {
  firstName: 'Мирослава',
  lastName: "O'Connor",
  phone: '(279) 555-0100',
  email: 'secret.person@example.com',
  details: 'Closing documents for the Maple Street trust',
};

const allStorage = (): string =>
  JSON.stringify(
    Object.fromEntries(Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)])),
  );

describe('AppointmentDraftService', () => {
  let service: AppointmentDraftService;

  beforeEach(() => {
    if (!globalThis.crypto?.subtle) {
      vi.stubGlobal('crypto', webcrypto);
    }
    sessionStorage.clear();
    localStorage.clear();
    service = TestBed.inject(AppointmentDraftService);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('round-trips a draft: plain part and sealed personal data', async () => {
    await service.save(plain(), sensitive);
    const loaded = await service.load(NOW + 1000);
    expect(loaded?.plain).toEqual(plain());
    expect(loaded?.sensitive).toEqual(sensitive);
  });

  it('never leaves personal data readable in storage (and never uses localStorage)', async () => {
    await service.save(plain(), sensitive);
    const raw = allStorage();
    for (const secret of [
      'Мирослава',
      'Мирослава'.toLowerCase(),
      "O'Connor",
      '555-0100',
      '(279)',
      'secret.person',
      'example.com',
      'Maple Street',
    ]) {
      expect(raw).not.toContain(secret);
    }
    // the plain part holds only the non-sensitive wizard fields
    expect(sessionStorage.getItem(PLAIN_STORAGE_KEY)).toContain('95814');
    expect(Object.keys(sessionStorage).sort()).toEqual(
      [KEY_STORAGE_KEY, PLAIN_STORAGE_KEY, SECRET_STORAGE_KEY].sort(),
    );
    expect(localStorage.length).toBe(0);
  });

  it('stores no consent, photo data or Turnstile token field at all', async () => {
    await service.save(plain(), sensitive);
    const raw = allStorage().toLowerCase();
    for (const forbidden of ['consent', 'turnstile', 'token', 'blob:', 'base64', 'image/']) {
      expect(raw).not.toContain(forbidden);
    }
    expect(JSON.parse(sessionStorage.getItem(PLAIN_STORAGE_KEY) as string)).not.toHaveProperty(
      'files',
    );
  });

  it('uses a fresh random IV for every save', async () => {
    await service.save(plain(), sensitive);
    const first = sessionStorage.getItem(SECRET_STORAGE_KEY);
    await service.save(plain({ savedAt: NOW + 1 }), sensitive);
    expect(sessionStorage.getItem(SECRET_STORAGE_KEY)).not.toBe(first);
  });

  it('discards (and wipes) a draft older than two hours', async () => {
    await service.save(plain(), sensitive);
    expect(await service.load(NOW + DRAFT_TTL_MS - 1)).not.toBeNull();
    expect(await service.load(NOW + DRAFT_TTL_MS + 1)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('discards an unsupported version', async () => {
    await service.save(plain(), sensitive);
    sessionStorage.setItem(PLAIN_STORAGE_KEY, JSON.stringify({ ...plain(), version: 99 }));
    expect(await service.load(NOW)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['a non-object', '"hello"'],
    ['an unknown service', JSON.stringify({ ...plain(), service: 'Hacking' })],
    ['a bad step', JSON.stringify({ ...plain(), step: 9 })],
    ['a malformed ZIP', JSON.stringify({ ...plain(), zip: '9<script>' })],
    ['a bad date', JSON.stringify({ ...plain(), preferredDate: 'tomorrow' })],
    ['a future timestamp', JSON.stringify({ ...plain(), savedAt: NOW + 10 * 60_000 })],
  ])('discards a corrupt plain part: %s', async (_name, value) => {
    sessionStorage.setItem(PLAIN_STORAGE_KEY, value);
    expect(await service.load(NOW)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('discards the whole draft when the sealed part is tampered with', async () => {
    await service.save(plain(), sensitive);
    const envelope = JSON.parse(sessionStorage.getItem(SECRET_STORAGE_KEY) as string);
    envelope.ct = envelope.ct.slice(0, -4) + 'AAAA';
    sessionStorage.setItem(SECRET_STORAGE_KEY, JSON.stringify(envelope));
    expect(await service.load(NOW)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('discards the draft when the sealed part belongs to another save (timestamp mismatch)', async () => {
    await service.save(plain(), sensitive);
    sessionStorage.setItem(PLAIN_STORAGE_KEY, JSON.stringify(plain({ savedAt: NOW + 5 })));
    expect(await service.load(NOW + 10)).toBeNull();
  });

  it('discards the draft when the key is gone (e.g. storage partially cleared)', async () => {
    await service.save(plain(), sensitive);
    sessionStorage.removeItem(KEY_STORAGE_KEY);
    expect(await service.load(NOW)).toBeNull();
  });

  it('clear() removes everything, and a save still in flight cannot bring it back', async () => {
    const pending = service.save(plain(), sensitive);
    service.clear();
    await pending;
    expect(sessionStorage.length).toBe(0);
    expect(await service.load(NOW)).toBeNull();
  });

  it('without Web Crypto it keeps the plain part only and no personal data', async () => {
    vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
    await service.save(plain(), sensitive);
    expect(sessionStorage.getItem(SECRET_STORAGE_KEY)).toBeNull();
    expect(allStorage()).not.toContain('secret.person');
    const loaded = await service.load(NOW);
    expect(loaded?.plain.zip).toBe('95814');
    expect(loaded?.sensitive).toBeNull();
  });

  it('never throws when storage is blocked', async () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    await expect(service.save(plain(), sensitive)).resolves.toBeUndefined();
    await expect(service.load(NOW)).resolves.toBeNull();
    expect(() => service.clear()).not.toThrow();
  });
});
