import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EXTERNAL_LINKS } from '../../core/config/business.config';
import { REVIEWS } from '../../data/reviews.data';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { ReviewCarouselComponent } from '../../shared/components/review-carousel/review-carousel.component';

@Component({
  selector: 'app-reviews',
  imports: [RouterLink, PageHeroComponent, ReviewCarouselComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="What Clients Say About Mira" eyebrow="Reviews">
      Google reviews from local clients and industry partners.
    </app-page-hero>

    <section class="section">
      <div class="container">
        <app-review-carousel [reviews]="reviews" />
        <p class="cta">
          <a class="btn btn--gold" routerLink="/contact">Book an Appointment</a>
          <a
            class="btn btn--outline"
            [href]="googleReviewUrl"
            target="_blank"
            rel="noopener noreferrer"
            >Leave a Google Review<span class="sr-only"> (opens in a new tab)</span></a
          >
        </p>
      </div>
    </section>
  `,
  styles: `
    .cta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      margin-top: 2rem;
    }
  `,
})
export class ReviewsComponent {
  protected readonly reviews = REVIEWS;
  protected readonly googleReviewUrl = EXTERNAL_LINKS.googleReview;
}
