import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../core/config/business.config';
import { IconComponent } from '../../shared/components/icon/icon.component';

/** Scroll distance (px) after which the sticky bar appears. */
export const MOBILE_CTA_SCROLL_THRESHOLD = 200;

/** Phone-only bottom bar: Call + Book. Hidden at the top of the page, revealed after scrolling. */
@Component({
  selector: 'app-mobile-cta',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.visible]': 'visible()', '[attr.inert]': "visible() ? null : ''" },
  template: `
    <nav class="bar" aria-label="Quick contact">
      <a class="btn btn--outline btn--sm" [href]="phone.href">
        <app-icon name="phone" style="--icon-size: 1rem" />
        Call Mira
      </a>
      <a class="btn btn--gold btn--sm" routerLink="/contact">Book Appointment</a>
    </nav>
  `,
  styles: `
    :host {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 40;
      display: block;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      background: var(--color-surface);
      border-top: 1px solid var(--color-border-strong);
      box-shadow: var(--shadow-3);
      visibility: hidden;
      transform: translateY(100%);
      transition:
        transform 0.25s ease,
        visibility 0.25s;
    }
    :host(.visible) {
      visibility: visible;
      transform: none;
    }
    .bar {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 0.75rem;
      padding: 0.75rem var(--gutter);
      min-height: var(--mobile-cta-height);
    }
    .btn {
      min-height: 2.75rem;
      padding-inline: 0.75rem;
    }
    @media (min-width: 768px) {
      :host {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `,
})
export class MobileCtaComponent {
  protected readonly phone = BUSINESS.phones.primary;
  protected readonly visible = signal(false);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.isBrowser) {
        return;
      }
      const update = (): void => this.visible.set(window.scrollY > MOBILE_CTA_SCROLL_THRESHOLD);
      window.addEventListener('scroll', update, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', update));
      update();
    });
  }
}
