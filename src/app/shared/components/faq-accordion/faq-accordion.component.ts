import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FaqItem } from '../../../data/faq.data';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

/** Accessible accordion. Answers stay in the DOM (hidden) so they are server-rendered and crawlable. */
@Component({
  selector: 'app-faq-accordion',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="list">
      @for (item of items(); track item.question; let i = $index) {
        <div class="item card" [class.open]="isOpen(i)">
          <h3>
            <button
              type="button"
              class="trigger"
              [id]="idPrefix + '-q-' + i"
              [attr.aria-expanded]="isOpen(i)"
              [attr.aria-controls]="idPrefix + '-a-' + i"
              (click)="toggle(i)"
            >
              <span>{{ item.question }}</span>
              <app-icon name="chevron-down" class="chevron" />
            </button>
          </h3>
          <div
            class="panel"
            role="region"
            [id]="idPrefix + '-a-' + i"
            [attr.aria-labelledby]="idPrefix + '-q-' + i"
            [hidden]="!isOpen(i)"
          >
            <p>{{ item.answer }}</p>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './faq-accordion.component.scss',
})
export class FaqAccordionComponent {
  readonly items = input.required<readonly FaqItem[]>();

  protected readonly idPrefix = `faq-${nextId++}`;
  private readonly openIndex = signal<number | null>(null);

  protected isOpen(index: number): boolean {
    return this.openIndex() === index;
  }

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }
}
