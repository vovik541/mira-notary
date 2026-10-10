import { AppointmentErrorResponse } from '../shared/appointment.model';
import { handleAppointmentRequest } from './appointments-handler';
import { EmailProvider, EmailSendResult, OutboundEmail } from './email-provider';
import { WorkerEnv } from './env';
import { RESEND_ENDPOINT } from './resend-email-sender';
import { FetchLike, TURNSTILE_VERIFY_URL } from './turnstile';

const NOW = new Date('2026-10-05T12:00:00Z');
const API_KEY = 're_test_super_secret_key';

const body = {
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '(916) 555-0100',
  email: 'jane@example.com',
  service: 'Loan Signing',
  locationZip: '95814',
  preferredDate: '2026-10-20',
  timePreference: 'morning',
  specificTime: null,
  contactConsent: true,
  turnstileToken: 'good-token',
};

interface Part {
  readonly name: string;
  readonly content: string | Uint8Array;
  readonly filename?: string;
  readonly type?: string;
}

/** Hand-built multipart bytes: jsdom's FormData cannot be serialized by Node's Request. */
function multipartBytes(parts: readonly Part[]): { bytes: Uint8Array; contentType: string } {
  const boundary = '----vitest-boundary-7MA4YWxkTrZu0gW';
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  for (const part of parts) {
    let head = `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"`;
    if (part.filename !== undefined) {
      head += `; filename="${part.filename}"`;
    }
    head += '\r\n';
    if (part.type) {
      head += `Content-Type: ${part.type}\r\n`;
    }
    chunks.push(encoder.encode(`${head}\r\n`));
    chunks.push(typeof part.content === 'string' ? encoder.encode(part.content) : part.content);
    chunks.push(encoder.encode('\r\n'));
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, contentType: `multipart/form-data; boundary=${boundary}` };
}

interface PhotoSpec {
  readonly filename: string;
  readonly type: string;
  readonly content: Uint8Array;
}

const pad = (head: number[], size: number): Uint8Array => {
  const bytes = new Uint8Array(Math.max(size, head.length));
  bytes.set(head);
  return bytes;
};
const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

const jpeg = (size = 2048): PhotoSpec => ({
  filename: 'scan.jpg',
  type: 'image/jpeg',
  content: pad([0xff, 0xd8, 0xff, 0xe0], size),
});
const png = (size = 2048): PhotoSpec => ({
  filename: 'id.png',
  type: 'image/png',
  content: pad([0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a], size),
});
const webp = (size = 2048): PhotoSpec => ({
  filename: 'doc.webp',
  type: 'image/webp',
  content: pad([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')], size),
});
const heic = (size = 2048): PhotoSpec => ({
  filename: 'IMG_0001.HEIC',
  type: 'image/heic',
  content: pad([0, 0, 0, 0x18, ...ascii('ftypheic')], size),
});

function post(
  data: unknown,
  headers: Record<string, string> = {},
  photos: readonly PhotoSpec[] = [],
): Request {
  const { bytes, contentType } = multipartBytes([
    { name: 'payload', content: typeof data === 'string' ? data : JSON.stringify(data) },
    ...photos.map((photo) => ({ name: 'photos', ...photo })),
  ]);
  return new Request('https://site.test/api/appointments', {
    method: 'POST',
    headers: { 'content-type': contentType, ...headers },
    body: bytes as BodyInit,
  });
}

const turnstile = (success: boolean, codes: string[] = []): FetchLike =>
  vi.fn(async () => new Response(JSON.stringify({ success, 'error-codes': codes })));

function makeProvider(result: EmailSendResult = { ok: true, id: 'email-id-1' }) {
  const sent: OutboundEmail[] = [];
  const provider: EmailProvider = {
    send: vi.fn(async (message: OutboundEmail) => {
      sent.push(message);
      return result;
    }),
  };
  return { provider, sent };
}

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ASSETS: { fetch: async () => new Response('asset') },
    RESEND_API_KEY: API_KEY,
    TURNSTILE_SECRET_KEY: 'secret',
    EMAIL_FROM_ADDRESS: 'appointments@notify.example.test',
    EMAIL_FROM_NAME: 'Local Notary Signings by Mira Derkach',
    APPOINTMENT_RECIPIENT: 'notifications@example.test',
    ...overrides,
  };
}

const errorOf = async (response: Response): Promise<AppointmentErrorResponse> =>
  (await response.json()) as AppointmentErrorResponse;

const loggedText = (): string =>
  JSON.stringify([
    ...(console.info as ReturnType<typeof vi.fn>).mock.calls,
    ...(console.warn as ReturnType<typeof vi.fn>).mock.calls,
    ...(console.error as ReturnType<typeof vi.fn>).mock.calls,
  ]);

describe('handleAppointmentRequest', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const run = (
    data: unknown,
    env: WorkerEnv,
    provider: EmailProvider,
    fetchFn: FetchLike = turnstile(true),
    headers: Record<string, string> = {},
    photos: readonly PhotoSpec[] = [],
  ) =>
    handleAppointmentRequest(post(data, headers, photos), env, {
      fetchFn,
      emailProvider: provider,
      now: () => NOW,
    });

  it('hands a valid request to the email provider and returns success', async () => {
    const { provider, sent } = makeProvider();
    const response = await run(body, makeEnv(), provider);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, phoneConfirmationRequired: false });
    expect(provider.send).toHaveBeenCalledTimes(1);

    const message = sent[0];
    expect(message.to).toBe('notifications@example.test');
    expect(message.from).toEqual({
      email: 'appointments@notify.example.test',
      name: 'Local Notary Signings by Mira Derkach',
    });
    expect(message.replyTo).toBe('jane@example.com');
    expect(message.subject).toBe('New Notary Appointment Request — Jane Doe');
    expect(message.html).toContain('New Appointment Request');
    expect(message.text).toContain('Jane Doe');
  });

  it('verifies the Turnstile token server-side with the Worker secret', async () => {
    const { provider } = makeProvider();
    const fetchFn = turnstile(true);
    await run(body, makeEnv(), provider, fetchFn, { 'cf-connecting-ip': '203.0.113.7' });
    const [url, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const params = init.body as URLSearchParams;
    expect(params.get('secret')).toBe('secret');
    expect(params.get('response')).toBe('good-token');
    expect(params.get('remoteip')).toBe('203.0.113.7');
  });

  it('accepts Unicode names and normalizes the phone number in the email', async () => {
    const { provider, sent } = makeProvider();
    const response = await run(
      { ...body, firstName: 'Мирослава', lastName: 'O’Connor', phone: '916 555 0100' },
      makeEnv(),
      provider,
    );
    expect(response.status).toBe(200);
    expect(sent[0].text).toContain('Name: Мирослава O’Connor');
    expect(sent[0].text).toContain('Phone: (916) 555-0100');
  });

  it('uses the visitor email only as Reply-To, never as From', async () => {
    const { provider, sent } = makeProvider();
    await run(body, makeEnv(), provider);
    expect(sent[0].replyTo).toBe('jane@example.com');
    expect(JSON.stringify(sent[0].from)).not.toContain('jane@example.com');
  });

  it.each([
    ['missing firstName', { firstName: undefined }],
    ['missing lastName', { lastName: undefined }],
    ['missing phone', { phone: undefined }],
    ['missing email', { email: undefined }],
    ['bad email', { email: 'not-an-email' }],
    ['bad phone', { phone: '123' }],
    ['digits in a name', { firstName: 'John123' }],
    ['symbols in a name', { lastName: 'Mira@' }],
    ['symbols-only name', { firstName: '!!!!' }],
    ['double hyphen in a name', { lastName: 'Smith--Jones' }],
    ['trailing hyphen in a name', { firstName: 'John-' }],
    ['name over 50 characters', { firstName: 'a'.repeat(51) }],
    ['name with surrounding space', { firstName: ' Jane' }],
    ['email over 120 characters', { email: `${'a'.repeat(109)}@example.com` }],
    ['phone with +1', { phone: '+1 279 555 0100' }],
    ['phone with country code digit', { phone: '12795550100' }],
    ['phone with 9 digits', { phone: '279555010' }],
    ['phone with 11 digits', { phone: '27955501000' }],
    ['signers 0', { numberOfSigners: 0 }],
    ['signers 51', { numberOfSigners: 51 }],
    ['signers 999', { numberOfSigners: 999 }],
    ['signers as text', { numberOfSigners: '5' }],
    ['no consent', { contactConsent: false }],
    ['malformed ZIP (4 digits)', { locationZip: '9581' }],
    ['malformed ZIP (6 digits)', { locationZip: '958140' }],
    ['malformed ZIP (letters)', { locationZip: '9581A' }],
    ['malformed ZIP (non-numeric)', { locationZip: 'abcde' }],
    ['ZIP+4', { locationZip: '95814-1234' }],
    ['padded ZIP', { locationZip: ' 95814 ' }],
    ['non-string ZIP', { locationZip: 95814 }],
    ['legacy fullName only', { firstName: undefined, lastName: undefined, fullName: 'Jane Doe' }],
  ])(
    'rejects %s with 400 and never calls the email provider or Turnstile',
    async (_name, overrides) => {
      const { provider } = makeProvider();
      const fetchFn = turnstile(true);
      const response = await run({ ...body, ...overrides }, makeEnv(), provider, fetchFn);
      expect(response.status).toBe(400);
      expect((await errorOf(response)).error).toBe('validation');
      expect(provider.send).not.toHaveBeenCalled();
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );

  it.each([
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
  ])(
    'runs the full flow (Turnstile, then the email provider) for confirmed nearby ZIP %s',
    async (zip) => {
      const { provider, sent } = makeProvider();
      const fetchFn = turnstile(true);
      const response = await run({ ...body, locationZip: zip }, makeEnv(), provider, fetchFn);
      expect(response.status).toBe(200);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(provider.send).toHaveBeenCalledTimes(1);
      expect(sent[0].text).toContain(`ZIP Code: ${zip}`);
    },
  );

  it.each(['90210', '95604'])(
    'accepts the well-formed outside-area ZIP %s: one email, flagged for Mira',
    async (zip) => {
      const { provider, sent } = makeProvider();
      const fetchFn = turnstile(true);
      const response = await run({ ...body, locationZip: zip }, makeEnv(), provider, fetchFn);
      expect(response.status).toBe(200);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(provider.send).toHaveBeenCalledTimes(1);
      expect(sent[0].text).toContain(`ZIP Code: ${zip}`);
      expect(sent[0].text).toContain(
        'Service Area: Outside standard service area — confirm travel availability and fee',
      );
    },
  );

  it('marks a confirmed-area ZIP as such in the email', async () => {
    const { provider, sent } = makeProvider();
    await run(body, makeEnv(), provider);
    expect(sent[0].text).toContain('Service Area: Standard service area');
  });

  it('emails the ZIP code exactly as the (valid) 5-digit value was sent', async () => {
    const { provider, sent } = makeProvider();
    const response = await run({ ...body, locationZip: '95814' }, makeEnv(), provider);
    expect(response.status).toBe(200);
    expect(sent[0].text).toContain('ZIP Code: 95814');
  });

  it('ignores any recipient / sender / header fields supplied by the client', async () => {
    const { provider, sent } = makeProvider();
    const hostile = {
      ...body,
      to: 'attacker@evil.test',
      recipient: 'attacker@evil.test',
      cc: 'attacker@evil.test',
      bcc: 'attacker@evil.test',
      from: 'ceo@bank.test',
      sender: 'ceo@bank.test',
      replyTo: 'attacker@evil.test',
      reply_to: 'attacker@evil.test',
      subject: 'Hacked subject',
      headers: { 'X-Evil': '1' },
    };
    const response = await run(hostile, makeEnv(), provider);

    expect(response.status).toBe(200);
    const message = sent[0];
    expect(message.to).toBe('notifications@example.test');
    expect(message.from.email).toBe('appointments@notify.example.test');
    expect(message.replyTo).toBe('jane@example.com');
    expect(message.subject).toBe('New Notary Appointment Request — Jane Doe');
    expect(JSON.stringify(message)).not.toContain('evil.test');
    expect(JSON.stringify(message)).not.toContain('Hacked subject');
  });

  it('rejects invalid input with 400 before Turnstile or the provider', async () => {
    const { provider } = makeProvider();
    const fetchFn = turnstile(true);
    const response = await run({ ...body, service: 'Nope' }, makeEnv(), provider, fetchFn);
    expect(response.status).toBe(400);
    expect((await errorOf(response)).error).toBe('validation');
    expect(fetchFn).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['non-object JSON', '"hello"'],
  ])('rejects %s with 400', async (_name, payload) => {
    const { provider } = makeProvider();
    const response = await run(payload, makeEnv(), provider);
    expect(response.status).toBe(400);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('rejects an oversized payload part, non-multipart bodies and legacy JSON posts', async () => {
    const { provider } = makeProvider();
    const big = await run({ ...body, additionalDetails: 'a'.repeat(40_000) }, makeEnv(), provider);
    expect(big.status).toBe(400);

    const wrongType = await run(body, makeEnv(), provider, turnstile(true), {
      'content-type': 'text/plain',
    });
    expect(wrongType.status).toBe(400);

    const json = await handleAppointmentRequest(
      new Request('https://site.test/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      makeEnv(),
      { fetchFn: turnstile(true), emailProvider: provider, now: () => NOW },
    );
    expect(json.status).toBe(400);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('rejects a body larger than the multipart limit with 413 before any other work', async () => {
    const { provider } = makeProvider();
    const fetchFn = turnstile(true);
    const huge = [jpeg(6_000_000), jpeg(6_000_000), jpeg(6_000_000)];
    const response = await run(body, makeEnv(), provider, fetchFn, {}, huge);
    expect(response.status).toBe(413);
    expect((await errorOf(response)).error).toBe('validation');
    expect(fetchFn).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('rejects a body whose declared Content-Length exceeds the limit', async () => {
    const { provider } = makeProvider();
    const response = await run(body, makeEnv(), provider, turnstile(true), {
      'content-length': String(20 * 1024 * 1024),
    });
    expect(response.status).toBe(413);
    expect(provider.send).not.toHaveBeenCalled();
  });

  describe('photo attachments', () => {
    it('sends a request without photos and without attachments', async () => {
      const { provider, sent } = makeProvider();
      const response = await run(body, makeEnv(), provider);
      expect(response.status).toBe(200);
      expect(sent[0].attachments).toBeUndefined();
      expect(sent[0].text).toContain('Attachments: None');
    });

    it.each([
      ['one JPEG', [jpeg()]],
      ['one PNG', [png()]],
      ['one WebP', [webp()]],
      ['one HEIC', [heic()]],
      ['five mixed photos', [jpeg(), png(), webp(), heic(), jpeg()]],
    ])('forwards %s to Resend as base64 attachments', async (_name, photos) => {
      const { provider, sent } = makeProvider();
      const response = await run(body, makeEnv(), provider, turnstile(true), {}, photos);
      expect(response.status).toBe(200);
      expect(provider.send).toHaveBeenCalledTimes(1);
      const attachments = sent[0].attachments ?? [];
      expect(attachments).toHaveLength(photos.length);
      attachments.forEach((attachment, index) => {
        expect(attachment.contentType).toBe(photos[index].type);
        expect(attachment.contentBase64).toBe(btoa(String.fromCharCode(...photos[index].content)));
      });
      expect(sent[0].text).toContain(
        `${photos.length} photo${photos.length === 1 ? '' : 's'} attached`,
      );
    });

    it('accepts exactly 5 MB per file and 15 MB in total', async () => {
      const { provider } = makeProvider();
      const five = 5 * 1024 * 1024;
      const response = await run(body, makeEnv(), provider, turnstile(true), {}, [
        jpeg(five),
        png(five),
        webp(five),
      ]);
      expect(response.status).toBe(200);
    });

    it('sanitizes attachment filenames and keeps the extension matching the real type', async () => {
      const { provider, sent } = makeProvider();
      await run(body, makeEnv(), provider, turnstile(true), {}, [
        { ...jpeg(), filename: '../../etc/pass<wd>x.exe' },
        { ...png(), filename: '' },
      ]);
      const names = (sent[0].attachments ?? []).map((a) => a.filename);
      expect(names[0]).toMatch(/^[A-Za-z0-9._ -]+\.jpg$/);
      expect(names[0]).not.toMatch(/[/<>"]/);
      expect(names[1]).toBe('photo-2.png');
    });

    it.each([
      ['six photos', [jpeg(), jpeg(), jpeg(), jpeg(), jpeg(), jpeg()]],
      ['a file larger than 5 MB', [jpeg(5 * 1024 * 1024 + 1)]],
      [
        'more than 15 MB in total',
        [jpeg(4_000_000), png(4_000_000), webp(4_000_000), jpeg(4_000_000)],
      ],
      [
        'application/pdf',
        [{ filename: 'a.pdf', type: 'application/pdf', content: pad(ascii('%PDF-1.7'), 100) }],
      ],
      ['an empty file', [{ ...jpeg(), content: new Uint8Array(0) }]],
      [
        'an image type with non-image bytes',
        [{ ...jpeg(), content: pad(ascii('<script>alert(1)</script>'), 100) }],
      ],
      ['a declared type that does not match the bytes', [{ ...png(), type: 'image/jpeg' }]],
      ['an unsupported image type (GIF)', [{ ...jpeg(), type: 'image/gif' }]],
    ])('rejects %s with 400 before Turnstile and Resend', async (_name, photos) => {
      const { provider } = makeProvider();
      const fetchFn = turnstile(true);
      const response = await run(body, makeEnv(), provider, fetchFn, {}, photos);
      expect(response.status).toBe(400);
      const payload = await errorOf(response);
      expect(payload.error).toBe('validation');
      expect(payload.message).not.toBe('Please check the form and try again.');
      expect(fetchFn).not.toHaveBeenCalled();
      expect(provider.send).not.toHaveBeenCalled();
    });

    it('rejects a file uploaded under an unexpected field name', async () => {
      const { provider } = makeProvider();
      const { bytes, contentType } = multipartBytes([
        { name: 'payload', content: JSON.stringify(body) },
        { name: 'attachment', filename: 'a.jpg', type: 'image/jpeg', content: jpeg().content },
      ]);
      const response = await handleAppointmentRequest(
        new Request('https://site.test/api/appointments', {
          method: 'POST',
          headers: { 'content-type': contentType },
          body: bytes as BodyInit,
        }),
        makeEnv(),
        { fetchFn: turnstile(true), emailProvider: provider, now: () => NOW },
      );
      expect(response.status).toBe(400);
      expect(provider.send).not.toHaveBeenCalled();
    });

    it('does not log file names or contents, only the photo count', async () => {
      const { provider } = makeProvider();
      await run(body, makeEnv(), provider, turnstile(true), {}, [
        { ...jpeg(), filename: 'secret-passport.jpg' },
      ]);
      const logged = loggedText();
      expect(logged).toContain('photos=1');
      expect(logged).not.toContain('secret-passport');
    });
  });

  describe('same-day / Sunday (derived from the date)', () => {
    // NOW = Mon 2026-10-05 12:00Z. body.preferredDate is Tue 2026-10-20; 2026-10-11 is a Sunday.
    it('sends a normal future request unmarked, with no phone confirmation', async () => {
      const { provider, sent } = makeProvider();
      const response = await run(body, makeEnv(), provider);
      expect(await response.json()).toEqual({ success: true, phoneConfirmationRequired: false });
      expect(sent[0].subject).toBe('New Notary Appointment Request — Jane Doe');
      expect(sent[0].text).toContain('Same-Day: No');
      expect(sent[0].text).toContain('Sunday: No');
      expect(sent[0].text).toContain('Phone Confirmation Required: No');
    });

    it('derives a same-day request from today in Los Angeles (exactly one email)', async () => {
      const { provider, sent } = makeProvider();
      const fetchFn = turnstile(true);
      const response = await run(
        { ...body, preferredDate: '2026-10-05' },
        makeEnv(),
        provider,
        fetchFn,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, phoneConfirmationRequired: true });
      expect(provider.send).toHaveBeenCalledTimes(1);
      expect(sent[0].subject).toBe('SAME-DAY — New Notary Appointment Request — Jane Doe');
      expect(sent[0].text).toContain('Same-Day: Yes');
      expect(sent[0].text).toContain('Phone Confirmation Required: Yes');
    });

    it('accepts a Sunday and requires phone confirmation without calling it same-day', async () => {
      const { provider, sent } = makeProvider();
      const response = await run({ ...body, preferredDate: '2026-10-11' }, makeEnv(), provider);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, phoneConfirmationRequired: true });
      expect(sent[0].subject).toBe('SUNDAY — New Notary Appointment Request — Jane Doe');
      expect(sent[0].text).toContain('Preferred Date: 2026-10-11 (Sunday)');
      expect(sent[0].text).toContain('Same-Day: No');
      expect(sent[0].text).toContain('Sunday: Yes');
    });

    it('handles today + Sunday as one combined state', async () => {
      const { provider, sent } = makeProvider();
      const response = await handleAppointmentRequest(
        post({ ...body, preferredDate: '2026-10-11' }),
        makeEnv(),
        {
          fetchFn: turnstile(true),
          emailProvider: provider,
          now: () => new Date('2026-10-11T19:00:00Z'),
        },
      );
      expect(response.status).toBe(200);
      expect(sent[0].subject).toBe('SAME-DAY SUNDAY — New Notary Appointment Request — Jane Doe');
      expect(sent[0].text).toContain('Same-Day: Yes');
      expect(sent[0].text).toContain('Sunday: Yes');
    });

    it.each([true, false, 'true', 1])(
      'ignores a forged urgent=%j: the date alone decides',
      async (urgent) => {
        const normal = makeProvider();
        await run({ ...body, urgent }, makeEnv(), normal.provider);
        expect(normal.sent[0].subject).toBe('New Notary Appointment Request — Jane Doe');
        expect(normal.sent[0].text).toContain('Phone Confirmation Required: No');

        const today = makeProvider();
        await run({ ...body, preferredDate: '2026-10-05', urgent }, makeEnv(), today.provider);
        expect(today.sent[0].text).toContain('Same-Day: Yes');
      },
    );

    it('renders structured times readably in the email', async () => {
      const { provider, sent } = makeProvider();
      await run(
        { ...body, timePreference: 'specific', specificTime: '14:30' },
        makeEnv(),
        provider,
      );
      expect(sent[0].text).toContain('Preferred Time: Specific Time — 2:30 PM');
    });

    it.each([
      ['unknown preference', { timePreference: 'whenever' }],
      ['specific without a time', { timePreference: 'specific', specificTime: null }],
      ['malformed specific time', { timePreference: 'specific', specificTime: '2ish' }],
      [
        'injected time on a non-specific choice',
        { timePreference: 'morning', specificTime: '10:00' },
      ],
      [
        'legacy free-text preferredTime only',
        { timePreference: undefined, preferredTime: 'whenever' },
      ],
    ])('rejects %s with 400 before Turnstile and Resend', async (_name, overrides) => {
      const { provider } = makeProvider();
      const fetchFn = turnstile(true);
      const response = await run({ ...body, ...overrides }, makeEnv(), provider, fetchFn);
      expect(response.status).toBe(400);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(provider.send).not.toHaveBeenCalled();
    });

    it.each(['07:30', '23:00', '20:30', '00:15'])(
      'accepts the out-of-hours specific time %s (no 400) and flags it in the email',
      async (time) => {
        const { provider, sent } = makeProvider();
        const fetchFn = turnstile(true);
        const response = await run(
          { ...body, timePreference: 'specific', specificTime: time },
          makeEnv(),
          provider,
          fetchFn,
        );
        expect(response.status).toBe(200);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(provider.send).toHaveBeenCalledTimes(1);
        expect(sent[0].text).toContain(
          'Time Window: Outside standard hours — confirm availability and additional fee',
        );
      },
    );

    it.each(['08:00', '12:00', '20:00'])(
      'accepts the in-hours specific time %s with no special line',
      async (time) => {
        const { provider, sent } = makeProvider();
        const response = await run(
          { ...body, timePreference: 'specific', specificTime: time },
          makeEnv(),
          provider,
        );
        expect(response.status).toBe(200);
        expect(sent).toHaveLength(1);
        expect(sent[0].text).not.toContain('Time Window');
      },
    );

    it('rejects a malformed specific time (25:99) with 400 before Turnstile and Resend', async () => {
      const { provider } = makeProvider();
      const fetchFn = turnstile(true);
      const response = await run(
        { ...body, timePreference: 'specific', specificTime: '25:99' },
        makeEnv(),
        provider,
        fetchFn,
      );
      expect(response.status).toBe(400);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(provider.send).not.toHaveBeenCalled();
    });

    describe('same-day requests keep every other protection', () => {
      const today = { ...body, preferredDate: '2026-10-05' };

      it('still requires contact consent', async () => {
        const { provider } = makeProvider();
        const fetchFn = turnstile(true);
        const response = await run(
          { ...today, contactConsent: false },
          makeEnv(),
          provider,
          fetchFn,
        );
        expect(response.status).toBe(400);
        expect(fetchFn).not.toHaveBeenCalled();
        expect(provider.send).not.toHaveBeenCalled();
      });

      it('still requires a well-formed 5-digit ZIP', async () => {
        const { provider } = makeProvider();
        const response = await run({ ...today, locationZip: '9021' }, makeEnv(), provider);
        expect(response.status).toBe(400);
        expect(provider.send).not.toHaveBeenCalled();
      });

      it('still verifies Turnstile', async () => {
        const { provider } = makeProvider();
        const response = await run(today, makeEnv(), provider, turnstile(false));
        expect(response.status).toBe(403);
        expect(provider.send).not.toHaveBeenCalled();
      });

      it('still validates photos', async () => {
        const { provider } = makeProvider();
        const fetchFn = turnstile(true);
        const pdf = {
          filename: 'a.pdf',
          type: 'application/pdf',
          content: pad(ascii('%PDF-1.7'), 100),
        };
        const response = await run(today, makeEnv(), provider, fetchFn, {}, [pdf]);
        expect(response.status).toBe(400);
        expect(fetchFn).not.toHaveBeenCalled();
        expect(provider.send).not.toHaveBeenCalled();
      });

      it('is still rate limited', async () => {
        const { provider } = makeProvider();
        const env = makeEnv({
          APPOINTMENT_RATE_LIMIT: { limit: async () => ({ success: false }) },
        });
        const response = await run(today, env, provider);
        expect(response.status).toBe(429);
        expect(provider.send).not.toHaveBeenCalled();
      });
    });
  });

  describe('contact consent', () => {
    it.each([
      ['missing', undefined],
      ['false', false],
      ['the string "true"', 'true'],
      ['the number 1', 1],
    ])('rejects consent that is %s before Turnstile and Resend', async (_name, consent) => {
      const { provider } = makeProvider();
      const fetchFn = turnstile(true);
      const response = await run(
        { ...body, contactConsent: consent },
        makeEnv(),
        provider,
        fetchFn,
      );
      expect(response.status).toBe(400);
      expect((await errorOf(response)).error).toBe('validation');
      expect(fetchFn).not.toHaveBeenCalled();
      expect(provider.send).not.toHaveBeenCalled();
    });

    it('records the permission in the email when consent is true', async () => {
      const { provider, sent } = makeProvider();
      await run(body, makeEnv(), provider);
      expect(sent[0].text).toContain('Contact Permission: Yes');
    });
  });

  it('returns 403 and does not email when Turnstile fails', async () => {
    const { provider } = makeProvider();
    const response = await run(
      body,
      makeEnv(),
      provider,
      turnstile(false, ['invalid-input-response']),
    );
    expect(response.status).toBe(403);
    const payload = await errorOf(response);
    expect(payload.error).toBe('verification');
    expect(payload.message).toBe("We couldn't verify the submission. Please try again.");
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('fails closed when siteverify is unreachable', async () => {
    const { provider } = makeProvider();
    const fetchFn: FetchLike = async () => {
      throw new Error('network down');
    };
    const response = await run(body, makeEnv(), provider, fetchFn);
    expect(response.status).toBe(403);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('rejects with 429 and does not email when the rate limiter says no', async () => {
    const { provider } = makeProvider();
    const env = makeEnv({ APPOINTMENT_RATE_LIMIT: { limit: async () => ({ success: false }) } });
    const response = await run(body, env, provider);
    expect(response.status).toBe(429);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('still works if the rate limiter binding itself errors', async () => {
    const { provider } = makeProvider();
    const env = makeEnv({
      APPOINTMENT_RATE_LIMIT: {
        limit: async () => {
          throw new Error('boom');
        },
      },
    });
    const response = await run(body, env, provider);
    expect(response.status).toBe(200);
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['RESEND_API_KEY', { RESEND_API_KEY: undefined }],
    ['RESEND_API_KEY', { RESEND_API_KEY: '   ' }],
    ['EMAIL_FROM_ADDRESS', { EMAIL_FROM_ADDRESS: '' }],
    ['EMAIL_FROM_ADDRESS', { EMAIL_FROM_ADDRESS: 'not-an-address' }],
    ['APPOINTMENT_RECIPIENT', { APPOINTMENT_RECIPIENT: '' }],
    ['APPOINTMENT_RECIPIENT', { APPOINTMENT_RECIPIENT: undefined }],
  ] as [string, Partial<WorkerEnv>][])(
    'answers "unavailable" and sends nothing when %s is not configured',
    async (name, overrides) => {
      const { provider } = makeProvider();
      const response = await run(body, makeEnv(overrides), provider);
      expect(response.status).toBe(503);
      expect((await errorOf(response)).message).toContain('call or text Mira at (279) 529-8754');
      expect(provider.send).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`email_not_configured missing=${name}`),
      );
    },
  );

  it('answers "unavailable" when the Turnstile secret is missing', async () => {
    const { provider } = makeProvider();
    const response = await run(body, makeEnv({ TURNSTILE_SECRET_KEY: undefined }), provider);
    expect(response.status).toBe(503);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it.each([
    ['client_error', { ok: false, category: 'client_error', status: 422 }],
    ['server_error', { ok: false, category: 'server_error', status: 503 }],
    ['network', { ok: false, category: 'network' }],
    ['timeout', { ok: false, category: 'timeout' }],
    ['bad_response', { ok: false, category: 'bad_response', status: 200 }],
  ] as [string, EmailSendResult][])(
    'returns a generic delivery error for provider failure: %s',
    async (category, result) => {
      const { provider } = makeProvider(result);
      const response = await run(body, makeEnv(), provider);
      expect(response.status).toBe(502);
      const payload = await errorOf(response);
      expect(payload.error).toBe('delivery');
      expect(payload.message).toBe(
        "We couldn't send your request right now. Please call or text Mira at (279) 529-8754.",
      );
      expect(JSON.stringify(payload)).not.toMatch(/resend|422|503|api/i);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`email_failed category=${category}`),
      );
      expect(provider.send).toHaveBeenCalledTimes(1);
    },
  );

  it('uses Resend by default, with the configured key, and treats a 200 + id as sent', async () => {
    const resendFetch = vi.fn(async () => new Response(JSON.stringify({ id: 'abc-123' })));
    vi.stubGlobal('fetch', resendFetch);

    const response = await handleAppointmentRequest(post(body), makeEnv(), {
      fetchFn: turnstile(true),
      now: () => NOW,
    });

    expect(response.status).toBe(200);
    expect(resendFetch).toHaveBeenCalledTimes(1);
    const [url, init] = resendFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RESEND_ENDPOINT);
    expect((init.headers as Record<string, string>)['authorization']).toBe(`Bearer ${API_KEY}`);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('email_sent id=abc-123'));
  });

  it('returns a generic error when Resend answers 4xx, without leaking its body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"message":"The notify domain is not verified"}', { status: 403 }),
      ),
    );
    const response = await handleAppointmentRequest(post(body), makeEnv(), {
      fetchFn: turnstile(true),
      now: () => NOW,
    });
    expect(response.status).toBe(502);
    expect(JSON.stringify(await errorOf(response))).not.toContain('not verified');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('status=403'));
  });

  it('rejects other methods and cross-origin posts', async () => {
    const { provider } = makeProvider();
    const get = await handleAppointmentRequest(
      new Request('https://site.test/api/appointments'),
      makeEnv(),
    );
    expect(get.status).toBe(405);

    const crossOrigin = await run(body, makeEnv(), provider, turnstile(true), {
      origin: 'https://evil.example',
    });
    expect(crossOrigin.status).toBe(403);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('never logs visitor data, recipient, sender or secrets (success and failure paths)', async () => {
    const ok = makeProvider();
    await run(body, makeEnv(), ok.provider, turnstile(true), { 'cf-ray': 'ray-123' });
    await run(
      body,
      makeEnv(),
      makeProvider({ ok: false, category: 'server_error', status: 500 }).provider,
    );
    await run({ ...body, service: 'Nope' }, makeEnv(), ok.provider);
    await run(body, makeEnv(), ok.provider, turnstile(false));
    await run(body, makeEnv({ RESEND_API_KEY: undefined }), ok.provider);

    const logged = loggedText();
    expect(logged).toContain('ray-123');
    for (const sensitive of [
      'Jane Doe',
      '555-0100',
      'jane@example.com',
      'good-token',
      API_KEY,
      'notifications@example.test',
      'appointments@notify.example.test',
    ]) {
      expect(logged).not.toContain(sensitive);
    }
  });
});
