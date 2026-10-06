import { parseAppointmentForm, readBodyWithLimit } from './multipart';

const BOUNDARY = 'xyz';
const enc = new TextEncoder();
const type = `multipart/form-data; boundary=${BOUNDARY}`;

const textPart = (name: string, value: string): string =>
  `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
const filePart = (name: string, filename: string, content: string): string =>
  `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n${content}\r\n`;
const end = `--${BOUNDARY}--\r\n`;

const parse = (raw: string) => parseAppointmentForm(enc.encode(raw), type);

describe('parseAppointmentForm', () => {
  it('reads the JSON payload part and all photo parts', async () => {
    const result = await parse(
      textPart('payload', '{"a":1}') + filePart('photos', 'a.jpg', 'AAA') + end,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toEqual({ a: 1 });
      expect(result.photos).toHaveLength(1);
      expect(result.photos[0].size).toBe(3);
    }
  });

  it.each([
    ['no payload part', end],
    ['two payload parts', textPart('payload', '{}') + textPart('payload', '{}') + end],
    ['invalid JSON', textPart('payload', '{nope') + end],
    ['a file as payload', filePart('payload', 'x.json', '{}') + end],
    ['a text value as a photo', textPart('payload', '{}') + textPart('photos', 'text') + end],
    [
      'a file under another field',
      textPart('payload', '{}') + filePart('other', 'a.jpg', 'A') + end,
    ],
  ])('flags %s as malformed', async (_name, raw) => {
    expect((await parse(raw)).ok).toBe(false);
  });

  it('flags non-multipart bytes as malformed', async () => {
    expect((await parseAppointmentForm(enc.encode('hello'), type)).ok).toBe(false);
  });
});

describe('readBodyWithLimit', () => {
  const request = (body: string, headers: Record<string, string> = {}): Request =>
    new Request('https://x.test/', { method: 'POST', body, headers });

  it('returns the bytes when within the limit', async () => {
    const result = await readBodyWithLimit(request('hello'), 10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bytes).toHaveLength(5);
    }
  });

  it('rejects by declared Content-Length and by streamed size', async () => {
    expect((await readBodyWithLimit(request('hi', { 'content-length': '999' }), 10)).ok).toBe(
      false,
    );
    expect((await readBodyWithLimit(request('x'.repeat(50)), 10)).ok).toBe(false);
  });
});
