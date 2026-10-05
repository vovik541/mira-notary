import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BUSINESS } from '../config/business.config';

export interface AppointmentRequest {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly service: string;
  readonly location: string;
  readonly preferredDate: string;
  readonly preferredTime: string;
  readonly signers: number | null;
  readonly documents: number | null;
  readonly language: string;
  readonly details: string;
  readonly urgent: boolean;
}

export interface AppointmentSubmission {
  /** True only when a backend has accepted the request. Always false until one exists. */
  readonly delivered: boolean;
  /** Pre-filled mailto link so the visitor can send the request themselves in the meantime. */
  readonly mailtoUrl: string;
}

/**
 * Integration boundary for appointment requests.
 *
 * TODO(backend): replace the body of `submit` with an HttpClient POST to the real endpoint
 * (provideHttpClient(withFetch()) must be added to app.config.ts) and return
 * `delivered: true` only after the server confirms receipt. Nothing is sent anywhere today.
 */
@Injectable({ providedIn: 'root' })
export class AppointmentRequestService {
  submit(request: AppointmentRequest): Observable<AppointmentSubmission> {
    return of({ delivered: false, mailtoUrl: this.buildMailtoUrl(request) });
  }

  buildMailtoUrl(request: AppointmentRequest): string {
    const lines = [
      `Name: ${request.fullName}`,
      `Phone: ${request.phone}`,
      request.email ? `Email: ${request.email}` : null,
      `Service needed: ${request.service}`,
      `Location / ZIP: ${request.location}`,
      `Preferred date: ${request.preferredDate}`,
      `Preferred time: ${request.preferredTime}`,
      request.signers ? `Number of signers: ${request.signers}` : null,
      request.documents ? `Documents to notarize: ${request.documents}` : null,
      `Preferred language: ${request.language}`,
      request.urgent ? 'Same-day / urgent request: yes' : null,
      request.details ? `Details: ${request.details}` : null,
    ].filter((line): line is string => line !== null);

    const subject = encodeURIComponent(`Appointment request — ${request.service}`);
    const body = encodeURIComponent(lines.join('\n'));
    return `mailto:${BUSINESS.email}?subject=${subject}&body=${body}`;
  }
}
