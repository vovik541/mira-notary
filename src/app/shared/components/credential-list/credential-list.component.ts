import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * NNA badge next to a short checklist of credentials. The badge is used once per page region
 * where credentials are discussed (home hero, loan signing, about) — never as a logo or decoration.
 */
@Component({
  selector: 'app-credential-list',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel card">
      <img
        class="badge"
        src="assets/credentials/nna-certified-2026.webp"
        width="300"
        height="300"
        alt="2026 NNA Certified Notary Signing Agent"
        loading="lazy"
        decoding="async"
      />
      <ul class="items">
        @for (item of items(); track item) {
          <li>
            <app-icon name="check-circle" style="--icon-size: 1rem" />
            <span>{{ item }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .panel {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
    }
    .badge {
      flex: none;
      width: 3.5rem;
      height: 3.5rem;
      object-fit: contain;
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
      .badge {
        width: 4rem;
        height: 4rem;
      }
    }
  `,
})
export class CredentialListComponent {
  readonly items = input.required<readonly string[]>();
}
