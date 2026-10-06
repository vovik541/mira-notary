import { AppointmentRequestPayload } from '../shared/appointment.model';
import { buildAppointmentEmail, escapeHtml, sanitizeForSubject } from './appointment-email';

const base: AppointmentRequestPayload = {
  fullName: 'Jane Doe',
  phone: '(916) 555-0100',
  service: 'Loan Signing',
  locationZip: '95814',
  preferredDate: '2027-03-15',
  preferredTime: 'Morning',
  urgent: false,
  turnstileToken: 'secret-token-value',
};

describe('buildAppointmentEmail', () => {
  it('uses the required subject and keeps document details out of it', () => {
    const email = buildAppointmentEmail({
      ...base,
      additionalDetails: 'Sensitive trust documents',
    });
    expect(email.subject).toBe('New Notary Appointment Request — Jane Doe');
    expect(email.subject).not.toContain('Sensitive');
  });

  it('renders defaults for optional fields in both html and text', () => {
    const { html, text } = buildAppointmentEmail(base);
    for (const body of [html, text]) {
      expect(body).toContain('Not provided');
      expect(body).toContain('Not specified');
      expect(body).toContain('None provided');
      expect(body).toContain('Submitted through Local Notary Signings website.');
    }
    expect(text).toContain('Same-Day / Urgent: No');
  });

  it('never leaks the Turnstile token', () => {
    const { html, text } = buildAppointmentEmail(base);
    expect(html).not.toContain('secret-token-value');
    expect(text).not.toContain('secret-token-value');
  });

  it('escapes visitor input in the html body', () => {
    const { html } = buildAppointmentEmail({
      ...base,
      fullName: '<img src=x onerror=alert(1)>',
      additionalDetails: '"><script>alert(1)</script>\nsecond & line',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
    expect(html).toContain('<br>second &amp; line');
  });

  it('keeps visitor line breaks out of the subject header', () => {
    const { subject } = buildAppointmentEmail({ ...base, fullName: 'Jane\r\nBcc: x@y.com' });
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe('helpers', () => {
  it('escapeHtml escapes all five characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('sanitizeForSubject collapses whitespace and truncates', () => {
    expect(sanitizeForSubject('  a \n\n b  ')).toBe('a b');
    expect(sanitizeForSubject('x'.repeat(100), 10)).toHaveLength(10);
  });
});
