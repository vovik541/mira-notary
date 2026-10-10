import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoanSigningComponent } from '../../../pages/loan-signing/loan-signing.component';
import { HomeComponent } from '../../../pages/home/home.component';
import { MobileNotaryComponent } from '../../../pages/mobile-notary/mobile-notary.component';
import { PricingComponent } from '../../../pages/pricing/pricing.component';
import { ServiceAreaComponent } from '../../../pages/service-area/service-area.component';
import { SiteHeaderComponent } from '../../../layout/site-header/site-header.component';
import { ContactCardComponent } from '../contact-card/contact-card.component';
import { CallTextComponent } from './call-text.component';

const TEL = 'tel:+12795298754';
const SMS = 'sms:+12795298754';

function render(component: Type<unknown>): HTMLElement {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const accessibleName = (a: Element): string =>
  `${a.getAttribute('aria-label') ?? ''} ${a.textContent ?? ''}`;

describe('CallTextComponent', () => {
  it('renders a real Call link (tel:) and a real Text link (sms:) with explicit labels', () => {
    const el = render(CallTextComponent);
    const [call, text] = Array.from(el.querySelectorAll('a'));
    expect(call.getAttribute('href')).toBe(TEL);
    expect(call.getAttribute('aria-label')).toBe('Call Mira & Team at (279) 529-8754');
    expect(call.textContent?.trim()).toBe('Call');
    expect(text.getAttribute('href')).toBe(SMS);
    expect(text.getAttribute('aria-label')).toBe('Text Mira & Team at (279) 529-8754');
    expect(text.textContent?.trim()).toBe('Text');
    expect(el.querySelectorAll('a')).toHaveLength(2);
  });
});

describe('Call / Text actions match their labels', () => {
  const pages: [string, Type<unknown>][] = [
    ['Home', HomeComponent],
    ['Pricing', PricingComponent],
    ['Loan Signing', LoanSigningComponent],
    ['Mobile Notary', MobileNotaryComponent],
    ['Service Area', ServiceAreaComponent],
    ['Contact card', ContactCardComponent],
    ['Header', SiteHeaderComponent],
  ];

  it.each(pages)(
    '%s: a tel: link never offers texting, an sms: link is always a Text action',
    (_name, component) => {
      const el = render(component);
      for (const a of Array.from(el.querySelectorAll('a[href^="tel:"]'))) {
        expect(accessibleName(a), a.outerHTML).not.toMatch(/\btext\b/i);
      }
      for (const a of Array.from(el.querySelectorAll('a[href^="sms:"]'))) {
        expect(a.getAttribute('href')).toBe(SMS);
        expect(accessibleName(a)).toMatch(/\btext\b/i);
        expect(accessibleName(a)).not.toMatch(/\bcall\b/i);
      }
    },
  );

  it.each(pages.slice(0, 4))(
    '%s: has both a Call (tel:) and a Text (sms:) action',
    (_name, component) => {
      const el = render(component);
      expect(el.querySelectorAll(`a[href="${TEL}"]`).length).toBeGreaterThan(0);
      expect(el.querySelectorAll(`a[href="${SMS}"]`).length).toBeGreaterThan(0);
    },
  );
});
