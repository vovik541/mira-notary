import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  APPOINTMENT_ENDPOINT,
  APPOINTMENT_PAYLOAD_FIELD,
  APPOINTMENT_PHOTOS_FIELD,
  AppointmentApiResponse,
  AppointmentErrorCode,
  AppointmentRequestPayload,
} from '../../../shared/appointment.model';
import { BUSINESS } from '../config/business.config';

export type AppointmentSubmitResult =
  | { readonly ok: true; readonly phoneConfirmationRequired: boolean }
  | { readonly ok: false; readonly code: AppointmentErrorCode; readonly message: string };

const NETWORK_FAILURE_MESSAGE = `We couldn't send your request right now. Please call or text Mira & Team at ${BUSINESS.phones.primary.display}.`;

/**
 * Sends appointment requests to the same-origin Worker endpoint (`POST /api/appointments`),
 * which validates, verifies Turnstile and emails Mira. Nothing is stored in the browser.
 */
@Injectable({ providedIn: 'root' })
export class AppointmentRequestService {
  private readonly http = inject(HttpClient);

  /**
   * Sends the request as `multipart/form-data` (JSON `payload` part + `photos` file parts). The
   * browser sets the multipart boundary itself, so no Content-Type header is set here.
   */
  submit(
    payload: AppointmentRequestPayload,
    photos: readonly File[] = [],
  ): Observable<AppointmentSubmitResult> {
    const body = new FormData();
    body.append(APPOINTMENT_PAYLOAD_FIELD, JSON.stringify(payload));
    for (const photo of photos) {
      body.append(APPOINTMENT_PHOTOS_FIELD, photo, photo.name);
    }
    return this.http.post<AppointmentApiResponse>(APPOINTMENT_ENDPOINT, body).pipe(
      map((response): AppointmentSubmitResult => ({
        ok: true,
        phoneConfirmationRequired:
          response.success === true && response.phoneConfirmationRequired === true,
      })),
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
