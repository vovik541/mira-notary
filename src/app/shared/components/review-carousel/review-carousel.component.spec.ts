import { TestBed } from '@angular/core/testing';
import { REVIEWS } from '../../../data/reviews.data';
import { ReviewCarouselComponent } from './review-carousel.component';

describe('ReviewCarouselComponent', () => {
  it('renders one slide and one pagination dot per review', () => {
    const fixture = TestBed.createComponent(ReviewCarouselComponent);
    fixture.componentRef.setInput('reviews', REVIEWS);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.slide').length).toBe(3);
    expect(el.querySelectorAll('.dot').length).toBe(3);
    expect(el.querySelector('.dot.active')).toBeTruthy();
  });

  it('shows each review verbatim with its author and source', () => {
    const fixture = TestBed.createComponent(ReviewCarouselComponent);
    fixture.componentRef.setInput('reviews', REVIEWS);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const review of REVIEWS) {
      expect(text).toContain(review.author);
      expect(text).toContain(review.text);
    }
    expect(text).toContain('Google Review');
  });
});
