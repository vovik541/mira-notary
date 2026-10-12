import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MobileCtaBlockerDirective } from '../../layout/mobile-cta/mobile-cta-markers.directive';
import {
  EXTERNAL_LINKS,
  GOOGLE_BUSINESS_PROFILE_URL,
  SERVICE_AREA_MAP,
} from '../../core/config/business.config';

/** Google My Maps service-area map + outbound Google actions. Optional: the page works without it. */
@Component({
  selector: 'app-service-area-map',
  imports: [MobileCtaBlockerDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section section--alt" aria-labelledby="map-heading" appMobileCtaBlocker>
      <div class="container">
        <h2 id="map-heading">Service Area Map</h2>
        <p class="muted">
          View Mira's mobile notary service area across Sacramento and nearby communities. Locations
          near or outside the highlighted area may still be available upon request.
        </p>
        <div class="frame">
          <iframe
            [src]="embedUrl"
            [attr.title]="map.title"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
          ></iframe>
        </div>
        <div class="actions">
          <a
            class="btn btn--outline"
            [href]="map.viewerUrl"
            target="_blank"
            rel="noopener noreferrer"
            >Open Service Area Map<span class="sr-only"> (opens in a new tab)</span></a
          >
          @if (businessProfileUrl) {
            <a
              class="btn btn--outline"
              [href]="businessProfileUrl"
              target="_blank"
              rel="noopener noreferrer"
              >View Google Business Profile<span class="sr-only"> (opens in a new tab)</span></a
            >
          }
          <a class="btn btn--gold" [href]="reviewUrl" target="_blank" rel="noopener noreferrer"
            >Leave a Google Review<span class="sr-only"> (opens in a new tab)</span></a
          >
        </div>
      </div>
    </section>
  `,
  styles: `
    h2 {
      font-size: 1.25rem;
    }
    .muted {
      margin-top: 0.5rem;
      max-width: 48rem;
    }
    .frame {
      margin-top: 1.25rem;
      min-height: 26rem;
      height: 70vh;
      max-height: 40rem;
      overflow: hidden;
      background: var(--color-well);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }
    @media (min-width: 640px) {
      .actions {
        flex-direction: row;
        flex-wrap: wrap;
      }
    }
    @media (min-width: 768px) {
      .frame {
        height: auto;
        min-height: 0;
        max-height: none;
        aspect-ratio: 16 / 9;
      }
    }
  `,
})
export class ServiceAreaMapComponent {
  protected readonly map = SERVICE_AREA_MAP;
  protected readonly businessProfileUrl = GOOGLE_BUSINESS_PROFILE_URL;
  protected readonly reviewUrl = EXTERNAL_LINKS.googleReview;
  /** Trusted: a constant from the business config, never user input. */
  protected readonly embedUrl: SafeResourceUrl = inject(
    DomSanitizer,
  ).bypassSecurityTrustResourceUrl(SERVICE_AREA_MAP.embedUrl);
}
