import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-section-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.center]': "align() === 'center'" },
  template: `
    @if (eyebrow(); as eyebrowText) {
      <p class="eyebrow">{{ eyebrowText }}</p>
    }
    <h2 [attr.id]="headingId()">{{ heading() }}</h2>
    @if (text(); as description) {
      <p class="text">{{ description }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 42rem;
      margin-bottom: 2rem;
    }
    :host(.center) {
      margin-inline: auto;
      text-align: center;
    }
    .eyebrow {
      margin-bottom: 0.5rem;
    }
    .text {
      margin-top: 0.75rem;
      color: var(--color-text-muted);
    }
    @media (min-width: 768px) {
      :host {
        margin-bottom: 2.5rem;
      }
    }
  `,
})
export class SectionHeaderComponent {
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>();
  readonly headingId = input<string>();
  readonly text = input<string>();
  readonly align = input<'left' | 'center'>('left');
}
