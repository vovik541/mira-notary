import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FAQ_ITEMS } from '../../data/faq.data';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-faq',
  imports: [RouterLink, CtaBandComponent, FaqAccordionComponent, PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="Mobile Notary Questions &amp; Answers" eyebrow="FAQ">
      Quick answers about appointments, travel, pricing and services. Still unsure?
      <a routerLink="/contact">Contact Mira</a>.
    </app-page-hero>

    <section class="section">
      <div class="container container--narrow">
        <app-faq-accordion [items]="items" />
      </div>
    </section>

    <app-cta-band />
  `,
  styles: `
    a {
      color: var(--color-navy);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
  `,
})
export class FaqComponent {
  protected readonly items = FAQ_ITEMS;
}
