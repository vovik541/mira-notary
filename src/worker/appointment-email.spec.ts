import { AppointmentRequestPayload } from '../shared/appointment.model';
import { buildAppointmentEmail, escapeHtml, sanitizeForSubject } from './appointment-email';

const base: AppointmentRequestPayload = {
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '(916) 555-0100',
  email: 'jane@example.com',
  service: 'Loan Signing',
  locationZip: '95814',
  preferredDate: '2027-03-15',
  timePreference: 'morning',
  specificTime: null,
  contactConsent: true,
  turnstileToken: 'secret-token-value',
};

describe('buildAppointmentEmail', () => {
  it('uses the required subject (first + last name) and keeps document details out of it', () => {
    const email = buildAppointmentEmail({
      ...base,
      additionalDetails: 'Sensitive trust documents',
    });
    expect(email.subject).toBe('New Notary Appointment Request — Jane Doe');
    expect(email.subject).not.toContain('Sensitive');
  });

  it('shows the split name, email and ZIP code in both html and text', () => {
    const { html, text } = buildAppointmentEmail(base);
    expect(text).toContain('Name: Jane Doe');
    expect(text).toContain('Email: jane@example.com');
    expect(text).toContain('ZIP Code: 95814');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('ZIP Code');
    expect(html).toContain('95814');
    expect(text).not.toContain('Location / ZIP');
  });

  it('renders defaults for optional fields in both html and text', () => {
    const { html, text } = buildAppointmentEmail(base);
    for (const body of [html, text]) {
      expect(body).toContain('Not specified');
      expect(body).toContain('None provided');
      expect(body).toContain('Submitted through Local Notary Signings website.');
    }
    expect(text).toContain('Same-Day: No');
    expect(text).toContain('Attachments: None');
  });

  it('includes the contact permission and no documents row', () => {
    const { html, text } = buildAppointmentEmail(base);
    for (const body of [html, text]) {
      expect(body).toContain('Yes — phone, text or email regarding this request.');
      expect(body).not.toContain('Documents');
    }
    expect(text).toContain('Contact Permission: Yes');
  });

  it('mentions the number of attached photos', () => {
    const { html, text } = buildAppointmentEmail(base, 3);
    expect(text).toContain('3 photos attached');
    expect(html).toContain('3 photos attached');
    expect(buildAppointmentEmail(base, 1).text).toContain('1 photo attached');
  });

  it.each([
    ['morning', null, 'Morning'],
    ['afternoon', null, 'Afternoon'],
    ['evening', null, 'Evening'],
    ['flexible', null, 'Flexible / Any Time'],
    ['specific', '14:30', 'Specific Time — 2:30 PM'],
    ['specific', '09:05', 'Specific Time — 9:05 AM'],
    ['specific', '00:15', 'Specific Time — 12:15 AM'],
    ['specific', '12:00', 'Specific Time — 12:00 PM'],
  ] as const)('shows %s %s as a readable label', (timePreference, specificTime, label) => {
    const { html, text } = buildAppointmentEmail({ ...base, timePreference, specificTime });
    expect(text).toContain(`Preferred Time: ${label}`);
    expect(html).toContain(label);
    expect(text).not.toMatch(/Preferred Time: (specific|afternoon|morning|evening|flexible)\b/);
  });

  const NORMAL = { sameDay: false, sunday: false, phoneConfirmation: false };
  const SAME_DAY = { sameDay: true, sunday: false, phoneConfirmation: true };
  const SUNDAY = { sameDay: false, sunday: true, phoneConfirmation: true };
  const SAME_DAY_SUNDAY = { sameDay: true, sunday: true, phoneConfirmation: true };

  it('keeps a normal request unmarked: Same-Day No, Sunday No, Phone Confirmation No', () => {
    const { subject, text, html } = buildAppointmentEmail(base, 0, NORMAL);
    expect(subject).toBe('New Notary Appointment Request — Jane Doe');
    expect(text.split('\n')[0]).toBe('NEW APPOINTMENT REQUEST');
    expect(text).toContain('Same-Day: No');
    expect(text).toContain('Sunday: No');
    expect(text).toContain('Phone Confirmation Required: No');
    expect(html).not.toContain('phone confirmation required');
  });

  it('marks a same-day request in the subject, banner and rows', () => {
    const { subject, text, html } = buildAppointmentEmail(base, 0, SAME_DAY);
    expect(subject).toBe('SAME-DAY — New Notary Appointment Request — Jane Doe');
    expect(text.split('\n')[0]).toBe('SAME-DAY REQUEST — PHONE CONFIRMATION REQUIRED');
    expect(text).toContain('Same-Day: Yes');
    expect(text).toContain('Sunday: No');
    expect(text).toContain('Phone Confirmation Required: Yes');
    expect(html).toContain('phone confirmation required');
  });

  it('marks a future Sunday request without calling it urgent or same-day', () => {
    const request = { ...base, preferredDate: '2027-03-14' };
    const { subject, text } = buildAppointmentEmail(request, 0, SUNDAY);
    expect(subject).toBe('SUNDAY — New Notary Appointment Request — Jane Doe');
    expect(subject).not.toMatch(/URGENT|SAME-DAY/);
    expect(text).toContain('Preferred Date: 2027-03-14 (Sunday)');
    expect(text).toContain('Same-Day: No');
    expect(text).toContain('Sunday: Yes');
    expect(text).toContain('Phone Confirmation Required: Yes');
  });

  it('marks a same-day Sunday request once', () => {
    const { subject, text } = buildAppointmentEmail(
      { ...base, preferredDate: '2027-03-14' },
      0,
      SAME_DAY_SUNDAY,
    );
    expect(subject).toBe('SAME-DAY SUNDAY — New Notary Appointment Request — Jane Doe');
    expect(text).toContain('Same-Day: Yes');
    expect(text).toContain('Sunday: Yes');
  });

  it('derives Sunday from the date when no timing is passed', () => {
    const { text } = buildAppointmentEmail({ ...base, preferredDate: '2027-03-14' });
    expect(text).toContain('Sunday: Yes');
    expect(text).toContain('Phone Confirmation Required: Yes');
  });

  it('has no user-controlled urgent wording', () => {
    const { text } = buildAppointmentEmail(base, 0, NORMAL);
    expect(text).not.toMatch(/urgent/i);
  });

  it('never leaks the Turnstile token', () => {
    const { html, text } = buildAppointmentEmail(base);
    expect(html).not.toContain('secret-token-value');
    expect(text).not.toContain('secret-token-value');
  });

  it('escapes visitor input in the html body', () => {
    const { html } = buildAppointmentEmail({
      ...base,
      firstName: '<img src=x onerror=alert(1)>',
      additionalDetails: '"><script>alert(1)</script>\nsecond & line',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
    expect(html).toContain('<br>second &amp; line');
  });

  it('keeps visitor line breaks out of the subject header', () => {
    const { subject } = buildAppointmentEmail({ ...base, lastName: 'Doe\r\nBcc: x@y.com' });
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
