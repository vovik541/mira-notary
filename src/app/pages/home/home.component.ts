import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS, EXTERNAL_LINKS, LANGUAGES_LABEL } from '../../core/config/business.config';
import { FAQ_ITEMS } from '../../data/faq.data';
import { REVIEWS } from '../../data/reviews.data';
import { SERVICE_AREA_CHIPS, SERVICE_AREA_SUMMARY } from '../../data/service-area.data';
import { SERVICES, WHY_MIRA } from '../../data/services.data';
import { CredentialListComponent } from '../../shared/components/credential-list/credential-list.component';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { FaqAccordionComponent } from '../../shared/components/faq-accordion/faq-accordion.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ReviewCarouselComponent } from '../../shared/components/review-carousel/review-carousel.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ServiceCardComponent } from '../../shared/components/service-card/service-card.component';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    IconComponent,
    CredentialListComponent,
    CtaBandComponent,
    FaqAccordionComponent,
    ReviewCarouselComponent,
    SectionHeaderComponent,
    ServiceCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly phone = BUSINESS.phones.primary;
  protected readonly languages = LANGUAGES_LABEL;
  protected readonly services = SERVICES;
  protected readonly whyMira = WHY_MIRA;
  protected readonly reviews = REVIEWS;
  protected readonly googleReviewUrl = EXTERNAL_LINKS.googleReview;
  protected readonly areaSummary = SERVICE_AREA_SUMMARY;
  protected readonly communities = SERVICE_AREA_CHIPS;
  protected readonly faqPreview = FAQ_ITEMS.slice(0, 3);
  protected readonly credentialItems = [
    'NNA Certified Signing Agent',
    '$1M E&O Insured',
    'Background Screened',
    LANGUAGES_LABEL,
  ];
}
