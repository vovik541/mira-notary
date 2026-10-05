import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-translation',
  imports: [RouterLink, PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="Document Translation Services" eyebrow="Translation">
      <p>
        Certified document translation services are available for Ukrainian ↔ English and Russian ↔
        English.
      </p>
      <p>
        Mira also works with a professional translation network that can assist with more than 150
        languages.
      </p>
    </app-page-hero>

    <section class="section" aria-labelledby="quote-heading">
      <div class="container">
        <div class="card quote">
          <h2 id="quote-heading">Need a Document Translated?</h2>
          <p class="lead">
            Tell Mira what document you need translated, the language pair, and any relevant
            deadline. She will confirm availability and provide a quote.
          </p>
          <p><a class="btn btn--gold" routerLink="/contact">Request a Translation Quote</a></p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .quote {
      max-width: 44rem;
      padding: 1.5rem;
    }
    .quote > * + * {
      margin-top: 1rem;
    }
    .quote p:last-child {
      margin-top: 1.5rem;
    }
    @media (min-width: 768px) {
      .quote {
        padding: 2.5rem;
      }
    }
  `,
})
export class TranslationComponent {}
