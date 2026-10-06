import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ZipInputDirective } from './zip-input.directive';

@Component({
  imports: [ReactiveFormsModule, ZipInputDirective],
  template: `<input id="zip" appZipInput [formControl]="control" />`,
})
class HostComponent {
  readonly control = new FormControl('', { nonNullable: true });
}

describe('ZipInputDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let input: HTMLInputElement;

  const type = (value: string): void => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  const paste = (text: string): Event => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
    input.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  it('sets the ZIP attributes (text, numeric keypad, postal-code, maxlength 5)', () => {
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('autocomplete')).toBe('postal-code');
    expect(input.getAttribute('maxlength')).toBe('5');
  });

  it.each([
    ['95814', '95814'],
    ['9581A', '9581'],
    ['958140', '95814'],
    ['abc', ''],
    ['9 5-8.1+4e', '95814'],
  ])('typing %j keeps %j in both the field and the control', (typed, expected) => {
    type(typed);
    expect(input.value).toBe(expected);
    expect(fixture.componentInstance.control.value).toBe(expected);
  });

  it('intercepts paste, sanitizes it and caps at five digits', () => {
    const event = paste('95a81-4-99');
    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe('95814');
    expect(fixture.componentInstance.control.value).toBe('95814');
  });

  it('replaces only the selected text when pasting over a selection', () => {
    type('95814');
    input.setSelectionRange(2, 5);
    paste('-6-7');
    expect(input.value).toBe('9567');
  });

  it('inserts at the caret when pasting into a partial value', () => {
    type('95');
    input.setSelectionRange(2, 2);
    paste('814');
    expect(input.value).toBe('95814');
  });

  it('only sanitizes: it does not decide validity', () => {
    type('958');
    expect(fixture.componentInstance.control.errors).toBeNull();
  });
});
