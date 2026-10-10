import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MOBILE_CTA_SCROLL_THRESHOLD, MobileCtaComponent } from './mobile-cta.component';

describe('MobileCtaComponent', () => {
  let fixture: ComponentFixture<MobileCtaComponent>;

  const scrollTo = (y: number): void => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    await TestBed.configureTestingModule({
      imports: [MobileCtaComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(MobileCtaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const host = (): HTMLElement => fixture.nativeElement;

  it('is hidden (and inert) at the top of the page', () => {
    expect(host().classList.contains('visible')).toBe(false);
    expect(host().hasAttribute('inert')).toBe(true);
  });

  it('appears after scrolling past the threshold and hides again near the top', () => {
    scrollTo(MOBILE_CTA_SCROLL_THRESHOLD + 50);
    expect(host().classList.contains('visible')).toBe(true);
    expect(host().hasAttribute('inert')).toBe(false);

    scrollTo(10);
    expect(host().classList.contains('visible')).toBe(false);
  });

  it('offers separate Call (tel:) and Text (sms:) links plus a link to the contact page', () => {
    const links = Array.from(host().querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'tel:+12795298754',
      'sms:+12795298754',
      '/contact',
    ]);
    expect(links[0].getAttribute('aria-label')).toBe('Call Mira & Team at (279) 529-8754');
    expect(links[1].getAttribute('aria-label')).toBe('Text Mira & Team at (279) 529-8754');
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Call', 'Text', 'Book Appointment']);
  });
});
