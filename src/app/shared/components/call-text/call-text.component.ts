import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BUSINESS } from '../../../core/config/business.config';
import { IconComponent } from '../icon/icon.component';

export type CallTextVariant = 'gold' | 'outline' | 'outline-light';

/**
 * Compact paired Call / Text control. Two real links — `tel:` and `sms:` — so a control that
 * offers texting really opens a text message. Plain semantic anchors (no JavaScript, no menus).
 */
@Component({
  selector: 'app-call-text',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pair" role="group" aria-label="Call or text Mira &amp; Team">
      <a [class]="buttonClass()" [href]="phone.href" [attr.aria-label]="callLabel">
        <app-icon name="phone" style="--icon-size: 1rem" />
        <span>Call</span>
      </a>
      <a [class]="buttonClass()" [href]="phone.smsHref" [attr.aria-label]="textLabel">
        <app-icon name="message" style="--icon-size: 1rem" />
        <span>Text</span>
      </a>
    </span>
  `,
  styles: `
    :host {
      display: block;
    }
    .pair {
      display: flex;
      gap: 0.5rem;
    }
    .btn {
      flex: 1 1 0;
      min-width: 0;
    }
    @media (min-width: 640px) {
      :host {
        display: inline-block;
      }
      .btn {
        flex: none;
        min-width: 6.5rem;
      }
    }
  `,
})
export class CallTextComponent {
  readonly variant = input<CallTextVariant>('outline');
  readonly size = input<'md' | 'sm'>('md');

  protected readonly phone = BUSINESS.phones.primary;
  protected readonly callLabel = `Call Mira & Team at ${BUSINESS.phones.primary.display}`;
  protected readonly textLabel = `Text Mira & Team at ${BUSINESS.phones.primary.display}`;
  protected readonly buttonClass = computed(
    () => `btn btn--${this.variant()}${this.size() === 'sm' ? ' btn--sm' : ''}`,
  );
}
