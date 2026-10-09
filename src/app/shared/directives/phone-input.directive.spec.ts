import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PhoneInputDirective } from './phone-input.directive';

@Component({
  imports: [ReactiveFormsModule, PhoneInputDirective],
  template: '<input appPhoneInput [formControl]="control" />',
})
class HostComponent {
  readonly control = new FormControl('', { nonNullable: true });
}

/** Simulates what a browser does for one edit: beforeinput, change the text, input. */
class Field {
  readonly input: HTMLInputElement;
  readonly control: FormControl<string>;

  constructor(readonly fixture: ComponentFixture<HostComponent>) {
    this.input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    this.control = fixture.componentInstance.control;
    this.input.dispatchEvent(new Event('focus'));
  }

  get value(): string {
    return this.input.value;
  }
  get caret(): number {
    return this.input.selectionStart ?? -1;
  }
  moveCaret(position: number): void {
    this.input.setSelectionRange(position, position);
  }

  private fire(inputType: string): void {
    const event = new Event('input', { bubbles: true });
    Object.defineProperty(event, 'inputType', { value: inputType });
    this.input.dispatchEvent(event);
    this.fixture.detectChanges();
  }

  type(text: string): void {
    for (const char of text) {
      this.input.dispatchEvent(new Event('beforeinput'));
      const start = this.input.selectionStart ?? this.input.value.length;
      const end = this.input.selectionEnd ?? start;
      this.input.value = this.input.value.slice(0, start) + char + this.input.value.slice(end);
      this.moveCaret(start + 1);
      this.fire('insertText');
    }
  }

  backspace(): void {
    this.input.dispatchEvent(new Event('beforeinput'));
    const start = this.input.selectionStart ?? 0;
    const end = this.input.selectionEnd ?? start;
    if (start === end && start > 0) {
      this.input.value = this.input.value.slice(0, start - 1) + this.input.value.slice(end);
      this.moveCaret(start - 1);
    } else {
      this.input.value = this.input.value.slice(0, start) + this.input.value.slice(end);
      this.moveCaret(start);
    }
    this.fire('deleteContentBackward');
  }

  deleteForward(): void {
    this.input.dispatchEvent(new Event('beforeinput'));
    const start = this.input.selectionStart ?? 0;
    const end = this.input.selectionEnd ?? start;
    this.input.value =
      this.input.value.slice(0, start) + this.input.value.slice(start === end ? end + 1 : end);
    this.moveCaret(start);
    this.fire('deleteContentForward');
  }

  paste(text: string): Event {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
    this.input.dispatchEvent(event);
    this.fixture.detectChanges();
    return event;
  }

  clear(): void {
    this.input.setSelectionRange(0, this.input.value.length);
    this.backspace();
  }
}

function setup(): Field {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return new Field(fixture);
}

describe('PhoneInputDirective', () => {
  it('is a plain tel input with a 14-character physical limit and national autofill', () => {
    const { input } = setup();
    expect(input.type).toBe('tel');
    expect(input.getAttribute('inputmode')).toBe('tel');
    expect(input.getAttribute('autocomplete')).toBe('tel-national');
    expect(input.getAttribute('maxlength')).toBe('14');
  });

  describe('typing', () => {
    it.each([
      ['2', '(2'],
      ['27', '(27'],
      ['279', '(279)'],
      ['2795', '(279) 5'],
      ['279555', '(279) 555'],
      ['2795550', '(279) 555-0'],
      ['2795550100', '(279) 555-0100'],
    ])('typing %s shows %s', (digits, display) => {
      const field = setup();
      field.type(digits);
      expect(field.value).toBe(display);
      expect(field.control.value).toBe(display);
      expect(field.caret).toBe(display.length);
    });

    it('ignores letters and symbols', () => {
      const field = setup();
      field.type('2a7-9.x');
      expect(field.value).toBe('(279)');
    });

    it('refuses an 11th digit: nothing changes and the field does not grow', () => {
      const field = setup();
      field.type('2795550100');
      field.type('9');
      expect(field.value).toBe('(279) 555-0100');
      expect(field.control.value).toBe('(279) 555-0100');
      expect(field.caret).toBe(14);
      field.type('12');
      expect(field.value).toBe('(279) 555-0100');
    });

    it('never produces more than ten digits however it is typed', () => {
      const field = setup();
      field.type('27955501009999999999');
      expect(field.value.replace(/\D/g, '')).toHaveLength(10);
      expect(field.value).toBe('(279) 555-0100');
    });
  });

  describe('paste', () => {
    it.each(['2795550100', '279-555-0100', '(279)5550100', '(279) 555-0100', '279 555 0100'])(
      'pasting %s gives (279) 555-0100',
      (text) => {
        const field = setup();
        const event = field.paste(text);
        expect(event.defaultPrevented).toBe(true);
        expect(field.value).toBe('(279) 555-0100');
        expect(field.control.value).toBe('(279) 555-0100');
      },
    );

    it.each(['+1 279 555 0100', '+12795550100', '12795550100', '27955501001', '+279 555 0100'])(
      'rejects %s whole: never truncated into another number',
      (text) => {
        const field = setup();
        field.paste(text);
        expect(field.value).toBe('');
        expect(field.control.value).toBe('');
      },
    );

    it('keeps an existing complete value when an invalid paste is attempted', () => {
      const field = setup();
      field.type('2795550100');
      field.input.setSelectionRange(0, field.value.length);
      field.paste('+1 916 555 0199');
      expect(field.value).toBe('(279) 555-0100');
      field.paste('99999999999');
      expect(field.value).toBe('(279) 555-0100');
    });

    it('merges a paste at the caret and refuses it when it would exceed ten digits', () => {
      const field = setup();
      field.type('279');
      field.paste('5550100');
      expect(field.value).toBe('(279) 555-0100');
      field.clear();
      field.type('27955');
      field.moveCaret(3);
      field.paste('99'); // 7 digits total: fine, inserted in the middle
      expect(field.value.replace(/\D/g, '')).toBe('2799955');
      field.paste('99999'); // would make 12 digits: refused
      expect(field.value.replace(/\D/g, '')).toBe('2799955');
    });

    it('drops letters in a paste but keeps the digits', () => {
      const field = setup();
      field.paste('call 279 555 0100 now');
      expect(field.value).toBe('(279) 555-0100');
    });
  });

  describe('backspace and Delete', () => {
    it('removes one digit per Backspace from a complete number, reformatting each time', () => {
      const field = setup();
      field.type('2795550100');
      const expected = [
        '(279) 555-010',
        '(279) 555-01',
        '(279) 555-0',
        '(279) 555',
        '(279) 55',
        '(279) 5',
        '(279)',
        '(27',
        '(2',
        '',
      ];
      for (const display of expected) {
        field.backspace();
        expect(field.value).toBe(display);
        expect(field.control.value).toBe(display);
      }
    });

    it('does not reinsert deleted digits or duplicate punctuation', () => {
      const field = setup();
      field.type('2795550100');
      field.backspace();
      field.backspace();
      expect(field.value).toBe('(279) 555-01');
      field.type('9');
      expect(field.value).toBe('(279) 555-019');
      expect(field.value.match(/\(/g)).toHaveLength(1);
      expect(field.value.match(/-/g)).toHaveLength(1);
    });

    it('Backspace right after ") " deletes the digit before it, not nothing', () => {
      const field = setup();
      field.type('2795550100');
      field.moveCaret(6); // "(279) |555-0100"
      field.backspace();
      expect(field.value).toBe('(275) 550-100');
      expect(field.value.replace(/\D/g, '')).toBe('275550100');
    });

    it('Delete before ")" removes the next digit', () => {
      const field = setup();
      field.type('2795550100');
      field.moveCaret(4); // "(279|) 555-0100"
      field.deleteForward();
      expect(field.value).toBe('(279) 550-100');
    });

    it('clearing the whole field empties it', () => {
      const field = setup();
      field.type('2795550100');
      field.clear();
      expect(field.value).toBe('');
      expect(field.control.value).toBe('');
    });
  });

  describe('editing in the middle', () => {
    it('inserts a digit mid-number and keeps the caret right after it', () => {
      const field = setup();
      field.type('27955501');
      field.moveCaret(6); // "(279) |555-01"
      field.type('9');
      expect(field.value).toBe('(279) 955-501');
      expect(field.caret).toBe(7);
      field.type('1');
      expect(field.value).toBe('(279) 915-5501');
      expect(field.caret).toBe(8);
    });

    it('refuses a digit inserted mid-number when ten are already present, shifting nothing', () => {
      const field = setup();
      field.type('2795550100');
      field.moveCaret(8);
      field.type('7');
      expect(field.value).toBe('(279) 555-0100');
      expect(field.caret).toBe(8);
    });

    it('deleting a middle digit keeps the caret in place and the number intact', () => {
      const field = setup();
      field.type('2795550100');
      field.moveCaret(6);
      field.deleteForward();
      expect(field.value).toBe('(279) 550-100');
      expect(field.caret).toBe(6);
    });
  });
});
