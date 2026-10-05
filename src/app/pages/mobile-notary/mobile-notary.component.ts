import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../core/config/business.config';
import { TRAVEL_FEES } from '../../data/pricing.data';
import { COMMON_NOTARY_SERVICES } from '../../data/services.data';
import { CheckListComponent } from '../../shared/components/check-list/check-list.component';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { PriceListComponent } from '../../shared/components/price-list/price-list.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-mobile-notary',
  imports: [
    RouterLink,
    CheckListComponent,
    CtaBandComponent,
    PageHeroComponent,
    PriceListComponent,
    SectionHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="Mobile Notary Services in the Sacramento Area" eyebrow="Mobile Notary">
      Professional notarization at your home, office, hospital, or another convenient agreed
      location.
      <div actions class="page-actions">
        <a class="btn btn--gold" routerLink="/contact">Request a Mobile Notary</a>
        <a class="btn btn--outline" [href]="phone.href">Call Mira: {{ phone.display }}</a>
      </div>
    </app-page-hero>

    <section class="section" aria-labelledby="common-heading">
      <div class="container">
        <app-section-header
          headingId="common-heading"
          heading="Common Notary Services"
          text="Common notarization services Mira provides for individuals and families."
        />
        <app-check-list [items]="services" columns="auto" />
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="travel-heading">
      <div class="container split split--even">
        <div class="intro">
          <h2 id="travel-heading">Mobile Travel</h2>
          <p class="muted">Final pricing is confirmed before service.</p>
          <p>
            <a class="btn btn--navy" routerLink="/pricing">See Full Pricing</a>
          </p>
        </div>
        <app-price-list [rows]="travel" />
      </div>
    </section>

    <app-cta-band />
  `,
  styles: `
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
  protected readonly services = COMMON_NOTARY_SERVICES;
  protected readonly travel = TRAVEL_FEES;
}
