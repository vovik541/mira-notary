import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TurnstileComponent } from '../../shared/components/turnstile/turnstile.component';
import { ContactComponent, notInPastValidator } from './contact.component';

function setup(query: Record<string, string> = {}): ComponentFixture<ContactComponent> {
  TestBed.configureTestingModule({
    imports: [ContactComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
      },
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

const submit = (fixture: ComponentFixture<ContactComponent>): void => {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  fixture.detectChanges();
};

const fillValid = (fixture: ComponentFixture<ContactComponent>): void => {
  set(fixture, 'fullName', 'Jane Doe');
  set(fixture, 'phone', '(916) 555-0100');
  set(fixture, 'service', 'Loan Signing');
  set(fixture, 'location', '95814');
  set(fixture, 'preferredDate', '2999-01-01');
  set(fixture, 'preferredTime', 'Morning');
  fixture.detectChanges();
};

const giveToken = (fixture: ComponentFixture<ContactComponent>, token: string | null): void => {
  fixture.debugElement.query(By.directive(TurnstileComponent)).componentInstance.token.emit(token);
  fixture.detectChanges();
};

const text = (fixture: ComponentFixture<ContactComponent>): string =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('ContactComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows accessible errors and sends nothing when required fields are empty', () => {
    const fixture = setup();
    submit(fixture);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelectorAll('.error[role="alert"]').length).toBeGreaterThanOrEqual(6);
    expect(field(fixture, 'fullName').getAttribute('aria-invalid')).toBe('true');
    expect(text(fixture)).toContain('Please check the form and try again.');
    TestBed.inject(HttpTestingController).expectNone('/api/appointments');
  });

  it('prefills the location from a valid ?zip= query param and ignores junk', () => {
    expect(field(setup({ zip: '95814' }), 'location').value).toBe('95814');
    TestBed.resetTestingModule();
    expect(field(setup({ zip: '<script>' }), 'location').value).toBe('');
  });

  it('requires the Turnstile check before sending', () => {
    const fixture = setup();
    fillValid(fixture);
    submit(fixture);
    expect(text(fixture)).toContain('Please complete the verification check');
    TestBed.inject(HttpTestingController).expectNone('/api/appointments');
  });

  it('sends a mapped payload, shows the sending state and prevents double submit', () => {
    const fixture = setup();
    const http = TestBed.inject(HttpTestingController);
    fillValid(fixture);
    set(fixture, 'details', 'Closing at title office');
    giveToken(fixture, 'turnstile-token');

    submit(fixture);
    submit(fixture); // second click while the first request is in flight

    const request = http.expectOne('/api/appointments');
    expect(request.request.body).toEqual({
      fullName: 'Jane Doe',
      phone: '(916) 555-0100',
      service: 'Loan Signing',
      locationZip: '95814',
      preferredDate: '2999-01-01',
      preferredTime: 'Morning',
      preferredLanguage: 'English',
      additionalDetails: 'Closing at title office',
      urgent: false,
      turnstileToken: 'turnstile-token',
    });

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
    expect(content).not.toContain('confirmed');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    (fixture.nativeElement.querySelector('.notice button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(field(fixture, 'fullName').value).toBe('');
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
          "We couldn't send your request right now. Please call or text Mira at (916) 759-0383.",
      },
      { status: 502, statusText: 'Bad Gateway' },
    );
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('.form-error') as HTMLElement).textContent,
    ).toContain('call or text Mira at (916) 759-0383');
    expect(field(fixture, 'fullName').value).toBe('Jane Doe');
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

describe('notInPastValidator', () => {
  it('accepts empty and future dates, rejects past dates', () => {
    expect(notInPastValidator(new FormControl(''))).toBeNull();
    expect(notInPastValidator(new FormControl('2999-12-31'))).toBeNull();
    expect(notInPastValidator(new FormControl('2000-01-01'))).toEqual({ pastDate: true });
  });
});
