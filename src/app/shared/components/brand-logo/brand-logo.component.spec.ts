import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BrandLogoComponent } from './brand-logo.component';

function render(showText: boolean): HTMLAnchorElement {
  TestBed.configureTestingModule({ imports: [BrandLogoComponent], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(BrandLogoComponent);
  fixture.componentRef.setInput('showText', showText);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('a.brand') as HTMLAnchorElement;
}

describe('BrandLogoComponent accessible name', () => {
  it('contains the visible name and tagline (label in name) when the text is shown', () => {
    const link = render(true);
    const visible = Array.from(link.querySelectorAll('.name, .role'))
      .map((part) => part.textContent?.trim())
      .join(' ');
    expect(visible).toBe('Mira Derkach Mobile Notary & Loan Signing Agent');
    expect(link.getAttribute('aria-label')).toContain(visible);
    expect(link.getAttribute('aria-label')).toMatch(/home$/);
  });

  it('names the link after the business when only the logo is shown', () => {
    expect(render(false).getAttribute('aria-label')).toBe('Local Notary Signings — home');
  });
});
