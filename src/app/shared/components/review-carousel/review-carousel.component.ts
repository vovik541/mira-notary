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

/** Mouse movement (px) below which a press is still a click, not a drag. */
export const DRAG_THRESHOLD_PX = 6;
/** A release counts as a flick only after this much travel (px)… */
export const FLICK_MIN_DISTANCE_PX = 24;
/** …at this speed (px per ms). A flick advances at most ONE position. */
export const FLICK_MIN_VELOCITY = 0.4;
/** A pause longer than this (ms) before release means "placed", not "flicked". */
const FLICK_MAX_IDLE_MS = 80;
/** rAF fallback (no `scrollend`): frames without movement that mean the scroll has stopped. */
const SETTLE_STABLE_FRAMES = 6;

/** Distinct scroll offsets the track can rest at (one per reachable position). */
export function measurePositions(track: HTMLElement): number[] {
  const max = Math.max(0, track.scrollWidth - track.clientWidth);
  const padding = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
  const positions: number[] = [];
  for (const slide of Array.from(track.children) as HTMLElement[]) {
    const target = Math.min(max, Math.max(0, slide.offsetLeft - padding));
    if (positions.length === 0 || target - positions[positions.length - 1] > 1) {
      positions.push(target);
    }
  }
  return positions.length > 0 ? positions : [0];
}

/** Index of the position closest to `left`. */
export function nearestPosition(positions: readonly number[], left: number): number {
  let best = 0;
  positions.forEach((position, index) => {
    if (Math.abs(position - left) < Math.abs(positions[best] - left)) {
      best = index;
    }
  });
  return best;
}

/**
 * Finite review carousel. The native scroll container (`scrollLeft` + CSS scroll-snap) is the
 * single source of truth: touch swipe, trackpad, keyboard, arrows, dots and desktop mouse drag
 * all just move `scrollLeft`. 1 card on phones, 2 on tablets, 3 on desktop. No autoplay,
 * no looping, no clones, no library.
 *
 * Mouse drag: Pointer Events, mouse + primary button only (touch keeps native scrolling). After a
 * {@link DRAG_THRESHOLD_PX} movement the track captures the pointer and `scrollLeft` follows it
 * 1:1 with snapping off. On release it settles (smooth scroll) onto the nearest real position.
 */
@Component({
  selector: 'app-review-carousel',
  imports: [ReviewCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      #track
      class="track"
      [class.is-dragging]="isDragging()"
      [class.is-settling]="isSettling()"
      tabindex="0"
      role="region"
      aria-label="Customer reviews"
      (scroll)="update()"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerCancel($event)"
      (lostpointercapture)="onLostPointerCapture($event)"
      (click)="onClick($event)"
      (selectstart)="onSelectStart($event)"
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
  protected readonly isDragging = signal(false);
  protected readonly isSettling = signal(false);
  private readonly stopCount = signal(1);
  protected readonly stops = computed(() => Array.from({ length: this.stopCount() }, (_, i) => i));

  private readonly track = viewChild.required<ElementRef<HTMLUListElement>>('track');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Valid resting offsets, re-measured on every update (geometry changes with the viewport). */
  private positions: number[] = [0];

  private activePointerId: number | null = null;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private dragStartIndex = 0;
  private lastMoveX = 0;
  private lastMoveTime = 0;
  private velocity = 0;
  private suppressNextClick = false;

  private settleFrame: number | null = null;
  private settleCleanup: (() => void) | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.cancelSettle());
    afterNextRender(() => {
      this.update();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.onResize());
        observer.observe(this.track().nativeElement);
        destroyRef.onDestroy(() => observer.disconnect());
      }
    });
  }

  /** Derives arrow state, dot count and active dot from the REAL scroll position. */
  protected update(): void {
    if (!this.isBrowser) {
      return;
    }
    const track = this.track().nativeElement;
    this.positions = measurePositions(track);
    this.stopCount.set(this.positions.length);

    const left = track.scrollLeft;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    this.canPrev.set(left > 1);
    this.canNext.set(left < max - 1 && this.positions.length > 1);
    this.activeIndex.set(nearestPosition(this.positions, left));
  }

  /**
   * The visible-card count changes with the viewport (1 → 2 → 3): positions are re-measured, the
   * index follows the real scroll position (never out of range) and, if the browser left the
   * track between two positions, it is nudged (instantly) onto the nearest valid one.
   */
  private onResize(): void {
    this.update();
    if (this.isDragging() || this.isSettling()) {
      return;
    }
    const track = this.track().nativeElement;
    const target = this.positions[nearestPosition(this.positions, track.scrollLeft)];
    if (Math.abs(target - track.scrollLeft) > 1) {
      track.scrollTo({ left: target, behavior: 'auto' });
    }
  }

  // ---- Arrows and dots ----------------------------------------------------------------------

  protected step(direction: 1 | -1): void {
    this.scrollTo(this.activeIndex() + direction);
  }

  protected scrollTo(index: number): void {
    if (!this.isBrowser) {
      return;
    }
    this.update();
    this.settleTo(index);
  }

  // ---- Mouse drag (Pointer Events) ----------------------------------------------------------

  protected onPointerDown(event: PointerEvent): void {
    // Touch and pen keep the browser's native scrolling; only the primary mouse button drags.
    if (
      !this.isBrowser ||
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      !event.isPrimary
    ) {
      return;
    }
    const track = this.track().nativeElement;
    this.cancelSettle();
    this.update();

    this.activePointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartScrollLeft = track.scrollLeft;
    this.dragStartIndex = nearestPosition(this.positions, track.scrollLeft);
    this.lastMoveX = event.clientX;
    this.lastMoveTime = event.timeStamp;
    this.velocity = 0;
    this.suppressNextClick = false;
  }

  protected onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }
    const track = this.track().nativeElement;

    if (!this.isDragging()) {
      if (Math.abs(event.clientX - this.dragStartX) < DRAG_THRESHOLD_PX) {
        return;
      }
      // Real drag begins. Capture only now, so a plain click keeps its normal target.
      // Re-base the origin so the content does not jump by the threshold distance.
      this.isDragging.set(true);
      this.dragStartX = event.clientX;
      this.dragStartScrollLeft = track.scrollLeft;
      track.setPointerCapture?.(event.pointerId);
      window.getSelection()?.removeAllRanges();
    }

    const elapsed = event.timeStamp - this.lastMoveTime;
    if (elapsed > 0) {
      this.velocity = (event.clientX - this.lastMoveX) / elapsed;
    }
    this.lastMoveX = event.clientX;
    this.lastMoveTime = event.timeStamp;

    // The browser clamps scrollLeft to [0, max]: no negative or past-the-end positions.
    track.scrollLeft = this.dragStartScrollLeft - (event.clientX - this.dragStartX);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }
    const idle = event.timeStamp - this.lastMoveTime > FLICK_MAX_IDLE_MS;
    this.finishPointer(event.pointerId, idle ? 0 : this.velocity);
  }

  protected onPointerCancel(event: PointerEvent): void {
    if (event.pointerId === this.activePointerId) {
      this.finishPointer(event.pointerId, 0);
    }
  }

  /** Capture taken away (e.g. element removed, window blur): behave like a release. */
  protected onLostPointerCapture(event: PointerEvent): void {
    if (event.pointerId === this.activePointerId) {
      this.finishPointer(event.pointerId, 0);
    }
  }

  private finishPointer(pointerId: number, velocity: number): void {
    const track = this.track().nativeElement;
    const wasDragging = this.isDragging();
    this.activePointerId = null;
    if (track.hasPointerCapture?.(pointerId)) {
      track.releasePointerCapture(pointerId);
    }
    if (!wasDragging) {
      return; // never became a drag: leave the click alone
    }

    this.isDragging.set(false);
    this.suppressNextClick = true; // the mouseup of a real drag must not click anything
    this.update();

    const travelled = track.scrollLeft - this.dragStartScrollLeft;
    let index = nearestPosition(this.positions, track.scrollLeft);
    // Conservative flick: a quick short drag that has not yet reached the half-way point moves
    // exactly one position in the drag direction; it never carries across several reviews.
    if (
      index === this.dragStartIndex &&
      Math.abs(travelled) >= FLICK_MIN_DISTANCE_PX &&
      Math.abs(velocity) >= FLICK_MIN_VELOCITY
    ) {
      index += velocity < 0 ? 1 : -1;
    }
    this.settleTo(index);
  }

  protected onClick(event: Event): void {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  protected onSelectStart(event: Event): void {
    if (this.isDragging()) {
      event.preventDefault();
    }
  }

  // ---- Settling -----------------------------------------------------------------------------

  /** Smoothly scrolls to a (clamped) position, with snapping off so it cannot fight the motion. */
  private settleTo(requested: number): void {
    const track = this.track().nativeElement;
    this.cancelSettle();
    const index = Math.min(this.positions.length - 1, Math.max(0, requested));
    const target = this.positions[index];

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || Math.abs(target - track.scrollLeft) <= 1) {
      track.scrollTo({ left: target, behavior: 'auto' });
      this.update();
      return;
    }

    this.isSettling.set(true);
    this.watchSettle(track, target);
    track.scrollTo({ left: target, behavior: 'smooth' });
  }

  /**
   * Completion: the `scrollend` event where the browser has it; otherwise a requestAnimationFrame
   * watcher that stops once the offset reaches the target or has not moved for a few frames
   * (Safari < 26 and older browsers have no `scrollend`). No timers involved.
   */
  private watchSettle(track: HTMLElement, target: number): void {
    if (supportsScrollEnd()) {
      const onEnd = (): void => this.endSettle();
      track.addEventListener('scrollend', onEnd, { once: true });
      this.settleCleanup = () => track.removeEventListener('scrollend', onEnd);
      return;
    }
    let previous = track.scrollLeft;
    let still = 0;
    const tick = (): void => {
      const now = track.scrollLeft;
      still = now === previous ? still + 1 : 0;
      previous = now;
      if (Math.abs(now - target) <= 1 || still >= SETTLE_STABLE_FRAMES) {
        this.endSettle();
        return;
      }
      this.settleFrame = requestAnimationFrame(tick);
    };
    this.settleFrame = requestAnimationFrame(tick);
  }

  private endSettle(): void {
    this.releaseSettleWatchers();
    this.isSettling.set(false);
    this.update();
  }

  /** Stops an in-flight settle (new press, new target, destroy), freezing at the current offset. */
  private cancelSettle(): void {
    const wasSettling = this.isSettling();
    this.releaseSettleWatchers();
    if (wasSettling) {
      const track = this.track().nativeElement;
      track.scrollTo({ left: track.scrollLeft, behavior: 'auto' });
      this.isSettling.set(false);
    }
  }

  private releaseSettleWatchers(): void {
    if (this.settleFrame !== null) {
      cancelAnimationFrame(this.settleFrame);
      this.settleFrame = null;
    }
    this.settleCleanup?.();
    this.settleCleanup = null;
  }
}

const supportsScrollEnd = (): boolean => 'onscrollend' in window;
