import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../core/config/business.config';
import { CallTextComponent } from '../../shared/components/call-text/call-text.component';
import { MobileCtaService } from './mobile-cta.service';

/**
 * Phone-only bottom bar: Call + Text (two real links) + Book. Context-aware: MobileCtaService shows
 * it only when the page's first area is behind the visitor and no other Call / Text / Book block
 * is on screen. Keyboard focus inside the bar keeps it open, so hiding never moves focus.
 */
@Component({
  selector: 'app-mobile-cta',
  imports: [CallTextComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.visible]': 'shown()',
    '[attr.inert]': "shown() ? null : ''",
    '(focusin)': 'focusWithin.set(true)',
    '(focusout)': 'focusWithin.set(false)',
  },
  template: `
    <nav class="bar" aria-label="Quick contact">
      <app-call-text variant="outline" size="sm" />
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
      opacity: 0;
      transform: translateY(100%);
      transition:
        transform 0.2s ease,
        opacity 0.2s ease,
        visibility 0.2s;
    }
    :host(.visible) {
      visibility: visible;
      opacity: 1;
      transform: none;
    }
    .bar {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
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
  protected readonly focusWithin = signal(false);
  private readonly cta = inject(MobileCtaService);
  protected readonly shown = computed(() => this.cta.visible() || this.focusWithin());
}
