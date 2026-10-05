import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { BUSINESS } from '../../core/config/business.config';
import {
  AppointmentRequest,
  AppointmentRequestService,
  AppointmentSubmission,
} from '../../core/services/appointment-request.service';
import { ContactCardComponent } from '../../shared/components/contact-card/contact-card.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

export const SERVICE_OPTIONS = [
  'General Notary',
  'Loan Signing',
  'California Apostille',
  'Document Translation',
  'Living Trust / Estate Documents',
  'Power of Attorney',
  'Other',
] as const;

const PHONE_PATTERN = /^[+()\-.\s\d]{10,20}$/;
const ZIP_PARAM_PATTERN = /^\d{5}(-\d{4})?$/;

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
  imports: [ReactiveFormsModule, ContactCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly appointments = inject(AppointmentRequestService);

  protected readonly phone = BUSINESS.phones.primary;
  protected readonly serviceOptions = SERVICE_OPTIONS;
  protected readonly languageOptions = BUSINESS.languages;
  protected readonly submission = signal<AppointmentSubmission | null>(null);

  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PHONE_PATTERN)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    service: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    preferredDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, notInPastValidator],
    }),
    preferredTime: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    signers: new FormControl<number | null>(null, [Validators.min(1), Validators.max(50)]),
    documents: new FormControl<number | null>(null, [Validators.min(1), Validators.max(500)]),
    language: new FormControl('English', { nonNullable: true }),
    details: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
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

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    const value = this.form.getRawValue();
    const request: AppointmentRequest = {
      fullName: value.fullName.trim(),
      phone: value.phone.trim(),
      email: value.email.trim(),
      service: value.service,
      location: value.location.trim(),
      preferredDate: value.preferredDate,
      preferredTime: value.preferredTime.trim(),
      signers: value.signers,
      documents: value.documents,
      language: value.language,
      details: value.details.trim(),
      urgent: value.urgent,
    };
    this.appointments.submit(request).subscribe((result) => this.submission.set(result));
  }

  protected editRequest(): void {
    this.submission.set(null);
  }

  private focusFirstInvalid(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.querySelector<HTMLElement>('form .invalid, form [aria-invalid="true"]')?.focus();
  }
}
