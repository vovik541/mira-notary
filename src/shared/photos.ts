/**
 * Optional photo attachments for appointment requests. Pure TypeScript shared by the Angular
 * form (early feedback) and the Cloudflare Worker (authoritative). Photos are never stored: they
 * exist only while the request is processed and are sent to Resend as email attachments.
 */

export const PHOTO_LIMITS = {
  maxFiles: 5,
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 15 * 1024 * 1024,
} as const;

/** Modest allowance for multipart framing and the JSON `payload` part on top of the photos. */
export const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
export const MAX_REQUEST_BYTES = PHOTO_LIMITS.maxTotalBytes + MULTIPART_OVERHEAD_BYTES;

export const PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type PhotoMime = (typeof PHOTO_MIME_TYPES)[number];

/** Value for `<input type="file" accept>`. */
export const PHOTO_ACCEPT = PHOTO_MIME_TYPES.join(',');

export interface PhotoMeta {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export type PhotoErrorCode =
  'too_many' | 'empty' | 'unsupported_type' | 'too_large' | 'total_too_large';

export const PHOTO_ERROR_MESSAGES: Record<PhotoErrorCode, string> = {
  too_many: `You can attach up to ${PHOTO_LIMITS.maxFiles} photos.`,
  empty: 'One of the selected photos is empty. Please choose a different file.',
  unsupported_type: 'Photos must be JPEG, PNG, WebP or HEIC images.',
  too_large: `Each photo must be ${PHOTO_LIMITS.maxFileBytes / (1024 * 1024)} MB or smaller.`,
  total_too_large: `Total photo size must be ${PHOTO_LIMITS.maxTotalBytes / (1024 * 1024)} MB or less.`,
};

const EXTENSION_TO_MIME: Record<string, PhotoMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const MIME_TO_EXTENSION: Record<PhotoMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * Normalizes the declared MIME type: lower-cases it, maps the non-standard `image/jpg`, and — only
 * when the browser supplied no type at all (common for HEIC on desktop) — falls back to the
 * extension for `.heic` / `.heif`. Anything else is returned as-is so it fails the allow-list.
 */
export function normalizePhotoType(type: string, name: string): string {
  const lower = type.trim().toLowerCase();
  if (lower === 'image/jpg') {
    return 'image/jpeg';
  }
  if (lower === '') {
    const ext = /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase() ?? '';
    return ext === 'heic' || ext === 'heif' ? EXTENSION_TO_MIME[ext] : '';
  }
  return lower;
}

export function isAllowedPhotoType(type: string): type is PhotoMime {
  return (PHOTO_MIME_TYPES as readonly string[]).includes(type);
}

/**
 * Validates a set of photos (names are never trusted or used for paths). Returns the FIRST problem
 * or `null`. Nothing is truncated: an invalid set is rejected as a whole.
 */
export function validatePhotos(photos: readonly PhotoMeta[]): PhotoErrorCode | null {
  if (photos.length > PHOTO_LIMITS.maxFiles) {
    return 'too_many';
  }
  let total = 0;
  for (const photo of photos) {
    if (!Number.isFinite(photo.size) || photo.size <= 0) {
      return 'empty';
    }
    if (!isAllowedPhotoType(normalizePhotoType(photo.type, photo.name))) {
      return 'unsupported_type';
    }
    if (photo.size > PHOTO_LIMITS.maxFileBytes) {
      return 'too_large';
    }
    total += photo.size;
  }
  return total > PHOTO_LIMITS.maxTotalBytes ? 'total_too_large' : null;
}

/**
 * Safe attachment filename for the email: basename only, a conservative character set, a bounded
 * length and an extension that matches the validated MIME type. Never used as a filesystem path.
 */
export function sanitizeAttachmentFilename(name: string, index: number, mime: PhotoMime): string {
  const extension = MIME_TO_EXTENSION[mime];
  const base = name
    .split(/[\\/]/)
    .pop()!
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\s_-]+|[.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60)
    .trim();
  return `${base || `photo-${index + 1}`}.${extension}`;
}

/** File signatures ("magic bytes") for the allowed formats; the declared type is never enough. */
export function detectImageMime(bytes: Uint8Array): PhotoMime | null {
  const at = (i: number): number => bytes[i] ?? -1;
  const ascii = (start: number, text: string): boolean =>
    [...text].every((char, i) => at(start + i) === char.charCodeAt(0));

  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return 'image/jpeg';
  }
  if (
    at(0) === 0x89 &&
    ascii(1, 'PNG') &&
    at(4) === 0x0d &&
    at(5) === 0x0a &&
    at(6) === 0x1a &&
    at(7) === 0x0a
  ) {
    return 'image/png';
  }
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) {
    return 'image/webp';
  }
  if (ascii(4, 'ftyp')) {
    const brand = String.fromCharCode(at(8), at(9), at(10), at(11));
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return 'image/heic';
    }
  }
  return null;
}

/** Declared and detected types agree (HEIC and HEIF share one container format). */
export function declaredMatchesDetected(declared: PhotoMime, detected: PhotoMime): boolean {
  const family = (mime: PhotoMime): string => (mime === 'image/heif' ? 'image/heic' : mime);
  return family(declared) === family(detected);
}

/** Base64 for attachment payloads (chunked: no giant argument lists, works in Workers). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
