import { AppointmentRequest, AppointmentRequestService } from './appointment-request.service';

const request: AppointmentRequest = {
  fullName: 'Jane Doe',
  phone: '(916) 555-0100',
  email: '',
  service: 'Loan Signing',
  location: '95814',
  preferredDate: '2030-01-15',
  preferredTime: 'Morning',
  signers: 2,
  documents: null,
  language: 'English',
  details: 'Closing at a title office & hospital',
  urgent: true,
};

describe('AppointmentRequestService', () => {
  const service = new AppointmentRequestService();

  it('never reports a request as delivered while no backend exists', () => {
    let delivered: boolean | undefined;
    service.submit(request).subscribe((result) => (delivered = result.delivered));
    expect(delivered).toBe(false);
  });

  it('builds a mailto link addressed to Mira with encoded details', () => {
    const url = service.buildMailtoUrl(request);
    expect(url.startsWith('mailto:MiraNotary@gmail.com?subject=')).toBe(true);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).toContain('Name: Jane Doe');
    expect(body).toContain('Number of signers: 2');
    expect(body).toContain('Same-day / urgent request: yes');
    expect(body).toContain('Details: Closing at a title office & hospital');
    expect(body).not.toContain('Email:');
    expect(body).not.toContain('Documents to notarize');
  });
});
