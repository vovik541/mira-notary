import {
  PHOTO_LIMITS,
  bytesToBase64,
  declaredMatchesDetected,
  detectImageMime,
  isAllowedPhotoType,
  normalizePhotoType,
  sanitizeAttachmentFilename,
  validatePhotos,
} from './photos';

const photo = (type: string, size = 100, name = 'a.jpg') => ({ name, type, size });

describe('validatePhotos', () => {
  it('accepts zero, one and five valid photos', () => {
    expect(validatePhotos([])).toBeNull();
    expect(validatePhotos([photo('image/jpeg')])).toBeNull();
    expect(validatePhotos(Array.from({ length: 5 }, () => photo('image/png')))).toBeNull();
  });

  it('accepts every allowed type', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']) {
      expect(validatePhotos([photo(type)])).toBeNull();
    }
  });

  it('rejects too many, empty, wrong type, too large, and too large in total', () => {
    expect(validatePhotos(Array.from({ length: 6 }, () => photo('image/jpeg')))).toBe('too_many');
    expect(validatePhotos([photo('image/jpeg', 0)])).toBe('empty');
    expect(validatePhotos([photo('application/pdf')])).toBe('unsupported_type');
    expect(validatePhotos([photo('image/gif')])).toBe('unsupported_type');
    expect(validatePhotos([photo('image/jpeg', PHOTO_LIMITS.maxFileBytes + 1)])).toBe('too_large');
    expect(validatePhotos([photo('image/jpeg', PHOTO_LIMITS.maxFileBytes)])).toBeNull();
    expect(validatePhotos(Array.from({ length: 4 }, () => photo('image/jpeg', 4_000_000)))).toBe(
      'total_too_large',
    );
  });
});

describe('normalizePhotoType', () => {
  it('maps image/jpg, lower-cases, and uses the extension only for typeless HEIC/HEIF', () => {
    expect(normalizePhotoType('image/jpg', 'a.jpg')).toBe('image/jpeg');
    expect(normalizePhotoType('IMAGE/PNG', 'a.png')).toBe('image/png');
    expect(normalizePhotoType('', 'IMG_1.HEIC')).toBe('image/heic');
    expect(normalizePhotoType('', 'IMG_1.heif')).toBe('image/heif');
    expect(normalizePhotoType('', 'a.jpg')).toBe('');
    expect(normalizePhotoType('application/pdf', 'a.heic')).toBe('application/pdf');
  });

  it('treats application/octet-stream (what a multipart upload sends for a typeless file) like no type', () => {
    expect(normalizePhotoType('application/octet-stream', 'IMG_1.HEIC')).toBe('image/heic');
    expect(normalizePhotoType('application/octet-stream', 'IMG_1.heif')).toBe('image/heif');
    expect(normalizePhotoType('application/octet-stream', 'a.jpg')).toBe('');
    expect(isAllowedPhotoType(normalizePhotoType('application/octet-stream', 'a.exe'))).toBe(false);
  });
});

describe('sanitizeAttachmentFilename', () => {
  it('keeps a basename, a safe character set and the extension for the real type', () => {
    expect(sanitizeAttachmentFilename('../../etc/passwd.exe', 0, 'image/jpeg')).toBe('passwd.jpg');
    expect(sanitizeAttachmentFilename('C:\\Users\\x\\scan.png', 0, 'image/png')).toBe('scan.png');
    expect(sanitizeAttachmentFilename('', 2, 'image/webp')).toBe('photo-3.webp');
    expect(sanitizeAttachmentFilename('<b>"x".jpg', 0, 'image/jpeg')).not.toMatch(/[<>"]/);
    expect(sanitizeAttachmentFilename('"photo test (1).jpg"', 0, 'image/jpeg')).toBe(
      'photo test _1_.jpg',
    );
    expect(
      sanitizeAttachmentFilename('a'.repeat(300) + '.jpg', 0, 'image/jpeg').length,
    ).toBeLessThan(70);
  });
});

describe('detectImageMime', () => {
  const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);
  const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

  it('recognizes JPEG, PNG, WebP and HEIC signatures', () => {
    expect(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(detectImageMime(bytes(0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(detectImageMime(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe(
      'image/webp',
    );
    expect(detectImageMime(bytes(0, 0, 0, 0x18, ...ascii('ftypheic')))).toBe('image/heic');
  });

  it('rejects scripts, PDFs and empty input', () => {
    expect(detectImageMime(bytes(...ascii('<script>')))).toBeNull();
    expect(detectImageMime(bytes(...ascii('%PDF-1.7')))).toBeNull();
    expect(detectImageMime(new Uint8Array(0))).toBeNull();
  });

  it('treats HEIC and HEIF declarations as the same container', () => {
    expect(declaredMatchesDetected('image/heif', 'image/heic')).toBe(true);
    expect(declaredMatchesDetected('image/png', 'image/jpeg')).toBe(false);
  });
});

describe('bytesToBase64', () => {
  it('encodes small and large inputs correctly', () => {
    expect(bytesToBase64(new Uint8Array([65, 66, 67]))).toBe('QUJD');
    const large = new Uint8Array(100_000).fill(7);
    expect(atob(bytesToBase64(large))).toHaveLength(100_000);
  });
});
