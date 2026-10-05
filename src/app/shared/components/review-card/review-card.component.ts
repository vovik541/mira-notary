import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Review } from '../../../data/reviews.data';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-review-card',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="card">
      <div class="stars" role="img" [attr.aria-label]="review().rating + ' out of 5 stars'">
        @for (star of stars; track star) {
          <app-icon name="star" style="--icon-size: 1rem" />
        }
      </div>
      <blockquote>“{{ review().text }}”</blockquote>
      <figcaption>
        <span class="author">{{ review().author }}</span>
        <span class="source">{{ review().source }}</span>
      </figcaption>
    </figure>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .card {
      display: flex;
      flex-direction: column;
      height: 100%;
      margin: 0;
      padding: 1.25rem;
    }
    .stars {
      display: flex;
      gap: 0.125rem;
      margin-bottom: 0.75rem;
      color: var(--color-gold);
    }
    blockquote {
      margin: 0 0 1.5rem;
      font-size: 0.9375rem;
      line-height: 1.65;
    }
    figcaption {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
      font-size: 0.75rem;
    }
    .author {
      font-weight: 600;
    }
    .source {
      color: var(--color-text-muted);
    }
    @media (min-width: 768px) {
      .card {
        padding: 1.5rem;
      }
      blockquote {
        font-size: 1rem;
      }
    }
  `,
})
export class ReviewCardComponent {
  readonly review = input.required<Review>();
  protected readonly stars = [1, 2, 3, 4, 5];
}
