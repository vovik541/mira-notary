import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ZipCheck, checkZip, isSacramentoCountyZip } from '../../../shared/service-area';
import { BUSINESS } from '../../core/config/business.config';
import { SERVICE_AREA_GROUPS } from '../../data/service-area.data';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { ZipInputDirective } from '../../shared/directives/zip-input.directive';
import { requiredTrimmed, zipFormatValidator } from '../../shared/validators/form-validators';

/** Result state of the ZIP checker; `null` = idle (nothing checked yet / input edited). */
export type ZipResult = Exclude<ZipCheck, { status: 'invalid' }> | null;

@Component({
  selector: 'app-service-area',
  imports: [ReactiveFormsModule, RouterLink, IconComponent, PageHeroComponent, ZipInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero
      heading="Mobile Notary Service Throughout the Greater Sacramento Area"
      eyebrow="Service Area"
    >
      Mira serves Sacramento County and confirmed nearby communities across the Greater Sacramento
      area.
      <span class="intro-copy"
        >Mira is a mobile notary: she travels to you, so there is no office to visit. Check your ZIP
        code below. A request outside the standard service area can still be submitted, and Mira
        will confirm availability and any travel fee. See
        <a routerLink="/services/mobile-notary">mobile notary services</a>,
        <a routerLink="/pricing">pricing</a> or
        <a routerLink="/contact">request an appointment</a>.</span
      >
    </app-page-hero>

    <section class="section">
      <div class="container grid">
        <div class="card panel">
          <h2>Confirmed Service Area</h2>
          <p class="muted">
            Mira provides mobile notary service throughout Sacramento County and in these confirmed
            nearby communities across the Greater Sacramento area.
          </p>
          <div class="groups">
            @for (group of groups; track group.county) {
              <section class="group" [attr.aria-labelledby]="'area-' + $index">
                <h3 [id]="'area-' + $index">{{ group.county }}</h3>
                @if (group.countywide) {
                  <p class="countywide">Countywide service</p>
                } @else {
                  <ul class="chips">
                    @for (community of group.communities; track community) {
                      <li>{{ community }}</li>
                    }
                  </ul>
                }
              </section>
            }
          </div>
          <p class="fine">
            For locations outside the confirmed area, contact Mira to ask about availability.
          </p>
        </div>

        <div class="card panel">
          <h2>Not Sure If Mira Travels to Your Area?</h2>
          <p class="muted">
            Enter your ZIP code to check whether it is in Mira's confirmed service area.
          </p>
          <form class="zip-form" (submit)="check(); $event.preventDefault()" novalidate>
            <label for="zip">ZIP Code</label>
            @let zipError = fieldError();
            <input
              id="zip"
              appZipInput
              placeholder="e.g. 95814"
              [formControl]="zip"
              [attr.aria-invalid]="zipError ? 'true' : null"
              [attr.aria-describedby]="zipError ? 'zip-error' : result() ? 'zip-result' : null"
            />
            @if (zipError) {
              <p class="error" id="zip-error" aria-live="polite">{{ zipError }}</p>
            }
            <button class="btn btn--navy" type="submit">Check ZIP Code</button>
          </form>

          <div id="zip-result" class="result" role="status" aria-live="polite">
            @switch (result()?.status) {
              @case ('supported') {
                <div class="outcome outcome--ok">
                  <p class="headline">
                    <app-icon name="check-circle" style="--icon-size: 1.25rem" />
                    Yes — Mira serves ZIP code {{ resultZip() }}.
                  </p>
                  <p class="muted">{{ supportedNote() }}</p>
                  <a
                    class="btn btn--gold"
                    routerLink="/contact"
                    [queryParams]="{ zip: resultZip() }"
                  >
                    Book an Appointment
                  </a>
                </div>
              }
              @case ('unconfirmed') {
                <div class="outcome outcome--unconfirmed">
                  <p class="headline">
                    This ZIP code is outside Mira's currently confirmed online service area.
                  </p>
                  <p class="muted">
                    Contact Mira to ask about availability in other nearby communities.
                  </p>
                  <div class="page-actions">
                    <a class="btn btn--gold" [href]="phone.href">
                      <app-icon name="phone" style="--icon-size: 1rem" />
                      Call Mira
                    </a>
                    <a class="btn btn--outline" routerLink="/contact">Contact Mira</a>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .intro-copy {
      display: block;
      margin-top: 0.75rem;
      font-size: 1rem;
      color: var(--color-text-muted);
    }
    .intro-copy a {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1.5rem;
    }
    .panel {
      padding: 1.5rem;
      min-width: 0;
    }
    .panel > * + * {
      margin-top: 1rem;
    }
    h2 {
      font-size: 1.25rem;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .chips li {
      padding: 0.5rem 1rem;
      font-family: var(--font-heading);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-navy);
      background: var(--color-well);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    /* Confirmed service area: one compact group per county. */
    .groups {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1.25rem 1.5rem;
    }
    .group h3 {
      margin-bottom: 0.5rem;
      font-size: 0.9375rem;
    }
    .group .chips {
      gap: 0.5rem;
    }
    .group .chips li {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }
    .countywide {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      font-family: var(--font-heading);
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--color-navy);
      background: var(--color-well);
      border: 1px solid var(--color-border);
      border-left: 3px solid var(--color-gold);
      border-radius: var(--radius-md);
    }
    .fine {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .zip-form {
      display: grid;
      gap: 0.5rem;
    }
    .zip-form .btn {
      margin-top: 0.5rem;
    }
    label {
      font-family: var(--font-heading);
      font-size: 0.875rem;
      font-weight: 600;
    }
    input {
      width: 100%;
      min-height: 3rem;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
    }
    input:focus-visible {
      outline: 2px solid var(--color-navy);
      outline-offset: 0;
    }
    input[aria-invalid='true'] {
      border-color: var(--color-error);
    }
    .result:empty {
      display: none;
    }
    .error {
      font-size: 0.875rem;
      color: var(--color-error);
    }
    .outcome {
      display: grid;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: var(--color-bg-light);
      border: 1px solid var(--color-border);
      border-left: 4px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      overflow-wrap: anywhere;
    }
    .outcome--ok {
      border-left-color: var(--color-success);
    }
    .outcome--unconfirmed {
      border-left-color: var(--color-gold);
    }
    .outcome > * {
      margin: 0;
    }
    .headline {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-family: var(--font-heading);
      font-weight: 700;
      color: var(--color-navy);
    }
    .outcome--ok app-icon {
      margin-top: 0.125rem;
      color: var(--color-success);
    }
    @media (min-width: 520px) {
      .groups {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    /* Stacked full-width card on tablets: all four counties in one row. */
    @media (min-width: 768px) and (max-width: 1023px) {
      .groups {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    @media (min-width: 1024px) {
      .grid {
        grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
        align-items: start;
      }
    }
  `,
})
export class ServiceAreaComponent {
  protected readonly groups = SERVICE_AREA_GROUPS;
  protected readonly phone = BUSINESS.phones.primary;

  /** Same format rule as the Contact form (exactly five digits); the service-area outcome is a result. */
  protected readonly zip = new FormControl('', {
    nonNullable: true,
    validators: [requiredTrimmed, zipFormatValidator],
  });
  protected readonly result = signal<ZipResult>(null);

  constructor() {
    // Editing the input discards a stale result.
    this.zip.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.result.set(null));
  }

  /** Shown after the field was left or Check was pressed; never on initial load. */
  protected fieldError(): string | null {
    if (!this.zip.invalid || !this.zip.touched) {
      return null;
    }
    return this.zip.hasError('required')
      ? 'ZIP code is required.'
      : 'Enter a valid 5-digit ZIP code.';
  }

  protected resultZip(): string {
    return this.result()?.zip ?? '';
  }

  /** County membership is reference data; the service-area decision is separate. */
  protected supportedNote(): string {
    return isSacramentoCountyZip(this.resultZip())
      ? 'This ZIP code is within Sacramento County.'
      : "This ZIP code is within Mira's confirmed Greater Sacramento service area.";
  }

  protected check(): void {
    this.zip.markAsTouched();
    if (this.zip.invalid) {
      this.result.set(null);
      return;
    }
    const check = checkZip(this.zip.value);
    this.result.set(check.status === 'invalid' ? null : check);
  }
}
