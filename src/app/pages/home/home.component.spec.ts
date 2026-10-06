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
    expect(text).toContain(
      'Serving Sacramento County and confirmed nearby communities across the Greater Sacramento area.',
    );
    expect(text).not.toContain('selected surrounding communities in Placer and Yolo Counties');
    const link = Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('View Service Area Details'),
    );
    expect(link?.getAttribute('href')).toBe('/service-area');
  });
});
