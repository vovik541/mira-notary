import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SEO_PAGES } from '../../core/seo/seo-pages';
import { APOSTILLE_FEES, APOSTILLE_NOTE } from '../../data/pricing.data';
import { APOSTILLE_STEPS } from '../../data/services.data';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { PriceListComponent } from '../../shared/components/price-list/price-list.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-apostille',
  imports: [
    RouterLink,
    CtaBandComponent,
    PageHeroComponent,
    PriceListComponent,
    SectionHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero
      heading="California Apostille Services"
      eyebrow="Apostille"
      [breadcrumbs]="crumbs"
    >
      Assistance with California apostille processing for documents intended for use outside the
      United States.
      <div actions class="page-actions">
        <a
          class="btn btn--gold"
          routerLink="/contact"
          [queryParams]="{ service: 'california-apostille' }"
          >Request Apostille Service</a
        >
      </div>
    </app-page-hero>

    <section class="section" aria-labelledby="about-heading">
      <div class="container">
        <div class="prose">
          <h2 id="about-heading">What Is an Apostille?</h2>
          <p>
            An apostille is a certificate from the California Secretary of State that authenticates
            the signature and seal on a California document, such as a notarized document, so it can
            be accepted in another country that recognizes apostilles. It confirms who signed and in
            what capacity; it does not confirm what the document says.
          </p>
          <p>
            The document usually has to be notarized first, and the Secretary of State generally
            needs the original rather than a photocopy. Mira can notarize your document, review it
            and coordinate the pickup and submission. See the
            <a routerLink="/faq">frequently asked questions</a> about originals and timing, check
            <a routerLink="/pricing">apostille pricing</a>, or
            <a routerLink="/service-area">confirm your service area</a>.
          </p>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="steps-heading">
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

    <section class="section" aria-labelledby="price-heading">
      <div class="container split split--even">
        <div>
          <h2 id="price-heading">Apostille Pricing</h2>
          <div class="prices"><app-price-list [rows]="fees" /></div>
        </div>
        <aside class="card panel" aria-label="Rush service and requests">
          <p class="note">{{ note }}</p>
          <p>
            <a
              class="btn btn--gold"
              routerLink="/contact"
              [queryParams]="{ service: 'california-apostille' }"
              >Request Apostille Service</a
            >
          </p>
        </aside>
      </div>
    </section>

    <app-cta-band service="california-apostille" />
  `,
  styles: `
    .steps {
      display: grid;
      gap: var(--grid-gap);
    }
    .step {
      padding: 1.5rem;
    }
    .num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      margin-bottom: 1rem;
      font-family: var(--font-heading);
      font-weight: 700;
      color: var(--color-navy-dark);
      background: var(--color-gold);
      border-radius: 50%;
    }
    .step h3 {
      margin-bottom: 0.5rem;
      font-size: 1.0625rem;
    }
    .step p {
      font-size: 0.9375rem;
      color: var(--color-text-muted);
    }
    h2 {
      font-size: 1.5rem;
    }
    .prose {
      max-width: 48rem;
    }
    .prose > * + * {
      margin-top: 1rem;
    }
    .prose a {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .prices {
      margin-top: 1.25rem;
    }
    .panel {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5rem;
      padding: 1.75rem;
      border-left: 4px solid var(--color-gold);
    }
    .note {
      font-size: 1.0625rem;
      color: var(--color-text);
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
      .split {
        align-items: stretch;
      }
    }
  `,
})
export class ApostilleComponent {
  protected readonly crumbs = SEO_PAGES.apostille.breadcrumbs;
  protected readonly steps = APOSTILLE_STEPS;
  protected readonly fees = APOSTILLE_FEES;
  protected readonly note = APOSTILLE_NOTE;
}
