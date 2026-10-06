import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppointmentServiceSlug } from '../../../../shared/appointment.model';
import { BUSINESS } from '../../../core/config/business.config';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-cta-band',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="band" aria-labelledby="cta-heading">
      <div class="container inner">
        <p class="eyebrow">{{ eyebrow() }}</p>
        <h2 id="cta-heading">{{ heading() }}</h2>
        <p class="text">{{ text() }}</p>
        <div class="actions">
          <a class="btn btn--gold" routerLink="/contact" [queryParams]="contactQuery()">
            Book an Appointment
          </a>
          <a class="btn btn--outline-light" [href]="phone.href">
            <app-icon name="phone" style="--icon-size: 1rem" />
            Call {{ phone.display }}
          </a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .band {
      padding-block: 3.5rem;
      color: #fff;
      text-align: center;
      background: var(--color-navy);
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
    }
    .eyebrow {
      margin-bottom: 0.75rem;
      color: var(--color-gold);
    }
    h2 {
      color: #fff;
      font-size: clamp(1.875rem, 1.4rem + 2vw, 3rem);
    }
    .text {
      max-width: 36rem;
      margin: 1rem auto 0;
      color: rgba(255, 255, 255, 0.85);
      font-size: 1.0625rem;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 22rem;
      margin: 2rem auto 0;
    }
    @media (min-width: 640px) {
      .band {
        padding-block: 5rem;
      }
      .actions {
        flex-direction: row;
        justify-content: center;
        max-width: none;
      }
    }
  `,
})
export class CtaBandComponent {
  protected readonly phone = BUSINESS.phones.primary;
  /** Service context to pre-select on the Contact form (omit for the generic CTA). */
  readonly service = input<AppointmentServiceSlug | null>(null);
  protected readonly contactQuery = computed(() => {
    const service = this.service();
    return service ? { service } : null;
  });
  readonly eyebrow = input('Need a Notary?');
  readonly heading = input('Mira Comes to You.');
  readonly text = input(
    'Professional mobile notary and loan signing services throughout the Sacramento area.',
  );
}
