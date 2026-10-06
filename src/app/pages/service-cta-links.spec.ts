import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CtaBandComponent } from '../shared/components/cta-band/cta-band.component';
import { ApostilleComponent } from './apostille/apostille.component';
import { LoanSigningComponent } from './loan-signing/loan-signing.component';
import { MobileNotaryComponent } from './mobile-notary/mobile-notary.component';
import { TranslationComponent } from './translation/translation.component';

function contactLinks(component: Type<unknown>): string[] {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
      'a[href^="/contact"]',
    ),
  ).map((a) => a.getAttribute('href') ?? '');
}

describe('service-specific Book Appointment links', () => {
  it.each([
    ['Mobile Notary', MobileNotaryComponent, 'general-notary'],
    ['Loan Signing', LoanSigningComponent, 'loan-signing'],
    ['California Apostille', ApostilleComponent, 'california-apostille'],
    ['Document Translation', TranslationComponent, 'document-translation'],
  ] as [string, Type<unknown>, string][])(
    '%s page links every contact CTA with ?service=%s',
    (_name, component, slug) => {
      const links = contactLinks(component);
      expect(links.length).toBeGreaterThan(0);
      for (const href of links) {
        expect(href).toBe(`/contact?service=${slug}`);
      }
    },
  );

  it('the shared CTA band passes its service context, and stays generic without one', () => {
    TestBed.configureTestingModule({ imports: [CtaBandComponent], providers: [provideRouter([])] });
    const withService = TestBed.createComponent(CtaBandComponent);
    withService.componentRef.setInput('service', 'loan-signing');
    withService.detectChanges();
    expect(
      (withService.nativeElement as HTMLElement)
        .querySelector('a[href^="/contact"]')
        ?.getAttribute('href'),
    ).toBe('/contact?service=loan-signing');

    const generic = TestBed.createComponent(CtaBandComponent);
    generic.detectChanges();
    expect(
      (generic.nativeElement as HTMLElement)
        .querySelector('a[href^="/contact"]')
        ?.getAttribute('href'),
    ).toBe('/contact');
  });
});
