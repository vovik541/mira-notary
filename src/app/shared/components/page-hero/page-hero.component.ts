import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Standard inner-page intro band: eyebrow, the page's single H1, lead copy and actions, with an
 * optional `[aside]` slot that sits to the right on desktop (e.g. credentials).
 */
@Component({
  selector: 'app-page-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container inner">
      <div class="main">
        @if (eyebrow(); as eyebrowText) {
          <p class="eyebrow">{{ eyebrowText }}</p>
        }
        <h1>{{ heading() }}</h1>
        <div class="lead copy"><ng-content /></div>
        <div class="actions"><ng-content select="[actions]" /></div>
      </div>
      <div class="aside"><ng-content select="[aside]" /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--color-bg-light);
      border-bottom: 1px solid var(--color-border);
      padding-block: var(--hero-y);
    }
    .inner {
      display: grid;
      gap: 2rem;
      align-items: center;
    }
    .main {
      max-width: 50rem;
    }
    .eyebrow {
      margin-bottom: 0.75rem;
    }
    .copy {
      margin-top: 1rem;
    }
    .copy:empty,
    .actions:empty,
    .aside:empty {
      display: none;
    }
    .copy > :not(:first-child) {
      margin-top: 0.75rem;
    }
    .actions {
      margin-top: 1.75rem;
    }
    @media (min-width: 1024px) {
      .inner:has(.aside:not(:empty)) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
        gap: 4rem;
      }
    }
  `,
})
export class PageHeroComponent {
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>();
}
