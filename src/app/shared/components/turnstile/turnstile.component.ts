import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: 'light' | 'dark' | 'auto';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(document: Document): Promise<TurnstileApi> {
  const win = document.defaultView as TurnstileWindow | null;
  if (win?.turnstile) {
    return Promise.resolve(win.turnstile);
  }
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () => {
      const api = (document.defaultView as TurnstileWindow | null)?.turnstile;
      api ? resolve(api) : reject(new Error('Turnstile unavailable'));
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget. Browser-only: nothing runs (and no script loads) during SSR or
 * prerendering. Emits the verification token, or `null` when it expires / errors.
 */
@Component({
  selector: 'app-turnstile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #container class="widget"></div>`,
  styles: `
    :host {
      display: block;
      min-height: 4.0625rem;
    }
  `,
})
export class TurnstileComponent {
  readonly siteKey = input.required<string>();
  readonly token = output<string | null>();
  readonly loadFailed = output<void>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private api: TurnstileApi | null = null;
  private widgetId: string | null = null;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      if (this.api && this.widgetId !== null) {
        this.api.remove(this.widgetId);
      }
    });

    afterNextRender(() => {
      if (!this.isBrowser) {
        return;
      }
      loadTurnstile(this.document)
        .then((api) => {
          if (this.destroyed) {
            return;
          }
          this.api = api;
          this.widgetId = api.render(this.container().nativeElement, {
            sitekey: this.siteKey(),
            theme: 'light',
            callback: (token) => this.token.emit(token),
            'expired-callback': () => this.token.emit(null),
            'error-callback': () => this.token.emit(null),
          });
        })
        .catch(() => this.loadFailed.emit());
    });
  }

  /** Request a fresh token (tokens are single-use). */
  reset(): void {
    this.token.emit(null);
    if (this.api && this.widgetId !== null) {
      this.api.reset(this.widgetId);
    }
  }
}
