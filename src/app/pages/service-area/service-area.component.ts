import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SERVICE_AREA_COMMUNITIES } from '../../data/service-area.data';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-service-area',
  imports: [ReactiveFormsModule, PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero
      heading="Mobile Notary Service Throughout the Greater Sacramento Area"
      eyebrow="Service Area"
    >
      Mira serves Sacramento County and selected surrounding communities in Placer and Yolo
      Counties.
    </app-page-hero>

    <section class="section">
      <div class="container grid">
        <div class="card panel">
          <h2>Confirmed Service Communities</h2>
          <ul class="chips">
            @for (community of communities; track community) {
              <li>{{ community }}</li>
            }
          </ul>
          <p class="muted">
            Appointments travel directly to your home, office, hospital, or agreed meeting spot
            within these communities.
          </p>
        </div>

        <div class="card panel">
          <h2>Not Sure If Mira Travels to Your Area?</h2>
          <p class="muted">Enter your ZIP code and Mira will confirm availability.</p>
          <form class="zip-form" (ngSubmit)="requestAvailability()" novalidate>
            <label for="zip">ZIP Code</label>
            <input
              id="zip"
              type="text"
              inputmode="numeric"
              autocomplete="postal-code"
              maxlength="10"
              placeholder="e.g. 95814"
              [formControl]="zip"
              [attr.aria-invalid]="zip.invalid && zip.touched"
              aria-describedby="zip-error"
            />
            @if (zip.invalid && zip.touched) {
              <p id="zip-error" class="error" role="alert">Enter a valid 5-digit ZIP code.</p>
            }
            <button class="btn btn--navy" type="submit">Request Availability</button>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1.5rem;
    }
    .panel {
      padding: 1.5rem;
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
    .error {
      font-size: 0.875rem;
      color: var(--color-error);
    }
    @media (min-width: 768px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class ServiceAreaComponent {
  private readonly router = inject(Router);

  protected readonly communities = SERVICE_AREA_COMMUNITIES;
  protected readonly zip = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)],
  });

  protected requestAvailability(): void {
    this.zip.markAsTouched();
    if (this.zip.invalid) {
      return;
    }
    void this.router.navigate(['/contact'], { queryParams: { zip: this.zip.value.trim() } });
  }
}
