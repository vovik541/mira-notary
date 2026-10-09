import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { NAME_MAX_LENGTH, sanitizeNameInput } from '../../../shared/validation';

/**
 * First / last name fields: while typing or pasting, everything except Unicode letters (any
 * script), spaces and straight/curly apostrophes is dropped and the length is capped. Case and
 * script are never changed. On blur, surrounding spaces are trimmed (they would be invalid).
 *
 * This only SANITIZES; whether the result is a valid name is decided by the shared validator, which
 * the Worker also runs (a forged request skips this directive entirely).
 */
@Directive({
  selector: 'input[appNameInput]',
  host: {
    type: 'text',
    autocapitalize: 'words',
    spellcheck: 'false',
    '[attr.maxlength]': 'maxLength',
  },
})
export class NameInputDirective {
  protected readonly maxLength = NAME_MAX_LENGTH;

  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('input', ['$event'])
  protected onInput(event: Event): void {
    // Leave an IME composition (e.g. CJK) alone until it is committed.
    if ((event as InputEvent).isComposing) {
      return;
    }
    this.apply(sanitizeNameInput(this.input.value));
  }

  @HostListener('compositionend')
  protected onCompositionEnd(): void {
    this.apply(sanitizeNameInput(this.input.value));
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
    this.apply(sanitizeNameInput(merged));
  }

  @HostListener('blur')
  protected onBlur(): void {
    this.apply(this.input.value.trim());
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
