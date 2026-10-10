import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../core/config/business.config';
import {
  APOSTILLE_FEES,
  APOSTILLE_NOTE,
  NOTARIAL_FEES,
  PAYMENT_METHODS,
  TRAVEL_FEES,
} from '../../data/pricing.data';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { PriceListComponent } from '../../shared/components/price-list/price-list.component';

@Component({
  selector: 'app-pricing',
  imports: [RouterLink, CtaBandComponent, PageHeroComponent, PriceListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="Mobile Notary Pricing" eyebrow="Pricing">
      Clear pricing for common notary services. Final pricing is confirmed before service.
      <span class="links"
        >Travel is available across the <a routerLink="/service-area">service area</a>; see
        <a routerLink="/services/mobile-notary">mobile notary services</a> or the
        <a routerLink="/faq">pricing FAQ</a>.</span
      >
      <div actions class="page-actions">
        <a class="btn btn--gold" routerLink="/contact">Book an Appointment</a>
        <a class="btn btn--outline" [href]="phone.href">Call {{ phone.display }}</a>
      </div>
    </app-page-hero>

    <section class="section">
      <div class="container split">
        <section class="main" aria-labelledby="notarial-heading">
          <h2 id="notarial-heading">Notarial Services</h2>
          <app-price-list [rows]="notarial" />
        </section>

        <div class="side">
          <section aria-labelledby="travel-heading">
            <h2 id="travel-heading">Mobile Travel</h2>
            <app-price-list [rows]="travel" />
          </section>

          <section aria-labelledby="apostille-heading">
            <h2 id="apostille-heading">California Apostille</h2>
            <app-price-list [rows]="apostille" />
            <p class="note">{{ apostilleNote }}</p>
          </section>

          <section aria-labelledby="payment-heading">
            <h2 id="payment-heading">Payment Methods</h2>
            <ul class="methods">
              @for (method of payments; track method) {
                <li>{{ method }}</li>
              }
            </ul>
          </section>
        </div>
      </div>
    </section>

    <app-cta-band />
  `,
  styles: `
    .links {
      display: block;
      margin-top: 0.75rem;
      font-size: 1rem;
      color: var(--color-text-muted);
    }
    .links a {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    h2 {
      margin-bottom: 1rem;
      font-size: 1.375rem;
    }
    .side {
      display: grid;
      gap: 2.25rem;
    }
    .note {
      margin-top: 0.75rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    .methods {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .methods li {
      padding: 0.5rem 1rem;
      font-family: var(--font-heading);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-navy);
      background: var(--color-well);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
  `,
})
export class PricingComponent {
  protected readonly phone = BUSINESS.phones.primary;
  protected readonly travel = TRAVEL_FEES;
  protected readonly notarial = NOTARIAL_FEES;
  protected readonly apostille = APOSTILLE_FEES;
  protected readonly apostilleNote = APOSTILLE_NOTE;
  protected readonly payments = PAYMENT_METHODS;
}
