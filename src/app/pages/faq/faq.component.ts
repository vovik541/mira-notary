import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StructuredDataService } from '../../core/seo/structured-data.service';
import { FAQ_ITEMS } from '../../data/faq.data';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-faq',
  imports: [RouterLink, CtaBandComponent, FaqAccordionComponent, PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="Frequently Asked Questions" eyebrow="FAQ">
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
      font-weight: 600;
      color: var(--color-navy);
    }
  `,
})
export class FaqComponent {
  protected readonly items = FAQ_ITEMS;

  constructor() {
    const structuredData = inject(StructuredDataService);
    structuredData.set('faq', structuredData.faqSchema());
    inject(DestroyRef).onDestroy(() => structuredData.remove('faq'));
  }
}
