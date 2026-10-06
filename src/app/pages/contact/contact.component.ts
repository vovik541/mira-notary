import {
  ChangeDetectionStrategy,
  Component,
  inject,
  isDevMode,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  APPOINTMENT_LANGUAGES,
  APPOINTMENT_LIMITS,
  APPOINTMENT_SERVICES,
  AppointmentLanguage,
  AppointmentRequestPayload,
  AppointmentService,
} from '../../../shared/appointment.model';
import { BUSINESS } from '../../core/config/business.config';
import { SITE, TURNSTILE_DEV_SITE_KEY } from '../../core/config/site.config';
import { AppointmentRequestService } from '../../core/services/appointment-request.service';
import { ContactCardComponent } from '../../shared/components/contact-card/contact-card.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TurnstileComponent } from '../../shared/components/turnstile/turnstile.component';

export const SERVICE_OPTIONS = APPOINTMENT_SERVICES;

export type FormState = 'idle' | 'sending' | 'success';

const PHONE_PATTERN = /^[+()\-.\s\d]{10,20}$/;
const ZIP_PARAM_PATTERN = /^\d{5}(-\d{4})?$/;

const MESSAGES = {
  verify: 'Please complete the verification check before sending.',
  unavailable: `We couldn't send your request right now. Please call or text Mira at ${BUSINESS.phones.primary.display}.`,
  invalid: 'Please check the form and try again.',
} as const;

/** Rejects dates before today (local time). Evaluated at validation time, never at build time. */
export const notInPastValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return value < today ? { pastDate: true } : null;
};

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, ContactCardComponent, IconComponent, TurnstileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly appointments = inject(AppointmentRequestService);
  private readonly turnstile = viewChild(TurnstileComponent);

  protected readonly phone = BUSINESS.phones.primary;
  protected readonly serviceOptions = SERVICE_OPTIONS;
  protected readonly languageOptions = APPOINTMENT_LANGUAGES;

  /** idle → sending → success (errors return to `idle` with `errorMessage` set). */
  protected readonly state = signal<FormState>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  /** Public Turnstile site key; empty in production until configured (form then fails closed). */
  protected readonly siteKey = SITE.turnstileSiteKey || (isDevMode() ? TURNSTILE_DEV_SITE_KEY : '');
  protected readonly turnstileEnabled = this.siteKey !== '';
  private turnstileToken: string | null = null;

  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(APPOINTMENT_LIMITS.fullName)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PHONE_PATTERN)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(APPOINTMENT_LIMITS.email)],
    }),
    service: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(APPOINTMENT_LIMITS.locationZip)],
    }),
    preferredDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, notInPastValidator],
    }),
    preferredTime: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(APPOINTMENT_LIMITS.preferredTime)],
    }),
    signers: new FormControl<number | null>(null, [
      Validators.min(1),
      Validators.max(APPOINTMENT_LIMITS.maxSigners),
    ]),
    documents: new FormControl<number | null>(null, [
      Validators.min(1),
      Validators.max(APPOINTMENT_LIMITS.maxDocuments),
    ]),
    language: new FormControl<string>('English', { nonNullable: true }),
    details: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(APPOINTMENT_LIMITS.additionalDetails)],
    }),
    urgent: new FormControl(false, { nonNullable: true }),
  });

  constructor() {
    const zip = inject(ActivatedRoute).snapshot.queryParamMap.get('zip')?.trim();
    if (zip && ZIP_PARAM_PATTERN.test(zip)) {
      this.form.controls.location.setValue(zip);
    }
  }

  protected showError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected onToken(token: string | null): void {
    this.turnstileToken = token;
    if (token) {
      this.clearVerifyError();
    }
  }

  protected onTurnstileLoadFailed(): void {
    this.errorMessage.set(MESSAGES.unavailable);
  }

  protected submit(): void {
    if (this.state() === 'sending') {
      return;
    }
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(MESSAGES.invalid);
      this.focusFirstInvalid();
      return;
    }
    if (!this.turnstileEnabled) {
      this.errorMessage.set(MESSAGES.unavailable);
      return;
    }
    if (!this.turnstileToken) {
      this.errorMessage.set(MESSAGES.verify);
      return;
    }

    this.state.set('sending');
    this.appointments.submit(this.buildPayload(this.turnstileToken)).subscribe((result) => {
      if (result.ok) {
        this.form.reset({ language: 'English', urgent: false });
        this.turnstileToken = null;
        this.state.set('success');
        return;
      }
      // Tokens are single-use: always ask for a fresh one after a failed attempt.
      this.turnstileToken = null;
      this.turnstile()?.reset();
      this.errorMessage.set(result.message);
      this.state.set('idle');
    });
  }

  protected newRequest(): void {
    this.errorMessage.set(null);
    this.state.set('idle');
  }

  private buildPayload(turnstileToken: string): AppointmentRequestPayload {
    const value = this.form.getRawValue();
    const email = value.email.trim();
    const details = value.details.trim();
    const language = (APPOINTMENT_LANGUAGES as readonly string[]).includes(value.language)
      ? (value.language as AppointmentLanguage)
      : undefined;

    return {
      fullName: value.fullName.trim(),
      phone: value.phone.trim(),
      ...(email ? { email } : {}),
      service: value.service as AppointmentService,
      locationZip: value.location.trim(),
      preferredDate: value.preferredDate,
      preferredTime: value.preferredTime.trim(),
      ...(value.signers ? { numberOfSigners: value.signers } : {}),
      ...(value.documents ? { numberOfDocuments: value.documents } : {}),
      ...(language ? { preferredLanguage: language } : {}),
      ...(details ? { additionalDetails: details } : {}),
      urgent: value.urgent,
      turnstileToken,
    };
  }

  private clearVerifyError(): void {
    if (this.errorMessage() === MESSAGES.verify) {
      this.errorMessage.set(null);
    }
  }

  private focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus();
  }
}
