import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CallTextComponent } from '../../shared/components/call-text/call-text.component';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../core/config/business.config';
import { SEO_PAGES } from '../../core/seo/seo-pages';
import { TRAVEL_FEES, TRAVEL_FEE_NOTE } from '../../data/pricing.data';
import { COMMON_NOTARY_SERVICES } from '../../data/services.data';
import { CheckListComponent } from '../../shared/components/check-list/check-list.component';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { PriceListComponent } from '../../shared/components/price-list/price-list.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-mobile-notary',
  imports: [
    CallTextComponent,
    RouterLink,
    CheckListComponent,
    CtaBandComponent,
    PageHeroComponent,
    PriceListComponent,
    SectionHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero
      heading="Mobile Notary Services at Your Home, Office or Hospital"
      eyebrow="Mobile Notary"
      [breadcrumbs]="crumbs"
    >
      Professional notarization at your home, office, hospital, or another convenient agreed
      location.
      <div actions class="page-actions">
        <a class="btn btn--gold" routerLink="/contact" [queryParams]="{ service: 'general-notary' }"
          >Request a Mobile Notary</a
        >
        <app-call-text variant="outline" />
      </div>
    </app-page-hero>

    <section class="section" aria-labelledby="how-heading">
      <div class="container">
        <div class="prose">
          <h2 id="how-heading">How Mobile Notary Appointments Work</h2>
          <p>
            Mira travels to you: your home, your office, a hospital or care facility, or another
            agreed location in Sacramento County and confirmed nearby communities. Check the
            <a routerLink="/service-area">service area</a> to confirm your ZIP code, then see
            <a routerLink="/pricing">pricing</a> for notarial and travel fees.
          </p>
          <p>
            Please bring the document or documents that need notarization and a valid,
            government-issued photo ID for each signer. Not sure what you need? Read the
            <a routerLink="/faq">answers to common questions</a> or contact Mira before your
            appointment. Same-day and urgent requests must be booked by phone. Mira speaks English,
            Ukrainian and Russian.
          </p>
          <p>
            Mortgage and refinance documents are handled as
            <a routerLink="/services/loan-signing">loan signing services</a>, and documents going
            abroad may also need a <a routerLink="/services/apostille">California apostille</a>.
          </p>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="common-heading">
      <div class="container">
        <app-section-header
          headingId="common-heading"
          heading="Common Notary Services"
          text="Common notarization services Mira provides for individuals and families."
        />
        <app-check-list [items]="services" columns="auto" />
      </div>
    </section>

    <section class="section" aria-labelledby="travel-heading">
      <div class="container split split--even">
        <div class="intro">
          <h2 id="travel-heading">Mobile Travel</h2>
          <p class="muted">Final pricing is confirmed before service.</p>
          <p class="fee-note">{{ travelNote }}</p>
          <p>
            <a class="btn btn--navy" routerLink="/pricing">See Full Pricing</a>
          </p>
        </div>
        <app-price-list [rows]="travel" />
      </div>
    </section>

    <app-cta-band service="general-notary" />
  `,
  styles: `
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
    .fee-note {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .intro > * + * {
      margin-top: 1rem;
    }
    h2 {
      font-size: 1.5rem;
    }
  `,
})
export class MobileNotaryComponent {
  protected readonly phone = BUSINESS.phones.primary;
  protected readonly crumbs = SEO_PAGES.mobileNotary.breadcrumbs;
  protected readonly services = COMMON_NOTARY_SERVICES;
  protected readonly travel = TRAVEL_FEES;
  protected readonly travelNote = TRAVEL_FEE_NOTE;
}
