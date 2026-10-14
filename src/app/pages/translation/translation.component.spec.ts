import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SEO_PAGES } from '../../core/seo/seo-pages';
import { organizationSchema, pageGraph, serviceSchema } from '../../core/seo/structured-data';
import { TranslationComponent } from './translation.component';

const REFERRAL = 'https://idiomaticaffiliates.com/order-a-translation/ref/eo11r/';
const DESKTOP_BANNER =
  'assets/referals/Translate-your-content-Language-translation-service-to-expand-your-business-4.webp';

function render(): HTMLElement {
  TestBed.configureTestingModule({
    imports: [TranslationComponent],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(TranslationComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const flat = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

describe('TranslationComponent partner banner', () => {
  it('uses the local desktop WebP, sized and lazy, never a remote image', () => {
    const el = render();
    const img = el.querySelector('.partner img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(DESKTOP_BANNER);
    expect(img.getAttribute('width')).toBe('728');
    expect(img.getAttribute('height')).toBe('90');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('alt')).toBe(
      'Idiomatic Language Services — professional translation services',
    );
    expect(el.innerHTML).not.toMatch(/(src|srcset)="\s*https?:\/\//);
    expect(el.innerHTML).not.toMatch(/\.png/i);
    expect(el.querySelectorAll('iframe, script')).toHaveLength(0);
  });

  it('uses the same wide banner on every viewport (no mobile-specific source)', () => {
    const el = render();
    expect(el.querySelectorAll('.partner img')).toHaveLength(1);
    expect(el.querySelector('.partner picture, .partner source')).toBeNull();
    expect(el.innerHTML).not.toContain('since-1996');
  });

  it('makes the whole banner one sponsored external link with the exact referral URL', () => {
    const link = render().querySelector('.partner a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(REFERRAL);
    expect(link.getAttribute('href')).not.toContain('utm_');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener sponsored');
    expect(link.querySelector('img')).not.toBeNull();
    expect(link.textContent).toContain('(opens in a new tab)');
  });

  it('shows the short commission disclosure right under the banner as visible text', () => {
    const el = render();
    const disclosure = el.querySelector('.partner .disclosure') as HTMLElement;
    expect(flat(disclosure.textContent)).toBe('Mira may earn a commission from qualifying orders.');
    expect(disclosure.previousElementSibling?.tagName).toBe('A');
    expect(disclosure.hasAttribute('hidden')).toBe(false);
    expect(disclosure.hasAttribute('title')).toBe(false);
    expect(flat(el.textContent)).not.toContain('at no additional cost to you');
  });

  it('names the affiliated partner as an option for other languages, outside the quote card', () => {
    const el = render();
    expect(flat(el.textContent)).toContain(
      'Need another language? More options are available through our affiliated business partner, Idiomatic Language Services.',
    );
    expect(el.querySelector('.quote .partner')).toBeNull();
    expect(el.querySelector('.info .partner')).toBeNull();
    expect(el.querySelector('.quote a[href^="https://idiomatic"]')).toBeNull();
  });

  it('keeps Mira’s own language pairs and quote CTA, and never claims she translates 150+ languages', () => {
    const el = render();
    const pairs = Array.from(el.querySelectorAll('.pair')).map((li) => li.textContent?.trim());
    expect(pairs).toEqual(['Ukrainian ↔ English', 'Russian ↔ English']);
    const cta = el.querySelector('.quote a.btn--gold') as HTMLAnchorElement;
    expect(cta.textContent?.trim()).toBe('Request a Translation Quote');
    expect(cta.getAttribute('href')).toContain('/contact');
    expect(flat(el.textContent)).not.toMatch(/150|translation network/i);
  });
});

describe('Translation SEO stays about Mira', () => {
  it('does not mention Idiomatic or referral language in metadata or JSON-LD', () => {
    const origin = 'https://miranotary.com';
    const payload = JSON.stringify([
      SEO_PAGES.translation,
      pageGraph(SEO_PAGES.translation, origin),
      serviceSchema('translation', '/services/translation', origin),
      organizationSchema(origin),
    ]);
    expect(payload).not.toMatch(/idiomatic|affiliate|referral|commission|sponsored/i);
  });
});
