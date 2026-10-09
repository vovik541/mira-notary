import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { sanitizeDigits } from '../../../shared/validation';

/**
 * Numeric text field (e.g. Number of Signers): digits only, at most the given number of
 * characters, for both typing and pasting. Deliberately type="text" + inputmode="numeric": a
 * type="number" input ignores maxlength, accepts "e + - ." and shows spinner controls.
 *
 * Only SANITIZES. Whether the digits form a valid value is up to the shared validator.
 */
@Directive({
  selector: 'input[appDigitsInput]',
  host: {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    spellcheck: 'false',
    '[attr.maxlength]': 'maxDigits()',
  },
})
export class DigitsInputDirective {
  readonly maxDigits = input.required<number>({ alias: 'appDigitsInput' });

  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('input')
  protected onInput(): void {
    this.apply(sanitizeDigits(this.input.value, this.maxDigits()));
  }

  /** Paste is merged first: the browser would truncate to maxlength before we could filter. */
  @HostListener('paste', ['$event'])
  protected onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text');
    if (pasted === undefined) {
      return;
    }
    event.preventDefault();
    const start = this.input.selectionStart ?? this.input.value.length;
    const end = this.input.selectionEnd ?? start;
    const merged = this.input.value.slice(0, start) + pasted + this.input.value.slice(end);
    this.apply(sanitizeDigits(merged, this.maxDigits()));
  }

  private apply(sanitized: string): void {
    if (this.input.value !== sanitized) {
      this.input.value = sanitized;
    }
    if (this.control?.control && this.control.value !== sanitized) {
      this.control.control.setValue(sanitized);
    }
  }
}
