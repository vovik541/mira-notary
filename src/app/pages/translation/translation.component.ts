import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EXTERNAL_LINKS } from '../../core/config/business.config';
import { SEO_PAGES } from '../../core/seo/seo-pages';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-translation',
  imports: [RouterLink, PageHeroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero
      heading="Ukrainian & Russian Document Translation"
      eyebrow="Translation"
      [breadcrumbs]="crumbs"
    >
      Document translation services are available for Ukrainian ↔ English and Russian ↔ English.
    </app-page-hero>

    <section class="section" aria-labelledby="notarize-heading">
      <div class="container">
        <div class="prose">
          <h2 id="notarize-heading">Translation and Notarization</h2>
          <p>
            Mira speaks English, Ukrainian and Russian. If a translated or foreign-language document
            also needs a notarized signature, see
            <a routerLink="/services/mobile-notary">mobile notary services</a>; documents going
            abroad may need a <a routerLink="/services/apostille">California apostille</a> as well.
          </p>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="quote-heading">
      <div class="container split split--even">
        <div class="info">
          <h2 class="info-heading">Language Pairs</h2>
          <ul class="pairs">
            <li class="card pair">Ukrainian ↔ English</li>
            <li class="card pair">Russian ↔ English</li>
          </ul>
          <p class="network">
            Need another language? Additional translation services are available through our
            translation partner.
          </p>
          <div class="partner">
            <a class="partner-link" [href]="partnerUrl" target="_blank" rel="noopener sponsored">
              <img
                src="assets/referals/Translate-your-content-Language-translation-service-to-expand-your-business-4.webp"
                width="728"
                height="90"
                alt="Idiomatic Translations — professional translation services"
                loading="lazy"
                decoding="async"
              />
              <span class="sr-only"> (opens in a new tab)</span>
            </a>
            <p class="disclosure">
              If you order through this link, Mira may earn a commission at no additional cost to
              you.
            </p>
          </div>
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
    .prose {
      max-width: 48rem;
    }
    .prose a {
      text-decoration: underline;
      text-underline-offset: 2px;
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
    .partner {
      margin-top: 1.25rem;
    }
    .partner-link {
      display: block;
      max-width: 728px;
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .partner-link:focus-visible {
      outline: 2px solid var(--color-navy);
      outline-offset: 2px;
    }
    .partner-link img {
      display: block;
      width: 100%;
      height: auto;
    }
    .disclosure {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
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
export class TranslationComponent {
  protected readonly crumbs = SEO_PAGES.translation.breadcrumbs;
  protected readonly partnerUrl = EXTERNAL_LINKS.idiomaticReferral;
}
