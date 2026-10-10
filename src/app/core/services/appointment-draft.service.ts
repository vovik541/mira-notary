import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { APPOINTMENT_LANGUAGES, APPOINTMENT_SERVICES } from '../../../shared/appointment.model';
import { isTimePreference, isValidTimeOfDay } from '../../../shared/appointment-timing';

/**
 * Session draft of the appointment form, so a refresh (F5) or an accidental navigation does not
 * throw away the user's progress. Tab-scoped sessionStorage only (never localStorage, never the
 * URL, never a server).
 *
 * Two parts:
 *
 * 1. PLAIN (non-sensitive): wizard step, service, ZIP, date, time preference, specific time,
 *    number of signers, language, a "photos were selected" flag, version and timestamp.
 * 2. ENCRYPTED (personal data): first/last name, phone, email and additional details, sealed with
 *    AES-GCM through Web Crypto and stored as an opaque blob.
 *
 * NEVER persisted: the contact consent (must be re-ticked after a reload), photos in any form
 * (files, contents, Base64, object URLs), the Turnstile token.
 *
 * What the encryption is for — and is not: the random key lives in the same sessionStorage (there
 * is nowhere safer in a pure front end), so this does NOT protect against JavaScript running on
 * this origin (XSS, malicious extension) or anyone who can read the live tab's storage. Its purpose
 * is narrower: customer personal data is not left lying around as readable plain text in browser
 * storage (devtools, profile/session files, forensic copies of the session store, accidental
 * screenshots of the Application tab). The data disappears with the tab or after two hours, and is
 * wiped on successful submission.
 */

export const DRAFT_VERSION = 1;
/** A draft older than this is discarded. */
export const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

export const PLAIN_STORAGE_KEY = 'vkh.appt.draft.v1';
export const SECRET_STORAGE_KEY = 'vkh.appt.draft.v1.s';
export const KEY_STORAGE_KEY = 'vkh.appt.draft.v1.k';

export interface DraftPlain {
  readonly version: number;
  readonly savedAt: number;
  readonly step: 1 | 2 | 3;
  readonly service: string;
  readonly zip: string;
  readonly preferredDate: string;
  readonly timePreference: string;
  readonly specificTime: string;
  readonly signers: string;
  readonly language: string;
  /** Only the fact that photos were chosen, so the form can say they must be chosen again. */
  readonly photosSelected: boolean;
}

export interface DraftSensitive {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly email: string;
  readonly details: string;
}

export interface StoredDraft {
  readonly plain: DraftPlain;
  /** `null` when Web Crypto is unavailable or nothing sensitive was saved. */
  readonly sensitive: DraftSensitive | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isString = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;

function validPlain(value: unknown, now: number): DraftPlain | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const v = value as Record<string, unknown>;
  if (
    v['version'] !== DRAFT_VERSION ||
    typeof v['savedAt'] !== 'number' ||
    !Number.isFinite(v['savedAt']) ||
    now - v['savedAt'] > DRAFT_TTL_MS ||
    v['savedAt'] > now + 60_000
  ) {
    return null;
  }
  const step = v['step'];
  if (step !== 1 && step !== 2 && step !== 3) {
    return null;
  }
  const service = v['service'];
  const date = v['preferredDate'];
  const time = v['timePreference'];
  const specific = v['specificTime'];
  const signers = v['signers'];
  const language = v['language'];
  const zip = v['zip'];
  if (
    !isString(service, 100) ||
    !(APPOINTMENT_SERVICES as readonly string[]).includes(service) ||
    !isString(zip, 5) ||
    !/^\d{0,5}$/.test(zip) ||
    !isString(date, 10) ||
    (date !== '' && !ISO_DATE.test(date)) ||
    !isString(time, 20) ||
    (time !== '' && !isTimePreference(time)) ||
    !isString(specific, 5) ||
    (specific !== '' && !isValidTimeOfDay(specific)) ||
    !isString(signers, 3) ||
    !/^\d{0,3}$/.test(signers) ||
    !isString(language, 20) ||
    !(APPOINTMENT_LANGUAGES as readonly string[]).includes(language) ||
    typeof v['photosSelected'] !== 'boolean'
  ) {
    return null;
  }
  return {
    version: DRAFT_VERSION,
    savedAt: v['savedAt'],
    step,
    service,
    zip,
    preferredDate: date,
    timePreference: time,
    specificTime: specific,
    signers,
    language,
    photosSelected: v['photosSelected'],
  };
}

function validSensitive(value: unknown): DraftSensitive | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const v = value as Record<string, unknown>;
  if (
    !isString(v['firstName'], 50) ||
    !isString(v['lastName'], 50) ||
    !isString(v['phone'], 14) ||
    !isString(v['email'], 120) ||
    !isString(v['details'], 3000)
  ) {
    return null;
  }
  return {
    firstName: v['firstName'],
    lastName: v['lastName'],
    phone: v['phone'],
    email: v['email'],
    details: v['details'],
  };
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(text);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

@Injectable({ providedIn: 'root' })
export class AppointmentDraftService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /** Saves run one at a time; clear() bumps this so a late save can never resurrect a draft. */
  private generation = 0;
  private queue: Promise<void> = Promise.resolve();

  /** Saves the draft (best effort: any storage / crypto failure is swallowed). */
  save(plain: DraftPlain, sensitive: DraftSensitive): Promise<void> {
    const generation = this.generation;
    this.queue = this.queue.then(() => this.write(generation, plain, sensitive));
    return this.queue;
  }

  private async write(
    generation: number,
    plain: DraftPlain,
    sensitive: DraftSensitive,
  ): Promise<void> {
    const storage = this.storage();
    if (!storage || generation !== this.generation) {
      return;
    }
    try {
      const key = await this.key(storage, true);
      const payload = new TextEncoder().encode(
        // savedAt travels inside the sealed payload too, so a mismatched pair is detected on load.
        JSON.stringify({ savedAt: plain.savedAt, data: sensitive }),
      );
      const iv = key ? crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12))) : null;
      const sealed =
        key && iv ? await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload) : null;
      if (generation !== this.generation) {
        storage.removeItem(KEY_STORAGE_KEY); // cleared while encrypting: leave nothing behind
        return;
      }
      storage.setItem(PLAIN_STORAGE_KEY, JSON.stringify(plain));
      if (sealed && iv) {
        storage.setItem(
          SECRET_STORAGE_KEY,
          JSON.stringify({
            v: DRAFT_VERSION,
            iv: toBase64(iv),
            ct: toBase64(new Uint8Array(sealed)),
          }),
        );
      } else {
        storage.removeItem(SECRET_STORAGE_KEY); // no Web Crypto: personal data is simply not kept
      }
    } catch {
      this.clear();
    }
  }

  /** The stored draft, or null if absent, expired, unsupported or unreadable (then it is wiped). */
  async load(now: number = Date.now()): Promise<StoredDraft | null> {
    const storage = this.storage();
    if (!storage) {
      return null;
    }
    try {
      const rawPlain = storage.getItem(PLAIN_STORAGE_KEY);
      if (rawPlain === null) {
        this.clear();
        return null;
      }
      const plain = validPlain(JSON.parse(rawPlain), now);
      if (!plain) {
        this.clear();
        return null;
      }
      const rawSecret = storage.getItem(SECRET_STORAGE_KEY);
      if (rawSecret === null) {
        return { plain, sensitive: null };
      }
      const key = await this.key(storage, false);
      const envelope = JSON.parse(rawSecret) as Record<string, unknown>;
      if (
        !key ||
        envelope['v'] !== DRAFT_VERSION ||
        typeof envelope['iv'] !== 'string' ||
        typeof envelope['ct'] !== 'string'
      ) {
        this.clear();
        return null;
      }
      const opened = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(envelope['iv']) },
        key,
        fromBase64(envelope['ct']),
      );
      const body = JSON.parse(new TextDecoder().decode(opened)) as Record<string, unknown>;
      const sensitive = validSensitive(body['data']);
      if (!sensitive || body['savedAt'] !== plain.savedAt) {
        this.clear();
        return null;
      }
      return { plain, sensitive };
    } catch {
      this.clear();
      return null;
    }
  }

  /** Removes everything this service ever stored (draft, sealed part and key). */
  clear(): void {
    this.generation++;
    const storage = this.storage();
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(PLAIN_STORAGE_KEY);
      storage.removeItem(SECRET_STORAGE_KEY);
      storage.removeItem(KEY_STORAGE_KEY);
    } catch {
      // storage unavailable: nothing to clear
    }
  }

  private storage(): Storage | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      return window.sessionStorage;
    } catch {
      return null; // blocked storage (some privacy modes)
    }
  }

  /** The session's AES-GCM key (generated on first save). Null when Web Crypto is unavailable. */
  private async key(storage: Storage, create: boolean): Promise<CryptoKey | null> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return null;
    }
    const stored = storage.getItem(KEY_STORAGE_KEY);
    if (stored !== null) {
      return crypto.subtle.importKey('raw', fromBase64(stored), 'AES-GCM', false, [
        'encrypt',
        'decrypt',
      ]);
    }
    if (!create) {
      return null;
    }
    const fresh = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    storage.setItem(
      KEY_STORAGE_KEY,
      toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', fresh))),
    );
    return fresh;
  }
}
