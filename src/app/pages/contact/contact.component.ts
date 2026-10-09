import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
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
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { merge, scan } from 'rxjs';
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
  TIME_PREFERENCES,
  TIME_PREFERENCE_LABELS,
  STANDARD_HOURS,
  STANDARD_HOURS_LABEL,
  TimePreference,
  classifyDate,
  isTimePreference,
  isValidTimeOfDay,
  isWithinStandardHours,
} from '../../../shared/appointment-timing';
import {
  PHOTO_ACCEPT,
  PHOTO_ERROR_MESSAGES,
  PHOTO_LIMITS,
  isAllowedPhotoType,
  normalizePhotoType,
  validatePhotos,
} from '../../../shared/photos';
import { normalizeZipCode } from '../../../shared/service-area';
import {
  MAX_SIGNERS,
  SIGNERS_INPUT_MAX_LENGTH,
  formatPhone,
  normalizePhone,
  parseSigners,
} from '../../../shared/validation';
import { BUSINESS } from '../../core/config/business.config';
import { SITE, TURNSTILE_DEV_SITE_KEY } from '../../core/config/site.config';
import { AppointmentRequestService } from '../../core/services/appointment-request.service';
import { ContactCardComponent } from '../../shared/components/contact-card/contact-card.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DigitsInputDirective } from '../../shared/directives/digits-input.directive';
import { NameInputDirective } from '../../shared/directives/name-input.directive';
import { ZipInputDirective } from '../../shared/directives/zip-input.directive';
import { TurnstileComponent } from '../../shared/components/turnstile/turnstile.component';
import {
  emailValidator,
  nameValidator,
  phoneValidator,
  preferredDateValidator,
  requiredTrimmed,
  signersValidator,
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
  | 'timePreference'
  | 'specificTime'
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
  'timePreference',
  'specificTime',
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
export const CONSENT_HELP_MESSAGE = 'Required so Mira can respond to your appointment request.';

export interface PhoneNotice {
  readonly title: string;
  readonly body: string;
}

const PHONE_TEXT = BUSINESS.phones.primary.display;

/**
 * Informational (not error) notices derived from the preferred date. Submission is always
 * allowed; availability for same-day and Sunday requests is confirmed by phone.
 */
export const SAME_DAY_NOTICE: PhoneNotice = {
  title: 'Same-day request',
  body: `You may submit your request so Mira can review the details, but submitting this form does not confirm an appointment. Please call Mira at ${PHONE_TEXT} to confirm today's availability.`,
};
export const SUNDAY_NOTICE: PhoneNotice = {
  title: 'Sunday availability',
  body: `Sunday appointments may be available by request and must be confirmed by phone. You may submit your request for Mira to review, then call ${PHONE_TEXT} to confirm availability.`,
};
export const SAME_DAY_SUNDAY_NOTICE: PhoneNotice = {
  title: 'Same-day Sunday request',
  body: `You may submit your request so Mira can review the details, but same-day Sunday availability must be confirmed by phone. Please call Mira at ${PHONE_TEXT} after submitting.`,
};

/** What the success state says; submitting never confirms a same-day or Sunday appointment. */
export type PhoneSuccessKind = 'same-day' | 'sunday' | 'same-day-sunday' | 'generic';
export const PHONE_SUCCESS_COPY: Record<PhoneSuccessKind, string> = {
  'same-day': `Mira has received your request, but this does not confirm a same-day appointment. Please call ${PHONE_TEXT} now to confirm availability.`,
  sunday: `Mira has received your request, but this does not confirm a Sunday appointment. Please call ${PHONE_TEXT} to confirm availability.`,
  'same-day-sunday': `Mira has received your request, but this does not confirm a same-day Sunday appointment. Please call ${PHONE_TEXT} now to confirm availability.`,
  generic: `Mira has received your request, but this does not confirm an appointment. Please call ${PHONE_TEXT} to confirm availability.`,
};

/** Why Submit is unavailable (one short message, chosen by priority). */
export const SUBMIT_BLOCK_MESSAGES = {
  fieldsAndConsent: 'Complete the required fields and agree to be contacted.',
  consentOnly: 'Please agree to be contacted before submitting.',
  fields: 'Please complete the required fields correctly.',
  photos: 'Please fix the photo upload before submitting.',
  time: 'Please choose a valid appointment time.',
} as const;
export type SubmitBlockReason = keyof typeof SUBMIT_BLOCK_MESSAGES;

export const NAME_INVALID_MESSAGE =
  'Use letters only; apostrophes, hyphens and spaces are allowed.';
export const SIGNERS_MESSAGE = `Enter a whole number from 1 to ${MAX_SIGNERS}.`;

export const SPECIFIC_TIME_RANGE_MESSAGE = `Choose a time between ${STANDARD_HOURS_LABEL}.`;

/**
 * The real validation of the conditional Specific Time field (no HTML `required`/`min`/`max` is
 * relied upon): only when "Specific Time" is chosen, it must be a valid HH:mm inside 08:30–20:30.
 */
const specificTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (control.parent?.get('timePreference')?.value !== 'specific') {
    return null;
  }
  if (!isValidTimeOfDay(control.value)) {
    return { specificTime: true };
  }
  return isWithinStandardHours(control.value) ? null : { outsideHours: true };
};

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
    NameInputDirective,
    DigitsInputDirective,
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
  protected readonly consentHelp = CONSENT_HELP_MESSAGE;
  protected readonly signersMaxLength = SIGNERS_INPUT_MAX_LENGTH;
  protected readonly standardHours = STANDARD_HOURS;
  protected readonly standardHoursLabel = STANDARD_HOURS_LABEL;
  protected readonly timeOptions = TIME_PREFERENCES.map((value) => ({
    value,
    label: TIME_PREFERENCE_LABELS[value],
  }));

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
        Validators.maxLength(APPOINTMENT_LIMITS.firstName),
        nameValidator,
      ],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [
        requiredTrimmed,
        Validators.maxLength(APPOINTMENT_LIMITS.lastName),
        nameValidator,
      ],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed, phoneValidator],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed, Validators.maxLength(APPOINTMENT_LIMITS.email), emailValidator],
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
    timePreference: new FormControl('', { nonNullable: true, validators: [requiredTrimmed] }),
    specificTime: new FormControl('', { nonNullable: true, validators: [specificTimeValidator] }),
    signers: new FormControl('', { nonNullable: true, validators: [signersValidator] }),
    language: new FormControl<string>('English', { nonNullable: true }),
    details: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(APPOINTMENT_LIMITS.additionalDetails)],
    }),
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  private readonly dateValue = toSignal(this.form.controls.preferredDate.valueChanges, {
    initialValue: '',
  });
  protected readonly timePreference = toSignal(this.form.controls.timePreference.valueChanges, {
    initialValue: '',
  });
  /**
   * Ticks on every value/status change, so the computed submit state below always re-reads the
   * controls (consent included) instead of mirroring a stale copy of the form's validity.
   */
  private readonly formTick = toSignal(
    merge(this.form.valueChanges, this.form.statusChanges).pipe(scan((count) => count + 1, 0)),
    { initialValue: 0 },
  );

  /**
   * The single source of truth for "why can't I submit?" (null = nothing blocks). Priority:
   * photo problem → (fields + consent) → consent only → a bad Specific Time alone → other fields.
   */
  protected readonly submitBlockReason = computed<SubmitBlockReason | null>(() => {
    this.formTick();
    if (this.photoError() !== null) {
      return 'photos';
    }
    const controls = this.form.controls;
    const consentOk = controls.consent.value === true;
    const others = Object.entries(controls).filter(([key]) => key !== 'consent');
    const invalid = others.filter(([, control]) => control.invalid).map(([key]) => key);
    if (invalid.length > 0 && !consentOk) {
      return 'fieldsAndConsent';
    }
    if (invalid.length === 0 && !consentOk) {
      return 'consentOnly';
    }
    if (invalid.length > 0) {
      return invalid.length === 1 && invalid[0] === 'specificTime' ? 'time' : 'fields';
    }
    return null;
  });
  protected readonly submitBlockMessage = computed(() => {
    const reason = this.submitBlockReason();
    return reason === null ? null : SUBMIT_BLOCK_MESSAGES[reason];
  });
  /** Submit is available only when nothing blocks it and no request is in flight. */
  protected readonly canSubmit = computed(
    () => this.state() !== 'sending' && this.submitBlockReason() === null,
  );

  /**
   * Same-day / Sunday status is derived from the preferred date alone (Mira's time zone). There is
   * no user-controlled urgent state: it never blocks submission and is recomputed by the Worker.
   */
  protected readonly timing = computed(() => classifyDate(this.dateValue()));
  protected readonly notice = computed<PhoneNotice | null>(() => {
    const kind = this.successKindFor(this.timing());
    return kind === 'same-day-sunday'
      ? SAME_DAY_SUNDAY_NOTICE
      : kind === 'same-day'
        ? SAME_DAY_NOTICE
        : kind === 'sunday'
          ? SUNDAY_NOTICE
          : null;
  });
  /** Set after a successful send of a request Mira still has to confirm by phone. */
  protected readonly phoneSuccess = signal<PhoneSuccessKind | null>(null);
  protected readonly phoneSuccessCopy = PHONE_SUCCESS_COPY;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokeAllPreviews());
    this.form.controls.timePreference.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((preference) => {
        const specific = this.form.controls.specificTime;
        if (preference !== 'specific' && specific.value !== '') {
          specific.setValue('');
        }
        specific.updateValueAndValidity();
      });
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
          ? 'First name is required.'
          : has('maxlength')
            ? `First name must be ${APPOINTMENT_LIMITS.firstName} characters or fewer.`
            : NAME_INVALID_MESSAGE;
      case 'lastName':
        return has('required')
          ? 'Last name is required.'
          : has('maxlength')
            ? `Last name must be ${APPOINTMENT_LIMITS.lastName} characters or fewer.`
            : NAME_INVALID_MESSAGE;
      case 'phone':
        return has('required')
          ? 'Enter your phone number.'
          : 'Enter a valid 10-digit phone number.';
      case 'email':
        return has('required')
          ? 'Enter your email address.'
          : has('maxlength')
            ? `Email must be ${APPOINTMENT_LIMITS.email} characters or fewer.`
            : 'Enter a valid email address.';
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
      case 'timePreference':
        return 'Choose a preferred time.';
      case 'specificTime':
        return has('outsideHours') ? SPECIFIC_TIME_RANGE_MESSAGE : 'Enter a specific time.';
      case 'signers':
        return SIGNERS_MESSAGE;
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

  /** Opening the picker again starts a new attempt: the previous rejection no longer blocks. */
  protected onPhotoPickerOpen(): void {
    this.photoError.set(null);
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
    if (this.state() === 'sending') {
      return;
    }
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(GLOBAL_MESSAGES.invalid);
      this.focusFirstInvalid();
      return;
    }
    if (this.photoError() !== null) {
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
    const submittedKind = this.successKindFor(classifyDate(this.form.controls.preferredDate.value));
    const files = this.photos().map((item) => item.file);
    this.appointments.submit(this.buildPayload(this.turnstileToken), files).subscribe((result) => {
      if (result.ok) {
        this.form.reset({
          service: DEFAULT_APPOINTMENT_SERVICE,
          language: 'English',
          consent: false,
        });
        this.phoneSuccess.set(
          result.phoneConfirmationRequired ? (submittedKind ?? 'generic') : submittedKind,
        );
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
    this.phoneSuccess.set(null);
    this.errorMessage.set(null);
    this.state.set('idle');
  }

  private successKindFor(timing: ReturnType<typeof classifyDate>): PhoneSuccessKind | null {
    if (timing.sameDay) {
      return timing.sunday ? 'same-day-sunday' : 'same-day';
    }
    return timing.sunday ? 'sunday' : null;
  }

  private buildPayload(turnstileToken: string): AppointmentRequestPayload {
    const value = this.form.getRawValue();
    const details = value.details.trim();
    const timePreference = (
      isTimePreference(value.timePreference) ? value.timePreference : 'flexible'
    ) as TimePreference;
    const language = (APPOINTMENT_LANGUAGES as readonly string[]).includes(value.language)
      ? (value.language as AppointmentLanguage)
      : undefined;

    return {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: formatPhone(normalizePhone(value.phone) ?? value.phone.trim()),
      email: value.email.trim(),
      service: value.service as AppointmentService,
      locationZip: normalizeZipCode(value.zip) ?? value.zip.trim(),
      preferredDate: value.preferredDate,
      timePreference,
      specificTime: timePreference === 'specific' ? value.specificTime : null,
      ...(parseSigners(value.signers) !== null
        ? { numberOfSigners: parseSigners(value.signers) as number }
        : {}),
      ...(language ? { preferredLanguage: language } : {}),
      ...(details ? { additionalDetails: details } : {}),
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
