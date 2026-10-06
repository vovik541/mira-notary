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

describe('ReviewsComponent full list', () => {
  it('renders all five reviews, including the two newest, and keeps the review CTA', () => {
    TestBed.configureTestingModule({
      imports: [ReviewsComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ReviewsComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const authors = Array.from(el.querySelectorAll('.author')).map((a) => a.textContent);
    expect(authors).toEqual([
      'Liudmyla Petruk',
      'Vasya K',
      'lara tessadri',
      'Alex Lubic',
      'Galina Izyurova',
    ]);
    expect(el.textContent).toContain('Mira was a total superstar!!!');
    expect(el.textContent).toContain('highly qualified professional');
    const cta = Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Leave a Google Review'),
    ) as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('https://g.page/r/CR77WhvSyXIGEBM/review');
    expect(cta.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
