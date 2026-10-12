import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EXTERNAL_LINKS, GOOGLE_BUSINESS_PROFILE_URL } from '../../core/config/business.config';
import { ServiceAreaComponent } from './service-area.component';

function setup(): ComponentFixture<ServiceAreaComponent> {
  TestBed.configureTestingModule({
    imports: [ServiceAreaComponent],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(ServiceAreaComponent);
  fixture.detectChanges();
  return fixture;
}

const input = (fixture: ComponentFixture<ServiceAreaComponent>): HTMLInputElement =>
  fixture.nativeElement.querySelector('#zip') as HTMLInputElement;

const type = (fixture: ComponentFixture<ServiceAreaComponent>, value: string): void => {
  input(fixture).value = value;
  input(fixture).dispatchEvent(new Event('input'));
  fixture.detectChanges();
};

const blur = (fixture: ComponentFixture<ServiceAreaComponent>): void => {
  input(fixture).dispatchEvent(new Event('blur'));
  fixture.detectChanges();
};

const pressCheck = (fixture: ComponentFixture<ServiceAreaComponent>): HTMLElement => {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('#zip-result') as HTMLElement;
};

function check(fixture: ComponentFixture<ServiceAreaComponent>, zip: string): HTMLElement {
  type(fixture, zip);
  return pressCheck(fixture);
}

const errorText = (fixture: ComponentFixture<ServiceAreaComponent>): string | null =>
  (fixture.nativeElement.querySelector('#zip-error') as HTMLElement | null)?.textContent?.trim() ??
  null;

describe('ServiceAreaComponent ZIP checker', () => {
  it('is idle initially: no result and no error', () => {
    const fixture = setup();
    const result = fixture.nativeElement.querySelector('#zip-result') as HTMLElement;
    expect(result.textContent?.trim()).toBe('');
    expect(errorText(fixture)).toBeNull();
  });

  it('uses the shared ZIP input: text field, numeric keypad hint, postal-code, maxlength 5', () => {
    const el = input(setup());
    expect(el.getAttribute('type')).toBe('text');
    expect(el.getAttribute('inputmode')).toBe('numeric');
    expect(el.getAttribute('autocomplete')).toBe('postal-code');
    expect(el.getAttribute('maxlength')).toBe('5');
  });

  it.each([
    ['95814', 'Sacramento'],
    ['95630', 'Folsom'],
  ])('reports %s as served and links to the Contact form', (zip, community) => {
    const fixture = setup();
    const result = check(fixture, zip);
    expect(result.textContent).toContain(`Yes — Mira serves ZIP code ${zip}.`);
    expect(result.textContent).toContain(
      `This ZIP code is in the ${community} area, within Mira's confirmed service area.`,
    );

    const cta = result.querySelector('a.btn--gold') as HTMLAnchorElement;
    expect(cta.textContent?.trim()).toBe('Book an Appointment');
    expect(cta.getAttribute('href')).toBe(`/contact?zip=${zip}`);
  });

  it('reports a well-formed ZIP outside the list without claiming Mira does not serve it', () => {
    const fixture = setup();
    const result = check(fixture, '90210');
    const content = result.textContent ?? '';
    expect(content).toContain(
      "This ZIP code is outside Mira's currently confirmed online service area.",
    );
    expect(content).toContain(
      'Call or text Mira & Team to ask about availability in other nearby communities.',
    );
    expect(content).not.toMatch(/does not serve|not serve/i);
    // Future-proof fallback: no county is named.
    expect(content).not.toMatch(/Placer|Yolo|El Dorado/);
    expect(content).not.toContain('selected surrounding communities');
    expect(content).not.toContain('Yes —');
    expect(errorText(fixture)).toBeNull(); // valid format: a result, not a field error

    const hrefs = Array.from(result.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('tel:+12795298754');
    expect(hrefs).toContain('/contact');
  });

  describe('format validation (exactly 5 digits)', () => {
    it.each(['9', '95', '958', '9581'])(
      'shows the 5-digit error for %j after the field is left, never "unconfirmed"',
      (partial) => {
        const fixture = setup();
        type(fixture, partial);
        expect(errorText(fixture)).toBeNull(); // still typing
        blur(fixture);
        expect(errorText(fixture)).toBe('Enter a valid 5-digit ZIP code.');
        expect(input(fixture).getAttribute('aria-invalid')).toBe('true');
        expect(input(fixture).getAttribute('aria-describedby')).toBe('zip-error');
        const result = fixture.nativeElement.querySelector('#zip-result') as HTMLElement;
        expect(result.textContent?.trim()).toBe('');
        expect(fixture.nativeElement.textContent).not.toContain('outside Mira');
      },
    );

    it('pressing Check with a partial ZIP shows the format error and no result', () => {
      const fixture = setup();
      const result = check(fixture, '9581');
      expect(errorText(fixture)).toBe('Enter a valid 5-digit ZIP code.');
      expect(result.querySelector('a')).toBeNull();
      expect(result.textContent?.trim()).toBe('');
    });

    it('pressing Check on an empty field shows the required error (no error before that)', () => {
      const fixture = setup();
      expect(errorText(fixture)).toBeNull();
      const result = pressCheck(fixture);
      expect(errorText(fixture)).toBe('ZIP code is required.');
      expect(result.textContent?.trim()).toBe('');
    });

    it('clears the format error once the field holds exactly 5 digits', () => {
      const fixture = setup();
      type(fixture, '9581');
      blur(fixture);
      expect(errorText(fixture)).toBe('Enter a valid 5-digit ZIP code.');
      type(fixture, '95814');
      expect(errorText(fixture)).toBeNull();
    });
  });

  describe('digits only, at most 5 (typing and paste)', () => {
    it.each([
      ['958140', '95814'],
      ['9581A', '9581'],
      ['95a81-4', '95814'],
      ['123456', '12345'],
      ['95814-1234', '95814'],
      ['e+-.', ''],
    ])('typing %j leaves %j in the field', (typed, expected) => {
      const fixture = setup();
      type(fixture, typed);
      expect(input(fixture).value).toBe(expected);
    });

    it.each([
      ['95a81-4', '95814'],
      ['123456', '12345'],
      ['95814abc', '95814'],
    ])('pasting %j leaves %j in the field', (pasted, expected) => {
      const fixture = setup();
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => pasted } });
      input(fixture).dispatchEvent(event);
      fixture.detectChanges();
      expect(event.defaultPrevented).toBe(true);
      expect(input(fixture).value).toBe(expected);
    });

    it('sanitized pasted ZIP+4 becomes a plain 5-digit check (never a "ZIP+4 result")', () => {
      const fixture = setup();
      const result = check(fixture, '95814-1234');
      expect(input(fixture).value).toBe('95814');
      expect(result.textContent).toContain('Yes — Mira serves ZIP code 95814.');
    });
  });

  it('discards a stale result when the input is edited', () => {
    const fixture = setup();
    check(fixture, '95814');
    type(fixture, '9581');
    expect(
      (fixture.nativeElement.querySelector('#zip-result') as HTMLElement).textContent?.trim(),
    ).toBe('');
  });

  it('uses the same shared ZIP list as the Contact form (single source)', async () => {
    const shared = await import('../../../shared/service-area');
    // 95604 is Auburn's PO Box ZIP: deliberately NOT confirmed. The page decides via the shared
    // helper only, so it must be reported as unconfirmed (and never as "does not serve").
    const unconfirmed = '95604';
    expect(shared.isSupportedServiceZip(unconfirmed)).toBe(false);
    const result = check(setup(), unconfirmed);
    expect(result.textContent).toContain('outside');
    expect(result.textContent).not.toMatch(/does not serve/i);
  });

  it('names the community for a named ZIP', () => {
    const named = check(setup(), '95661');
    expect(named.textContent).toContain('This ZIP code is in the Roseville area');
  });

  it('stays generic for small rural ZIPs without a named community', () => {
    const generic = check(setup(), '95639');
    expect(generic.textContent).toContain('Yes — Mira serves ZIP code 95639.');
    expect(generic.textContent).toContain(
      "This ZIP code is within Mira's confirmed Greater Sacramento service area.",
    );
  });

  it.each(['95691', '95616', '95762', '95661', '95658', '95681', '95664'])(
    'supports polygon ZIP %s and never describes it as a whole-county service',
    (zip) => {
      const result = check(setup(), zip);
      const text = result.textContent ?? '';
      expect(text).toContain(`Yes — Mira serves ZIP code ${zip}.`);
      expect(text).not.toContain('outside');
      expect(text).not.toMatch(/within Sacramento County|countywide/i);
      expect(result.querySelector('a.btn--gold')?.getAttribute('href')).toBe(`/contact?zip=${zip}`);
    },
  );

  it.each(['95602', '95757', '95695', '95614'])(
    'shows the distinct "Limited service area" result for %s with real Call and Text actions',
    (zip) => {
      const result = check(setup(), zip);
      const text = (result.textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('Limited service area');
      expect(text).toContain(
        'Mira may be available in this ZIP code, but availability can vary by exact location. Please call or text Mira & Team to confirm.',
      );
      const hrefs = Array.from(result.querySelectorAll('a')).map((a) => a.getAttribute('href'));
      expect(hrefs).toContain('tel:+12795298754');
      expect(hrefs).toContain('sms:+12795298754');
      expect(text).not.toContain('Yes —');
      expect(text).not.toMatch(/fully confirmed|confirmed service area/i);
      expect(text).not.toContain("outside Mira's currently confirmed online service area");
    },
  );

  it('keeps the confirmed result unchanged for a polygon ZIP', () => {
    const result = check(setup(), '95814');
    expect(result.textContent).toContain('Yes — Mira serves ZIP code 95814.');
    expect(result.textContent).not.toContain('Limited service area');
  });

  it.each(['95682', '95615', '95617', '95812', '94203', '90210'])(
    'treats %s (< 1% overlap or unknown) as outside, not "not served"',
    (zip) => {
      const result = check(setup(), zip);
      expect(result.textContent).toContain('outside');
      expect(result.textContent).not.toContain('Yes —');
      expect(result.textContent).not.toMatch(/does not serve|not serve/i);
    },
  );

  it('keeps 90210 unconfirmed', () => {
    const result = check(setup(), '90210');
    expect(result.textContent).toContain('outside');
    expect(result.textContent).not.toContain('Yes —');
  });
});

describe('ServiceAreaComponent confirmed service area block', () => {
  const block = (): HTMLElement => {
    const fixture = setup();
    return (fixture.nativeElement as HTMLElement).querySelector('.grid .panel') as HTMLElement;
  };

  const groupsOf = (panel: HTMLElement): { county: string; body: string[] }[] =>
    Array.from(panel.querySelectorAll('.group')).map((group) => ({
      county: group.querySelector('h3')?.textContent?.trim() ?? '',
      body: Array.from(group.querySelectorAll('.chips li')).map(
        (li) => li.textContent?.trim() ?? '',
      ),
    }));

  it('is headed "Confirmed Service Area"', () => {
    expect(block().querySelector('h2')?.textContent?.trim()).toBe('Confirmed Service Area');
  });

  it('shows county → key communities from the polygon-derived data only', () => {
    const groups = groupsOf(block());
    expect(groups.map((g) => g.county)).toEqual([
      'Sacramento County',
      'Placer County',
      'Yolo County',
      'El Dorado County',
    ]);
    const byCounty = Object.fromEntries(groups.map((g) => [g.county, g.body]));
    expect(byCounty['Placer County']).toContain('Roseville');
    expect(byCounty['Placer County']).not.toContain('Cameron Park');
    expect(byCounty['Yolo County']).toEqual(['Davis', 'West Sacramento', 'Woodland']);
    expect(byCounty['El Dorado County']).toEqual(['El Dorado Hills']);
    expect(byCounty['Sacramento County']).toEqual(
      expect.arrayContaining(['Sacramento', 'Elk Grove', 'Folsom', 'Rancho Cordova']),
    );
  });

  it('never claims countywide service and shows no ZIP chips', () => {
    const panel = block();
    const text = (panel.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).not.toMatch(/countywide|throughout Sacramento County/i);
    expect(panel.querySelectorAll('.countywide')).toHaveLength(0);
    for (const chip of Array.from(panel.querySelectorAll('.chips li'))) {
      expect(chip.textContent?.trim()).not.toMatch(/\d{5}/);
    }
  });

  it('invites a call or text for locations near or outside the confirmed area', () => {
    const text = (block().textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain(
      'Locations near or outside the confirmed area may still be available. Call or text Mira & Team to ask.',
    );
  });
});

describe('ServiceAreaComponent limited coverage note', () => {
  it('mentions edge ZIPs once, without listing partial ZIPs or cities', () => {
    const el = setup().nativeElement as HTMLElement;
    const text = (el.textContent as string).replace(/\s+/g, ' ');
    expect(text).toContain(
      'Some ZIP codes near the edge of the service area may have limited coverage. Use the ZIP checker to confirm.',
    );
    const chips = Array.from(el.querySelectorAll('.groups .chips li')).map((li) =>
      li.textContent?.trim(),
    );
    for (const partial of ['Wilton', 'Dixon', 'Clarksburg', 'Knights Landing', 'Rio Oso']) {
      expect(chips).not.toContain(partial);
    }
  });
});

describe('ServiceAreaComponent service area map', () => {
  const section = (): HTMLElement =>
    setup().nativeElement.querySelector('app-service-area-map section') as HTMLElement;

  it('embeds only the public Google My Maps view, lazily, with an accessible title', () => {
    const iframe = section().querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe(
      'https://www.google.com/maps/d/embed?mid=1ng1VSm4xqVtoWQ-JoSgasdx6ww7p86g&ehbc=2E312F',
    );
    expect(iframe.getAttribute('src')).not.toContain('/edit');
    expect(iframe.getAttribute('title')).toBe('Local Notary Signings by Mira service area map');
    expect(iframe.getAttribute('loading')).toBe('lazy');
    expect(iframe.hasAttribute('sandbox')).toBe(false);
  });

  it('never exposes the My Maps editor URL anywhere on the page', () => {
    const html = setup().nativeElement.innerHTML as string;
    expect(html).not.toMatch(/maps\/d\/edit|\/edit\?mid=/);
  });

  it('offers the map viewer and review actions from centralized config, opening safely', () => {
    const links = Array.from(section().querySelectorAll('a')) as HTMLAnchorElement[];
    const byLabel = Object.fromEntries(
      links.map((a) => [a.textContent?.replace(/\(opens in a new tab\)/, '').trim(), a]),
    );
    expect(byLabel['Open Service Area Map'].getAttribute('href')).toBe(
      'https://www.google.com/maps/d/viewer?mid=1ng1VSm4xqVtoWQ-JoSgasdx6ww7p86g',
    );
    expect(byLabel['Leave a Google Review'].getAttribute('href')).toBe(EXTERNAL_LINKS.googleReview);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('omits the Google Business Profile action while no verified URL is configured', () => {
    expect(GOOGLE_BUSINESS_PROFILE_URL).toBeNull();
    expect(section().textContent).not.toContain('View Google Business Profile');
  });

  it('uses the approved copy and never says "Google account"', () => {
    const text = (section().textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain(
      "View Mira's mobile notary service area across Sacramento and nearby communities. Locations near or outside the highlighted area may still be available upon request.",
    );
    expect(text).not.toMatch(/google account/i);
  });

  it('marks the map section so the contextual mobile CTA steps aside', () => {
    expect(section().hasAttribute('appmobilectablocker')).toBe(true);
  });
});
