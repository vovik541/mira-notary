import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import {
  caretPositionAfterFormat,
  countDigits,
  extractPhoneDigits,
  formatPhoneDisplay,
} from '../../../shared/phone';
import { PHONE_DIGIT_COUNT, PHONE_INPUT_MAX_LENGTH } from '../../../shared/validation';

/**
 * Live-formatted U.S. phone field: the visible text is always the progressive display
 * ("(2", "(279)", "(279) 555-0", "(279) 555-0100"), built from at most TEN digits.
 *
 * - Typing: non-digits are ignored; an 11th digit is refused (the field reverts, it never grows or
 *   silently drops a different digit).
 * - Paste: merged at the selection and formatted; a paste that would exceed ten digits, or that
 *   contains "+" (a country code), is rejected whole — never truncated into another number.
 * - Editing: the caret is restored from the number of digits before it, so editing in the middle
 *   works; Backspace/Delete over "(", ")", " " or "-" removes the neighbouring digit instead of
 *   doing nothing.
 *
 * The Angular form control holds the DISPLAY text (e.g. "(279) 555-0100"); the request sends the
 * ten digits (see ContactComponent.buildPayload). The Worker validates independently.
 */
@Directive({
  selector: 'input[appPhoneInput]',
  host: {
    type: 'tel',
    inputmode: 'tel',
    autocomplete: 'tel-national',
    spellcheck: 'false',
    '[attr.maxlength]': 'maxLength',
  },
})
export class PhoneInputDirective {
  /** Only the longest possible DISPLAY ("(279) 555-0100"); the digit cap is enforced below. */
  protected readonly maxLength = PHONE_INPUT_MAX_LENGTH;

  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly control = inject(NgControl, { optional: true, self: true });

  /** The text as it was before the current edit (the value to fall back to). */
  private lastValue = '';

  @HostListener('focus')
  @HostListener('beforeinput')
  protected remember(): void {
    this.lastValue = this.input.value;
  }

  @HostListener('input', ['$event'])
  protected onInput(event: Event): void {
    const raw = this.input.value;
    const caret = this.input.selectionStart ?? raw.length;
    let digits = extractPhoneDigits(raw);
    let digitsBeforeCaret = countDigits(raw.slice(0, caret));

    if (digits.length > PHONE_DIGIT_COUNT) {
      this.revert(caret - (raw.length - this.lastValue.length));
      return;
    }

    // Deleting only punctuation changes nothing semantically: treat it as deleting the digit next
    // to the caret, otherwise the formatter would just put the punctuation back.
    const type = (event as InputEvent).inputType ?? '';
    if (
      digits === extractPhoneDigits(this.lastValue) &&
      raw.length < this.lastValue.length &&
      (type === 'deleteContentBackward' || type === 'deleteContentForward')
    ) {
      if (type === 'deleteContentBackward' && digitsBeforeCaret > 0) {
        digits = digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret);
        digitsBeforeCaret -= 1;
      } else if (type === 'deleteContentForward' && digitsBeforeCaret < digits.length) {
        digits = digits.slice(0, digitsBeforeCaret) + digits.slice(digitsBeforeCaret + 1);
      }
    }

    this.apply(digits, digitsBeforeCaret);
  }

  @HostListener('paste', ['$event'])
  protected onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text');
    if (pasted === undefined) {
      return;
    }
    event.preventDefault();
    if (pasted.includes('+')) {
      return; // no country code in this form: refuse, never reinterpret
    }
    const value = this.input.value;
    const start = this.input.selectionStart ?? value.length;
    const end = this.input.selectionEnd ?? start;
    const merged = value.slice(0, start) + pasted + value.slice(end);
    const digits = extractPhoneDigits(merged);
    if (digits.length > PHONE_DIGIT_COUNT) {
      return; // would need truncating: leave the current value untouched
    }
    this.lastValue = value;
    this.apply(digits, countDigits(value.slice(0, start) + pasted));
  }

  private apply(digits: string, digitsBeforeCaret: number): void {
    const formatted = formatPhoneDisplay(digits);
    this.input.value = formatted;
    this.lastValue = formatted;
    const position = caretPositionAfterFormat(formatted, digitsBeforeCaret);
    this.input.setSelectionRange(position, position);
    this.syncControl(formatted);
  }

  /** Refuse the edit: put back the previous text and caret (an 11th digit was typed or dropped in). */
  private revert(caret: number): void {
    this.input.value = this.lastValue;
    const position = Math.min(Math.max(caret, 0), this.lastValue.length);
    this.input.setSelectionRange(position, position);
    this.syncControl(this.lastValue);
  }

  /** Model to view is skipped: rewriting the DOM value would throw the caret to the end. */
  private syncControl(display: string): void {
    const control = this.control?.control;
    if (control && control.value !== display) {
      control.setValue(display, { emitModelToViewChange: false });
    }
  }
}
