import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../core/config/business.config';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container nf">
      <p class="eyebrow">404</p>
      <h1>Page Not Found</h1>
      <p class="lead">
        The page you were looking for doesn’t exist or may have moved. Try one of these instead, or
        call Mira at {{ phone.display }}.
      </p>
      <div class="page-actions">
        <a class="btn btn--gold" routerLink="/">Back to Home</a>
        <a class="btn btn--outline" routerLink="/services">View Services</a>
        <a class="btn btn--outline" routerLink="/contact">Request Appointment</a>
      </div>
    </section>
  `,
  styles: `
    .nf {
      max-width: calc(44rem + var(--gutter) * 2);
      margin-inline: 0;
      padding-block: 4rem 5rem;
    }
    .nf > * + * {
      margin-top: 1rem;
    }
    .page-actions {
      margin-top: 2rem;
    }
  `,
})
export class NotFoundComponent {
  protected readonly phone = BUSINESS.phones.primary;

  constructor() {
    // Present only during server rendering: makes the response a real 404 for crawlers.
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) {
      responseInit.status = 404;
    }
  }
}
