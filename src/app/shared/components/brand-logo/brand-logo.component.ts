import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../../core/config/business.config';

@Component({
  selector: 'app-brand-logo',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="brand" routerLink="/" [attr.aria-label]="business.name + ' — home'">
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
}
