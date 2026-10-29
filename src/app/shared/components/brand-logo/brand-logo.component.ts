import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../../core/config/business.config';

@Component({
  selector: 'app-brand-logo',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="brand" routerLink="/" [attr.aria-label]="label()">
      <img
        class="logo"
        [src]="business.logo.src"
        [width]="business.logo.width"
        [height]="business.logo.height"
        [alt]="business.logo.alt"
        [attr.fetchpriority]="priority() ? 'high' : null"
        [attr.loading]="priority() ? 'eager' : 'lazy'"
        decoding="async"
      />
      @if (showText()) {
        <span class="text">
          <span class="name">{{ business.ownerName }}</span>
          <span class="role">{{ business.tagline }}</span>
        </span>
      }
    </a>
  `,
  styleUrl: './brand-logo.component.scss',
})
export class BrandLogoComponent {
  protected readonly business = BUSINESS;
  readonly showText = input(true);
  readonly priority = input(false);

  /** Accessible name must contain the visible text (WCAG 2.5.3 Label in Name). */
  protected readonly label = computed(() =>
    this.showText()
      ? `${this.business.ownerName} ${this.business.tagline} — home`
      : `${this.business.name} — home`,
  );
}
