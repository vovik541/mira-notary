import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Compact checklist. `columns="auto"` flows 1 → 2 → 3 columns with the viewport. */
@Component({
  selector: 'app-check-list',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.auto]': "columns() === 'auto'" },
  template: `
    <ul>
      @for (item of items(); track item) {
        <li>
          <app-icon name="check" style="--icon-size: 1rem" />
          <span>{{ item }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      display: grid;
      gap: 0.25rem 1.5rem;
    }
    li {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding-block: 0.5rem;
      border-bottom: 1px solid var(--color-border);
      font-weight: 500;
      font-size: 0.9375rem;
      line-height: 1.4;
    }
    app-icon {
      margin-top: 0.1875rem;
      color: var(--color-success);
    }
    @media (min-width: 640px) {
      :host(.auto) ul {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 1024px) {
      :host(.auto) ul {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  `,
})
export class CheckListComponent {
  readonly items = input.required<readonly string[]>();
  readonly columns = input<'auto' | '1'>('1');
}
