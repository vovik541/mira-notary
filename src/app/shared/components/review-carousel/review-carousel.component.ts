import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Review } from '../../../data/reviews.data';
import { IconComponent } from '../icon/icon.component';
import { ReviewCardComponent } from '../review-card/review-card.component';

/**
 * Finite review carousel: native CSS scroll-snap track (swipe, trackpad, keyboard) plus
 * Previous / Next buttons and position dots. 1 card on phones, 2 on tablets, 3 on desktop.
 * No autoplay, no looping, no carousel library.
 */
@Component({
  selector: 'app-review-carousel',
  imports: [ReviewCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      #track
      class="track"
      tabindex="0"
      role="region"
      aria-label="Customer reviews"
      (scroll)="update()"
    >
      @for (review of reviews(); track review.author) {
        <li class="slide"><app-review-card [review]="review" /></li>
      }
    </ul>
    <div class="controls">
      <button
        type="button"
        class="arrow"
        aria-label="Previous review"
        [disabled]="!canPrev()"
        (click)="step(-1)"
      >
        <app-icon name="chevron-left" style="--icon-size: 1.25rem" />
      </button>
      <div class="dots" role="group" aria-label="Choose a position">
        @for (stop of stops(); track stop) {
          <button
            type="button"
            class="dot"
            [class.active]="stop === activeIndex()"
            [attr.aria-label]="'Go to position ' + (stop + 1) + ' of ' + stops().length"
            [attr.aria-current]="stop === activeIndex() ? 'true' : null"
            (click)="scrollTo(stop)"
          ></button>
        }
      </div>
      <button
        type="button"
        class="arrow"
        aria-label="Next review"
        [disabled]="!canNext()"
        (click)="step(1)"
      >
        <app-icon name="chevron-right" style="--icon-size: 1.25rem" />
      </button>
    </div>
  `,
  styleUrl: './review-carousel.component.scss',
})
export class ReviewCarouselComponent {
  readonly reviews = input.required<readonly Review[]>();

  protected readonly activeIndex = signal(0);
  protected readonly canPrev = signal(false);
  protected readonly canNext = signal(true);
  /** Number of distinct scroll positions (reviews minus the cards visible at once, plus one). */
  private readonly visible = signal(1);
  protected readonly stops = computed(() =>
    Array.from({ length: Math.max(1, this.reviews().length - this.visible() + 1) }, (_, i) => i),
  );

  private readonly track = viewChild.required<ElementRef<HTMLUListElement>>('track');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    afterNextRender(() => {
      this.update();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.update());
        observer.observe(this.track().nativeElement);
        inject(DestroyRef).onDestroy(() => observer.disconnect());
      }
    });
  }

  /** Re-reads the track and refreshes arrow state, visible-card count and the active dot. */
  protected update(): void {
    if (!this.isBrowser) {
      return;
    }
    const track = this.track().nativeElement;
    const slides = Array.from(track.children) as HTMLElement[];

    const atStart = track.scrollLeft <= 1;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    this.canPrev.set(!atStart);
    this.canNext.set(!atEnd && slides.length > 1);

    const stride = slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : 0;
    this.visible.set(stride > 0 ? Math.max(1, Math.round(track.clientWidth / stride)) : 1);

    const last = this.stops().length - 1;
    let index = 0;
    if (atStart) {
      index = 0;
    } else if (atEnd) {
      index = last;
    } else if (stride > 0) {
      index = Math.min(last, Math.max(0, Math.round(track.scrollLeft / stride)));
    }
    if (index !== this.activeIndex()) {
      this.activeIndex.set(index);
    }
  }

  protected step(direction: 1 | -1): void {
    this.scrollTo(Math.min(this.stops().length - 1, Math.max(0, this.activeIndex() + direction)));
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
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({
      left: slide.offsetLeft - track.offsetLeft,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }
}
