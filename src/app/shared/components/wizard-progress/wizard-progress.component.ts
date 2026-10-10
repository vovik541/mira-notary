import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Compact step indicator for a multi-step form: done (check), current (gold) and upcoming steps
 * joined by a connector line. Phones show numbered dots only (labels stay available to assistive
 * technology); the current step is exposed with aria-current="step".
 */
@Component({
  selector: 'app-wizard-progress',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="wizard-progress" aria-label="Appointment request progress">
      <ol>
        @for (label of labels(); track $index; let i = $index) {
          @let n = i + 1;
          <li
            [class.done]="n < current()"
            [class.current]="n === current()"
            [attr.aria-current]="n === current() ? 'step' : null"
          >
            <span class="dot" aria-hidden="true">
              @if (n < current()) {
                <app-icon name="check" style="--icon-size: 0.875rem" />
              } @else {
                {{ n }}
              }
            </span>
            <span class="step-label">
              <span class="sr-only">
                {{ n < current() ? 'Completed: ' : n === current() ? 'Current: ' : 'Upcoming: ' }}
              </span>
              {{ label }}
            </span>
          </li>
        }
      </ol>
    </nav>
  `,
  styleUrl: './wizard-progress.component.scss',
})
export class WizardProgressComponent {
  /** 1-based number of the current step. */
  readonly current = input.required<number>();
  readonly labels = input.required<readonly string[]>();
}
