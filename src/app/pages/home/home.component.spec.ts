import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

describe('HomeComponent service-area preview', () => {
  const render = (): HTMLElement => {
    TestBed.configureTestingModule({ imports: [HomeComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows Sacramento County and all 11 confirmed communities as compact chips', () => {
    const chips = Array.from(render().querySelectorAll('.chips li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(chips).toEqual([
      'Sacramento County',
      'Roseville',
      'Rocklin',
      'Lincoln',
      'Loomis',
      'Granite Bay',
      'Auburn',
      'West Sacramento',
      'Davis',
      'Woodland',
      'El Dorado Hills',
      'Cameron Park',
    ]);
  });

  it('uses the approved hero supporting sentence (plain marketing wording, no "confirmed")', () => {
    const lead = render().querySelector('.hero-copy .lead') as HTMLElement;
    expect(lead.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Reliable mobile notarization and loan signing services at your home, office, hospital, or another convenient location throughout Sacramento County and nearby communities in the Greater Sacramento area.',
    );
    expect(lead.textContent).not.toContain('confirmed');
  });

  it('uses the updated summary and links to the full Service Area page', () => {
    const el = render();
    const text = (el.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Serving the Greater Sacramento Area & Surrounding Communities');
    expect(text).toContain(
      'Mira serves Sacramento County and confirmed nearby communities across Placer, Yolo and El Dorado Counties.',
    );
    expect(text).not.toContain('selected surrounding communities in Placer and Yolo Counties');
    const link = Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('View Service Area Details'),
    );
    expect(link?.getAttribute('href')).toBe('/service-area');
  });
});

describe('HomeComponent hero', () => {
  const render = (): HTMLElement => {
    TestBed.configureTestingModule({ imports: [HomeComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('has the exact plural H1 with a non-breaking closing phrase', () => {
    const h1 = render().querySelector('h1') as HTMLElement;
    expect(h1.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Professional Mobile Notary Services — Wherever You Need It',
    );
    expect(h1.textContent).not.toContain('Service —');
    expect(h1.querySelector('.keep')?.textContent).toBe('Wherever You Need It');
  });

  it('uses the primary phone number in the hero and offers a Google review link', () => {
    const el = render();
    const tels = Array.from(el.querySelectorAll('a[href^="tel:"]')).map((a) =>
      a.getAttribute('href'),
    );
    expect(tels.length).toBeGreaterThan(0);
    expect(new Set(tels)).toEqual(new Set(['tel:+12795298754']));

    const review = Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Leave a Google Review'),
    ) as HTMLAnchorElement;
    expect(review.getAttribute('href')).toBe('https://g.page/r/CR77WhvSyXIGEBM/review');
    expect(review.getAttribute('target')).toBe('_blank');
    expect(review.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
