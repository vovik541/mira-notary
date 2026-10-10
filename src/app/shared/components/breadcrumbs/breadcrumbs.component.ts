import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbItem } from '../../../core/seo/seo-pages';

/** Visible breadcrumb trail (the matching BreadcrumbList JSON-LD comes from the SEO registry). */
@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Breadcrumb">
      <ol>
        @for (item of items(); track item.path; let last = $last) {
          <li>
            @if (last) {
              <span aria-current="page">{{ item.name }}</span>
            } @else {
              <a [routerLink]="item.path">{{ item.name }}</a>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }
    li:not(:last-child)::after {
      margin-left: 0.5rem;
      content: '/';
      color: var(--color-text-muted);
    }
    a {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    [aria-current] {
      color: var(--color-text);
    }
  `,
})
export class BreadcrumbsComponent {
  readonly items = input.required<readonly BreadcrumbItem[]>();
}
