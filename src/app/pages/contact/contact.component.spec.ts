import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ContactComponent, notInPastValidator } from './contact.component';

function setup(query: Record<string, string> = {}): ComponentFixture<ContactComponent> {
  TestBed.configureTestingModule({
    imports: [ContactComponent],
    providers: [
      provideRouter([]),
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

describe('ContactComponent', () => {
  it('shows accessible errors and does not submit when required fields are empty', () => {
    const fixture = setup();
    submit(fixture);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelectorAll('.error[role="alert"]').length).toBeGreaterThanOrEqual(6);
    expect(field(fixture, 'fullName').getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('.notice')).toBeNull();
  });

  it('prefills the location from a valid ?zip= query param and ignores junk', () => {
    expect(field(setup({ zip: '95814' }), 'location').value).toBe('95814');
    TestBed.resetTestingModule();
    expect(field(setup({ zip: '<script>' }), 'location').value).toBe('');
  });

  it('after a valid submit, says the request was NOT delivered and offers mailto/tel', () => {
    const fixture = setup();
    set(fixture, 'fullName', 'Jane Doe');
    set(fixture, 'phone', '(916) 555-0100');
    set(fixture, 'service', 'Loan Signing');
    set(fixture, 'location', '95814');
    set(fixture, 'preferredDate', '2999-01-01');
    set(fixture, 'preferredTime', 'Morning');
    fixture.detectChanges();
    submit(fixture);

    const notice = fixture.nativeElement.querySelector('.notice') as HTMLElement;
    expect(notice.textContent).toContain('not been delivered');
    const hrefs = Array.from(notice.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.startsWith('mailto:MiraNotary@gmail.com'))).toBe(true);
    expect(hrefs).toContain('tel:+19167590383');
  });
});

describe('notInPastValidator', () => {
  it('accepts empty and future dates, rejects past dates', () => {
    expect(notInPastValidator(new FormControl(''))).toBeNull();
    expect(notInPastValidator(new FormControl('2999-12-31'))).toBeNull();
    expect(notInPastValidator(new FormControl('2000-01-01'))).toEqual({ pastDate: true });
  });
});
