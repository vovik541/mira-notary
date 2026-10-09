import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { todayInBusinessZone, isSunday } from '../../../shared/appointment-timing';
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

/** ISO date `n` days after `iso` (pure calendar arithmetic). */
const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** A normal future date: at least a week away and never a Sunday. */
const futureWeekday = (): string => {
  let date = addDays(todayInBusinessZone(), 7);
  while (isSunday(date)) {
    date = addDays(date, 1);
  }
  return date;
};

/** The first Sunday strictly after `iso`. */
const nextSundayFrom = (iso: string): string => {
  let date = addDays(iso, 1);
  while (!isSunday(date)) {
    date = addDays(date, 1);
  }
  return date;
};

const fillValid = (fixture: ComponentFixture<ContactComponent>): void => {
  set(fixture, 'firstName', 'Jane');
  set(fixture, 'lastName', 'Doe');
  set(fixture, 'phone', '(916) 555-0100');
  set(fixture, 'email', 'jane@example.com');
  set(fixture, 'zip', '95814');
  set(fixture, 'preferredDate', futureWeekday());
  set(fixture, 'timePreference', 'morning');
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
        'timePreference',
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
      ['firstName', 'First name is required.'],
      ['lastName', 'Last name is required.'],
      ['phone', 'Enter your phone number.'],
      ['email', 'Enter your email address.'],
      ['zip', 'ZIP code is required.'],
      ['preferredDate', 'Choose a preferred date.'],
      ['timePreference', 'Choose a preferred time.'],
    ])('%s is required', (id, message) => {
      const fixture = setup();
      enter(fixture, id, '');
      expect(errorText(fixture, id)).toBe(message);
    });

    it('rejects whitespace-only values', () => {
      const fixture = setup();
      enter(fixture, 'firstName', '   ');
      expect(errorText(fixture, 'firstName')).toBe('First name is required.');
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
    /** Programmatic control changes do not dirty an OnPush view by themselves. */
    const refresh = (fixture: ComponentFixture<ContactComponent>): void => {
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };
    const typeInto = (
      fixture: ComponentFixture<ContactComponent>,
      id: string,
      value: string,
    ): HTMLInputElement => {
      const input = field(fixture, id);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      return input;
    };
    const pasteInto = (
      fixture: ComponentFixture<ContactComponent>,
      id: string,
      pasted: string,
    ): Event => {
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => pasted } });
      field(fixture, id).dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    it.each([
      'Mira',
      "O'Connor",
      'O’Connor',
      'Anne-Marie',
      'Mary-Kate',
      'Smith-Jones',
      'Anna Maria',
      'José',
      'Мирослава',
      'Володимир',
    ])('accepts %s unchanged', (name) => {
      const fixture = setup();
      const first = typeInto(fixture, 'firstName', name);
      enter(fixture, 'firstName', name);
      enter(fixture, 'lastName', name);
      expect(first.value).toBe(name);
      expect(errorText(fixture, 'firstName')).toBeNull();
      expect(errorText(fixture, 'lastName')).toBeNull();
    });

    it('filters digits and symbols out while typing, deterministically', () => {
      const fixture = setup();
      expect(typeInto(fixture, 'firstName', 'John123').value).toBe('John');
      expect(typeInto(fixture, 'firstName', 'Mira@').value).toBe('Mira');
      expect(typeInto(fixture, 'firstName', 'John_Doe').value).toBe('JohnDoe');
      expect(typeInto(fixture, 'firstName', 'Anne-Marie').value).toBe('Anne-Marie');
      expect(typeInto(fixture, 'lastName', 'Smith_Jones.').value).toBe('SmithJones');
      expect(typeInto(fixture, 'lastName', '12345').value).toBe('');
      expect(typeInto(fixture, 'lastName', '!!!').value).toBe('');
      expect(typeInto(fixture, 'firstName', 'Мир1ос+лава').value).toBe('Мирослава');
    });

    it('keeps capitalization, spaces and both apostrophes while filtering', () => {
      const fixture = setup();
      expect(typeInto(fixture, 'firstName', "mIRa o'neil").value).toBe("mIRa o'neil");
      expect(typeInto(fixture, 'lastName', 'D’Angelo 3').value).toBe('D’Angelo ');
    });

    it('sanitizes pasted text and keeps the paste inside the 50-character limit', () => {
      const fixture = setup();
      const event = pasteInto(fixture, 'firstName', 'J0hn\n<b>Doe</b> 99 ' + 'x'.repeat(80));
      expect(event.defaultPrevented).toBe(true);
      const value = field(fixture, 'firstName').value;
      expect(value.startsWith('JhnbDoeb  x')).toBe(true);
      expect(value).toHaveLength(50);
      expect(value).not.toMatch(/[0-9<>/]/);
    });

    it('limits the physical input to 50 characters', () => {
      const fixture = setup();
      expect(field(fixture, 'firstName').getAttribute('maxlength')).toBe('50');
      expect(field(fixture, 'lastName').getAttribute('maxlength')).toBe('50');
      expect(typeInto(fixture, 'firstName', 'a'.repeat(60)).value).toHaveLength(50);
    });

    it('trims surrounding spaces when the field is left', () => {
      const fixture = setup();
      enter(fixture, 'firstName', '  Anna Maria ');
      expect(field(fixture, 'firstName').value).toBe('Anna Maria');
      expect(errorText(fixture, 'firstName')).toBeNull();
    });

    it.each(["'John", "John'", "'", '-John', 'John-', 'John--Smith', "John''Smith", 'John  Smith'])(
      'flags %s after the field is left',
      (name) => {
        const fixture = setup();
        enter(fixture, 'firstName', name);
        expect(errorText(fixture, 'firstName')).toBe(
          'Use letters only; apostrophes, hyphens and spaces are allowed.',
        );
      },
    );

    it('applies the same rules to forged / programmatic values (validator, not just the filter)', () => {
      const fixture = setup();
      const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
      for (const [key, label] of [
        ['firstName', 'First'],
        ['lastName', 'Last'],
      ]) {
        const control = form.controls[key];
        control.setValue('John123');
        control.markAsTouched();
        refresh(fixture);
        expect(errorText(fixture, key)).toBe(
          'Use letters only; apostrophes, hyphens and spaces are allowed.',
        );
        control.setValue('a'.repeat(51));
        refresh(fixture);
        expect(errorText(fixture, key)).toBe(`${label} name must be 50 characters or fewer.`);
        control.setValue('a'.repeat(50));
        refresh(fixture);
        expect(errorText(fixture, key)).toBeNull();
      }
    });
  });

  describe('phone and email', () => {
    it.each(['2795550100', '279-555-0100', '(279) 555-0100', '279 555 0100'])(
      'accepts phone %s',
      (phone) => {
        const fixture = setup();
        enter(fixture, 'phone', phone);
        expect(errorText(fixture, 'phone')).toBeNull();
      },
    );

    it.each([
      '+1 279 555 0100',
      '12795550100',
      '279555010',
      '27955501000',
      'abcdefghij',
      '279.555.0100',
    ])('rejects phone %s', (phone) => {
      const fixture = setup();
      enter(fixture, 'phone', phone);
      expect(errorText(fixture, 'phone')).toBe('Enter a valid 10-digit phone number.');
    });

    it('is a plain tel input: no live mask, 14-character physical limit', () => {
      const fixture = setup();
      const input = field(fixture, 'phone');
      expect(input.type).toBe('tel');
      expect(input.getAttribute('maxlength')).toBe('14');
      expect(input.getAttribute('placeholder')).toBe('(279) 555-0100');
      input.value = '2795550100';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(input.value).toBe('2795550100'); // never reformatted while typing
    });

    it('uses the right input types and hints', () => {
      const fixture = setup();
      expect(field(fixture, 'phone').type).toBe('tel');
      expect(field(fixture, 'email').type).toBe('email');
      expect(field(fixture, 'zip').getAttribute('inputmode')).toBe('numeric');
      expect(field(fixture, 'zip').getAttribute('autocomplete')).toBe('postal-code');
    });

    it('limits the email physically and semantically to 120 characters', () => {
      const fixture = setup();
      expect(field(fixture, 'email').getAttribute('maxlength')).toBe('120');
      const okEmail = `${'a'.repeat(108)}@example.com`;
      enter(fixture, 'email', okEmail);
      expect(okEmail).toHaveLength(120);
      expect(errorText(fixture, 'email')).toBeNull();

      const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
      form.controls['email'].setValue(`${'a'.repeat(109)}@example.com`);
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      expect(errorText(fixture, 'email')).toBe('Email must be 120 characters or fewer.');
    });

    it.each(['plain', 'a@b', 'a@@b.com', 'a b@c.com'])('rejects email %s', (email) => {
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

    it('validates the optional number of signers only when filled (1–50)', () => {
      const fixture = setup();
      enter(fixture, 'signers', '');
      expect(errorText(fixture, 'signers')).toBeNull();
      for (const bad of ['0', '00', '51', '999']) {
        enter(fixture, 'signers', bad);
        expect(errorText(fixture, 'signers')).toBe('Enter a whole number from 1 to 50.');
      }
      for (const ok of ['1', '2', '12', '50', '050', '001']) {
        enter(fixture, 'signers', ok);
        expect(errorText(fixture, 'signers')).toBeNull();
      }
    });

    it('is a numeric text field: digits only, 3 characters, no spinner', () => {
      const fixture = setup();
      const input = field(fixture, 'signers');
      expect(input.type).toBe('text');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('maxlength')).toBe('3');
      for (const [typed, kept] of [
        ['1a2.', '12'],
        ['-5', '5'],
        ['+3', '3'],
        ['1e1', '11'],
        ['4 5', '45'],
        ['1234', '123'],
        ['abc', ''],
      ]) {
        input.value = typed;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(input.value).toBe(kept);
      }
    });

    it('sanitizes a paste into Number of Signers', () => {
      const fixture = setup();
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => '1,2e5' } });
      field(fixture, 'signers').dispatchEvent(event);
      fixture.detectChanges();
      expect(event.defaultPrevented).toBe(true);
      expect(field(fixture, 'signers').value).toBe('125');
    });

    it('sends the signers count as a normalized integer', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      set(fixture, 'signers', '007');
      giveToken(fixture, 't');
      submit(fixture);
      const request = http.expectOne('/api/appointments');
      const payload = JSON.parse((request.request.body as FormData).get('payload') as string);
      expect(payload.numberOfSigners).toBe(7);
      request.flush({ success: true });
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
        preferredDate: futureWeekday(),
        timePreference: 'morning',
        specificTime: null,
        numberOfSigners: 1,
        preferredLanguage: 'English',
        additionalDetails: 'Closing at title office',
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

  it('shows neutral helper text under the consent checkbox and no error before interaction', () => {
    const fixture = setup();
    const help = fixture.nativeElement.querySelector('#consent-help') as HTMLElement;
    expect(help.textContent?.trim()).toBe(
      'Required so Mira can respond to your appointment request.',
    );
    expect(help.classList.contains('error')).toBe(false);
    expect(field(fixture, 'consent').getAttribute('aria-describedby')).toBe('consent-help');
    expect(field(fixture, 'consent').getAttribute('aria-invalid')).toBeNull();
  });

  it('turns the helper into the requirement message once the box was touched and left unchecked', () => {
    const fixture = setup();
    check(fixture, 'consent', true);
    check(fixture, 'consent', false);
    const help = fixture.nativeElement.querySelector('#consent-help') as HTMLElement;
    expect(help.textContent?.trim()).toBe(
      'Please confirm that Mira may contact you about this request.',
    );
    expect(help.classList.contains('error')).toBe(true);
    expect(field(fixture, 'consent').getAttribute('aria-invalid')).toBe('true');

    check(fixture, 'consent', true);
    expect(help.textContent?.trim()).toBe(
      'Required so Mira can respond to your appointment request.',
    );
    expect(field(fixture, 'consent').getAttribute('aria-invalid')).toBeNull();
  });

  it('shows no validation errors at all on first load (only required asterisks)', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelectorAll('.error')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('[aria-invalid="true"]')).toBeNull();
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

  const submitButton = (fixture: ComponentFixture<ContactComponent>): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  const callouts = (fixture: ComponentFixture<ContactComponent>): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.phone-callout'));

  describe('submit button rules', () => {
    it('is unavailable until the form is valid, including contact consent', () => {
      const fixture = setup();
      expect(submitButton(fixture).disabled).toBe(true);

      fillValid(fixture);
      expect(submitButton(fixture).disabled).toBe(false);

      check(fixture, 'consent', false);
      expect(submitButton(fixture).disabled).toBe(true);
      check(fixture, 'consent', true);
      expect(submitButton(fixture).disabled).toBe(false);
    });

    it('is unavailable while a required specific time is missing', () => {
      const fixture = setup();
      fillValid(fixture);
      set(fixture, 'timePreference', 'specific');
      fixture.detectChanges();
      expect(submitButton(fixture).disabled).toBe(true);
      set(fixture, 'specificTime', '14:30');
      fixture.detectChanges();
      expect(submitButton(fixture).disabled).toBe(false);
    });

    it('is not disabled merely because the date is today or a Sunday', () => {
      const fixture = setup();
      fillValid(fixture);
      for (const date of [todayInBusinessZone(), nextSundayFrom(todayInBusinessZone())]) {
        set(fixture, 'preferredDate', date);
        fixture.detectChanges();
        expect(submitButton(fixture).disabled).toBe(false);
      }
    });

    it('is disabled while sending', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');
      submit(fixture);
      expect(submitButton(fixture).disabled).toBe(true);
      http.expectOne('/api/appointments').flush({ success: true });
    });
  });

  describe('why Submit is disabled', () => {
    const reason = (fixture: ComponentFixture<ContactComponent>): string | null =>
      (
        fixture.nativeElement.querySelector('#submit-help') as HTMLElement | null
      )?.textContent?.trim() ?? null;

    it('empty form: disabled, with the combined helper (small, red, tied to the button)', () => {
      const fixture = setup();
      expect(submitButton(fixture).disabled).toBe(true);
      expect(reason(fixture)).toBe('Complete the required fields and agree to be contacted.');
      expect(submitButton(fixture).getAttribute('aria-describedby')).toBe('submit-help');
      // no field is flagged on initial load
      expect(fixture.nativeElement.querySelectorAll('.error')).toHaveLength(0);
      expect(fixture.nativeElement.querySelector('[aria-invalid="true"]')).toBeNull();
    });

    it('all fields valid but consent unchecked: disabled, consent-only helper', () => {
      const fixture = setup();
      fillValid(fixture);
      check(fixture, 'consent', false);
      expect(submitButton(fixture).disabled).toBe(true);
      expect(reason(fixture)).toBe('Please agree to be contacted before submitting.');
    });

    it('unchecking consent on an otherwise valid form disables Submit again (regression)', () => {
      const fixture = setup();
      fillValid(fixture);
      expect(submitButton(fixture).disabled).toBe(false);
      expect(reason(fixture)).toBeNull();
      expect(submitButton(fixture).getAttribute('aria-describedby')).toBeNull();

      check(fixture, 'consent', false);
      expect(submitButton(fixture).disabled).toBe(true);
      check(fixture, 'consent', true);
      expect(submitButton(fixture).disabled).toBe(false);
      check(fixture, 'consent', false);
      expect(submitButton(fixture).disabled).toBe(true);
    });

    it('consent checked but another required field invalid: disabled, fields helper', () => {
      const fixture = setup();
      fillValid(fixture);
      set(fixture, 'email', '');
      fixture.detectChanges();
      expect(submitButton(fixture).disabled).toBe(true);
      expect(reason(fixture)).toBe('Please complete the required fields correctly.');
    });

    it('fields invalid and consent unchecked together show only the combined message', () => {
      const fixture = setup();
      fillValid(fixture);
      check(fixture, 'consent', false);
      set(fixture, 'email', '');
      fixture.detectChanges();
      expect(reason(fixture)).toBe('Complete the required fields and agree to be contacted.');
      expect(fixture.nativeElement.querySelectorAll('#submit-help')).toHaveLength(1);
    });

    it('a missing/invalid Specific Time alone gives the appointment-time reason', () => {
      const fixture = setup();
      fillValid(fixture);
      set(fixture, 'timePreference', 'specific');
      fixture.detectChanges();
      expect(submitButton(fixture).disabled).toBe(true);
      expect(reason(fixture)).toBe('Please choose a valid appointment time.');
      set(fixture, 'specificTime', '21:00');
      fixture.detectChanges();
      expect(reason(fixture)).toBe('Please choose a valid appointment time.');
      set(fixture, 'specificTime', '14:00');
      fixture.detectChanges();
      expect(submitButton(fixture).disabled).toBe(false);
      expect(reason(fixture)).toBeNull();
    });

    it('a rejected photo selection blocks Submit with the photo reason until a new attempt', () => {
      const fixture = setup();
      fillValid(fixture);
      const input = field(fixture, 'photos');
      Object.defineProperty(input, 'files', {
        value: [new File([new Uint8Array(10)], 'a.pdf', { type: 'application/pdf' })],
        configurable: true,
      });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(submitButton(fixture).disabled).toBe(true);
      expect(reason(fixture)).toBe('Please fix the photo upload before submitting.');

      input.dispatchEvent(new Event('click')); // opening the picker starts a new attempt
      fixture.detectChanges();
      expect(submitButton(fixture).disabled).toBe(false);
      expect(reason(fixture)).toBeNull();
    });

    it('stays enabled for a valid same-day or Sunday request', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-05T19:00:00Z'));
      try {
        const fixture = setup();
        fillValid(fixture);
        for (const date of ['2026-10-05', '2026-10-11']) {
          set(fixture, 'preferredDate', date);
          fixture.detectChanges();
          expect(submitButton(fixture).disabled).toBe(false);
          expect(reason(fixture)).toBeNull();
        }
      } finally {
        vi.useRealTimers();
      }
    });

    it('never clickable while disabled: the helper explains instead of an error list', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      expect(submitButton(fixture).tagName).toBe('BUTTON');
      submitButton(fixture).click();
      fixture.detectChanges();
      http.expectNone('/api/appointments');
      expect(fixture.nativeElement.querySelectorAll('.error')).toHaveLength(0);
    });
  });

  describe('preferred time', () => {
    it('is a select with the five structured choices, and no free-text field', () => {
      const fixture = setup();
      const select = field(fixture, 'timePreference') as unknown as HTMLSelectElement;
      expect(select.tagName).toBe('SELECT');
      const options = Array.from(select.options).map((option) => option.textContent?.trim());
      expect(options).toEqual([
        'Select a time',
        'Morning',
        'Afternoon',
        'Evening',
        'Flexible / Any Time',
        'Specific Time',
      ]);
      expect(fixture.nativeElement.querySelector('#preferredTime')).toBeNull();
      expect(fixture.nativeElement.querySelector('input[placeholder*="Morning"]')).toBeNull();
    });

    it('shows a time input only for Specific Time', () => {
      const fixture = setup();
      expect(field(fixture, 'specificTime')).toBeNull();
      for (const value of ['morning', 'afternoon', 'evening', 'flexible']) {
        set(fixture, 'timePreference', value);
        fixture.detectChanges();
        expect(field(fixture, 'specificTime')).toBeNull();
      }
      set(fixture, 'timePreference', 'specific');
      fixture.detectChanges();
      expect(field(fixture, 'specificTime').type).toBe('time');
    });

    it('requires a specific time once Specific Time is chosen, and shows the error after blur', () => {
      const fixture = setup();
      set(fixture, 'timePreference', 'specific');
      fixture.detectChanges();
      expect(errorText(fixture, 'specificTime')).toBeNull();
      enter(fixture, 'specificTime', '');
      expect(errorText(fixture, 'specificTime')).toBe('Enter a specific time.');
      enter(fixture, 'specificTime', '14:30');
      expect(errorText(fixture, 'specificTime')).toBeNull();
    });

    it('limits the time input to standard hours and explains how to ask for another time', () => {
      const fixture = setup();
      set(fixture, 'timePreference', 'specific');
      fixture.detectChanges();
      const input = field(fixture, 'specificTime');
      expect(input.getAttribute('min')).toBe('08:30');
      expect(input.getAttribute('max')).toBe('20:30');

      const help = fixture.nativeElement.querySelector('#specificTime-help') as HTMLElement;
      expect(help.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Standard appointment hours: 8:30 AM–8:30 PM. Need another time? Call Mira to check availability.',
      );
      expect(help.classList.contains('error')).toBe(false);
      expect(help.querySelector('a')?.getAttribute('href')).toBe('tel:+12795298754');
      expect(input.getAttribute('aria-describedby')).toContain('specificTime-help');
    });

    it.each(['08:29', '20:31', '00:00', '23:59'])(
      'rejects %s: error shown and submission unavailable',
      (time) => {
        const fixture = setup();
        fillValid(fixture);
        set(fixture, 'timePreference', 'specific');
        fixture.detectChanges();
        enter(fixture, 'specificTime', time);
        expect(errorText(fixture, 'specificTime')).toBe('Choose a time between 8:30 AM–8:30 PM.');
        expect(submitButton(fixture).disabled).toBe(true);
      },
    );

    it.each(['08:30', '12:00', '14:00', '20:30'])('accepts %s', (time) => {
      const fixture = setup();
      fillValid(fixture);
      set(fixture, 'timePreference', 'specific');
      fixture.detectChanges();
      enter(fixture, 'specificTime', time);
      expect(errorText(fixture, 'specificTime')).toBeNull();
      expect(submitButton(fixture).disabled).toBe(false);
    });

    it('does not offer before/after-hours options in the selector', () => {
      const select = field(setup(), 'timePreference') as unknown as HTMLSelectElement;
      const labels = Array.from(select.options).map((option) => option.textContent ?? '');
      expect(labels.join('|')).not.toMatch(/(before|after)/i);
    });

    it('sends the structured time and clears a stale specific time when the choice changes', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      set(fixture, 'timePreference', 'specific');
      fixture.detectChanges();
      set(fixture, 'specificTime', '14:30');
      fixture.detectChanges();
      set(fixture, 'timePreference', 'evening');
      fixture.detectChanges();
      giveToken(fixture, 't');
      submit(fixture);
      const first = http.expectOne('/api/appointments');
      const payload = JSON.parse((first.request.body as FormData).get('payload') as string);
      expect(payload.timePreference).toBe('evening');
      expect(payload.specificTime).toBeNull();
      expect(payload).not.toHaveProperty('preferredTime');
      first.flush({ success: true });
    });

    it('sends a specific time as HH:mm', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      set(fixture, 'timePreference', 'specific');
      fixture.detectChanges();
      set(fixture, 'specificTime', '14:30');
      fixture.detectChanges();
      giveToken(fixture, 't');
      submit(fixture);
      const request = http.expectOne('/api/appointments');
      const payload = JSON.parse((request.request.body as FormData).get('payload') as string);
      expect(payload.timePreference).toBe('specific');
      expect(payload.specificTime).toBe('14:30');
      request.flush({ success: true });
    });
  });

  describe('same-day and Sunday (derived from the date)', () => {
    // Mon 2026-10-05 12:00 in Los Angeles. 2026-10-11 is a Sunday.
    const TODAY = '2026-10-05';
    const SUNDAY = '2026-10-11';
    const FUTURE = '2026-10-20';

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-05T19:00:00Z'));
    });
    afterEach(() => vi.useRealTimers());

    it('has no urgent checkbox anywhere and no callout for a normal future date', () => {
      const fixture = setup();
      expect(fixture.nativeElement.querySelector('#urgent')).toBeNull();
      expect(text(fixture)).not.toMatch(/Same-Day \/ Urgent Request/);
      set(fixture, 'preferredDate', FUTURE);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('input[type="checkbox"]#urgent')).toBeNull();
      expect(callouts(fixture)).toHaveLength(0);
    });

    it('shows the same-day callout for today, with a Call Mira link and no error styling', () => {
      const fixture = setup();
      set(fixture, 'preferredDate', TODAY);
      fixture.detectChanges();
      expect(callouts(fixture)).toHaveLength(1);
      const callout = callouts(fixture)[0];
      expect(callout.querySelector('.phone-callout-title')?.textContent).toBe('Same-day request');
      expect(callout.textContent).toContain(
        "You may submit your request so Mira can review the details, but submitting this form does not confirm an appointment. Please call Mira at (279) 529-8754 to confirm today's availability.",
      );
      const call = callout.querySelector('a') as HTMLAnchorElement;
      expect(call.textContent).toContain('Call Mira');
      expect(call.getAttribute('href')).toBe('tel:+12795298754');
      expect(callout.classList.contains('error')).toBe(false);
      expect(callout.getAttribute('role')).toBe('status');
      expect(fixture.nativeElement.querySelector('#urgent')).toBeNull();
    });

    it('keeps the form submittable for today and never sends an urgent field', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      set(fixture, 'preferredDate', TODAY);
      fixture.detectChanges();
      giveToken(fixture, 't');
      expect(submitButton(fixture).disabled).toBe(false);

      submit(fixture);
      const request = http.expectOne('/api/appointments');
      const payload = JSON.parse((request.request.body as FormData).get('payload') as string);
      expect(payload.preferredDate).toBe(TODAY);
      expect(payload).not.toHaveProperty('urgent');
      request.flush({ success: true, phoneConfirmationRequired: true });
    });

    it('treats the Los Angeles day as today even when UTC is already tomorrow', () => {
      vi.setSystemTime(new Date('2026-10-06T05:00:00Z'));
      const fixture = setup();
      set(fixture, 'preferredDate', TODAY);
      fixture.detectChanges();
      expect(callouts(fixture)[0]?.querySelector('.phone-callout-title')?.textContent).toBe(
        'Same-day request',
      );
    });

    it('removes the callout again when the date moves to a normal day', () => {
      const fixture = setup();
      set(fixture, 'preferredDate', TODAY);
      fixture.detectChanges();
      expect(callouts(fixture)).toHaveLength(1);
      set(fixture, 'preferredDate', FUTURE);
      fixture.detectChanges();
      expect(callouts(fixture)).toHaveLength(0);
    });

    it('keeps Sundays selectable and shows the Sunday callout without blocking submission', () => {
      const fixture = setup();
      fillValid(fixture);
      set(fixture, 'preferredDate', SUNDAY);
      fixture.detectChanges();
      expect(errorText(fixture, 'preferredDate')).toBeNull();
      expect(field(fixture, 'preferredDate').hasAttribute('disabled')).toBe(false);
      expect(callouts(fixture)).toHaveLength(1);
      const callout = callouts(fixture)[0];
      expect(callout.querySelector('.phone-callout-title')?.textContent).toBe(
        'Sunday availability',
      );
      expect(callout.textContent).toContain(
        'Sunday appointments may be available by request and must be confirmed by phone. You may submit your request for Mira to review, then call (279) 529-8754 to confirm availability.',
      );
      expect(callout.querySelector('a')?.getAttribute('href')).toBe('tel:+12795298754');
      expect(submitButton(fixture).disabled).toBe(false);
    });

    it('renders exactly ONE combined callout when today is a Sunday', () => {
      vi.setSystemTime(new Date('2026-10-11T19:00:00Z'));
      const fixture = setup();
      set(fixture, 'preferredDate', SUNDAY);
      fixture.detectChanges();
      expect(callouts(fixture)).toHaveLength(1);
      const callout = callouts(fixture)[0];
      expect(callout.querySelector('.phone-callout-title')?.textContent).toBe(
        'Same-day Sunday request',
      );
      expect(callout.textContent).toContain(
        'You may submit your request so Mira can review the details, but same-day Sunday availability must be confirmed by phone. Please call Mira at (279) 529-8754 after submitting.',
      );
    });

    it.each([
      ['today', TODAY, 'does not confirm a same-day appointment'],
      ['a Sunday', SUNDAY, 'does not confirm a Sunday appointment'],
    ])('shows the phone-confirmation success state for %s', (_name, date, phrase) => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      set(fixture, 'preferredDate', date);
      fixture.detectChanges();
      giveToken(fixture, 't');
      submit(fixture);
      http.expectOne('/api/appointments').flush({ success: true, phoneConfirmationRequired: true });
      fixture.detectChanges();

      const notice = fixture.nativeElement.querySelector('.notice') as HTMLElement;
      expect(notice.querySelector('h2')?.textContent).toBe('Request sent');
      expect(notice.textContent).toContain(phrase);
      expect(notice.textContent).toContain('(279) 529-8754');
      const call = notice.querySelector('a.btn--gold') as HTMLAnchorElement;
      expect(call.textContent).toContain('Call Mira Now');
      expect(call.getAttribute('href')).toBe('tel:+12795298754');
      expect(notice.classList.contains('error')).toBe(false);
    });

    it('shows one combined success state for today + Sunday', () => {
      vi.setSystemTime(new Date('2026-10-11T19:00:00Z'));
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      set(fixture, 'preferredDate', SUNDAY);
      fixture.detectChanges();
      giveToken(fixture, 't');
      submit(fixture);
      http.expectOne('/api/appointments').flush({ success: true, phoneConfirmationRequired: true });
      fixture.detectChanges();
      const notice = fixture.nativeElement.querySelector('.notice') as HTMLElement;
      expect(notice.querySelectorAll('h2')).toHaveLength(1);
      expect(notice.textContent).toContain('does not confirm a same-day Sunday appointment');
    });

    it('keeps the normal success state for an ordinary request', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillValid(fixture);
      giveToken(fixture, 't');
      submit(fixture);
      http
        .expectOne('/api/appointments')
        .flush({ success: true, phoneConfirmationRequired: false });
      fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('.notice h2') as HTMLElement).textContent).toBe(
        'Thank you. Your request has been sent to Mira.',
      );
    });
  });

  it('uses a 279 example phone number as the placeholder, never Mira real number', () => {
    const placeholder = field(setup(), 'phone').getAttribute('placeholder');
    expect(placeholder).toBe('(279) 555-0100');
    expect(placeholder).not.toContain('529-8754');
  });

  it('uses the approved photo helper copy', () => {
    const help = (setup().nativeElement.querySelector('#photos-help') as HTMLElement).textContent;
    expect(help?.replace(/\s+/g, ' ').trim()).toBe(
      'Add up to 5 photos that may help Mira understand your request. JPEG, PNG, WebP or HEIC, up to 5 MB each and 15 MB total.',
    );
    expect(help).not.toMatch(/\bID\b|document or location/i);
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
