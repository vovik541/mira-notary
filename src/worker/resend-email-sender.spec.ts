import { OutboundEmail } from './email-provider';
import { RESEND_ENDPOINT, ResendEmailSender, formatAddress } from './resend-email-sender';
import { FetchLike } from './turnstile';

const API_KEY = 're_test_key';

const message: OutboundEmail = {
  from: {
    email: 'appointments@notify.example.test',
    name: 'Local Notary Signings by Mira Derkach',
  },
  to: 'notifications@example.test',
  replyTo: 'jane@example.com',
  subject: 'New Notary Appointment Request — Jane Doe',
  html: '<p>hi</p>',
  text: 'hi',
};

const respond = (init: ResponseInit | undefined, body: string | null): FetchLike =>
  vi.fn(async () => new Response(body, init));

describe('ResendEmailSender', () => {
  it('POSTs the official Resend contract (snake_case fields, bearer auth)', async () => {
    const fetchFn = respond(undefined, JSON.stringify({ id: 'msg-1' }));
    const result = await new ResendEmailSender(API_KEY, fetchFn).send(message);

    expect(result).toEqual({ ok: true, id: 'msg-1' });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [url, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://api.resend.com/emails');
    expect(url).toBe(RESEND_ENDPOINT);
    expect(init.method).toBe('POST');

    const headers = init.headers as Record<string, string>;
    expect(headers['authorization']).toBe(`Bearer ${API_KEY}`);
    expect(headers['content-type']).toBe('application/json');
    expect(headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);

    expect(JSON.parse(init.body as string)).toEqual({
      from: '"Local Notary Signings by Mira Derkach" <appointments@notify.example.test>',
      to: ['notifications@example.test'],
      subject: 'New Notary Appointment Request — Jane Doe',
      html: '<p>hi</p>',
      text: 'hi',
      reply_to: 'jane@example.com',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends attachments as snake_case base64 objects', async () => {
    const fetchFn = respond(undefined, JSON.stringify({ id: 'msg-2' }));
    await new ResendEmailSender(API_KEY, fetchFn).send({
      ...message,
      attachments: [{ filename: 'a.jpg', contentBase64: 'QUJD', contentType: 'image/jpeg' }],
    });
    const [, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).attachments).toEqual([
      { filename: 'a.jpg', content: 'QUJD', content_type: 'image/jpeg' },
    ]);
  });

  it('omits the attachments field when there are none', async () => {
    const fetchFn = respond(undefined, JSON.stringify({ id: 'msg-3' }));
    await new ResendEmailSender(API_KEY, fetchFn).send(message);
    const [, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty('attachments');
  });

  it('omits reply_to when there is no visitor email', async () => {
    const fetchFn = respond(undefined, JSON.stringify({ id: 'msg-1' }));
    const { replyTo: _replyTo, ...withoutReplyTo } = message;
    await new ResendEmailSender(API_KEY, fetchFn).send(withoutReplyTo);
    const [, init] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty('reply_to');
    expect(JSON.parse(init.body as string)).not.toHaveProperty('replyTo');
  });

  it.each([400, 401, 403, 422, 429])('classifies HTTP %i as a client error', async (status) => {
    const result = await new ResendEmailSender(
      API_KEY,
      respond({ status }, '{"message":"x"}'),
    ).send(message);
    expect(result).toEqual({ ok: false, category: 'client_error', status });
  });

  it.each([500, 502, 503])('classifies HTTP %i as a server error', async (status) => {
    const result = await new ResendEmailSender(API_KEY, respond({ status }, 'oops')).send(message);
    expect(result).toEqual({ ok: false, category: 'server_error', status });
  });

  it('treats network exceptions as failures without throwing', async () => {
    const fetchFn: FetchLike = async () => {
      throw new TypeError('fetch failed');
    };
    expect(await new ResendEmailSender(API_KEY, fetchFn).send(message)).toEqual({
      ok: false,
      category: 'network',
    });
  });

  it('treats an aborted / timed-out request as a timeout', async () => {
    const fetchFn: FetchLike = async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    };
    expect(await new ResendEmailSender(API_KEY, fetchFn).send(message)).toEqual({
      ok: false,
      category: 'timeout',
    });
  });

  it('really aborts a hanging request after the configured timeout', async () => {
    const hanging: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    const result = await new ResendEmailSender(API_KEY, hanging, 20).send(message);
    expect(result).toEqual({ ok: false, category: 'timeout' });
  });

  it.each([
    ['unreadable body', 'not json'],
    ['missing id', '{"ok":true}'],
    ['non-string id', '{"id":123}'],
    ['empty id', '{"id":""}'],
  ])('rejects a 200 with a malformed response (%s)', async (_name, body) => {
    const result = await new ResendEmailSender(API_KEY, respond({ status: 200 }, body)).send(
      message,
    );
    expect(result).toEqual({ ok: false, category: 'bad_response', status: 200 });
  });

  it('makes exactly one attempt, even on failure (no retries / duplicate sends)', async () => {
    const fetchFn = respond({ status: 503 }, 'down');
    await new ResendEmailSender(API_KEY, fetchFn).send(message);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('never exposes the API key in its results', async () => {
    const results = [
      await new ResendEmailSender(API_KEY, respond({ status: 401 }, 'bad key')).send(message),
      await new ResendEmailSender(API_KEY, respond(undefined, '{"id":"x"}')).send(message),
    ];
    expect(JSON.stringify(results)).not.toContain(API_KEY);
  });
});

describe('formatAddress', () => {
  it('returns the bare address without a name', () => {
    expect(formatAddress({ email: 'a@b.test' })).toBe('a@b.test');
  });

  it('quotes and escapes display names', () => {
    expect(formatAddress({ email: 'a@b.test', name: 'Mira, "The" Notary' })).toBe(
      '"Mira, \\"The\\" Notary" <a@b.test>',
    );
  });
});
