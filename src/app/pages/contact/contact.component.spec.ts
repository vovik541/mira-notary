import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TurnstileComponent } from '../../shared/components/turnstile/turnstile.component';
import { preferredDateValidator } from '../../shared/validators/form-validators';
import { ContactComponent, UNCONFIRMED_ZIP_MESSAGE } from './contact.component';

function setup(query: Record<string, string> = {}): ComponentFixture<ContactComponent> {
  TestBed.configureTestingModule({
    imports: [ContactComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)) } },
    ],
  });
  const fixture = TestBed.createComponent(ContactComponent);
  fixture.detectChanges();
  return fixture;
}

const field = (fixture: ComponentFixture<ContactComponent>, id: string): HTMLInputElement =>
  fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;

const set = (fixture: ComponentFixture<ContactComponent>, id: string, value: string): void => {
  const control = field(fixture, id);
  control.value = value;
  control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input'));
};

/** Types a value and leaves the field (the moment errors are allowed to appear). */
const enter = (fixture: ComponentFixture<ContactComponent>, id: string, value: string): void => {
  set(fixture, id, value);
  field(fixture, id).dispatchEvent(new Event('blur'));
  fixture.detectChanges();
};

const check = (fixture: ComponentFixture<ContactComponent>, id: string, checked: boolean): void => {
  const control = field(fixture, id);
  control.checked = checked;
  control.dispatchEvent(new Event('change'));
  fixture.detectChanges();
};

const submit = (fixture: ComponentFixture<ContactComponent>): void => {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  fixture.detectChanges();
};

const isoDate = (daysFromToday: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const fillValid = (fixture: ComponentFixture<ContactComponent>): void => {
  set(fixture, 'firstName', 'Jane');
  set(fixture, 'lastName', 'Doe');
  set(fixture, 'phone', '(916) 555-0100');
  set(fixture, 'email', 'jane@example.com');
  set(fixture, 'zip', '95814');
  set(fixture, 'preferredDate', isoDate(7));
  set(fixture, 'preferredTime', 'Morning');
  check(fixture, 'consent', true);
};

const giveToken = (fixture: ComponentFixture<ContactComponent>, token: string | null): void => {
  fixture.debugElement.query(By.directive(TurnstileComponent)).componentInstance.token.emit(token);
  fixture.detectChanges();
};

const text = (fixture: ComponentFixture<ContactComponent>): string =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

const errorText = (fixture: ComponentFixture<ContactComponent>, id: string): string | null =>
  (
    fixture.nativeElement.querySelector(`#${id}-error`) as HTMLElement | null
  )?.textContent?.trim() ?? null;

describe('ContactComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('validation UX', () => {
    it('shows no errors on initial load', () => {
      const fixture = setup();
      expect(fixture.nativeElement.querySelectorAll('.error').length).toBe(0);
      expect(fixture.nativeElement.querySelector('[aria-invalid="true"]')).toBeNull();
    });

    it('shows a field error only after the field is left, and clears it once corrected', () => {
      const fixture = setup();
      set(fixture, 'email', 'nope');
      fixture.detectChanges();
      expect(errorText(fixture, 'email')).toBeNull();

      field(fixture, 'email').dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(errorText(fixture, 'email')).toBe('Enter a valid email address.');

      set(fixture, 'email', 'jane@example.com');
      fixture.detectChanges();
      expect(errorText(fixture, 'email')).toBeNull();
      expect(field(fixture, 'email').getAttribute('aria-invalid')).toBeNull();
    });

    it('associates the error with its field (aria-invalid + aria-describedby)', () => {
      const fixture = setup();
      enter(fixture, 'phone', '123');
      const input = field(fixture, 'phone');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('phone-error');
      expect(fixture.nativeElement.querySelector('#phone-error')).toBeTruthy();
    });

    it('on submit with invalid fields: sends nothing, marks every field, focuses the first one', () => {
      const fixture = setup();
      document.body.appendChild(fixture.nativeElement);
      submit(fixture);

      for (const id of [
        'firstName',
        'lastName',
        'phone',
        'email',
        'zip',
        'preferredDate',
        'preferredTime',
      ]) {
        expect(errorText(fixture, id)).toBeTruthy();
        expect(field(fixture, id).getAttribute('aria-invalid')).toBe('true');
      }
      expect(text(fixture)).toContain('Please check the form and try again.');
      expect(document.activeElement).toBe(field(fixture, 'firstName'));
      TestBed.inject(HttpTestingController).expectNone('/api/appointments');
      fixture.nativeElement.remove();
    });

    it('keeps entered values when submission is rejected client-side', () => {
      const fixture = setup();
      set(fixture, 'firstName', 'Jane');
      submit(fixture);
      expect(field(fixture, 'firstName').value).toBe('Jane');
    });
  });

  describe('required fields', () => {
    it.each([
      ['firstName', 'Enter your first name.'],
      ['lastName', 'Enter your last name.'],
      ['phone', 'Enter your phone number.'],
      ['email', 'Enter your email address.'],
      ['zip', 'ZIP code is required.'],
      ['preferredDate', 'Choose a preferred date.'],
      ['preferredTime', 'Enter your preferred time.'],
    ])('%s is required', (id, message) => {
      const fixture = setup();
      enter(fixture, id, '');
      expect(errorText(fixture, id)).toBe(message);
    });

    it('rejects whitespace-only values', () => {
      const fixture = setup();
      enter(fixture, 'firstName', '   ');
      enter(fixture, 'preferredTime', '  ');
      expect(errorText(fixture, 'firstName')).toBe('Enter your first name.');
      expect(errorText(fixture, 'preferredTime')).toBe('Enter your preferred time.');
    });

    it('does not make optional fields required', () => {
      const fixture = setup();
      submit(fixture);
      for (const id of ['signers', 'language', 'details']) {
        expect(errorText(fixture, id)).toBeNull();
      }
    });
  });

  describe('names', () => {
    it.each(["O'Connor", 'Anne-Marie', 'Мирослава', 'José'])('accepts %s', (name) => {
      const fixture = setup();
      enter(fixture, 'firstName', name);
      enter(fixture, 'lastName', name);
      expect(errorText(fixture, 'firstName')).toBeNull();
      expect(errorText(fixture, 'lastName')).toBeNull();
    });

    it('rejects names without a letter and names over 80 characters', () => {
      const fixture = setup();
      enter(fixture, 'firstName', '---');
      expect(errorText(fixture, 'firstName')).toBe('Enter a valid first name.');
      enter(fixture, 'lastName', 'a'.repeat(81));
      expect(errorText(fixture, 'lastName')).toBe('Last name must be 80 characters or fewer.');
    });
  });

  describe('phone and email', () => {
    it.each(['9167590383', '916-759-0383', '(279) 529-8754', '+1 916 759 0383'])(
      'accepts phone %s',
      (phone) => {
        const fixture = setup();
        enter(fixture, 'phone', phone);
        expect(errorText(fixture, 'phone')).toBeNull();
      },
    );

    it.each(['123', 'abcdefghij', '1'.repeat(16)])('rejects phone %s', (phone) => {
      const fixture = setup();
      enter(fixture, 'phone', phone);
      expect(errorText(fixture, 'phone')).toBe('Enter a valid phone number.');
    });

    it('uses the right input types and hints', () => {
      const fixture = setup();
      expect(field(fixture, 'phone').type).toBe('tel');
      expect(field(fixture, 'email').type).toBe('email');
      expect(field(fixture, 'zip').getAttribute('inputmode')).toBe('numeric');
      expect(field(fixture, 'zip').getAttribute('autocomplete')).toBe('postal-code');
    });

    it.each(['plain', 'a@b', 'a@@b.com'])('rejects email %s', (email) => {
      const fixture = setup();
      enter(fixture, 'email', email);
      expect(errorText(fixture, 'email')).toBe('Enter a valid email address.');
    });
  });

  describe('ZIP code', () => {
    const pasteInto = (
      fixture: ComponentFixture<ContactComponent>,
      text: string,
    ): { prevented: boolean } => {
      const input = field(fixture, 'zip');
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
      input.dispatchEvent(event);
      fixture.detectChanges();
      return { prevented: event.defaultPrevented };
    };

    it('is a text input with the numeric keypad hint, postal-code autofill and maxlength 5 (never type=number)', () => {
      const input = field(setup(), 'zip');
      expect(input.getAttribute('type')).toBe('text');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('autocomplete')).toBe('postal-code');
      expect(input.getAttribute('maxlength')).toBe('5');
    });

    it('shows no error on initial load', () => {
      expect(errorText(setup(), 'zip')).toBeNull();
    });

    it.each(['95814', '95630', '95742', '95624'])('accepts the supported ZIP %s', (zip) => {
      const fixture = setup();
      enter(fixture, 'zip', zip);
      expect(errorText(fixture, 'zip')).toBeNull();
      expect(field(fixture, 'zip').getAttribute('aria-invalid')).toBeNull();
    });

    it('is required (empty after interaction)', () => {
      const fixture = setup();
      enter(fixture, 'zip', '');
      expect(errorText(fixture, 'zip')).toBe('ZIP code is required.');
    });

    it.each(['9', '95', '958', '9581'])(
      'shows the 5-digit error for %j only after the field is left',
      (partial) => {
        const fixture = setup();
        set(fixture, 'zip', partial);
        fixture.detectChanges();
        expect(errorText(fixture, 'zip')).toBeNull(); // still typing: no error yet

        field(fixture, 'zip').dispatchEvent(new Event('blur'));
        fixture.detectChanges();
        expect(errorText(fixture, 'zip')).toBe('Enter a valid 5-digit ZIP code.');
        // Not the service-area message: format is checked first.
        expect(errorText(fixture, 'zip')).not.toContain('outside');
      },
    );

    it('clears the format error as soon as the field holds exactly 5 digits', () => {
      const fixture = setup();
      enter(fixture, 'zip', '9581');
      expect(errorText(fixture, 'zip')).toBe('Enter a valid 5-digit ZIP code.');
      set(fixture, 'zip', '95814');
      fixture.detectChanges();
      expect(errorText(fixture, 'zip')).toBeNull();
    });

    it('associates the error with the field (aria-invalid + aria-describedby)', () => {
      const fixture = setup();
      enter(fixture, 'zip', '958');
      const input = field(fixture, 'zip');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('zip-error');
      expect(fixture.nativeElement.querySelector('#zip-error')).toBeTruthy();
    });

    it('accepts the 5th digit and blocks a 6th: typing "958140" leaves "95814"', () => {
      const fixture = setup();
      set(fixture, 'zip', '958140');
      expect(field(fixture, 'zip').value).toBe('95814');
      expect(fixture.componentInstance['form'].controls.zip.value).toBe('95814');
    });

    it.each([
      ['9581A', '9581'],
      ['95a81-4', '95814'],
      ['123456', '12345'],
      ['95 814', '95814'],
      ['95814-1234', '95814'],
      ['e+-.', ''],
    ])('strips non-digits while typing: %j → %j', (typed, expected) => {
      const fixture = setup();
      set(fixture, 'zip', typed);
      expect(field(fixture, 'zip').value).toBe(expected);
      expect(fixture.componentInstance['form'].controls.zip.value).toBe(expected);
    });

    it.each([
      ['95814', '95814'],
      ['95a81-4', '95814'],
      ['123456', '12345'],
      ['123456789', '12345'],
      ['95814abc', '95814'],
      [' 95814 ', '95814'],
    ])('sanitizes pasted text: %j → %j (paste is intercepted)', (pasted, expected) => {
      const fixture = setup();
      const { prevented } = pasteInto(fixture, pasted);
      expect(prevented).toBe(true);
      expect(field(fixture, 'zip').value).toBe(expected);
      expect(fixture.componentInstance['form'].controls.zip.value).toBe(expected);
    });

    it('merges a paste with what is already in the field and still caps at 5', () => {
      const fixture = setup();
      set(fixture, 'zip', '95');
      pasteInto(fixture, '8-14-99');
      expect(field(fixture, 'zip').value).toBe('95814');
    });

    it.each([
      '95661',
      '95678',
      '95747',
      '95677',
      '95765',
      '95648',
      '95650',
      '95746',
      '95602',
      '95603',
      '95605',
      '95691',
      '95616',
      '95617',
      '95618',
      '95695',
      '95776',
      '95762',
      '95682',
    ])('accepts the confirmed nearby ZIP %s with no unconfirmed warning', (zip) => {
      const fixture = setup();
      enter(fixture, 'zip', zip);
      expect(errorText(fixture, 'zip')).toBeNull();
      expect(fixture.componentInstance['form'].controls.zip.valid).toBe(true);
    });

    it('prefills a confirmed nearby ZIP from the URL as valid', () => {
      const fixture = setup({ zip: '95691' });
      expect(field(fixture, 'zip').value).toBe('95691');
      expect(errorText(fixture, 'zip')).toBeNull();
    });

    it('treats 90210 as a valid format but an unconfirmed service area', () => {
      const fixture = setup();
      enter(fixture, 'zip', '90210');
      const message = errorText(fixture, 'zip');
      expect(message).toBe(UNCONFIRMED_ZIP_MESSAGE);
      expect(message).toBe(
        "This ZIP code is outside Mira's currently confirmed online service area. Contact Mira to ask about availability in other nearby communities.",
      );
      expect(message).not.toMatch(/does not serve/i);
      // Future-proof fallback: no county is named (so no whole-county availability is implied).
      expect(message).not.toMatch(/Placer|Yolo|El Dorado|County/);
      expect(fixture.componentInstance['form'].controls.zip.hasError('zipFormat')).toBe(false);
    });

    it('does not submit while the ZIP is malformed or unconfirmed', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');

      set(fixture, 'zip', '9581');
      submit(fixture);
      expect(errorText(fixture, 'zip')).toBe('Enter a valid 5-digit ZIP code.');

      set(fixture, 'zip', '90210');
      submit(fixture);
      expect(errorText(fixture, 'zip')).toBe(UNCONFIRMED_ZIP_MESSAGE);
      http.expectNone('/api/appointments');
    });
  });

  describe('other fields', () => {
    it('only offers whitelisted services and languages', () => {
      const fixture = setup();
      const services = Array.from(field(fixture, 'service').querySelectorAll('option')).map(
        (o) => o.value,
      );
      expect(services).toEqual([
        'General Notary',
        'Loan Signing',
        'California Apostille',
        'Document Translation',
        'Living Trust / Estate Documents',
        'Power of Attorney',
        'Other',
      ]);
      const languages = Array.from(field(fixture, 'language').querySelectorAll('option')).map(
        (o) => o.value,
      );
      expect(languages).toEqual(['English', 'Ukrainian', 'Russian']);
    });

    it('rejects past dates and dates too far ahead, accepts today and near-future dates', () => {
      const fixture = setup();
      enter(fixture, 'preferredDate', '2000-01-01');
      expect(errorText(fixture, 'preferredDate')).toBe('Choose today or a future date.');
      enter(fixture, 'preferredDate', isoDate(365 * 3));
      expect(errorText(fixture, 'preferredDate')).toBe('Choose a date within the next two years.');
      enter(fixture, 'preferredDate', isoDate(0));
      expect(errorText(fixture, 'preferredDate')).toBeNull();
      enter(fixture, 'preferredDate', isoDate(30));
      expect(errorText(fixture, 'preferredDate')).toBeNull();
    });

    it('validates the optional number fields only when filled', () => {
      const fixture = setup();
      enter(fixture, 'signers', '');
      expect(errorText(fixture, 'signers')).toBeNull();
      enter(fixture, 'signers', '0');
      expect(errorText(fixture, 'signers')).toBe('Enter a whole number from 1 to 50.');
      enter(fixture, 'signers', '51');
      expect(errorText(fixture, 'signers')).toBe('Enter a whole number from 1 to 50.');
      enter(fixture, 'signers', '1.5');
      expect(errorText(fixture, 'signers')).toBe('Enter a whole number from 1 to 50.');
      enter(fixture, 'signers', '2');
      expect(errorText(fixture, 'signers')).toBeNull();
    });

    it('limits additional details to 3000 characters and shows a counter', () => {
      const fixture = setup();
      enter(fixture, 'details', 'a'.repeat(3000));
      expect(errorText(fixture, 'details')).toBeNull();
      expect(text(fixture)).toContain('3000 / 3000');
      enter(fixture, 'details', 'a'.repeat(3001));
      expect(errorText(fixture, 'details')).toBe(
        'Additional details must be 3000 characters or fewer.',
      );
    });
  });

  describe('prefill from the URL', () => {
    const serviceOf = (fixture: ComponentFixture<ContactComponent>): string =>
      field(fixture, 'service').value;

    it.each([
      ['loan-signing', 'Loan Signing'],
      ['california-apostille', 'California Apostille'],
      ['document-translation', 'Document Translation'],
      ['general-notary', 'General Notary'],
      ['living-trust-estate', 'Living Trust / Estate Documents'],
      ['power-of-attorney', 'Power of Attorney'],
    ])('?service=%s selects %s', (slug, service) => {
      expect(serviceOf(setup({ service: slug }))).toBe(service);
    });

    it.each<Record<string, string>>([
      { service: 'invalid' },
      { service: 'DROP-TABLE' },
      { service: '__proto__' },
      {},
    ])('falls back to General Notary for %j', (query) => {
      expect(serviceOf(setup(query))).toBe('General Notary');
    });

    it('prefills a supported ZIP', () => {
      const fixture = setup({ zip: '95814' });
      expect(field(fixture, 'zip').value).toBe('95814');
      expect(errorText(fixture, 'zip')).toBeNull();
    });

    it('no longer normalizes ZIP+4 / padded query values: they are ignored, not prefilled', () => {
      for (const zip of ['95814-1234', ' 95814', '95814 ', '958140']) {
        TestBed.resetTestingModule();
        const fixture = setup({ zip });
        expect(field(fixture, 'zip').value).toBe('');
        expect(errorText(fixture, 'zip')).toBeNull();
      }
    });

    it('does not treat a too-short query ZIP as valid (nothing is prefilled)', () => {
      const fixture = setup({ zip: '9581' });
      expect(field(fixture, 'zip').value).toBe('');
      expect(fixture.componentInstance['form'].controls.zip.valid).toBe(false);
    });

    it('does not accept an unsupported ZIP from the URL', () => {
      const fixture = setup({ zip: '90210' });
      expect(errorText(fixture, 'zip')).toBe(UNCONFIRMED_ZIP_MESSAGE);
      expect(fixture.componentInstance['form'].controls.zip.valid).toBe(false);
    });

    it('ignores a malformed ZIP in the URL', () => {
      expect(field(setup({ zip: '<script>' }), 'zip').value).toBe('');
      TestBed.resetTestingModule();
      expect(field(setup({ zip: '9581' }), 'zip').value).toBe('');
    });

    it('applies service and ZIP independently', () => {
      const fixture = setup({ service: 'loan-signing', zip: '95814' });
      expect(serviceOf(fixture)).toBe('Loan Signing');
      expect(field(fixture, 'zip').value).toBe('95814');
    });

    it('keeps a valid ZIP and falls back to General Notary for a bad service', () => {
      const fixture = setup({ service: 'nope', zip: '95630' });
      expect(serviceOf(fixture)).toBe('General Notary');
      expect(field(fixture, 'zip').value).toBe('95630');
    });
  });

  describe('submission', () => {
    it('requires the Turnstile check before sending', () => {
      const fixture = setup();
      fillValid(fixture);
      submit(fixture);
      expect(text(fixture)).toContain('Please complete the verification check');
      TestBed.inject(HttpTestingController).expectNone('/api/appointments');
    });

    it('sends the mapped payload exactly once, shows the sending state, blocks double submit', () => {
      const fixture = setup({ service: 'loan-signing' });
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      set(fixture, 'zip', '95814-1234');
      set(fixture, 'signers', '1');
      set(fixture, 'details', 'Closing at title office');
      giveToken(fixture, 'turnstile-token');

      submit(fixture);
      submit(fixture); // second click while the first request is in flight

      const request = http.expectOne('/api/appointments');
      const form = request.request.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect(form.getAll('photos')).toHaveLength(0);
      expect(JSON.parse(form.get('payload') as string)).toEqual({
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '(916) 555-0100',
        email: 'jane@example.com',
        service: 'Loan Signing',
        locationZip: '95814',
        preferredDate: isoDate(7),
        preferredTime: 'Morning',
        numberOfSigners: 1,
        preferredLanguage: 'English',
        additionalDetails: 'Closing at title office',
        urgent: false,
        contactConsent: true,
        turnstileToken: 'turnstile-token',
      });
      expect(form.get('payload') as string).not.toContain('fullName');
      expect(form.get('payload') as string).not.toContain('numberOfDocuments');

      const button = fixture.nativeElement.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.textContent).toContain('Sending');

      request.flush({ success: true });
      fixture.detectChanges();
    });

    it('shows the success state and resets the form after a successful send', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');
      submit(fixture);
      http.expectOne('/api/appointments').flush({ success: true });
      fixture.detectChanges();

      const content = text(fixture);
      expect(content).toContain('Thank you. Your request has been sent to Mira.');
      expect(content).toContain('Mira will contact you to confirm availability and final pricing.');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();

      (fixture.nativeElement.querySelector('.notice button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(field(fixture, 'firstName').value).toBe('');
      expect(field(fixture, 'service').value).toBe('General Notary');
    });

    it('keeps the entered data and shows the API message when sending fails', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');
      submit(fixture);
      http.expectOne('/api/appointments').flush(
        {
          success: false,
          error: 'delivery',
          message:
            "We couldn't send your request right now. Please call or text Mira at (279) 529-8754.",
        },
        { status: 502, statusText: 'Bad Gateway' },
      );
      fixture.detectChanges();

      expect(
        (fixture.nativeElement.querySelector('.form-error') as HTMLElement).textContent,
      ).toContain('call or text Mira at (279) 529-8754');
      expect(field(fixture, 'firstName').value).toBe('Jane');
      const button = fixture.nativeElement.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(false);

      // The single-use token was consumed: a retry needs a new one.
      submit(fixture);
      expect(text(fixture)).toContain('Please complete the verification check');
      http.expectNone('/api/appointments');
    });
  });
});

describe('ContactComponent — contact consent, urgent and photos', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  const pickPhotos = (fixture: ComponentFixture<ContactComponent>, files: File[]): void => {
    const input = field(fixture, 'photos');
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const photo = (name: string, type = 'image/jpeg', size = 1024): File =>
    new File([new Uint8Array(size)], name, { type });

  it('has an unchecked-by-default required consent checkbox with the exact wording', () => {
    const fixture = setup();
    expect(field(fixture, 'consent').checked).toBe(false);
    expect(text(fixture)).toContain(
      'I agree that Mira may contact me by phone, text message, or email regarding this request.',
    );
  });

  it('blocks submission without consent and shows the exact message', () => {
    const fixture = setup();
    const http = TestBed.inject(HttpTestingController);
    fillValid(fixture);
    check(fixture, 'consent', false);
    giveToken(fixture, 't');
    submit(fixture);
    expect(errorText(fixture, 'consent')).toBe(
      'Please confirm that Mira may contact you about this request.',
    );
    http.expectNone('/api/appointments');
  });

  it('no longer asks for the number of documents', () => {
    const fixture = setup();
    expect(field(fixture, 'documents')).toBeNull();
    expect(text(fixture)).not.toContain('Number of Documents');
    expect(text(fixture)).toContain('Number of Signers');
  });

  it('shows the Additional Details help text', () => {
    const fixture = setup();
    expect(text(fixture)).toContain(
      'Briefly explain your notary request, the document type, and anything Mira should know before contacting you.',
    );
  });

  it('shows a compact privacy notice without the absolute "do not store" claim', () => {
    const fixture = setup();
    const notice = (fixture.nativeElement.querySelector('details.privacy') as HTMLElement)
      .textContent as string;
    expect(notice).toContain('does not save appointment submissions in a website database');
    expect(notice).toContain('retained by Mira');
    expect(notice).not.toMatch(/we do not store your information/i);
  });

  describe('same-day / urgent', () => {
    it('shows the phone callout, disables submit and never sends while checked', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');
      check(fixture, 'urgent', true);

      expect(text(fixture)).toContain('Same-day and urgent appointments must be booked by phone.');
      const call = fixture.nativeElement.querySelector('.urgent-callout a') as HTMLAnchorElement;
      expect(call.textContent).toContain('Call Mira Now');
      expect(call.getAttribute('href')).toBe('tel:+12795298754');
      expect(fixture.nativeElement.querySelector('.urgent-callout')?.textContent).toContain(
        '(279) 529-8754',
      );
      const button = fixture.nativeElement.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(true);

      submit(fixture);
      http.expectNone('/api/appointments');
    });

    it('keeps entered data and restores submission when unchecked', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');
      check(fixture, 'urgent', true);
      expect(field(fixture, 'firstName').value).toBe('Jane');

      check(fixture, 'urgent', false);
      expect(fixture.nativeElement.querySelector('.urgent-callout')).toBeNull();
      const button = fixture.nativeElement.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(false);

      submit(fixture);
      const request = http.expectOne('/api/appointments');
      const payload = JSON.parse((request.request.body as FormData).get('payload') as string);
      expect(payload.urgent).toBe(false);
      request.flush({ success: true });
    });
  });

  describe('photos', () => {
    it('accepts only the allowed image types on the file input', () => {
      const fixture = setup();
      const accept = field(fixture, 'photos').getAttribute('accept') as string;
      expect(accept).toBe('image/jpeg,image/png,image/webp,image/heic,image/heif');
    });

    it('lists selected photos and lets the user remove them', () => {
      const fixture = setup();
      pickPhotos(fixture, [photo('a.jpg'), photo('b.png', 'image/png')]);
      const items = fixture.nativeElement.querySelectorAll('.photo-list li');
      expect(items).toHaveLength(2);
      expect(text(fixture)).toContain('a.jpg');

      (items[0].querySelector('.photo-remove') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.photo-list li')).toHaveLength(1);
      expect(text(fixture)).not.toContain('a.jpg');
    });

    it.each([
      ['six photos', Array.from({ length: 6 }, (_v, i) => photo(`p${i}.jpg`)), 'up to 5 photos'],
      ['a PDF', [photo('a.pdf', 'application/pdf')], 'JPEG, PNG, WebP or HEIC'],
      [
        'a photo over 5 MB',
        [photo('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)],
        '5 MB or smaller',
      ],
      ['an empty file', [photo('e.jpg', 'image/jpeg', 0)], 'is empty'],
      [
        'more than 15 MB in total',
        [
          photo('1.jpg', 'image/jpeg', 4_000_000),
          photo('2.jpg', 'image/jpeg', 4_000_000),
          photo('3.jpg', 'image/jpeg', 4_000_000),
          photo('4.jpg', 'image/jpeg', 4_000_000),
        ],
        '15 MB or less',
      ],
    ])('rejects %s with a clear message and adds nothing', (_name, files, message) => {
      const fixture = setup();
      pickPhotos(fixture, files);
      expect(
        (fixture.nativeElement.querySelector('#photos-error') as HTMLElement).textContent,
      ).toContain(message);
      expect(fixture.nativeElement.querySelectorAll('.photo-list li')).toHaveLength(0);
    });

    it('accepts HEIC identified only by its extension', () => {
      const fixture = setup();
      pickPhotos(fixture, [photo('IMG_1.HEIC', '')]);
      expect(fixture.nativeElement.querySelectorAll('.photo-list li')).toHaveLength(1);
    });

    it('sends photos as multipart file parts and clears them after success', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');
      pickPhotos(fixture, [photo('a.jpg'), photo('b.png', 'image/png')]);
      submit(fixture);

      const request = http.expectOne('/api/appointments');
      const form = request.request.body as FormData;
      expect(form.getAll('photos').map((file) => (file as File).name)).toEqual(['a.jpg', 'b.png']);
      request.flush({ success: true });
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('.notice button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.photo-list li')).toHaveLength(0);
    });

    it('keeps the photos when sending fails', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');
      pickPhotos(fixture, [photo('a.jpg')]);
      submit(fixture);
      http
        .expectOne('/api/appointments')
        .flush(
          { success: false, error: 'delivery', message: 'Try again.' },
          { status: 502, statusText: 'Bad Gateway' },
        );
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.photo-list li')).toHaveLength(1);
    });

    it('revokes thumbnail object URLs on remove and on destroy', () => {
      const created: string[] = [];
      const revoked: string[] = [];
      const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
      URL.createObjectURL = (): string => {
        const url = `blob:test/${created.length}`;
        created.push(url);
        return url;
      };
      URL.revokeObjectURL = (url: string): void => {
        revoked.push(url);
      };
      try {
        const fixture = setup();
        pickPhotos(fixture, [photo('a.jpg'), photo('b.png', 'image/png')]);
        expect(created).toHaveLength(2);

        (fixture.nativeElement.querySelector('.photo-remove') as HTMLButtonElement).click();
        expect(revoked).toEqual(['blob:test/0']);

        fixture.destroy();
        expect(revoked).toContain('blob:test/1');
      } finally {
        URL.createObjectURL = original.create;
        URL.revokeObjectURL = original.revoke;
      }
    });
  });
});

describe('preferredDateValidator', () => {
  it('accepts empty, today and near-future dates; rejects past, far-future and malformed', () => {
    expect(preferredDateValidator(new FormControl(''))).toBeNull();
    expect(preferredDateValidator(new FormControl(isoDate(0)))).toBeNull();
    expect(preferredDateValidator(new FormControl(isoDate(10)))).toBeNull();
    expect(preferredDateValidator(new FormControl('2000-01-01'))).toEqual({ pastDate: true });
    expect(preferredDateValidator(new FormControl(isoDate(365 * 3)))).toEqual({ tooFar: true });
    expect(preferredDateValidator(new FormControl('20-10-2030'))).toEqual({ dateFormat: true });
  });
});
