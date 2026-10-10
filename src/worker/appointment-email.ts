import { AppointmentRequestPayload } from '../shared/appointment.model';
import { checkZip } from '../shared/service-area';
import {
  DateTiming,
  classifyDate,
  describeTimePreference,
  isWithinStandardHours,
} from '../shared/appointment-timing';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Single-line, bounded version of a visitor-supplied value for use in the subject line. */
export function sanitizeForSubject(value: string, maxLength = 60): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

interface Row {
  label: string;
  value: string;
  multiline?: boolean;
}

interface Section {
  title: string;
  rows: Row[];
}

/** "3 photos attached" / "None" — the photos themselves are attachments, never inlined. */
export function describeAttachments(photoCount: number): string {
  return photoCount === 0 ? 'None' : `${photoCount} photo${photoCount === 1 ? '' : 's'} attached`;
}

/** A specific time outside the standard 8:00 AM–8:00 PM hours: advisory, never rejected. */
function isOutsideStandardHours(request: AppointmentRequestPayload): boolean {
  return (
    request.timePreference === 'specific' &&
    request.specificTime !== null &&
    !isWithinStandardHours(request.specificTime)
  );
}

/** Attention marker for Mira: same-day, Sunday or both. Empty for a normal request. */
function requestKind(timing: DateTiming): string {
  if (timing.sameDay && timing.sunday) {
    return 'SAME-DAY SUNDAY';
  }
  if (timing.sameDay) {
    return 'SAME-DAY';
  }
  return timing.sunday ? 'SUNDAY' : '';
}

function sectionsFor(
  request: AppointmentRequestPayload,
  photoCount: number,
  timing: DateTiming,
): Section[] {
  return [
    { title: 'Service', rows: [{ label: 'Service', value: request.service }] },
    {
      title: 'Client',
      rows: [
        { label: 'Name', value: `${request.firstName} ${request.lastName}` },
        { label: 'Phone', value: request.phone },
        { label: 'Email', value: request.email },
      ],
    },
    {
      title: 'Appointment',
      rows: [
        { label: 'ZIP Code', value: request.locationZip },
        {
          label: 'Service Area',
          value:
            checkZip(request.locationZip).status === 'supported'
              ? 'Standard service area'
              : 'Outside standard service area — confirm travel availability and fee',
        },
        {
          label: 'Preferred Date',
          value: timing.sunday ? `${request.preferredDate} (Sunday)` : request.preferredDate,
        },
        {
          label: 'Preferred Time',
          value: describeTimePreference(request.timePreference, request.specificTime),
        },
        ...(isOutsideStandardHours(request)
          ? [
              {
                label: 'Time Window',
                value: 'Outside standard hours — confirm availability and additional fee',
              },
            ]
          : []),
        { label: 'Preferred Language', value: request.preferredLanguage ?? 'Not specified' },
      ],
    },
    {
      title: 'Details',
      rows: [
        {
          label: 'Number of Signers',
          value: request.numberOfSigners?.toString() ?? 'Not specified',
        },
        { label: 'Same-Day', value: timing.sameDay ? 'Yes' : 'No' },
        { label: 'Sunday', value: timing.sunday ? 'Yes' : 'No' },
        { label: 'Phone Confirmation Required', value: timing.phoneConfirmation ? 'Yes' : 'No' },
        {
          label: 'Contact Permission',
          value: 'Yes — phone, text or email regarding this request.',
        },
      ],
    },
    {
      title: 'Additional Details',
      rows: [
        {
          label: '',
          value: request.additionalDetails ?? 'None provided',
          multiline: true,
        },
      ],
    },
    {
      title: 'Attachments',
      rows: [{ label: 'Attachments', value: describeAttachments(photoCount) }],
    },
  ];
}

const bannerHtml = (kind: string): string =>
  `<tr><td style="background:#fff4d6;color:#7a4b00;padding:12px 24px;font-size:15px;font-weight:bold;border-bottom:1px solid #e5eaf0;">${escapeHtml(kind)} — phone confirmation required. Call the client to confirm availability.</td></tr>`;

const FOOTER = 'Submitted through Local Notary Signings website.';

/**
 * `timing` is the date-derived status computed by the Worker at validation time; it defaults to
 * the real clock only so callers without an injected clock stay simple.
 */
export function buildAppointmentEmail(
  request: AppointmentRequestPayload,
  photoCount = 0,
  timing: DateTiming = classifyDate(request.preferredDate),
): EmailContent {
  const sections = sectionsFor(request, photoCount, timing);
  const kind = requestKind(timing);

  const text = [
    kind ? `${kind} REQUEST — PHONE CONFIRMATION REQUIRED` : 'NEW APPOINTMENT REQUEST',
    '',
    ...sections.flatMap((section) => [
      section.title.toUpperCase(),
      ...section.rows.map((row) => (row.label ? `${row.label}: ${row.value}` : row.value)),
      '',
    ]),
    FOOTER,
  ].join('\n');

  const sectionHtml = sections
    .map((section) => {
      const rows = section.rows
        .map((row) => {
          const value = escapeHtml(row.value).replace(/\r?\n/g, '<br>');
          if (!row.label) {
            return `<tr><td style="padding:4px 0;font-size:15px;line-height:1.5;color:#172033;">${value}</td></tr>`;
          }
          return `<tr><td style="padding:4px 0;font-size:15px;line-height:1.5;color:#172033;"><span style="display:block;font-size:12px;color:#667085;">${escapeHtml(row.label)}</span>${value}</td></tr>`;
        })
        .join('');
      return `<tr><td style="padding:20px 24px 4px;"><div style="font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#082f57;border-bottom:1px solid #e5eaf0;padding-bottom:6px;">${escapeHtml(section.title)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">${rows}</table></td></tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f7f9fc;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5eaf0;border-radius:8px;">
<tr><td style="background:#082f57;color:#ffffff;padding:20px 24px;border-radius:8px 8px 0 0;font-size:20px;font-weight:bold;">New Appointment Request</td></tr>
${kind ? bannerHtml(kind) : ''}
${sectionHtml}
<tr><td style="padding:20px 24px;font-size:12px;color:#667085;border-top:1px solid #e5eaf0;">${escapeHtml(FOOTER)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return {
    subject: `${kind ? `${kind} — ` : ''}New Notary Appointment Request — ${sanitizeForSubject(`${request.firstName} ${request.lastName}`)}`,
    html,
    text,
  };
}
