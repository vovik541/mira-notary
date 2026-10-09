import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaqItem, FaqSegment, faqSegments } from '../../../data/faq.data';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

/** Accessible accordion. Answers stay in the DOM (hidden) so they are server-rendered and crawlable. */
@Component({
  selector: 'app-faq-accordion',
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="list">
      @for (item of items(); track item.id; let i = $index) {
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
            <p>
              @for (segment of segments(item); track $index) {
                @if (!segment.href) {
                  <ng-container>{{ segment.text }}</ng-container>
                } @else if (isInternal(segment.href)) {
                  <a [routerLink]="segment.href">{{ segment.text }}</a>
                } @else {
                  <a [href]="segment.href">{{ segment.text }}</a>
                }
              }
            </p>
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

  protected segments(item: FaqItem): readonly FaqSegment[] {
    return faqSegments(item);
  }

  protected isInternal(href: string): boolean {
    return href.startsWith('/');
  }

  protected isOpen(index: number): boolean {
    return this.openIndex() === index;
  }

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }
}
