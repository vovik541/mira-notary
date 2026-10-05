import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Review } from '../../../data/reviews.data';
import { ReviewCardComponent } from '../review-card/review-card.component';

/**
 * Reviews grid on tablet/desktop, native CSS scroll-snap swiper on phones.
 * No autoplay, no looping, no carousel library.
 */
@Component({
  selector: 'app-review-carousel',
  imports: [ReviewCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      #track
      class="track"
      tabindex="0"
      role="region"
      aria-label="Client reviews. Scroll horizontally to read more."
      (scroll)="onScroll()"
    >
      @for (review of reviews(); track review.author) {
        <li class="slide"><app-review-card [review]="review" /></li>
      }
    </ul>
    <div class="dots" role="group" aria-label="Choose a review">
      @for (review of reviews(); track review.author; let i = $index) {
        <button
          type="button"
          class="dot"
          [class.active]="i === activeIndex()"
          [attr.aria-label]="'Show review ' + (i + 1) + ' of ' + reviews().length"
          [attr.aria-current]="i === activeIndex() ? 'true' : null"
          (click)="scrollTo(i)"
        ></button>
      }
    </div>
  `,
  styleUrl: './review-carousel.component.scss',
})
export class ReviewCarouselComponent {
  readonly reviews = input.required<readonly Review[]>();

  protected readonly activeIndex = signal(0);

  private readonly track = viewChild.required<ElementRef<HTMLUListElement>>('track');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    afterNextRender(() => this.onScroll());
  }

  protected onScroll(): void {
    if (!this.isBrowser) {
      return;
    }
    const index = this.indexFromScroll(this.track().nativeElement);
    if (index !== this.activeIndex()) {
      this.activeIndex.set(index);
    }
  }

  protected scrollTo(index: number): void {
    if (!this.isBrowser) {
      return;
    }
    const track = this.track().nativeElement;
    const slide = track.children.item(index) as HTMLElement | null;
    if (!slide) {
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({
      left: slide.offsetLeft - track.offsetLeft,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
    this.activeIndex.set(index);
  }

  /** Index of the slide whose left edge is closest to the track's current scroll position. */
  private indexFromScroll(track: HTMLElement): number {
    const slides = Array.from(track.children) as HTMLElement[];
    const origin = track.scrollLeft + track.offsetLeft;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    slides.forEach((slide, i) => {
      const distance = Math.abs(slide.offsetLeft - origin);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    return best;
  }
}
