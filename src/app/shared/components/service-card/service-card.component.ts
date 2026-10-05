import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServiceSummary } from '../../../data/services.data';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-service-card',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <div class="body">
        <span class="icon-box"><app-icon [name]="service().icon" /></span>
        <h3>{{ service().title }}</h3>
        <p class="summary">{{ service().summary }}</p>
        @if (service().note; as note) {
          <p class="note">{{ note }}</p>
        }
        @if (service().highlights.length) {
          <ul class="highlights">
            @for (item of service().highlights; track item) {
              <li>{{ item }}</li>
            }
          </ul>
        }
      </div>
      <a class="text-link" [routerLink]="service().path">
        {{ service().homeLinkLabel }}
        <app-icon name="chevron-right" style="--icon-size: 1rem" />
      </a>
    </article>
  `,
  styleUrl: './service-card.component.scss',
})
export class ServiceCardComponent {
  readonly service = input.required<ServiceSummary>();
}
