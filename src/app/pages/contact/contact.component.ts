import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
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
  STANDARD_HOURS_LABEL,
  TimePreference,
  classifyDate,
  describeTimePreference,
  formatTimeOfDay,
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
import { checkZip, normalizeZipCode } from '../../../shared/service-area';
import {
  MAX_SIGNERS,
  SIGNERS_INPUT_MAX_LENGTH,
  normalizePhone,
  parseSigners,
} from '../../../shared/validation';
import { BUSINESS } from '../../core/config/business.config';
import { turnstileSiteKeyFor } from '../../core/config/site.config';
import { AppointmentRequestService } from '../../core/services/appointment-request.service';
import { WizardHistory, WizardStepNumber } from './wizard-history';
import { ContactCardComponent } from '../../shared/components/contact-card/contact-card.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DigitsInputDirective } from '../../shared/directives/digits-input.directive';
import { NameInputDirective } from '../../shared/directives/name-input.directive';
import { PhoneInputDirective } from '../../shared/directives/phone-input.directive';
import { ZipInputDirective } from '../../shared/directives/zip-input.directive';
import { TurnstileComponent } from '../../shared/components/turnstile/turnstile.component';
import { WizardProgressComponent } from '../../shared/components/wizard-progress/wizard-progress.component';
import {
  emailValidator,
  nameValidator,
  phoneValidator,
  preferredDateValidator,
  requiredTrimmed,
  signersValidator,
  zipFormatValidator,
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

export type WizardStep = WizardStepNumber;

/** The controls each wizard step owns, in DOM order (also the focus order for the first error). */
export const STEP_FIELDS: Record<WizardStep, readonly FieldKey[]> = {
  1: ['service', 'zip', 'preferredDate', 'timePreference', 'specificTime', 'signers'],
  2: ['firstName', 'lastName', 'phone', 'email', 'language'],
  3: ['details', 'consent'],
};
const WIZARD_STEPS: readonly WizardStep[] = [1, 2, 3];
export const STEP_TITLES: Record<WizardStep, string> = {
  1: 'Appointment Details',
  2: 'Your Information',
  3: 'Request Details',
};
/**
 * What the step-level validation summary talks about. Only the labels live here:
 * whether a field is a problem is read from the real form control (its existing validators), so
 * no validation rule is duplicated. A field is listed iff its control is invalid — which is why a
 * ZIP outside the service area, an out-of-hours time, or an empty optional field never appear.
 */
export interface StepFieldDefinition {
  readonly control: FieldKey;
  readonly label: string;
}
export const STEP_SUMMARY_FIELDS: Record<1 | 2, readonly StepFieldDefinition[]> = {
  1: [
    { control: 'service', label: 'Service' },
    { control: 'zip', label: 'ZIP Code' },
    { control: 'preferredDate', label: 'Preferred Date' },
    { control: 'timePreference', label: 'Preferred Time' },
    // invalid only while "Specific Time" is selected (conditional validator)
    { control: 'specificTime', label: 'Specific Time' },
    // optional: invalid only when filled in wrongly, never "missing"
    { control: 'signers', label: 'Number of Signers' },
  ],
  2: [
    { control: 'firstName', label: 'First Name' },
    { control: 'lastName', label: 'Last Name' },
    { control: 'phone', label: 'Phone Number' },
    { control: 'email', label: 'Email' },
    // Preferred Language is a plain select that defaults to English: it cannot be invalid
  ],
};

/** Friendly sentence for the one case where a single populated field is wrong. */
const SINGLE_INVALID_MESSAGES: Partial<Record<FieldKey, string>> = {
  phone: 'Please enter a valid 10-digit phone number to continue.',
  email: 'Please enter a valid email address to continue.',
  firstName: 'Please check your first name before continuing.',
  lastName: 'Please check your last name before continuing.',
  zip: 'Please enter a valid 5-digit ZIP code to continue.',
  signers: 'Please enter a number of signers from 1 to 50.',
  specificTime: 'Please choose a valid appointment time to continue.',
};

function joinNatural(items: readonly string[]): string {
  return items.length <= 2
    ? items.join(' and ')
    : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Natural-language sentence for what still blocks Continue; null when nothing does.
 * "Please complete A, B, and C to continue." / "Please check A and B before continuing." /
 * "Please complete A and check B before continuing."
 */
export function stepSummaryText(
  problems: readonly {
    readonly control: FieldKey;
    readonly label: string;
    readonly missing: boolean;
  }[],
): string | null {
  const missing = problems.filter((p) => p.missing).map((p) => p.label);
  const invalid = problems.filter((p) => !p.missing);
  if (problems.length === 0) {
    return null;
  }
  if (invalid.length === 0) {
    return `Please complete ${joinNatural(missing)} to continue.`;
  }
  if (missing.length === 0) {
    return invalid.length === 1
      ? (SINGLE_INVALID_MESSAGES[invalid[0].control] ??
          `Please check ${invalid[0].label} before continuing.`)
      : `Please check ${joinNatural(invalid.map((p) => p.label))} before continuing.`;
  }
  const comma = missing.length > 1 ? ',' : '';
  return `Please complete ${joinNatural(missing)}${comma} and check ${joinNatural(invalid.map((p) => p.label))} before continuing.`;
}

const STEP_SHORT_LABELS = ['Appointment', 'Your Information', 'Details'] as const;

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

/** Non-blocking note for a well-formed specific time outside standard hours (not an error). */
export const OUTSIDE_HOURS_NOTE =
  'Outside standard hours — you can still submit. Mira will confirm availability and any additional after-hours fee.';

/**
 * The real validation of the conditional Specific Time field (no HTML `required`/`min`/`max` is
 * relied upon): only when "Specific Time" is chosen, it must be a valid HH:mm. A time outside the
 * standard hours is still valid — it only triggers an advisory note.
 */
const specificTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (control.parent?.get('timePreference')?.value !== 'specific') {
    return null;
  }
  return isValidTimeOfDay(control.value) ? null : { specificTime: true };
};

const GLOBAL_MESSAGES = {
  verify: 'Please complete the verification check before sending.',
  unavailable: `We couldn't send your request right now. Please call or text Mira at ${BUSINESS.phones.primary.display}.`,
  invalid: 'Please check the form and try again.',
} as const;

/** Non-blocking note for a well-formed ZIP outside the confirmed area (not an error). */
export const OUTSIDE_AREA_NOTE =
  'Outside standard service area — you can still submit. Mira will confirm travel availability and fee.';

@Component({
  selector: 'app-contact',
  imports: [
    ReactiveFormsModule,
    ContactCardComponent,
    IconComponent,
    TurnstileComponent,
    WizardProgressComponent,
    ZipInputDirective,
    NameInputDirective,
    PhoneInputDirective,
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
  protected readonly outsideHoursNote = OUTSIDE_HOURS_NOTE;
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

  /** Public Turnstile site key: dummy key on localhost, production key only on the production host, '' elsewhere. */
  protected readonly siteKey = turnstileSiteKeyFor(inject(DOCUMENT).location?.hostname);
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
      validators: [requiredTrimmed, zipFormatValidator],
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

  private readonly zipValue = toSignal(this.form.controls.zip.valueChanges, {
    initialValue: this.form.controls.zip.value,
  });
  /**
   * A well-formed ZIP outside the confirmed area: informational only. It never makes the control
   * invalid and never blocks submission (the Worker accepts it and flags it for Mira).
   */
  protected readonly outsideArea = computed(
    () => checkZip(this.zipValue()).status === 'unconfirmed',
  );
  protected readonly outsideAreaNote = OUTSIDE_AREA_NOTE;

  private readonly specificValue = toSignal(this.form.controls.specificTime.valueChanges, {
    initialValue: this.form.controls.specificTime.value,
  });
  /** A well-formed specific time outside standard hours: informational only, never invalid. */
  protected readonly outsideHours = computed(
    () =>
      this.timePreference() === 'specific' &&
      isValidTimeOfDay(this.specificValue()) &&
      !isWithinStandardHours(this.specificValue()),
  );

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

  // ---- wizard -----------------------------------------------------------------------------
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly wizardHistory = new WizardHistory(this.isBrowser ? window : null);
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');

  protected readonly steps = WIZARD_STEPS;
  protected readonly stepShortLabels = STEP_SHORT_LABELS;
  /** One Angular form, three views: values are never reset when moving between steps. */
  protected readonly step = signal<WizardStep>(1);
  protected readonly stepTitle = computed(() => STEP_TITLES[this.step()]);

  /** Compact, non-personal recap of step 1 shown on the final step. */
  protected readonly summary = computed(() => {
    this.formTick();
    const value = this.form.getRawValue();
    const preference = isTimePreference(value.timePreference) ? value.timePreference : null;
    const time =
      preference === 'specific' && value.specificTime
        ? formatTimeOfDay(value.specificTime)
        : preference
          ? describeTimePreference(preference, null)
          : '';
    const date = this.formatDate(value.preferredDate);
    return {
      service: value.service,
      when: [date, time].filter((part) => part !== '').join(' · '),
      zip: value.zip,
      outside: this.outsideArea(),
      outsideHours: this.outsideHours(),
    };
  });

  /** One compact sentence per step (1 and 2) saying what still blocks Continue; null when valid. */
  protected readonly stepSummary = computed<Record<1 | 2, string | null>>(() => {
    this.formTick();
    const summarize = (step: 1 | 2): string | null =>
      stepSummaryText(
        STEP_SUMMARY_FIELDS[step]
          .map(({ control, label }) => ({ key: control, label, control: this.control(control) }))
          .filter(({ control }) => control.invalid)
          .map(({ key, label, control }) => ({
            control: key,
            label,
            missing: String(control.value ?? '').trim() === '',
          })),
      );
    return { 1: summarize(1), 2: summarize(2) };
  });

  /** Wizard history entries below the current one that this component created. */
  private entriesBelow = 0;

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

    if (this.isBrowser) {
      // A (re)loaded page always starts at step 1; the history entry only carries the step number.
      this.wizardHistory.replace(1);
      const stop = this.wizardHistory.listen((target) => this.onHistoryStep(target));
      inject(DestroyRef).onDestroy(stop);
    }
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
        return has('required') ? 'ZIP code is required.' : 'Enter a valid 5-digit ZIP code.';
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
        return 'Enter a specific time.';
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

    // Never trust the wizard position: send the user to the earliest step that is still invalid.
    const invalidStep = this.earliestInvalidStep();
    if (invalidStep !== null) {
      this.touchStep(invalidStep);
      this.errorMessage.set(GLOBAL_MESSAGES.invalid);
      if (invalidStep !== this.step()) {
        this.moveTo(invalidStep, 'push', false);
      }
      this.focusField(STEP_FIELDS[invalidStep].find((key) => this.control(key).invalid));
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
        this.step.set(1);
        this.wizardHistory.replace(1);
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

  // ---- wizard navigation -------------------------------------------------------------------

  /** Enter in a field on steps 1–2 means "Continue", never "send the request". */
  protected onFormSubmit(): void {
    if (this.step() < 3) {
      this.next();
      return;
    }
    this.submit();
  }

  /**
   * Enter inside a text field on steps 1–2 is "Continue". (The submit button is disabled and
   * hidden there, so the browser would otherwise do nothing at all.) Never submits the request.
   */
  protected onEnter(event: Event): void {
    if (this.step() < 3 && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault();
      this.next();
    }
  }

  /** Validates ONLY the current step; stays put (and focuses the first problem) when invalid. */
  protected next(): void {
    const current = this.step();
    if (current >= 3) {
      return;
    }
    this.touchStep(current);
    const firstInvalid = STEP_FIELDS[current].find((key) => this.control(key).invalid);
    if (firstInvalid) {
      this.focusField(firstInvalid);
      return;
    }
    this.moveTo((current + 1) as WizardStep, 'push', true);
  }

  /** Back never clears or revalidates anything. */
  protected back(): void {
    const current = this.step();
    if (current <= 1) {
      return;
    }
    if (this.entriesBelow > 0 && this.wizardHistory.current() === current) {
      this.wizardHistory.back(); // the popstate listener performs the move
    } else {
      this.moveTo((current - 1) as WizardStep, 'replace', true);
    }
  }

  protected editAppointment(): void {
    this.moveTo(1, 'push', true);
  }

  private stepValid(step: WizardStep): boolean {
    return STEP_FIELDS[step].every((key) => this.control(key).valid);
  }

  private earliestInvalidStep(): WizardStep | null {
    return WIZARD_STEPS.find((step) => !this.stepValid(step)) ?? null;
  }

  /** The furthest step the user may be on: never past the first step that is still invalid. */
  private allowedStep(requested: WizardStep): WizardStep {
    const invalid = this.earliestInvalidStep();
    return invalid === null ? requested : (Math.min(requested, invalid) as WizardStep);
  }

  private touchStep(step: WizardStep): void {
    for (const key of STEP_FIELDS[step]) {
      this.control(key).markAsTouched();
    }
  }

  private moveTo(target: WizardStep, history: 'push' | 'replace', focusHeading: boolean): void {
    this.step.set(target);
    if (history === 'push') {
      this.wizardHistory.push(target);
      this.entriesBelow += 1;
    } else {
      this.wizardHistory.replace(target);
      this.entriesBelow = Math.max(0, target - 1);
    }
    if (focusHeading) {
      this.focusHeading();
    }
  }

  /** Browser Back / Forward landed on a wizard entry: follow it (clamped, never pushing). */
  private onHistoryStep(target: WizardStep | null): void {
    if (target === null || this.state() === 'success') {
      return;
    }
    const allowed = this.allowedStep(target);
    this.step.set(allowed);
    this.entriesBelow = allowed - 1;
    if (allowed !== target) {
      this.wizardHistory.replace(allowed);
    }
    this.focusHeading();
  }

  private focusHeading(): void {
    this.focusElement(() => this.stepHeading()?.nativeElement ?? null);
  }

  private focusField(key: FieldKey | undefined): void {
    if (!key) {
      return;
    }
    this.focusElement(() =>
      typeof document === 'undefined' ? null : document.getElementById(key),
    );
  }

  /** Focuses now; if the element is still inside a hidden step, once more after the next render. */
  private focusElement(find: () => HTMLElement | null): void {
    const attempt = (): boolean => {
      const element = find();
      element?.focus();
      element?.scrollIntoView?.({ block: 'center' });
      return element !== null && document.activeElement === element;
    };
    if (!this.isBrowser || attempt()) {
      return;
    }
    setTimeout(() => attempt(), 0);
  }

  private formatDate(iso: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) {
      return '';
    }
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
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
      // The control holds the display text "(279) 555-0100"; the request carries the ten digits.
      phone: normalizePhone(value.phone) ?? value.phone.trim(),
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
}
