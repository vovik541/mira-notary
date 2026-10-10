import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Lightweight modal preview of ONE already-loaded image (the caller's object URL — nothing is
 * copied or uploaded). Accessible dialog: labelled by the file name, focus moves to Close, Tab is
 * trapped on it (it is the only control), Escape / Close / backdrop request closing. It never
 * closes itself: the owner decides (and reconciles browser history), then removes it.
 */
@Component({
  selector: 'app-photo-lightbox',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeRequested.emit()' },
  template: `
    <div class="backdrop" (click)="closeRequested.emit()">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Preview ' + label()"
        (click)="$event.stopPropagation()"
        (keydown.tab)="trap($event)"
      >
        <button
          #close
          class="close"
          type="button"
          aria-label="Close preview"
          (click)="closeRequested.emit()"
        >
          <app-icon name="close" style="--icon-size: 1.5rem" />
        </button>
        <img [src]="src()" alt="" />
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 4rem 1rem 1rem;
      overflow: hidden;
      overscroll-behavior: contain;
      background: rgb(6 29 51 / 0.86);
    }
    .dialog {
      display: contents;
    }
    img {
      display: block;
      width: auto;
      height: auto;
      max-width: min(90vw, 100%);
      max-height: calc(100dvh - 5.5rem);
      object-fit: contain;
      background: var(--color-surface);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-3);
    }
    .close {
      position: fixed;
      top: 0.75rem;
      right: 0.75rem;
      z-index: 101;
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      color: var(--color-navy-dark);
      cursor: pointer;
      background: var(--color-surface);
      border: 0;
      border-radius: 50%;
      box-shadow: var(--shadow-2);
    }
    .close:focus-visible {
      outline: 3px solid var(--color-gold);
      outline-offset: 2px;
    }
  `,
})
export class PhotoLightboxComponent {
  readonly src = input.required<string>();
  /** File name: gives the dialog its accessible name (the image itself has an empty alt). */
  readonly label = input.required<string>();
  readonly closeRequested = output<void>();

  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('close');

  constructor() {
    afterNextRender(() => this.closeButton().nativeElement.focus({ preventScroll: true }));
  }

  /** Close is the only control, so Tab / Shift+Tab simply stay on it. */
  protected trap(event: Event): void {
    event.preventDefault();
    this.closeButton().nativeElement.focus({ preventScroll: true });
  }
}
