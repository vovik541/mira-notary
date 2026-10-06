import { ComponentFixture, TestBed } from '@angular/core/testing';
import { REVIEWS } from '../../../data/reviews.data';
import {
  DRAG_THRESHOLD_PX,
  ReviewCarouselComponent,
  measurePositions,
  nearestPosition,
} from './review-carousel.component';

/** Semantic fake of the scroll geometry (jsdom has no layout): N slides, a given stride/viewport. */
interface Geometry {
  stride: number;
  clientWidth: number;
}
const DESKTOP: Geometry = { stride: 300, clientWidth: 900 }; // 3 visible → 3 positions
const MOBILE: Geometry = { stride: 300, clientWidth: 300 }; // 1 visible → 5 positions

class Rig {
  scrollLeft = 0;
  geometry: Geometry = DESKTOP;
  readonly track: HTMLElement;
  readonly scrollToCalls: ScrollToOptions[] = [];
  readonly setCapture = vi.fn();
  readonly releaseCapture = vi.fn();
  private captured = false;

  constructor(readonly fixture: ComponentFixture<ReviewCarouselComponent>) {
    this.track = (fixture.nativeElement as HTMLElement).querySelector('.track') as HTMLElement;
    const slides = Array.from(this.track.children) as HTMLElement[];
    slides.forEach((slide, i) =>
      Object.defineProperty(slide, 'offsetLeft', {
        configurable: true,
        get: () => i * this.geometry.stride,
      }),
    );
    const define = (name: string, descriptor: PropertyDescriptor): void => {
      Object.defineProperty(this.track, name, { configurable: true, ...descriptor });
    };
    define('clientWidth', { get: () => this.geometry.clientWidth });
    define('scrollWidth', { get: () => slides.length * this.geometry.stride });
    define('scrollLeft', {
      get: () => Math.min(this.max, Math.max(0, this.scrollLeft)),
      set: (value: number) => (this.scrollLeft = value),
    });
    define('scrollTo', {
      value: (options: ScrollToOptions) => {
        this.scrollToCalls.push(options);
        this.scrollLeft = options.left ?? 0;
        this.track.dispatchEvent(new Event('scroll'));
      },
    });
    define('setPointerCapture', {
      value: (id: number) => {
        this.captured = true;
        this.setCapture(id);
      },
    });
    define('hasPointerCapture', { value: () => this.captured });
    define('releasePointerCapture', {
      value: (id: number) => {
        this.captured = false;
        this.releaseCapture(id);
      },
    });
  }

  get max(): number {
    return Math.max(0, REVIEWS.length * this.geometry.stride - this.geometry.clientWidth);
  }

  /** Dispatches a pointer event; extra fields are attached as own properties. */
  pointer(
    type: string,
    init: { x?: number; t?: number; kind?: string; button?: number; id?: number } = {},
  ): Event {
    const event = new Event(type, { bubbles: true, cancelable: true });
    const fields: Record<string, unknown> = {
      pointerId: init.id ?? 1,
      pointerType: init.kind ?? 'mouse',
      button: init.button ?? 0,
      isPrimary: true,
      clientX: init.x ?? 0,
      timeStamp: init.t ?? 0,
    };
    for (const [key, value] of Object.entries(fields)) {
      Object.defineProperty(event, key, { value });
    }
    this.track.dispatchEvent(event);
    this.fixture.detectChanges();
    return event;
  }

  /** Slow, deliberate drag by `dx` px (pointer ends idle, so no flick). */
  drag(dx: number, start = 500): void {
    this.pointer('pointerdown', { x: start, t: 0 });
    this.pointer('pointermove', { x: start, t: 10 });
    this.pointer('pointermove', { x: start + Math.sign(dx) * DRAG_THRESHOLD_PX, t: 20 });
    this.pointer('pointermove', { x: start + dx, t: 400 });
    this.pointer('pointerup', { x: start + dx, t: 1000 });
  }

  update(): void {
    this.track.dispatchEvent(new Event('scroll'));
    this.fixture.detectChanges();
  }

  get dots(): HTMLElement[] {
    return Array.from((this.fixture.nativeElement as HTMLElement).querySelectorAll('.dot'));
  }
  get activeDot(): number {
    return this.dots.findIndex((dot) => dot.classList.contains('active'));
  }
  button(label: string): HTMLButtonElement {
    return (this.fixture.nativeElement as HTMLElement).querySelector(
      `button[aria-label="${label}"]`,
    ) as HTMLButtonElement;
  }
  get dragging(): boolean {
    return this.track.classList.contains('is-dragging');
  }
}

function setup(reducedMotion = true): Rig {
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
  const fixture = TestBed.createComponent(ReviewCarouselComponent);
  fixture.componentRef.setInput('reviews', REVIEWS);
  fixture.detectChanges();
  const rig = new Rig(fixture);
  rig.update();
  return rig;
}

describe('ReviewCarousel mouse drag', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('geometry helpers', () => {
    it('measures one position per reachable stop, clamped to the max scroll', () => {
      const rig = setup();
      expect(measurePositions(rig.track)).toEqual([0, 300, 600]);
      rig.geometry = MOBILE;
      expect(measurePositions(rig.track)).toEqual([0, 300, 600, 900, 1200]);
    });

    it('finds the nearest position', () => {
      expect(nearestPosition([0, 300, 600], 140)).toBe(0);
      expect(nearestPosition([0, 300, 600], 160)).toBe(1);
      expect(nearestPosition([0, 300, 600], 9999)).toBe(2);
      expect(nearestPosition([0, 300, 600], -50)).toBe(0);
    });
  });

  describe('drag lifecycle', () => {
    it('does not start a drag below the threshold and leaves the click alone', () => {
      const rig = setup();
      rig.pointer('pointerdown', { x: 500, t: 0 });
      rig.pointer('pointermove', { x: 500 - (DRAG_THRESHOLD_PX - 1), t: 10 });
      expect(rig.dragging).toBe(false);
      expect(rig.setCapture).not.toHaveBeenCalled();
      expect(rig.scrollLeft).toBe(0);

      rig.pointer('pointerup', { x: 497, t: 20 });
      const click = new Event('click', { bubbles: true, cancelable: true });
      rig.track.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(false);
      expect(rig.scrollToCalls).toHaveLength(0);
    });

    it('starts dragging beyond the threshold, captures the pointer and follows it', () => {
      const rig = setup();
      rig.pointer('pointerdown', { x: 500, t: 0 });
      rig.pointer('pointermove', { x: 500 - DRAG_THRESHOLD_PX - 1, t: 10 });
      expect(rig.dragging).toBe(true);
      expect(rig.setCapture).toHaveBeenCalledWith(1);

      const before = rig.scrollLeft;
      rig.pointer('pointermove', { x: 400, t: 30 }); // pointer moved left → content scrolls right
      expect(rig.scrollLeft).toBeGreaterThan(before);
      rig.pointer('pointermove', { x: 450, t: 50 }); // back right → scrolls back
      expect(rig.scrollLeft).toBeLessThan(150);
    });

    it('ends the drag on pointerup and releases the pointer', () => {
      const rig = setup();
      rig.drag(-100);
      expect(rig.dragging).toBe(false);
      expect(rig.releaseCapture).toHaveBeenCalledWith(1);
    });

    it('resets safely on pointercancel (no stuck dragging state)', () => {
      const rig = setup();
      rig.pointer('pointerdown', { x: 500, t: 0 });
      rig.pointer('pointermove', { x: 400, t: 20 });
      expect(rig.dragging).toBe(true);
      rig.pointer('pointercancel', { t: 30 });
      expect(rig.dragging).toBe(false);
      // a later stray move must not resurrect the drag
      rig.pointer('pointermove', { x: 300, t: 40 });
      expect(rig.dragging).toBe(false);
    });

    it('resets safely when pointer capture is lost', () => {
      const rig = setup();
      rig.pointer('pointerdown', { x: 500, t: 0 });
      rig.pointer('pointermove', { x: 400, t: 20 });
      rig.pointer('lostpointercapture', { t: 30 });
      expect(rig.dragging).toBe(false);
    });

    it('ignores touch, pen and non-primary buttons (native scrolling stays in charge)', () => {
      const rig = setup();
      for (const init of [{ kind: 'touch' }, { kind: 'pen' }, { button: 2 }]) {
        rig.pointer('pointerdown', { x: 500, t: 0, ...init });
        rig.pointer('pointermove', { x: 300, t: 20, ...init });
        expect(rig.dragging).toBe(false);
        expect(rig.setCapture).not.toHaveBeenCalled();
      }
    });

    it('suppresses exactly one click after a real drag, and no click otherwise', () => {
      const rig = setup();
      rig.drag(-100);
      const first = new Event('click', { bubbles: true, cancelable: true });
      rig.track.dispatchEvent(first);
      expect(first.defaultPrevented).toBe(true);
      const second = new Event('click', { bubbles: true, cancelable: true });
      rig.track.dispatchEvent(second);
      expect(second.defaultPrevented).toBe(false);
    });

    it('blocks text selection only while dragging', () => {
      const rig = setup();
      const idle = new Event('selectstart', { cancelable: true });
      rig.track.dispatchEvent(idle);
      expect(idle.defaultPrevented).toBe(false);

      rig.pointer('pointerdown', { x: 500, t: 0 });
      rig.pointer('pointermove', { x: 400, t: 20 });
      const during = new Event('selectstart', { cancelable: true });
      rig.track.dispatchEvent(during);
      expect(during.defaultPrevented).toBe(true);
    });
  });

  describe('snapping on release', () => {
    it('settles on the nearest valid position (past half → next, short of half → back)', () => {
      const rig = setup();
      rig.drag(-170); // scrollLeft 170 (≥ half of 300)
      expect(rig.scrollLeft).toBe(300);
      expect(rig.activeDot).toBe(1);

      rig.drag(-100); // 300 + 100 → nearest is still 300
      expect(rig.scrollLeft).toBe(300);
      expect(rig.activeDot).toBe(1);
    });

    it('never settles below the first position', () => {
      const rig = setup();
      rig.drag(800);
      expect(rig.scrollLeft).toBe(0);
      expect(rig.activeDot).toBe(0);
      expect(rig.button('Previous review').disabled).toBe(true);
    });

    it('never settles beyond the last position', () => {
      const rig = setup();
      rig.drag(-5000);
      expect(rig.scrollLeft).toBe(600);
      expect(rig.activeDot).toBe(2);
      expect(rig.button('Next review').disabled).toBe(true);
    });

    it('a quick short flick advances exactly one position, never more', () => {
      const rig = setup();
      rig.pointer('pointerdown', { x: 500, t: 0 });
      rig.pointer('pointermove', { x: 495, t: 5 });
      rig.pointer('pointermove', { x: 470, t: 10 }); // crosses the threshold
      rig.pointer('pointermove', { x: 440, t: 15 });
      rig.pointer('pointermove', { x: 400, t: 20 }); // fast: ~8px/ms
      rig.pointer('pointerup', { x: 400, t: 25 });
      expect(rig.scrollLeft).toBe(300);
      expect(rig.activeDot).toBe(1);
    });

    it('a slow drag of the same distance does not flick', () => {
      const rig = setup();
      rig.drag(-60);
      expect(rig.scrollLeft).toBe(0);
      expect(rig.activeDot).toBe(0);
    });

    it('settles smoothly (not instantly) unless reduced motion is requested', () => {
      const rig = setup(false);
      rig.drag(-170);
      const last = rig.scrollToCalls[rig.scrollToCalls.length - 1];
      expect(last).toEqual({ left: 300, behavior: 'smooth' });
      expect(rig.track.classList.contains('is-settling')).toBe(true);
    });

    it('uses an instant, non-animated settle when reduced motion is requested', () => {
      const rig = setup(true);
      rig.drag(-170);
      const last = rig.scrollToCalls[rig.scrollToCalls.length - 1];
      expect(last.behavior).toBe('auto');
    });
  });

  describe('controls stay synchronized with the real scroll position', () => {
    it('updates arrows and dots after drags, and arrows/dots then keep working', () => {
      const rig = setup();
      expect(rig.button('Previous review').disabled).toBe(true);

      rig.drag(-170);
      expect(rig.button('Previous review').disabled).toBe(false);
      expect(rig.button('Next review').disabled).toBe(false);
      expect(rig.activeDot).toBe(1);

      rig.button('Next review').click();
      rig.fixture.detectChanges();
      expect(rig.scrollLeft).toBe(600);
      expect(rig.activeDot).toBe(2);

      rig.dots[0].click();
      rig.fixture.detectChanges();
      expect(rig.scrollLeft).toBe(0);
      expect(rig.activeDot).toBe(0);
    });
  });

  describe('resize', () => {
    it('re-measures positions and clamps the index when fewer positions exist', () => {
      let resized: () => void = () => undefined;
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            resized = callback;
          }
          observe(): void {}
          disconnect(): void {}
        },
      );
      const fixture = TestBed.createComponent(ReviewCarouselComponent);
      fixture.componentRef.setInput('reviews', REVIEWS);
      fixture.detectChanges();
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      const rig = new Rig(fixture);

      rig.geometry = MOBILE;
      rig.update();
      expect(rig.dots).toHaveLength(5);
      rig.dots[4].click();
      fixture.detectChanges();
      expect(rig.activeDot).toBe(4);

      rig.geometry = DESKTOP; // 3 visible: only 3 positions now
      resized();
      fixture.detectChanges();
      expect(rig.dots).toHaveLength(3);
      expect(rig.activeDot).toBe(2);
      expect(rig.track.scrollLeft).toBe(600);
      expect(rig.button('Next review').disabled).toBe(true);
    });
  });

  it('never duplicates or remounts review cards while interacting', () => {
    const rig = setup();
    const before = Array.from(rig.track.querySelectorAll('app-review-card'));
    rig.drag(-170);
    rig.drag(300);
    rig.button('Next review').click();
    rig.fixture.detectChanges();
    const after = Array.from(rig.track.querySelectorAll('app-review-card'));
    expect(after).toHaveLength(5);
    expect(after).toEqual(before); // same DOM nodes: no re-creation
  });
});
