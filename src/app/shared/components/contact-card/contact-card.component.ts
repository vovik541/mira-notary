import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BUSINESS, EMAIL_HREF, LANGUAGES_LABEL } from '../../../core/config/business.config';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-contact-card',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card panel" aria-labelledby="direct-contact-heading">
      <h2 id="direct-contact-heading">Prefer to Speak Directly?</h2>
      <p class="muted">Call or text Mira.</p>
      <ul class="methods">
        <li>
          <a [href]="business.phones.primary.href">
            <span class="icon"><app-icon name="phone" /></span>
            <span class="label">
              <span class="kind">Main Call or Text</span>
              <span class="value">{{ business.phones.primary.display }}</span>
            </span>
          </a>
        </li>
        <li>
          <a [href]="business.phones.secondary.href">
            <span class="icon"><app-icon name="phone" /></span>
            <span class="label">
              <span class="kind">Secondary Phone</span>
              <span class="value">{{ business.phones.secondary.display }}</span>
            </span>
          </a>
        </li>
        <li>
          <a [href]="emailHref">
            <span class="icon"><app-icon name="mail" /></span>
            <span class="label">
              <span class="kind">Direct Email</span>
              <span class="value">{{ business.email }}</span>
            </span>
          </a>
        </li>
      </ul>
      <p class="languages"><strong>Languages:</strong> {{ languages }}</p>
    </section>
  `,
  styleUrl: './contact-card.component.scss',
})
export class ContactCardComponent {
  protected readonly business = BUSINESS;
  protected readonly emailHref = EMAIL_HREF;
  protected readonly languages = LANGUAGES_LABEL;
}
