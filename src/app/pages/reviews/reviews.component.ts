import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
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
        <p class="cta"><a class="btn btn--gold" routerLink="/contact">Book an Appointment</a></p>
      </div>
    </section>
  `,
  styles: `
    .cta {
      margin-top: 2rem;
      text-align: center;
    }
  `,
})
export class ReviewsComponent {
  protected readonly reviews = REVIEWS;
}
