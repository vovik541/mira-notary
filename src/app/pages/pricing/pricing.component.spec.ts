import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PricingComponent } from './pricing.component';

describe('PricingComponent payment methods', () => {
  it('lists Zelle, Cash App, Venmo and cash only', () => {
    TestBed.configureTestingModule({ imports: [PricingComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const methods = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.methods li'),
    ).map((li) => li.textContent?.trim());
    expect(methods).toEqual(['Zelle', 'Cash App', 'Venmo', 'Cash']);
  });
});

describe('PricingComponent travel fees', () => {
  const render = (): HTMLElement => {
    TestBed.configureTestingModule({ imports: [PricingComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the Sacramento travel fee as ~$50, not $70 (after-hours stays +$70)', () => {
    const text = render().textContent ?? '';
    expect(text).toContain('Sacramento Travel Fee');
    expect(text).toMatch(/Sacramento Travel Fee[\s\S]{0,40}~\$50/);
    expect(text).not.toMatch(/Sacramento Travel Fee[\s\S]{0,40}\$70/);
    expect(text).toMatch(/After-Hours Travel[\s\S]{0,20}\+\$70/);
  });

  it('shows the location-variable travel note (muted, not a warning)', () => {
    const note = Array.from(render().querySelectorAll('p.note')).find((p) =>
      p.textContent?.includes('Travel fees may vary'),
    );
    expect(note?.textContent?.trim()).toBe(
      'Travel fees may vary based on the meeting location. Mira & Team will confirm the applicable travel fee before the appointment.',
    );
    expect(note?.getAttribute('role')).toBeNull();
  });

  it('offers separate Call (tel:) and Text (sms:) actions', () => {
    const links = Array.from(render().querySelectorAll('app-call-text a')).slice(
      0,
      2,
    ) as HTMLAnchorElement[];
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Call', 'tel:+12795298754'],
      ['Text', 'sms:+12795298754'],
    ]);
  });
});
