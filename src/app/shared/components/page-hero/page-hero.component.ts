import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Standard inner-page intro: eyebrow, the page's single H1, lead copy and an actions slot. */
@Component({
  selector: 'app-page-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container inner">
      @if (eyebrow(); as eyebrowText) {
        <p class="eyebrow">{{ eyebrowText }}</p>
      }
      <h1>{{ heading() }}</h1>
      <div class="lead copy"><ng-content /></div>
      <div class="actions"><ng-content select="[actions]" /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--color-bg-light);
      border-bottom: 1px solid var(--color-border);
      padding-block: 2.5rem;
    }
    .inner {
      max-width: calc(48rem + var(--gutter) * 2);
      margin-inline: 0;
    }
    :host-context(.center) .inner {
      text-align: center;
    }
    .eyebrow {
      margin-bottom: 0.75rem;
    }
    .copy {
      margin-top: 1rem;
    }
    .copy:empty {
      display: none;
    }
    .copy > :not(:first-child) {
      margin-top: 0.75rem;
    }
    .actions {
      margin-top: 1.5rem;
    }
    .actions:empty {
      display: none;
    }
    @media (min-width: 768px) {
      :host {
        padding-block: 4rem;
      }
    }
    @media (min-width: 1024px) {
      .inner {
        max-width: var(--container-max);
        padding-right: 30%;
      }
    }
  `,
})
export class PageHeroComponent {
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>();
}
