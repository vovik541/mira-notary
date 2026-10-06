import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  isDevMode,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
import {
  APPOINTMENT_LANGUAGES,
  APPOINTMENT_LIMITS,
  APPOINTMENT_SERVICES,
  AppointmentLanguage,
  AppointmentRequestPayload,
  AppointmentService,
  DEFAULT_APPOINTMENT_SERVICE,
  serviceFromSlug,
} from '../../../shared/appointment.model';
import {
  PHOTO_ACCEPT,
  PHOTO_ERROR_MESSAGES,
  PHOTO_LIMITS,
  isAllowedPhotoType,
  normalizePhotoType,
  validatePhotos,
} from '../../../shared/photos';
import { normalizeZipCode } from '../../../shared/service-area';
import { BUSINESS } from '../../core/config/business.config';
import { SITE, TURNSTILE_DEV_SITE_KEY } from '../../core/config/site.config';
import { AppointmentRequestService } from '../../core/services/appointment-request.service';
import { ContactCardComponent } from '../../shared/components/contact-card/contact-card.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ZipInputDirective } from '../../shared/directives/zip-input.directive';
import { TurnstileComponent } from '../../shared/components/turnstile/turnstile.component';
import {
  emailValidator,
  nameValidator,
  phoneValidator,
  preferredDateValidator,
  requiredTrimmed,
  wholeNumberValidator,
  zipValidator,
} from '../../shared/validators/form-validators';

export const SERVICE_OPTIONS = APPOINTMENT_SERVICES;

export type FormState = 'idle' | 'sending' | 'success';

export type FieldKey =
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'service'
  | 'zip'
  | 'preferredDate'
  | 'preferredTime'
  | 'signers'
  | 'language'
  | 'details'
  | 'consent';

/** DOM order of the fields: used to focus the first invalid one. */
const FIELD_ORDER: readonly FieldKey[] = [
  'firstName',
  'lastName',
  'phone',
  'email',
  'service',
  'zip',
  'preferredDate',
  'preferredTime',
  'signers',
  'language',
  'details',
  'consent',
];

export interface PhotoItem {
  readonly id: number;
  readonly file: File;
  /** Object URL for a thumbnail; null for formats browsers generally cannot render (HEIC/HEIF). */
  readonly previewUrl: string | null;
}

export const CONSENT_ERROR_MESSAGE = 'Please confirm that Mira may contact you about this request.';
export const URGENT_PHONE_MESSAGE = 'Same-day and urgent appointments must be booked by phone.';

const GLOBAL_MESSAGES = {
  verify: 'Please complete the verification check before sending.',
  unavailable: `We couldn't send your request right now. Please call or text Mira at ${BUSINESS.phones.primary.display}.`,
  invalid: 'Please check the form and try again.',
} as const;

export const UNCONFIRMED_ZIP_MESSAGE =
  "This ZIP code is outside Mira's currently confirmed online service area. Contact Mira to ask about availability in other nearby communities.";

@Component({
  selector: 'app-contact',
  imports: [
    ReactiveFormsModule,
    ContactCardComponent,
    IconComponent,
    TurnstileComponent,
    ZipInputDirective,
  ],
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
  protected readonly limits = APPOINTMENT_LIMITS;
  protected readonly photoAccept = PHOTO_ACCEPT;
  protected readonly photoLimits = PHOTO_LIMITS;
  protected readonly urgentMessage = URGENT_PHONE_MESSAGE;
  protected readonly consentErrorMessage = CONSENT_ERROR_MESSAGE;

  protected readonly photos = signal<readonly PhotoItem[]>([]);
  protected readonly photoError = signal<string | null>(null);
  private nextPhotoId = 0;

  /** idle → sending → success (errors return to `idle` with `errorMessage` set). */
  protected readonly state = signal<FormState>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  /** Public Turnstile site key; empty in production until configured (form then fails closed). */
  protected readonly siteKey = SITE.turnstileSiteKey || (isDevMode() ? TURNSTILE_DEV_SITE_KEY : '');
  protected readonly turnstileEnabled = this.siteKey !== '';
  private turnstileToken: string | null = null;

  protected readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [
        requiredTrimmed,
        nameValidator,
        Validators.maxLength(APPOINTMENT_LIMITS.firstName),
      ],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [
        requiredTrimmed,
        nameValidator,
        Validators.maxLength(APPOINTMENT_LIMITS.lastName),
      ],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed, phoneValidator],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed, emailValidator],
    }),
    service: new FormControl<string>(DEFAULT_APPOINTMENT_SERVICE, {
      nonNullable: true,
      validators: [requiredTrimmed],
    }),
    zip: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed, zipValidator],
    }),
    preferredDate: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed, preferredDateValidator],
    }),
    preferredTime: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed, Validators.maxLength(APPOINTMENT_LIMITS.preferredTime)],
    }),
    signers: new FormControl<number | null>(null, [
      wholeNumberValidator,
      Validators.min(1),
      Validators.max(APPOINTMENT_LIMITS.maxSigners),
    ]),
    language: new FormControl<string>('English', { nonNullable: true }),
    details: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(APPOINTMENT_LIMITS.additionalDetails)],
    }),
    urgent: new FormControl(false, { nonNullable: true }),
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  /** Same-day / urgent requests are phone-only: while checked, the form cannot be submitted. */
  protected readonly urgent = toSignal(this.form.controls.urgent.valueChanges, {
    initialValue: false,
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokeAllPreviews());
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => this.applyQuery(params));
  }

  /**
   * `?service=` and `?zip=` are untrusted: the service goes through a strict whitelist (anything
   * else → General Notary) and the ZIP is only prefilled when it is a syntactically valid ZIP —
   * it is then validated like typed input, so an unsupported ZIP shows its error instead of
   * being accepted.
   */
  private applyQuery(params: ParamMap): void {
    this.form.controls.service.setValue(serviceFromSlug(params.get('service')));

    const zip = normalizeZipCode(params.get('zip'));
    if (zip) {
      this.form.controls.zip.setValue(zip);
      this.form.controls.zip.markAsTouched();
    }
  }

  protected control(key: FieldKey): AbstractControl {
    return this.form.controls[key];
  }

  /** Message for a field, only once the user has left it (or tried to submit). */
  protected fieldError(key: FieldKey): string | null {
    const control = this.control(key);
    if (!control.invalid || !control.touched) {
      return null;
    }
    return this.messageFor(key, control);
  }

  private messageFor(key: FieldKey, control: AbstractControl): string {
    const has = (code: string): boolean => control.hasError(code);
    switch (key) {
      case 'firstName':
        return has('required')
          ? 'Enter your first name.'
          : has('maxlength')
            ? `First name must be ${APPOINTMENT_LIMITS.firstName} characters or fewer.`
            : 'Enter a valid first name.';
      case 'lastName':
        return has('required')
          ? 'Enter your last name.'
          : has('maxlength')
            ? `Last name must be ${APPOINTMENT_LIMITS.lastName} characters or fewer.`
            : 'Enter a valid last name.';
      case 'phone':
        return has('required') ? 'Enter your phone number.' : 'Enter a valid phone number.';
      case 'email':
        return has('required') ? 'Enter your email address.' : 'Enter a valid email address.';
      case 'service':
        return 'Choose a service.';
      case 'zip':
        return has('required')
          ? 'ZIP code is required.'
          : has('zipUnconfirmed')
            ? UNCONFIRMED_ZIP_MESSAGE
            : 'Enter a valid 5-digit ZIP code.';
      case 'preferredDate':
        return has('required')
          ? 'Choose a preferred date.'
          : has('pastDate')
            ? 'Choose today or a future date.'
            : has('tooFar')
              ? 'Choose a date within the next two years.'
              : 'Enter a valid date.';
      case 'preferredTime':
        return has('required')
          ? 'Enter your preferred time.'
          : `Preferred time must be ${APPOINTMENT_LIMITS.preferredTime} characters or fewer.`;
      case 'signers':
        return `Enter a whole number from 1 to ${APPOINTMENT_LIMITS.maxSigners}.`;
      case 'consent':
        return CONSENT_ERROR_MESSAGE;
      case 'details':
        return `Additional details must be ${APPOINTMENT_LIMITS.additionalDetails} characters or fewer.`;
      default:
        return 'Please check this field.';
    }
  }

  protected detailsLength(): number {
    return this.form.controls.details.value.length;
  }

  protected onToken(token: string | null): void {
    this.turnstileToken = token;
    if (token) {
      this.clearVerifyError();
    }
  }

  protected onTurnstileLoadFailed(): void {
    this.errorMessage.set(GLOBAL_MESSAGES.unavailable);
  }

  protected onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    // Allow choosing the same file again later.
    input.value = '';
    if (picked.length === 0) {
      return;
    }

    const combined = [...this.photos().map((item) => item.file), ...picked];
    const problem = validatePhotos(combined);
    if (problem) {
      this.photoError.set(PHOTO_ERROR_MESSAGES[problem]);
      return;
    }
    this.photoError.set(null);
    this.photos.update((items) => [
      ...items,
      ...picked.map((file) => ({
        id: this.nextPhotoId++,
        file,
        previewUrl: this.previewFor(file),
      })),
    ]);
  }

  protected removePhoto(id: number): void {
    const item = this.photos().find((candidate) => candidate.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    this.photos.update((items) => items.filter((candidate) => candidate.id !== id));
    this.photoError.set(null);
  }

  protected formatSize(bytes: number): string {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private previewFor(file: File): string | null {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return null;
    }
    const type = normalizePhotoType(file.type, file.name);
    return isAllowedPhotoType(type) && type !== 'image/heic' && type !== 'image/heif'
      ? URL.createObjectURL(file)
      : null;
  }

  private clearPhotos(): void {
    this.revokeAllPreviews();
    this.photos.set([]);
    this.photoError.set(null);
  }

  private revokeAllPreviews(): void {
    for (const item of this.photos()) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }

  protected submit(): void {
    if (this.state() === 'sending' || this.urgent()) {
      return;
    }
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(GLOBAL_MESSAGES.invalid);
      this.focusFirstInvalid();
      return;
    }
    if (!this.turnstileEnabled) {
      this.errorMessage.set(GLOBAL_MESSAGES.unavailable);
      return;
    }
    if (!this.turnstileToken) {
      this.errorMessage.set(GLOBAL_MESSAGES.verify);
      return;
    }

    this.state.set('sending');
    const files = this.photos().map((item) => item.file);
    this.appointments.submit(this.buildPayload(this.turnstileToken), files).subscribe((result) => {
      if (result.ok) {
        this.form.reset({
          service: DEFAULT_APPOINTMENT_SERVICE,
          language: 'English',
          urgent: false,
          consent: false,
        });
        this.clearPhotos();
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
    const details = value.details.trim();
    const language = (APPOINTMENT_LANGUAGES as readonly string[]).includes(value.language)
      ? (value.language as AppointmentLanguage)
      : undefined;

    return {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: value.phone.trim(),
      email: value.email.trim(),
      service: value.service as AppointmentService,
      locationZip: normalizeZipCode(value.zip) ?? value.zip.trim(),
      preferredDate: value.preferredDate,
      preferredTime: value.preferredTime.trim(),
      ...(value.signers ? { numberOfSigners: value.signers } : {}),
      ...(language ? { preferredLanguage: language } : {}),
      ...(details ? { additionalDetails: details } : {}),
      urgent: false,
      contactConsent: true,
      turnstileToken,
    };
  }

  private clearVerifyError(): void {
    if (this.errorMessage() === GLOBAL_MESSAGES.verify) {
      this.errorMessage.set(null);
    }
  }

  private focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const first = FIELD_ORDER.find((key) => this.control(key).invalid);
    if (first) {
      const element = document.getElementById(first);
      element?.focus();
      element?.scrollIntoView?.({ block: 'center' });
    }
  }
}
