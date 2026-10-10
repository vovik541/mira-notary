import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/seo/seo.service';
import { SiteFooterComponent } from './layout/site-footer/site-footer.component';
import { SiteHeaderComponent } from './layout/site-header/site-header.component';
import { MobileCtaComponent } from './layout/mobile-cta/mobile-cta.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, MobileCtaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main">Skip to main content</a>
    <app-site-header />
    <main id="main" tabindex="-1"><router-outlet /></main>
    <app-site-footer />
    <app-mobile-cta />
  `,
  styles: `
    :host {
      display: block;
    }
    main {
      min-height: 60vh;
      outline: none;
    }
  `,
})
export class App {
  constructor() {
    inject(SeoService).init();
  }
}
