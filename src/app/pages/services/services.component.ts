import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SERVICES } from '../../data/services.data';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-services',
  imports: [RouterLink, CtaBandComponent, IconComponent, PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="Notary & Document Services">
      Professional mobile services for individuals, families, businesses, borrowers, and real estate
      professionals.
    </app-page-hero>

    <section class="section">
      <div class="container grid">
        @for (service of services; track service.slug) {
          <article class="card item">
            <div>
              <span class="icon-box"><app-icon [name]="service.icon" /></span>
              <h2>{{ service.title }}</h2>
              <p class="summary">{{ service.summary }}</p>
              @if (service.slug === 'translation') {
                <p class="summary">
                  Mira also works with a professional translation network that can assist with more
                  than 150 languages.
                </p>
              }
              <h3>{{ service.overviewHeading }}</h3>
              <ul class="examples">
                @for (item of service.overviewHighlights; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            </div>
            <a class="btn btn--navy cta" [routerLink]="service.path">{{
              service.overviewLinkLabel
            }}</a>
          </article>
        }
      </div>
    </section>

    <app-cta-band />
  `,
  styles: `
    .grid {
      display: grid;
      gap: var(--grid-gap);
    }
    .item {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.5rem;
      padding: 1.5rem;
    }
    .icon-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      margin-bottom: 1rem;
      color: var(--color-navy);
      background: var(--color-bg-light);
      border-radius: var(--radius-md);
    }
    h2 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    h3 {
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
      font-size: 0.8125rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .cta {
      min-height: 3.5rem;
    }
    .summary {
      color: var(--color-text-muted);
    }
    .summary + .summary {
      margin-top: 0.5rem;
    }
    .examples {
      display: grid;
      gap: 0.375rem;
      font-size: 0.9375rem;
    }
    .examples li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .examples li::before {
      content: '';
      flex: none;
      width: 0.375rem;
      height: 0.375rem;
      border-radius: 50%;
      background: var(--color-gold);
    }
    @media (min-width: 768px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 1200px) {
      .grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      h2 {
        font-size: 1.375rem;
      }
    }
  `,
})
export class ServicesComponent {
  protected readonly services = SERVICES;
}
