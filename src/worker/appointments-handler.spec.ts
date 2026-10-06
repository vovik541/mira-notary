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
  preferredTime: 'Morning',
  urgent: false,
  turnstileToken: 'good-token',
};

function post(data: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://site.test/api/appointments', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof data === 'string' ? data : JSON.stringify(data),
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
  ) =>
    handleAppointmentRequest(post(data, headers), env, {
      fetchFn,
      emailProvider: provider,
      now: () => NOW,
    });

  it('hands a valid request to the email provider and returns success', async () => {
    const { provider, sent } = makeProvider();
    const response = await run(body, makeEnv(), provider);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
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
    ['malformed ZIP (4 digits)', { locationZip: '9581' }],
    ['malformed ZIP (6 digits)', { locationZip: '958140' }],
    ['malformed ZIP (letters)', { locationZip: '9581A' }],
    ['malformed ZIP (non-numeric)', { locationZip: 'abcde' }],
    ['ZIP+4', { locationZip: '95814-1234' }],
    ['padded ZIP', { locationZip: ' 95814 ' }],
    ['non-string ZIP', { locationZip: 95814 }],
    ['ZIP outside the confirmed service area', { locationZip: '90210' }],
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

  it('still stops an unconfirmed ZIP (e.g. Auburn PO Box 95604) before Turnstile and email', async () => {
    const { provider } = makeProvider();
    const fetchFn = turnstile(true);
    const response = await run({ ...body, locationZip: '95604' }, makeEnv(), provider, fetchFn);
    expect(response.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(provider.send).not.toHaveBeenCalled();
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

  it('rejects oversized bodies and non-JSON content types', async () => {
    const { provider } = makeProvider();
    const big = await run({ ...body, additionalDetails: 'a'.repeat(20_000) }, makeEnv(), provider);
    expect(big.status).toBe(400);

    const wrongType = await run(body, makeEnv(), provider, turnstile(true), {
      'content-type': 'text/plain',
    });
    expect(wrongType.status).toBe(400);
    expect(provider.send).not.toHaveBeenCalled();
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
      expect((await errorOf(response)).message).toContain('call or text Mira at (916) 759-0383');
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
        "We couldn't send your request right now. Please call or text Mira at (916) 759-0383.",
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
