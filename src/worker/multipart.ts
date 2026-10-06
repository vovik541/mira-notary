import {
  APPOINTMENT_PAYLOAD_FIELD,
  APPOINTMENT_PAYLOAD_MAX_BYTES,
  APPOINTMENT_PHOTOS_FIELD,
} from '../shared/appointment.model';
import { MAX_REQUEST_BYTES } from '../shared/photos';

/** Minimal shape of an uploaded file part (works for workerd's `File` and Node's). */
export interface UploadedFile {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice(start?: number, end?: number): { arrayBuffer(): Promise<ArrayBuffer> };
}

export type BodyRead = { ok: true; bytes: Uint8Array } | { ok: false; reason: 'too_large' };

/**
 * Reads the request body, but never more than `limit` bytes: an oversized upload is rejected from
 * the declared `Content-Length` when present, and by counting while streaming when it is not.
 */
export async function readBodyWithLimit(
  request: Request,
  limit: number = MAX_REQUEST_BYTES,
): Promise<BodyRead> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) {
    return { ok: false, reason: 'too_large' };
  }
  if (!request.body) {
    return { ok: true, bytes: new Uint8Array(0) };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, reason: 'too_large' };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

export type ParsedForm =
  { ok: true; payload: unknown; photos: UploadedFile[] } | { ok: false; reason: 'malformed' };

const isFilePart = (value: unknown): value is UploadedFile =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as UploadedFile).arrayBuffer === 'function' &&
  typeof (value as UploadedFile).size === 'number';

/**
 * Parses `multipart/form-data`: one JSON `payload` text part and zero or more `photos` file
 * parts. Anything unexpected (extra files, non-file photo parts, bad JSON) is "malformed".
 */
export async function parseAppointmentForm(
  bytes: Uint8Array,
  contentType: string,
): Promise<ParsedForm> {
  let form: FormData;
  try {
    form = await new Response(bytes as BodyInit, {
      headers: { 'content-type': contentType },
    }).formData();
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const payloadParts = form.getAll(APPOINTMENT_PAYLOAD_FIELD);
  if (payloadParts.length !== 1 || typeof payloadParts[0] !== 'string') {
    return { ok: false, reason: 'malformed' };
  }
  if (new TextEncoder().encode(payloadParts[0]).length > APPOINTMENT_PAYLOAD_MAX_BYTES) {
    return { ok: false, reason: 'malformed' };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadParts[0]);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const photos: UploadedFile[] = [];
  for (const part of form.getAll(APPOINTMENT_PHOTOS_FIELD)) {
    if (!isFilePart(part)) {
      return { ok: false, reason: 'malformed' };
    }
    photos.push(part);
  }
  // Files under any other field name are not part of this API.
  for (const [name, value] of form.entries()) {
    if (
      name !== APPOINTMENT_PHOTOS_FIELD &&
      name !== APPOINTMENT_PAYLOAD_FIELD &&
      isFilePart(value)
    ) {
      return { ok: false, reason: 'malformed' };
    }
  }
  return { ok: true, payload, photos };
}
