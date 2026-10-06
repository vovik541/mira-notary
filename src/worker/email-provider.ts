/**
 * Provider-neutral outbound email boundary. The appointment handler only knows this interface;
 * everything provider-specific (endpoint, auth, field names) lives in an adapter such as
 * `ResendEmailSender`. Replacing the provider means writing another adapter, nothing else.
 */

export interface EmailAddress {
  email: string;
  name?: string;
}

/** A file attached to the email (already validated; content is Base64). */
export interface EmailAttachment {
  filename: string;
  contentBase64: string;
  contentType: string;
}

/** Fully trusted, server-built message (no field is taken directly from the browser request). */
export interface OutboundEmail {
  from: EmailAddress;
  /** Single recipient, from Worker configuration only. */
  to: string;
  /** Visitor's validated email address, when supplied. */
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  /** Optional photos, sent as normal attachments (never inlined into the HTML). */
  attachments?: readonly EmailAttachment[];
}

export type EmailFailureCategory =
  'network' | 'timeout' | 'client_error' | 'server_error' | 'bad_response';

export type EmailSendResult =
  { ok: true; id: string } | { ok: false; category: EmailFailureCategory; status?: number };

export interface EmailProvider {
  /** Never throws: failures are reported through the result. One attempt, no retries. */
  send(message: OutboundEmail): Promise<EmailSendResult>;
}
