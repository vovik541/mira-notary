import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  APPOINTMENT_ENDPOINT,
  AppointmentApiResponse,
  AppointmentErrorCode,
  AppointmentRequestPayload,
} from '../../../shared/appointment.model';
import { BUSINESS } from '../config/business.config';

export type AppointmentSubmitResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: AppointmentErrorCode; readonly message: string };

const NETWORK_FAILURE_MESSAGE = `We couldn't send your request right now. Please call or text Mira at ${BUSINESS.phones.primary.display}.`;

/**
 * Sends appointment requests to the same-origin Worker endpoint (`POST /api/appointments`),
 * which validates, verifies Turnstile and emails Mira. Nothing is stored in the browser.
 */
@Injectable({ providedIn: 'root' })
export class AppointmentRequestService {
  private readonly http = inject(HttpClient);

  submit(payload: AppointmentRequestPayload): Observable<AppointmentSubmitResult> {
    return this.http.post<AppointmentApiResponse>(APPOINTMENT_ENDPOINT, payload).pipe(
      map((): AppointmentSubmitResult => ({ ok: true })),
      catchError((error: unknown) => of(this.toFailure(error))),
    );
  }

  private toFailure(error: unknown): AppointmentSubmitResult {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as Partial<AppointmentApiResponse> | null;
      if (body && body.success === false && typeof body.message === 'string' && body.error) {
        return { ok: false, code: body.error, message: body.message };
      }
    }
    return { ok: false, code: 'delivery', message: NETWORK_FAILURE_MESSAGE };
  }
}
