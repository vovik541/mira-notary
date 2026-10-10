import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * The two NNA badges (Certified Notary Signing Agent, Member) stacked next to a short checklist of
 * credentials. They are used once per page region where credentials are discussed (home hero,
 * loan signing) — never as a logo or decoration.
 */
@Component({
  selector: 'app-credential-list',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel card">
      <div class="badges">
        <img
          src="assets/credentials/nna_certified_global.webp"
          width="332"
          height="303"
          alt="NNA Certified Notary Signing Agent badge"
          loading="lazy"
          decoding="async"
        />
        <img
          src="assets/credentials/national_notary_association.webp"
          width="618"
          height="522"
          alt="National Notary Association member badge"
          loading="lazy"
          decoding="async"
        />
      </div>
      <ul class="items">
        @for (item of items(); track item) {
          <li>
            <app-icon name="check-circle" style="--icon-size: 1rem" />
            <span>{{ item }}</span>
          </li>
        }
      </ul>
      @if (profileUrl(); as url) {
        <a class="profile-link" [href]="url" target="_blank" rel="noopener noreferrer">
          {{ profileLabel() }}
          <span class="sr-only"> (opens in a new tab)</span>
        </a>
      }
    </div>
  `,
  styles: `
    .panel {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
    }
    .profile-link {
      flex-basis: 100%;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-navy);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
    .badges {
      display: flex;
      flex: none;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .badges img {
      width: 4.25rem;
      height: auto;
    }
    .items {
      display: grid;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-navy);
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    app-icon {
      color: var(--color-gold);
    }
    @media (min-width: 640px) {
      .badges img {
        width: 5rem;
      }
    }
  `,
})
export class CredentialListComponent {
  readonly items = input.required<readonly string[]>();
  /** Optional external verification link shown under the checklist. */
  readonly profileUrl = input<string | null>(null);
  readonly profileLabel = input('View NNA Signing Agent Profile');
}
