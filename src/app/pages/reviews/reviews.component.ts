import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EXTERNAL_LINKS } from '../../core/config/business.config';
import { REVIEWS } from '../../data/reviews.data';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';

@Component({
  selector: 'app-reviews',
  imports: [RouterLink, PageHeroComponent, ReviewCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="What Clients Say About Mira" eyebrow="Reviews">
      Google reviews from local clients and industry partners.
    </app-page-hero>

    <section class="section">
      <div class="container">
        <ul class="grid">
          @for (review of reviews; track review.author) {
            <li><app-review-card [review]="review" /></li>
          }
        </ul>
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
    .grid {
      display: grid;
      gap: 1rem;

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1.5rem;
      }
      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
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
