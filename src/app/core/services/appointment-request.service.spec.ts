import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppointmentRequestPayload } from '../../../shared/appointment.model';
import { AppointmentRequestService, AppointmentSubmitResult } from './appointment-request.service';

const payload: AppointmentRequestPayload = {
  fullName: 'Jane Doe',
  phone: '(916) 555-0100',
  service: 'Loan Signing',
  locationZip: '95814',
  preferredDate: '2027-03-15',
  preferredTime: 'Morning',
  urgent: false,
  turnstileToken: 'token',
};

describe('AppointmentRequestService', () => {
  let service: AppointmentRequestService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppointmentRequestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const submit = (): { result: AppointmentSubmitResult | undefined } => {
    const holder: { result: AppointmentSubmitResult | undefined } = { result: undefined };
    service.submit(payload).subscribe((result) => (holder.result = result));
    return holder;
  };

  it('POSTs the payload to the same-origin endpoint', () => {
    const holder = submit();
    const request = http.expectOne('/api/appointments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ success: true });
    expect(holder.result).toEqual({ ok: true });
  });

  it('surfaces the API error message and code', () => {
    const holder = submit();
    http
      .expectOne('/api/appointments')
      .flush(
        { success: false, error: 'verification', message: "We couldn't verify the submission." },
        { status: 403, statusText: 'Forbidden' },
      );
    expect(holder.result).toEqual({
      ok: false,
      code: 'verification',
      message: "We couldn't verify the submission.",
    });
  });

  it('falls back to a safe "call Mira" message on network or unexpected errors', () => {
    const holder = submit();
    http.expectOne('/api/appointments').error(new ProgressEvent('error'));
    expect(holder.result?.ok).toBe(false);
    if (holder.result && !holder.result.ok) {
      expect(holder.result.code).toBe('delivery');
      expect(holder.result.message).toContain('(916) 759-0383');
    }
  });

  it('ignores error bodies that are not API responses', () => {
    const holder = submit();
    http
      .expectOne('/api/appointments')
      .flush('<html>boom</html>', { status: 500, statusText: 'Server Error' });
    expect(holder.result?.ok).toBe(false);
    if (holder.result && !holder.result.ok) {
      expect(holder.result.message).not.toContain('boom');
    }
  });
});
