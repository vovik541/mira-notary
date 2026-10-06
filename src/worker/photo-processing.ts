import {
  PHOTO_ERROR_MESSAGES,
  PhotoErrorCode,
  PhotoMime,
  bytesToBase64,
  declaredMatchesDetected,
  detectImageMime,
  isAllowedPhotoType,
  normalizePhotoType,
  sanitizeAttachmentFilename,
  validatePhotos,
} from '../shared/photos';
import { EmailAttachment } from './email-provider';
import { UploadedFile } from './multipart';

export interface AcceptedPhoto {
  readonly file: UploadedFile;
  readonly mime: PhotoMime;
  /** Sanitized name for the email attachment (never used as a path). */
  readonly filename: string;
}

export type PhotoInspection =
  | { ok: true; photos: AcceptedPhoto[]; totalBytes: number }
  | { ok: false; code: PhotoErrorCode | 'content_mismatch'; message: string };

const CONTENT_MISMATCH_MESSAGE =
  'One of the photos could not be read as a JPEG, PNG, WebP or HEIC image. Please choose a different file.';

/**
 * Cheap validation of the upload set, run BEFORE Turnstile (so a rejected set does not burn the
 * single-use token) and before any large conversion: count, sizes, allowed MIME types, and the
 * file signature of each photo (only its first bytes are read).
 */
export async function inspectPhotos(files: readonly UploadedFile[]): Promise<PhotoInspection> {
  const problem = validatePhotos(files);
  if (problem) {
    return { ok: false, code: problem, message: PHOTO_ERROR_MESSAGES[problem] };
  }

  const photos: AcceptedPhoto[] = [];
  let totalBytes = 0;
  for (const [index, file] of files.entries()) {
    const declared = normalizePhotoType(file.type, file.name);
    if (!isAllowedPhotoType(declared)) {
      return {
        ok: false,
        code: 'unsupported_type',
        message: PHOTO_ERROR_MESSAGES.unsupported_type,
      };
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const detected = detectImageMime(head);
    if (!detected || !declaredMatchesDetected(declared, detected)) {
      return { ok: false, code: 'content_mismatch', message: CONTENT_MISMATCH_MESSAGE };
    }
    totalBytes += file.size;
    photos.push({
      file,
      mime: declared,
      filename: sanitizeAttachmentFilename(file.name, index, declared),
    });
  }
  return { ok: true, photos, totalBytes };
}

/** Base64-encodes the already validated photos (the only point where file bytes are read fully). */
export async function encodeAttachments(
  photos: readonly AcceptedPhoto[],
): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = [];
  for (const photo of photos) {
    const bytes = new Uint8Array(await photo.file.arrayBuffer());
    attachments.push({
      filename: photo.filename,
      contentBase64: bytesToBase64(bytes),
      contentType: photo.mime,
    });
  }
  return attachments;
}
