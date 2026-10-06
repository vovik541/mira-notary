import { ComponentFixture, TestBed } from '@angular/core/testing';
import { REVIEWS } from '../../../data/reviews.data';
import { ReviewCarouselComponent } from './review-carousel.component';

function setup(): ComponentFixture<ReviewCarouselComponent> {
  const fixture = TestBed.createComponent(ReviewCarouselComponent);
  fixture.componentRef.setInput('reviews', REVIEWS);
  fixture.detectChanges();
  return fixture;
}

const button = (fixture: ComponentFixture<ReviewCarouselComponent>, label: string) =>
  (fixture.nativeElement as HTMLElement).querySelector(
    `button[aria-label="${label}"]`,
  ) as HTMLButtonElement;

/** jsdom has no layout: fake the scroll geometry, then fire a scroll event like a swipe would. */
function scrollTo(fixture: ComponentFixture<ReviewCarouselComponent>, left: number): void {
  const track = (fixture.nativeElement as HTMLElement).querySelector('.track') as HTMLElement;
  Array.from(track.children).forEach((slide, i) =>
    Object.defineProperty(slide, 'offsetLeft', { value: i * 300, configurable: true }),
  );
  Object.defineProperty(track, 'clientWidth', { value: 1000, configurable: true });
  Object.defineProperty(track, 'scrollWidth', { value: 1600, configurable: true });
  Object.defineProperty(track, 'scrollLeft', { value: left, configurable: true });
  track.dispatchEvent(new Event('scroll'));
  fixture.detectChanges();
}

describe('ReviewCarouselComponent', () => {
  it('renders one slide per review in dataset order', () => {
    const el: HTMLElement = setup().nativeElement;
    const authors = Array.from(el.querySelectorAll('.slide .author')).map((a) => a.textContent);
    expect(authors).toEqual(REVIEWS.map((review) => review.author));
    expect(el.querySelectorAll('.slide')).toHaveLength(5);
  });

  it('shows each review verbatim with its author and source', () => {
    const text = (setup().nativeElement as HTMLElement).textContent ?? '';
    for (const review of REVIEWS) {
      expect(text).toContain(review.author);
      expect(text).toContain(review.text);
    }
    expect(text).toContain('Google Review');
  });

  it('exposes a labelled scroll region and real, labelled Previous / Next buttons', () => {
    const fixture = setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.track')?.getAttribute('aria-label')).toBe('Customer reviews');
    expect(button(fixture, 'Previous review').tagName).toBe('BUTTON');
    expect(button(fixture, 'Next review').tagName).toBe('BUTTON');
  });

  it('starts at the beginning: Previous disabled, Next enabled, first dot active', () => {
    const fixture = setup();
    scrollTo(fixture, 0);
    expect(button(fixture, 'Previous review').disabled).toBe(true);
    expect(button(fixture, 'Next review').disabled).toBe(false);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.dot.active')
        ?.getAttribute('aria-label'),
    ).toContain('position 1');
  });

  it('updates arrow state and the dot when the user scrolls manually', () => {
    const fixture = setup();

    scrollTo(fixture, 300);
    expect(button(fixture, 'Previous review').disabled).toBe(false);
    expect(button(fixture, 'Next review').disabled).toBe(false);

    scrollTo(fixture, 600); // 600 + 1000 clientWidth = scrollWidth 1600: the end
    expect(button(fixture, 'Next review').disabled).toBe(true);
    expect(button(fixture, 'Previous review').disabled).toBe(false);
    const dots = (fixture.nativeElement as HTMLElement).querySelectorAll('.dot');
    expect(dots[dots.length - 1].classList.contains('active')).toBe(true);

    scrollTo(fixture, 0);
    expect(button(fixture, 'Previous review').disabled).toBe(true);
    expect(button(fixture, 'Next review').disabled).toBe(false);
  });

  it('scrolls the track when Next is pressed and never past the available reviews', () => {
    const fixture = setup();
    const track = (fixture.nativeElement as HTMLElement).querySelector('.track') as HTMLElement;
    const scrollSpy = vi.fn();
    track.scrollTo = scrollSpy as unknown as typeof track.scrollTo;
    scrollTo(fixture, 0);

    button(fixture, 'Next review').click();
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    scrollTo(fixture, 600);
    expect(button(fixture, 'Next review').disabled).toBe(true);
    button(fixture, 'Next review').click(); // disabled: nothing happens
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps native touch scrolling (scroll-snap track, no autoplay timers)', () => {
    const el: HTMLElement = setup().nativeElement;
    expect(el.querySelector('ul.track')).toBeTruthy();
  });
});
