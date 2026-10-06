import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { ZIP_LENGTH, sanitizeZipInput } from '../../../shared/service-area';

/**
 * ZIP code field behavior shared by the Contact form and the Service Area checker:
 * digits only, at most five characters, for both typing and pasting. The control (and the visible
 * input) never holds anything else.
 *
 * This only SANITIZES. Whether the value is a valid ZIP (exactly five digits) and whether it is in
 * the service area is decided by the shared validators / `checkZip`, not here.
 *
 * Deliberately `type="text"` (not `number`): number inputs accept `e`, `+`, `-` and `.`, ignore
 * `maxlength` and drop leading zeros. `inputmode="numeric"` still opens the numeric keypad.
 */
@Directive({
  selector: 'input[appZipInput]',
  host: {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'postal-code',
    autocapitalize: 'off',
    spellcheck: 'false',
    '[attr.maxlength]': 'maxLength',
  },
})
export class ZipInputDirective {
  protected readonly maxLength = ZIP_LENGTH;

  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('input')
  protected onInput(): void {
    this.apply(sanitizeZipInput(this.input.value));
  }

  /**
   * Paste is handled explicitly: the browser would truncate to `maxlength` BEFORE we could drop
   * the non-digits, so `95a81-4` would lose its last digit.
   */
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
    this.apply(sanitizeZipInput(merged));
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
