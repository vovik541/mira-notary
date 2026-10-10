import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

  it.each(['95814', '95630'])('reports %s as served and links to the Contact form', (zip) => {
    const fixture = setup();
    const result = check(fixture, zip);
    expect(result.textContent).toContain(`Yes — Mira serves ZIP code ${zip}.`);
    expect(result.textContent).toContain('This ZIP code is within Sacramento County.');

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

  it('describes a Sacramento County ZIP by county', () => {
    const result = check(setup(), '95814');
    expect(result.textContent).toContain('Yes — Mira serves ZIP code 95814.');
    expect(result.textContent).toContain('This ZIP code is within Sacramento County.');
  });

  it.each([
    ['95691', 'West Sacramento'],
    ['95616', 'Davis'],
    ['95695', 'Woodland'],
    ['95603', 'Auburn'],
    ['95762', 'El Dorado Hills'],
    ['95682', 'Cameron Park'],
    ['95661', 'Roseville'],
  ])('supports %s (%s) without claiming it is in Sacramento County', (zip) => {
    const fixture = setup();
    const result = check(fixture, zip);
    const text = result.textContent ?? '';
    expect(text).toContain(`Yes — Mira serves ZIP code ${zip}.`);
    expect(text).toContain(
      "This ZIP code is within Mira's confirmed Greater Sacramento service area.",
    );
    expect(text).not.toContain('within Sacramento County');
    expect(text).not.toContain('outside');
    expect(result.querySelector('a.btn--gold')?.getAttribute('href')).toBe(`/contact?zip=${zip}`);
  });

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
      body: [
        ...Array.from(group.querySelectorAll('.chips li')).map(
          (li) => li.textContent?.trim() ?? '',
        ),
        ...Array.from(group.querySelectorAll('.countywide')).map(
          (p) => p.textContent?.trim() ?? '',
        ),
      ],
    }));

  it('is headed "Confirmed Service Area"', () => {
    const panel = block();
    expect(panel.querySelector('h2')?.textContent?.trim()).toBe('Confirmed Service Area');
    expect(panel.textContent).not.toContain('Confirmed Service Communities');
  });

  it('shows the four county groups with exactly the confirmed communities', () => {
    expect(groupsOf(block())).toEqual([
      { county: 'Sacramento County', body: ['Countywide service'] },
      {
        county: 'Placer County',
        body: ['Roseville', 'Rocklin', 'Lincoln', 'Loomis', 'Granite Bay', 'Auburn'],
      },
      { county: 'Yolo County', body: ['West Sacramento', 'Davis', 'Woodland'] },
      { county: 'El Dorado County', body: ['El Dorado Hills', 'Cameron Park'] },
    ]);
  });

  it('lists all 11 nearby communities and does not enumerate Sacramento County cities', () => {
    const chips = Array.from(block().querySelectorAll('.chips li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(chips).toHaveLength(11);
    expect(chips).not.toContain('Sacramento');
    expect(chips).not.toContain('Sacramento County');
  });

  it('uses the new intro copy and drops the outdated Placer-only copy', () => {
    const text = (block().textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain(
      'Mira provides mobile notary service throughout Sacramento County and in these confirmed nearby communities across the Greater Sacramento area.',
    );
    expect(text).toContain(
      'For locations outside the confirmed area, contact Mira to ask about availability.',
    );
    expect(text).not.toContain('these confirmed Placer County communities');
    expect(text).not.toContain(
      'Additional surrounding communities in Placer and Yolo Counties may be available by request.',
    );
  });

  it('claims countywide service only for Sacramento County', () => {
    const panel = block();
    expect(panel.querySelectorAll('.countywide')).toHaveLength(1);
    const text = (panel.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).not.toMatch(/(all of|throughout) (placer|yolo|el dorado)/i);
    const nonSacramento = Array.from(panel.querySelectorAll('.group'))
      .filter((g) => !g.querySelector('h3')?.textContent?.includes('Sacramento'))
      .map((g) => g.textContent ?? '');
    for (const groupText of nonSacramento) {
      expect(groupText).not.toContain('Countywide');
    }
  });
});
