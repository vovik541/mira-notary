import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TurnstileComponent } from '../../shared/components/turnstile/turnstile.component';
import { todayInBusinessZone } from '../../../shared/appointment-timing';
import { ContactComponent } from './contact.component';

interface Internals {
  step: () => 1 | 2 | 3;
}

const inst = (fixture: ComponentFixture<ContactComponent>): Internals =>
  fixture.componentInstance as unknown as Internals;
const stepOf = (fixture: ComponentFixture<ContactComponent>): number => inst(fixture).step();

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
  document.body.appendChild(fixture.nativeElement);
  return fixture;
}

/** A fresh component instance in the same TestBed, like a page reload (storage persists). */
function reload(): ComponentFixture<ContactComponent> {
  document.body.replaceChildren();
  const fixture = TestBed.createComponent(ContactComponent);
  fixture.detectChanges();
  document.body.appendChild(fixture.nativeElement);
  return fixture;
}

const el = (fixture: ComponentFixture<ContactComponent>, id: string): HTMLInputElement =>
  fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;

const set = (fixture: ComponentFixture<ContactComponent>, id: string, value: string): void => {
  const control = el(fixture, id);
  control.dispatchEvent(new Event('focus'));
  control.dispatchEvent(new Event('beforeinput'));
  control.value = value;
  control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input'));
  fixture.detectChanges();
};

const check = (fixture: ComponentFixture<ContactComponent>, id: string, on: boolean): void => {
  const box = el(fixture, id);
  box.checked = on;
  box.dispatchEvent(new Event('change'));
  fixture.detectChanges();
};

const click = (fixture: ComponentFixture<ContactComponent>, selector: string): void => {
  (fixture.nativeElement.querySelector(selector) as HTMLElement).click();
  fixture.detectChanges();
};

const visibleStep = (fixture: ComponentFixture<ContactComponent>): number[] =>
  Array.from(fixture.nativeElement.querySelectorAll('form > .step') as NodeListOf<HTMLElement>)
    .map((node, index) => (node.hidden ? 0 : index + 1))
    .filter((n) => n > 0);

const continueButton = (fixture: ComponentFixture<ContactComponent>): HTMLButtonElement => {
  const current = fixture.nativeElement.querySelectorAll('form > .step')[
    stepOf(fixture) - 1
  ] as HTMLElement;
  return Array.from(current.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === 'Continue',
  ) as HTMLButtonElement;
};

const tick = (ms = 40): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let weekday = '';
const futureWeekday = (): string => {
  if (weekday) {
    return weekday;
  }
  const [y, m, d] = todayInBusinessZone().split('-').map(Number);
  let date = new Date(Date.UTC(y, m - 1, d + 9));
  while (date.getUTCDay() === 0) {
    date = new Date(date.getTime() + 86_400_000);
  }
  weekday = date.toISOString().slice(0, 10);
  return weekday;
};

const fillStep1 = (fixture: ComponentFixture<ContactComponent>): void => {
  set(fixture, 'service', 'Loan Signing');
  set(fixture, 'zip', '95814');
  set(fixture, 'preferredDate', futureWeekday());
  set(fixture, 'timePreference', 'afternoon');
  set(fixture, 'signers', '2');
};
const fillStep2 = (fixture: ComponentFixture<ContactComponent>): void => {
  set(fixture, 'firstName', 'Jane');
  set(fixture, 'lastName', 'Doe');
  set(fixture, 'phone', '9165550100');
  set(fixture, 'email', 'jane.doe@example.com');
  set(fixture, 'language', 'Ukrainian');
};

describe('ContactComponent wizard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    history.replaceState(null, '');
  });
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('structure', () => {
    it('is ONE form with three steps, starting on step 1 with the right heading', () => {
      const fixture = setup();
      expect(fixture.nativeElement.querySelectorAll('form')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('form > .step')).toHaveLength(3);
      expect(stepOf(fixture)).toBe(1);
      expect(visibleStep(fixture)).toEqual([1]);
      expect(fixture.nativeElement.querySelector('.step-count').textContent).toBe('Step 1 of 3');
      expect(fixture.nativeElement.querySelector('.step-title').textContent).toBe(
        'Appointment Details',
      );
      expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Request an Appointment');
    });

    it('puts each field on its step', () => {
      const fixture = setup();
      const stepOfField = (id: string): number =>
        Array.from(
          fixture.nativeElement.querySelectorAll('form > .step') as NodeListOf<HTMLElement>,
        ).findIndex((node) => node.querySelector(`#${id}`) !== null) + 1;
      for (const id of ['service', 'zip', 'preferredDate', 'timePreference', 'signers']) {
        expect(stepOfField(id)).toBe(1);
      }
      for (const id of ['firstName', 'lastName', 'phone', 'email', 'language']) {
        expect(stepOfField(id)).toBe(2);
      }
      for (const id of ['details', 'photos', 'consent']) {
        expect(stepOfField(id)).toBe(3);
      }
    });

    it('marks the current step with aria-current and shows done / current / upcoming', () => {
      const fixture = setup();
      const items = () =>
        Array.from(
          fixture.nativeElement.querySelectorAll('.wizard-progress li') as NodeListOf<HTMLElement>,
        );
      expect(items().map((li) => li.getAttribute('aria-current'))).toEqual(['step', null, null]);
      expect(items()[0].classList.contains('current')).toBe(true);

      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(items().map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null]);
      expect(items()[0].classList.contains('done')).toBe(true);
      expect(items()[2].classList.contains('done')).toBe(false);
      expect(items().map((li) => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        expect.stringContaining('Appointment'),
        expect.stringContaining('Your Information'),
        expect.stringContaining('Details'),
      ]);
    });

    it('keeps the direct-contact panel next to the form', () => {
      expect(setup().nativeElement.querySelector('aside.side app-contact-card')).not.toBeNull();
    });

    it('Continue / Back are real, non-submitting buttons; only the final one submits', () => {
      const fixture = setup();
      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll('form button') as NodeListOf<HTMLButtonElement>,
      );
      const submitters = buttons.filter((button) => button.type === 'submit');
      expect(submitters).toHaveLength(1);
      expect(submitters[0].textContent?.trim()).toBe('Request Appointment');
      for (const button of buttons.filter((b) =>
        ['Continue', 'Back'].includes(b.textContent?.trim() ?? ''),
      )) {
        expect(button.type).toBe('button');
      }
    });

    it('shows the submit-disabled helper only on the final step', () => {
      const fixture = setup();
      const help = fixture.nativeElement.querySelector('#submit-help') as HTMLElement;
      expect(help.closest('.step')?.hasAttribute('hidden')).toBe(true);
      (fixture.componentInstance as unknown as { step: { set(n: number): void } }).step.set(3);
      fixture.detectChanges();
      expect(help.closest('.step')?.hasAttribute('hidden')).toBe(false);
      expect(help.textContent).toContain('Complete the required fields');
    });
  });

  describe('Continue validation', () => {
    it('stays on step 1 when invalid, touches only step 1, focuses the first problem', () => {
      const fixture = setup();
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(stepOf(fixture)).toBe(1);
      expect(el(fixture, 'zip').getAttribute('aria-invalid')).toBe('true');
      expect(el(fixture, 'preferredDate').getAttribute('aria-invalid')).toBe('true');
      expect(el(fixture, 'timePreference').getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(el(fixture, 'zip'));
      // later steps untouched
      for (const id of ['firstName', 'lastName', 'phone', 'email']) {
        expect(el(fixture, id).getAttribute('aria-invalid')).toBeNull();
        expect(fixture.nativeElement.querySelector(`#${id}-error`)).toBeNull();
      }
      expect(fixture.nativeElement.querySelector('#consent-help.error')).toBeNull();
    });

    it('moves to step 2 once step 1 is valid (signers optional)', () => {
      const fixture = setup();
      set(fixture, 'zip', '95814');
      set(fixture, 'preferredDate', futureWeekday());
      set(fixture, 'timePreference', 'morning');
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(stepOf(fixture)).toBe(2);
      expect(visibleStep(fixture)).toEqual([2]);
      expect(fixture.nativeElement.querySelector('.step-count').textContent).toBe('Step 2 of 3');
      expect(fixture.nativeElement.querySelector('.step-title').textContent).toBe(
        'Your Information',
      );
    });

    it('a populated Number of Signers must stay valid to continue', () => {
      const fixture = setup();
      fillStep1(fixture);
      set(fixture, 'signers', '99');
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(stepOf(fixture)).toBe(1);
      expect(document.activeElement).toBe(el(fixture, 'signers'));
    });

    it('requires a valid Specific Time on step 1 when that option is chosen', () => {
      const fixture = setup();
      fillStep1(fixture);
      set(fixture, 'timePreference', 'specific');
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(stepOf(fixture)).toBe(1);
      expect(document.activeElement).toBe(el(fixture, 'specificTime'));
      set(fixture, 'specificTime', '14:30');
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(stepOf(fixture)).toBe(2);
    });

    it.each(['07:30', '20:30', '23:00'])(
      'lets an out-of-hours specific time (%s) continue, with its amber note on step 1',
      (time) => {
        const fixture = setup();
        fillStep1(fixture);
        set(fixture, 'timePreference', 'specific');
        set(fixture, 'specificTime', time);
        expect(
          fixture.nativeElement.querySelector('form > .step:nth-of-type(1) #time-note'),
        ).not.toBeNull();
        expect(el(fixture, 'specificTime').getAttribute('aria-invalid')).toBeNull();
        click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
        expect(stepOf(fixture)).toBe(2);
      },
    );

    it('keeps an empty specific time blocking Continue (red error)', () => {
      const fixture = setup();
      fillStep1(fixture);
      set(fixture, 'timePreference', 'specific');
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(stepOf(fixture)).toBe(1);
      expect(el(fixture, 'specificTime').getAttribute('aria-invalid')).toBe('true');
    });

    it('lets a ZIP outside the standard service area continue, with its note on step 1', () => {
      const fixture = setup();
      fillStep1(fixture);
      set(fixture, 'zip', '90210');
      expect(
        fixture.nativeElement.querySelector('form > .step:nth-of-type(1) #zip-note'),
      ).not.toBeNull();
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(stepOf(fixture)).toBe(2);
    });

    it('lets same-day and Sunday requests continue, with their callout on step 1', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-05T19:00:00Z'));
      try {
        const fixture = setup();
        fillStep1(fixture);
        set(fixture, 'preferredDate', '2026-10-05');
        expect(
          fixture.nativeElement.querySelector('form > .step:nth-of-type(1) #phone-notice'),
        ).not.toBeNull();
        click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
        expect(stepOf(fixture)).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('step 2: names, phone and email gate Continue with the existing rules', () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      expect(stepOf(fixture)).toBe(2);
      expect(document.activeElement).toBe(el(fixture, 'firstName'));
      expect(el(fixture, 'email').getAttribute('aria-invalid')).toBe('true');
      // step 3 untouched
      expect(el(fixture, 'consent').getAttribute('aria-invalid')).toBeNull();

      set(fixture, 'firstName', 'Jane');
      set(fixture, 'lastName', 'Doe');
      set(fixture, 'phone', '916555010'); // 9 digits
      set(fixture, 'email', 'jane@example.com');
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      expect(stepOf(fixture)).toBe(2);
      expect(document.activeElement).toBe(el(fixture, 'phone'));

      set(fixture, 'phone', '9165550100');
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      expect(stepOf(fixture)).toBe(3);
      expect(fixture.nativeElement.querySelector('.step-title').textContent).toBe(
        'Request Details',
      );
    });

    it('Continue never sends the request', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      http.expectNone('/api/appointments');
    });

    it('pressing Enter in a field on steps 1–2 acts as Continue and is not left to the browser', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      const press = (id: string): boolean => {
        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        });
        el(fixture, id).dispatchEvent(event);
        fixture.detectChanges();
        return event.defaultPrevented;
      };
      expect(press('zip')).toBe(true); // invalid step 1: stays
      expect(stepOf(fixture)).toBe(1);
      fillStep1(fixture);
      expect(press('zip')).toBe(true);
      expect(stepOf(fixture)).toBe(2);
      fillStep2(fixture);
      expect(press('lastName')).toBe(true);
      expect(stepOf(fixture)).toBe(3);
      expect(press('consent')).toBe(false); // step 3: default behaviour untouched
      http.expectNone('/api/appointments');
    });

    it('Enter on step 1 or 2 acts as Continue (when valid) and never submits the request', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      const enter = (): void => {
        (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
          new Event('submit'),
        );
        fixture.detectChanges();
      };
      enter(); // invalid step 1: stays
      expect(stepOf(fixture)).toBe(1);
      fillStep1(fixture);
      enter();
      expect(stepOf(fixture)).toBe(2);
      fillStep2(fixture);
      enter();
      expect(stepOf(fixture)).toBe(3);
      http.expectNone('/api/appointments');
    });
  });

  describe('step-level "Please complete / fix" summary', () => {
    const summary = (fixture: ComponentFixture<ContactComponent>, step: 1 | 2): string | null =>
      (
        fixture.nativeElement.querySelector(
          `#step-${step}-validation-summary`,
        ) as HTMLElement | null
      )?.textContent?.trim() ?? null;
    const goStep2 = (fixture: ComponentFixture<ContactComponent>): void => {
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
    };
    const goNext = (fixture: ComponentFixture<ContactComponent>, step: 1 | 2): void =>
      click(fixture, `form > .step:nth-of-type(${step}) .wizard-actions .btn--gold`);

    describe('Number of Signers label', () => {
      it('is marked optional, without an asterisk, and stays optional', () => {
        const fixture = setup();
        const label = fixture.nativeElement.querySelector('label[for="signers"]') as HTMLElement;
        expect(label.textContent?.replace(/\s+/g, ' ').trim()).toBe('Number of Signers (optional)');
        expect(label.querySelector('.optional')?.textContent).toBe('(optional)');
        expect(label.textContent).not.toContain('*');
        expect(label.querySelector('[aria-hidden="true"]')).toBeNull();
      });
    });

    describe('step 1', () => {
      it('is visible before any interaction, lists only the missing REQUIRED fields, and flags nothing red', () => {
        const fixture = setup();
        expect(summary(fixture, 1)).toBe(
          'Please complete: ZIP Code, Preferred Date, Preferred Time.',
        );
        expect(summary(fixture, 1)).not.toContain('Number of Signers');
        expect(summary(fixture, 1)).not.toContain('Specific Time');
        // the fields themselves stay neutral until touched / Continue
        expect(fixture.nativeElement.querySelectorAll('.error')).toHaveLength(0);
        expect(fixture.nativeElement.querySelector('[aria-invalid="true"]')).toBeNull();
      });

      it('is small red helper text right under Continue, tied to the button', () => {
        const fixture = setup();
        const element = fixture.nativeElement.querySelector(
          '#step-1-validation-summary',
        ) as HTMLElement;
        expect(element.classList.contains('step-validation-summary')).toBe(true);
        expect(element.previousElementSibling?.classList.contains('wizard-actions')).toBe(true);
        expect(element.getAttribute('aria-live')).toBeNull(); // no noisy live region
        expect(continueButton(fixture).getAttribute('aria-describedby')).toBe(
          'step-1-validation-summary',
        );
      });

      it('shrinks as fields become valid and disappears completely when the step is valid', () => {
        const fixture = setup();
        set(fixture, 'zip', '95814');
        expect(summary(fixture, 1)).toBe('Please complete: Preferred Date, Preferred Time.');
        set(fixture, 'preferredDate', futureWeekday());
        expect(summary(fixture, 1)).toBe('Please complete: Preferred Time.');
        set(fixture, 'timePreference', 'morning');
        expect(summary(fixture, 1)).toBeNull();
        expect(fixture.nativeElement.querySelector('#step-1-validation-summary')).toBeNull();
        expect(continueButton(fixture).hasAttribute('aria-describedby')).toBe(false);
        expect(fixture.nativeElement.textContent).not.toContain('All fields complete');
      });

      it('names a malformed ZIP as something to fix, and mixes missing + invalid in one sentence', () => {
        const fixture = setup();
        set(fixture, 'zip', '9581');
        set(fixture, 'timePreference', 'morning');
        expect(summary(fixture, 1)).toBe('Please complete or fix: ZIP Code, Preferred Date.');
        set(fixture, 'preferredDate', futureWeekday());
        expect(summary(fixture, 1)).toBe('Please fix: ZIP Code.');
        set(fixture, 'zip', '95814');
        expect(summary(fixture, 1)).toBeNull();
      });

      it('does NOT list a well-formed ZIP outside the standard service area', () => {
        const fixture = setup();
        fillStep1(fixture);
        set(fixture, 'zip', '90210');
        expect(summary(fixture, 1)).toBeNull();
        expect(fixture.nativeElement.querySelector('#zip-note')).not.toBeNull();
        click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
        expect(stepOf(fixture)).toBe(2);
      });

      it('lists Specific Time only while it is selected and missing', () => {
        const fixture = setup();
        fillStep1(fixture);
        expect(summary(fixture, 1)).toBeNull();
        set(fixture, 'timePreference', 'specific');
        expect(summary(fixture, 1)).toBe('Please complete: Specific Time.');
        set(fixture, 'specificTime', '14:30');
        expect(summary(fixture, 1)).toBeNull();
        set(fixture, 'timePreference', 'morning');
        expect(summary(fixture, 1)).toBeNull();
      });

      it.each(['07:30', '20:30', '23:00'])(
        'does NOT list a valid out-of-hours specific time (%s): amber note only',
        (time) => {
          const fixture = setup();
          fillStep1(fixture);
          set(fixture, 'timePreference', 'specific');
          set(fixture, 'specificTime', time);
          expect(summary(fixture, 1)).toBeNull();
          expect(fixture.nativeElement.querySelector('#time-note')).not.toBeNull();
        },
      );

      it('mentions Number of Signers only when it was filled in wrongly — never as missing', () => {
        const fixture = setup();
        fillStep1(fixture);
        set(fixture, 'signers', '');
        expect(summary(fixture, 1)).toBeNull();
        set(fixture, 'signers', '99');
        expect(summary(fixture, 1)).toBe('Please fix: Number of Signers.');
        set(fixture, 'signers', '12');
        expect(summary(fixture, 1)).toBeNull();
      });

      it('lists Service Needed if it somehow becomes empty', () => {
        const fixture = setup();
        fillStep1(fixture);
        const form = (
          fixture.componentInstance as unknown as {
            form: { controls: Record<string, { setValue(v: string): void }> };
          }
        ).form;
        form.controls['service'].setValue('');
        fixture.detectChanges();
        expect(summary(fixture, 1)).toBe('Please complete: Service Needed.');
      });
    });

    describe('Continue is the single, consistent gate', () => {
      it('stays clickable; when invalid it does not advance, touches only this step, focuses the first problem', () => {
        const fixture = setup();
        expect(continueButton(fixture).disabled).toBe(false);
        goNext(fixture, 1);
        expect(stepOf(fixture)).toBe(1);
        expect(el(fixture, 'zip').getAttribute('aria-invalid')).toBe('true');
        expect(document.activeElement).toBe(el(fixture, 'zip'));
        expect(fixture.nativeElement.querySelector('#firstName-error')).toBeNull();
        expect(summary(fixture, 1)).toBe(
          'Please complete: ZIP Code, Preferred Date, Preferred Time.',
        );
      });

      it('advances exactly when the summary is gone', () => {
        const fixture = setup();
        fillStep1(fixture);
        expect(summary(fixture, 1)).toBeNull();
        goNext(fixture, 1);
        expect(stepOf(fixture)).toBe(2);
      });

      it('never submits the request', () => {
        const fixture = setup();
        const http = TestBed.inject(HttpTestingController);
        goNext(fixture, 1);
        fillStep1(fixture);
        goNext(fixture, 1);
        goNext(fixture, 2);
        http.expectNone('/api/appointments');
      });
    });

    describe('step 2', () => {
      it('starts as a complete-list of the required fields (language is not required)', () => {
        const fixture = setup();
        goStep2(fixture);
        expect(summary(fixture, 2)).toBe(
          'Please complete: First Name, Last Name, Phone Number, Email.',
        );
        expect(summary(fixture, 2)).not.toContain('Language');
        expect(fixture.nativeElement.querySelector('#firstName-error')).toBeNull();
        expect(continueButton(fixture).getAttribute('aria-describedby')).toBe(
          'step-2-validation-summary',
        );
      });

      it('drops each field as it becomes valid and hides the summary at the end', () => {
        const fixture = setup();
        goStep2(fixture);
        set(fixture, 'firstName', 'Jane');
        expect(summary(fixture, 2)).toBe('Please complete: Last Name, Phone Number, Email.');
        set(fixture, 'lastName', 'Doe');
        expect(summary(fixture, 2)).toBe('Please complete: Phone Number, Email.');
        set(fixture, 'phone', '9165550100');
        expect(summary(fixture, 2)).toBe('Please complete: Email.');
        set(fixture, 'email', 'jane@example.com');
        expect(summary(fixture, 2)).toBeNull();
        expect(fixture.nativeElement.querySelector('#step-2-validation-summary')).toBeNull();
      });

      it('shows malformed phone / email as "fix" and mixes missing with invalid', () => {
        const fixture = setup();
        goStep2(fixture);
        set(fixture, 'firstName', 'Jane');
        set(fixture, 'lastName', 'Doe');
        set(fixture, 'phone', '916555010'); // 9 digits
        set(fixture, 'email', 'broken');
        expect(summary(fixture, 2)).toBe('Please fix: Phone Number, Email.');
        set(fixture, 'phone', '9165550100');
        expect(summary(fixture, 2)).toBe('Please fix: Email.');
        set(fixture, 'email', '');
        set(fixture, 'phone', '916555010');
        expect(summary(fixture, 2)).toBe('Please complete or fix: Phone Number, Email.');
      });

      it('Continue on an invalid step 2 stays, touches only step 2, focuses the first problem', () => {
        const fixture = setup();
        goStep2(fixture);
        goNext(fixture, 2);
        expect(stepOf(fixture)).toBe(2);
        expect(document.activeElement).toBe(el(fixture, 'firstName'));
        expect(el(fixture, 'email').getAttribute('aria-invalid')).toBe('true');
        expect(el(fixture, 'consent').getAttribute('aria-invalid')).toBeNull();
      });

      it('has no step summary on the final step (it keeps its own submit helper)', () => {
        const fixture = setup();
        goStep2(fixture);
        fillStep2(fixture);
        goNext(fixture, 2);
        expect(stepOf(fixture)).toBe(3);
        expect(
          fixture.nativeElement.querySelector(
            'form > .step:nth-of-type(3) .step-validation-summary',
          ),
        ).toBeNull();
        expect(fixture.nativeElement.querySelector('#submit-help')).not.toBeNull();
      });
    });
  });

  describe('Back', () => {
    it('keeps every entered value (steps 1 ↔ 2 ↔ 3), without revalidating or touching', async () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      set(fixture, 'details', 'Some details');
      expect(stepOf(fixture)).toBe(3);

      click(fixture, 'form > .step:nth-of-type(3) .wizard-actions .btn--outline');
      await tick();
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(2);
      expect(el(fixture, 'firstName').value).toBe('Jane');
      expect(el(fixture, 'phone').value).toBe('(916) 555-0100');
      expect(el(fixture, 'email').value).toBe('jane.doe@example.com');
      expect(el(fixture, 'language').value).toBe('Ukrainian');

      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--outline');
      await tick();
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(1);
      expect(el(fixture, 'service').value).toBe('Loan Signing');
      expect(el(fixture, 'zip').value).toBe('95814');
      expect(el(fixture, 'preferredDate').value).toBe(futureWeekday());
      expect(el(fixture, 'timePreference').value).toBe('afternoon');
      expect(el(fixture, 'signers').value).toBe('2');
      // going back marks nothing invalid
      expect(fixture.nativeElement.querySelectorAll('.error')).toHaveLength(0);

      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      expect(el(fixture, 'details').value).toBe('Some details');
    });

    it('keeps selected photos across Step 3 → Back → Step 3', async () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      const input = el(fixture, 'photos');
      Object.defineProperty(input, 'files', {
        value: [new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' })],
        configurable: true,
      });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.photo-list li')).toHaveLength(1);

      click(fixture, 'form > .step:nth-of-type(3) .wizard-actions .btn--outline');
      await tick();
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      expect(stepOf(fixture)).toBe(3);
      expect(fixture.nativeElement.querySelectorAll('.photo-list li')).toHaveLength(1);
    });

    it('moves focus to the step heading after Continue and Back', async () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.step-title'));
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--outline');
      await tick();
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.step-title'));
    });
  });

  describe('browser history', () => {
    it('records the step in history.state and never touches the URL', () => {
      const fixture = setup();
      const url = location.href;
      expect((history.state as Record<string, unknown>)['wizardStep']).toBe(1);
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      expect((history.state as Record<string, unknown>)['wizardStep']).toBe(2);
      expect(location.href).toBe(url);
      expect(location.search).toBe('');
      expect(location.hash).toBe('');
    });

    it('browser Back goes 3 → 2 → 1 and Forward returns, keeping the values', async () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      expect(stepOf(fixture)).toBe(3);

      history.back();
      await tick();
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(2);
      history.back();
      await tick();
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(1);
      expect(el(fixture, 'zip').value).toBe('95814');

      history.forward();
      await tick();
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(2);
      history.forward();
      await tick();
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(3);
      expect(el(fixture, 'email').value).toBe('jane.doe@example.com');
    });

    it('never grows the history by following Back / Forward (no pushState loop)', async () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      const length = history.length;
      history.back();
      await tick();
      history.forward();
      await tick();
      history.back();
      await tick();
      expect(history.length).toBe(length);
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(1);
    });

    it('does not trap the user on step 1: Back from step 1 is a normal browser navigation', async () => {
      const fixture = setup();
      const before = history.length;
      expect(stepOf(fixture)).toBe(1);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button'); // invalid: stays, no push
      expect(history.length).toBe(before);
      const stateBefore = history.state;
      expect(stateBefore['wizardStep']).toBe(1);
    });

    it('clamps Forward to the earliest invalid step', async () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      history.back();
      await tick();
      history.back();
      await tick();
      set(fixture, 'zip', ''); // step 1 is now invalid
      history.forward();
      await tick();
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(1);
    });
  });

  describe('final step summary', () => {
    it('shows service, date · time and ZIP — and no personal data', () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      set(fixture, 'details', 'Very private details');
      const summary = (fixture.nativeElement.querySelector('.summary') as HTMLElement)
        .textContent as string;
      expect(summary).toContain('Loan Signing');
      expect(summary).toContain('Afternoon');
      expect(summary).toContain('ZIP 95814');
      expect(summary).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4} · Afternoon/);
      for (const personal of ['Jane', 'Doe', '555-0100', 'jane.doe', 'private']) {
        expect(summary).not.toContain(personal);
      }
      expect(summary).not.toContain('Outside standard service area');
    });

    it('shows a specific time as clock time, and flags an outside-area ZIP', () => {
      const fixture = setup();
      fillStep1(fixture);
      set(fixture, 'timePreference', 'specific');
      set(fixture, 'specificTime', '14:30');
      set(fixture, 'zip', '90210');
      const summary = (fixture.nativeElement.querySelector('.summary') as HTMLElement)
        .textContent as string;
      expect(summary).toContain('· 2:30 PM');
      expect(summary).toContain('Outside standard service area');
    });

    it('"Edit appointment details" returns to step 1 with everything intact', () => {
      const fixture = setup();
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      click(fixture, '.summary .link-button');
      expect(stepOf(fixture)).toBe(1);
      expect(el(fixture, 'zip').value).toBe('95814');
      expect(el(fixture, 'firstName').value).toBe('Jane');
    });
  });

  describe('final submit', () => {
    it('uses the existing request service, once, from step 3', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      check(fixture, 'consent', true);
      fixture.debugElement
        .query(By.directive(TurnstileComponent))
        .componentInstance.token.emit('t');
      fixture.detectChanges();

      (el(fixture, 'details').closest('form') as HTMLFormElement).dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();
      const request = http.expectOne('/api/appointments');
      const payload = JSON.parse((request.request.body as FormData).get('payload') as string);
      expect(payload.service).toBe('Loan Signing');
      expect(payload.firstName).toBe('Jane');
      expect(payload.phone).toBe('9165550100');
      expect(payload.contactConsent).toBe(true);
      request.flush({ success: true });
    });

    it('sends the user back to the earliest invalid step if something upstream went stale', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      check(fixture, 'consent', true);
      set(fixture, 'email', 'broken'); // programmatic / stale change to an earlier step
      (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(2);
      expect(el(fixture, 'email').getAttribute('aria-invalid')).toBe('true');
      http.expectNone('/api/appointments');
    });
  });

  describe('no persistence (privacy)', () => {
    const fillEverything = (fixture: ComponentFixture<ContactComponent>): void => {
      fillStep1(fixture);
      click(fixture, 'form > .step:nth-of-type(1) .wizard-actions button');
      fillStep2(fixture);
      click(fixture, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
      set(fixture, 'details', 'Closing documents for Maple Street');
      check(fixture, 'consent', true);
    };

    it('a newly created component starts fresh: step 1, empty, no consent, no photos, no token', async () => {
      const first = setup();
      fillEverything(first);
      const input = el(first, 'photos');
      Object.defineProperty(input, 'files', {
        value: [new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' })],
        configurable: true,
      });
      input.dispatchEvent(new Event('change'));
      first.detectChanges();
      await tick(450); // longer than any debounce a persistence layer could have used
      expect(stepOf(first)).toBe(3);
      first.destroy();

      const reloaded = reload();
      await tick(60);
      reloaded.detectChanges();
      expect(stepOf(reloaded)).toBe(1);
      expect(visibleStep(reloaded)).toEqual([1]);
      for (const id of [
        'zip',
        'preferredDate',
        'timePreference',
        'signers',
        'firstName',
        'lastName',
        'phone',
        'email',
        'details',
      ]) {
        expect(el(reloaded, id).value).toBe('');
      }
      expect(el(reloaded, 'service').value).toBe('General Notary');
      expect(el(reloaded, 'language').value).toBe('English');
      expect(el(reloaded, 'consent').checked).toBe(false);
      expect(reloaded.nativeElement.querySelectorAll('.photo-list li')).toHaveLength(0);
      expect(
        (reloaded.componentInstance as unknown as { turnstileToken: string | null }).turnstileToken,
      ).toBeNull();
      // and no restore messages exist any more
      expect(reloaded.nativeElement.textContent).not.toMatch(
        /draft was restored|not saved after a page refresh/i,
      );
      expect(reloaded.nativeElement.querySelector('.draft-note, #photos-note')).toBeNull();
      // the (reloaded) history entry says step 1, nothing else
      expect(history.state).toEqual({ wizardStep: 1 });
    });

    it('writes nothing to sessionStorage, localStorage or cookies while the form is used', async () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const fixture = setup();
      fillEverything(fixture);
      click(fixture, 'form > .step:nth-of-type(3) .wizard-actions .btn--outline');
      await tick();
      await tick(450);

      expect(setItem).not.toHaveBeenCalled();
      expect(sessionStorage.length).toBe(0);
      expect(localStorage.length).toBe(0);
      expect(document.cookie).toBe('');
      const idb = (globalThis as { indexedDB?: unknown }).indexedDB;
      expect(idb === undefined || idb === null).toBe(true);
    });

    it('keeps only the step number in history.state and no personal data in the URL', async () => {
      const fixture = setup();
      fillEverything(fixture);
      expect(history.state).toEqual({ wizardStep: 3 });
      click(fixture, 'form > .step:nth-of-type(3) .wizard-actions .btn--outline');
      await tick();
      expect(history.state).toEqual({ wizardStep: 2 });
      const url = location.href;
      for (const personal of [
        'Jane',
        'Doe',
        '555',
        'jane.doe',
        'example.com',
        'Maple',
        '95814',
        'Loan',
      ]) {
        expect(url).not.toContain(personal);
        expect(JSON.stringify(history.state)).not.toContain(personal);
      }
      expect(location.search).toBe('');
      expect(location.hash).toBe('');
    });

    it('still lets ?service= and ?zip= prefill step 1', () => {
      const fixture = setup({ service: 'california-apostille', zip: '95814' });
      expect(stepOf(fixture)).toBe(1);
      expect(el(fixture, 'service').value).toBe('California Apostille');
      expect(el(fixture, 'zip').value).toBe('95814');
      expect(fixture.nativeElement.querySelectorAll('.error')).toHaveLength(0);
    });

    it('ignores a malformed ?zip= and an unknown ?service=', () => {
      const fixture = setup({ service: 'nope', zip: '9581' });
      expect(el(fixture, 'service').value).toBe('General Notary');
      expect(el(fixture, 'zip').value).toBe('');
    });

    it('after a successful submission the form is empty, on step 1, with no leftovers', () => {
      const fixture = setup();
      const http = TestBed.inject(HttpTestingController);
      fillEverything(fixture);
      fixture.debugElement
        .query(By.directive(TurnstileComponent))
        .componentInstance.token.emit('t');
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit'),
      );
      fixture.detectChanges();
      http.expectOne('/api/appointments').flush({ success: true });
      fixture.detectChanges();
      expect(stepOf(fixture)).toBe(1);
      expect(history.state).toEqual({ wizardStep: 1 });
      expect(sessionStorage.length).toBe(0);
      expect(localStorage.length).toBe(0);
      click(fixture, '.notice button');
      expect(el(fixture, 'firstName').value).toBe('');
      expect(el(fixture, 'consent').checked).toBe(false);
    });
  });
});
