import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PriceRow } from '../../../data/pricing.data';

@Component({
  selector: 'app-price-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="card list">
      @for (row of rows(); track row.label) {
        <div class="row">
          <div>
            <dt>{{ row.label }}</dt>
            @if (row.detail) {
              <dd class="detail">{{ row.detail }}</dd>
            }
          </div>
          <dd class="price">
            {{ row.price }}
            @if (row.unit) {
              <span class="unit">{{ row.unit }}</span>
            }
          </dd>
        </div>
      }
    </dl>
  `,
  styles: `
    .list {
      margin: 0;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1.25rem;
    }
    .row + .row {
      border-top: 1px solid var(--color-border);
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
    }
    .detail {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
    .price {
      flex: none;
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--color-navy);
      text-align: right;
    }
    .unit {
      display: block;
      font-family: var(--font-body);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }
  `,
})
export class PriceListComponent {
  readonly rows = input.required<readonly PriceRow[]>();
}
