import { TestBed } from '@angular/core/testing';
import { ContactCardComponent } from './contact-card.component';

describe('ContactCardComponent', () => {
  const render = (): HTMLElement => {
    TestBed.configureTestingModule({ imports: [ContactCardComponent] });
    const fixture = TestBed.createComponent(ContactCardComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the primary number once, labelled "Primary"', () => {
    const el = render();
    const visible = (el.textContent ?? '').replace(/\s+/g, ' ');
    expect(visible.split('(279) 529-8754')).toHaveLength(2); // exactly one occurrence
    expect(el.querySelector('.primary-card .kind')?.textContent).toBe('Primary');
    expect(el.querySelector('.primary-card .value')?.textContent?.trim()).toBe('(279) 529-8754');
    expect(visible).not.toContain('Primary · Call');
    expect(visible).not.toContain('Primary · Text');
  });

  it('offers a real Call (tel:) and a real Text (sms:) action with explicit labels', () => {
    const links = Array.from(render().querySelectorAll('.primary-card a'));
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Call', 'tel:+12795298754'],
      ['Text', 'sms:+12795298754'],
    ]);
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual([
      'Call Mira & Team at (279) 529-8754',
      'Text Mira & Team at (279) 529-8754',
    ]);
  });

  it('keeps the secondary phone (call only, no invented Text) and the direct email', () => {
    const card = render();
    const secondary = card.querySelector('a.secondary') as HTMLAnchorElement;
    expect(secondary.getAttribute('href')).toBe('tel:+19167590383');
    expect(secondary.textContent).toContain('(916) 759-0383');
    expect(card.querySelector('a[href="sms:+19167590383"]')).toBeNull();
    const email = card.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(email.getAttribute('href')).toBe('mailto:contact@miranotary.com');
    expect(email.textContent).toContain('contact@miranotary.com');
    expect(card.querySelector('h2')?.textContent).toBe('Prefer to Speak Directly?');
  });
});
