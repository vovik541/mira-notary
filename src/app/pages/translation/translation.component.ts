import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-translation',
  imports: [RouterLink, PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero heading="Document Translation Services" eyebrow="Translation">
      Certified document translation services are available for Ukrainian ↔ English and Russian ↔
      English.
    </app-page-hero>

    <section class="section" aria-labelledby="quote-heading">
      <div class="container split split--even">
        <div class="info">
          <h2 class="info-heading">Language Pairs</h2>
          <ul class="pairs">
            <li class="card pair">Ukrainian ↔ English</li>
            <li class="card pair">Russian ↔ English</li>
          </ul>
          <p class="network">
            Mira also works with a professional translation network that can assist with more than
            150 languages.
          </p>
        </div>

        <div class="card quote">
          <h2 id="quote-heading">Need a Document Translated?</h2>
          <p class="lead">
            Tell Mira what document you need translated, the language pair, and any relevant
            deadline. She will confirm availability and provide a quote.
          </p>
          <p>
            <a
              class="btn btn--gold"
              routerLink="/contact"
              [queryParams]="{ service: 'document-translation' }"
              >Request a Translation Quote</a
            >
          </p>
        </div>
      </div>
    </section>
  `,
  styles: `
    h2 {
      font-size: 1.5rem;
    }
    .info-heading {
      margin-bottom: 1.25rem;
    }
    .pairs {
      display: grid;
      gap: 1rem;
    }
    .pair {
      padding: 1.25rem 1.5rem;
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-navy);
    }
    .network {
      margin-top: 1.5rem;
      padding-left: 1rem;
      color: var(--color-text-muted);
      border-left: 3px solid var(--color-gold);
    }
    .quote {
      padding: 1.75rem;
    }
    .quote > * + * {
      margin-top: 1rem;
    }
    .quote p:last-child {
      margin-top: 1.5rem;
    }
    @media (min-width: 640px) {
      .pairs {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 1024px) {
      .pairs {
        grid-template-columns: 1fr;
      }
      .quote {
        padding: 2.5rem;
      }
    }
  `,
})
export class TranslationComponent {}
