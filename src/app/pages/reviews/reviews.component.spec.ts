import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReviewsComponent } from './reviews.component';

describe('ReviewsComponent', () => {
  it('offers a Leave a Google Review link that opens safely in a new tab', () => {
    TestBed.configureTestingModule({
      imports: [ReviewsComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ReviewsComponent);
    fixture.detectChanges();
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find(
      (a) => a.textContent?.includes('Leave a Google Review'),
    ) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://g.page/r/CR77WhvSyXIGEBM/review');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
