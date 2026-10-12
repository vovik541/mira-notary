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

describe('PricingComponent notarial services', () => {
  const render = (): HTMLElement => {
    TestBed.configureTestingModule({ imports: [PricingComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const section = (el: HTMLElement): HTMLElement =>
    el.querySelector('section[aria-labelledby="notarial-heading"]') as HTMLElement;

  it('shows ONE "Up to $15" notarial price per applicable signature or act, travel clearly separate', () => {
    const notarial = section(render());
    expect(notarial.querySelectorAll('dt')).toHaveLength(1);
    expect((notarial.textContent?.match(/\$15/g) ?? []).length).toBe(1);
    const text = notarial.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('Up to $15');
    expect(text).toContain('per applicable signature or notarial act');
    expect(text).not.toContain('per notarized signature');
    expect(text).toContain('+ applicable travel fee, charged separately');
  });

  it('keeps the useful notarial terminology in plain explanatory copy', () => {
    const text = section(render()).textContent ?? '';
    for (const term of [
      'acknowledgments',
      'jurats',
      'oaths and affirmations',
      'proofs of execution',
      'certified copies of powers of attorney',
    ]) {
      expect(text).toContain(term);
    }
    expect(text).toContain(
      'Mobile travel fees are separate and vary by meeting location and appointment time.',
    );
  });

  it('no longer lists the five repeated rows or Depositions', () => {
    const text = render().textContent ?? '';
    expect(text).not.toMatch(/Deposition/i);
    expect(text).not.toContain('Subscribing Witness');
    expect(text).not.toContain('+ $7');
  });

  it('keeps travel and apostille pricing exactly as approved', () => {
    const text = render().textContent ?? '';
    expect(text).toMatch(/Sacramento Travel Fee[\s\S]{0,20}8:00 AM–8:00 PM[\s\S]{0,20}~\$50/);
    expect(text).toMatch(/After-Hours Travel[\s\S]{0,20}\+\$70/);
    expect(text).toMatch(/Hospital Travel[\s\S]{0,20}\+\$10/);
    expect(text).toMatch(/First California Apostille[\s\S]{0,20}\$125/);
    expect(text).toMatch(/Each Additional Document[\s\S]{0,20}\$60/);
    expect(text).toContain('Travel fees may vary based on the meeting location.');
  });
});
