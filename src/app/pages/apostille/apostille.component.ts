import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APOSTILLE_FEES, APOSTILLE_NOTE } from '../../data/pricing.data';
import { APOSTILLE_STEPS } from '../../data/services.data';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-apostille',
  imports: [RouterLink, CtaBandComponent, PageHeroComponent, SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="California Apostille Services" eyebrow="Apostille">
      Assistance with California apostille processing for documents intended for use outside the
      United States.
      <div actions class="page-actions">
        <a class="btn btn--gold" routerLink="/contact">Request Apostille Service</a>
      </div>
    </app-page-hero>

    <section class="section" aria-labelledby="steps-heading">
      <div class="container">
        <app-section-header headingId="steps-heading" heading="How the Service Works" />
        <ol class="steps">
          @for (step of steps; track step.title; let i = $index) {
            <li class="card step">
              <span class="num" aria-hidden="true">{{ i + 1 }}</span>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </li>
          }
        </ol>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="price-heading">
      <div class="container narrow">
        <app-section-header headingId="price-heading" heading="Apostille Pricing" />
        <dl class="card prices">
          @for (row of fees; track row.label) {
            <div class="row">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.price }}</dd>
            </div>
          }
        </dl>
        <p class="note">{{ note }}</p>
      </div>
    </section>

    <app-cta-band />
  `,
  styles: `
    .steps {
      display: grid;
      gap: 1rem;
    }
    .step {
      padding: 1.25rem;
    }
    .num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      margin-bottom: 0.75rem;
      font-family: var(--font-heading);
      font-weight: 700;
      color: var(--color-navy-dark);
      background: var(--color-gold);
      border-radius: 50%;
    }
    .step h3 {
      margin-bottom: 0.375rem;
      font-size: 1rem;
    }
    .step p {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .narrow {
      max-width: calc(40rem + var(--gutter) * 2);
      margin-inline: 0;
    }
    .prices {
      margin: 0;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
    }
    .row + .row {
      border-top: 1px solid var(--color-border);
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
      font-family: var(--font-heading);
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--color-navy);
    }
    .note {
      margin-top: 1rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    @media (min-width: 640px) {
      .steps {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 1024px) {
      .steps {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
  `,
})
export class ApostilleComponent {
  protected readonly steps = APOSTILLE_STEPS;
  protected readonly fees = APOSTILLE_FEES;
  protected readonly note = APOSTILLE_NOTE;
}
