import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SITE } from '../config/site.config';
import { SeoPage } from './seo-pages';
import { canonicalUrl, normalizeBase } from './site-url';
import { StructuredDataService } from './structured-data.service';

/** What a route's `data.seo` carries (the shared registry entry). */
export type RouteSeoData = Pick<SeoPage, 'title' | 'description'> & Partial<SeoPage>;

/** Public social-share image (crawlable, 1200×630). */
export const SOCIAL_IMAGE_PATH = '/assets/brand/social-share.png';
export const SOCIAL_IMAGE_ALT =
  'Local Notary Signings by Mira Derkach — mobile notary and loan signing agent';

/**
 * Applies per-route title / description / robots / canonical / Open Graph / Twitter tags and the
 * page's JSON-LD. Metadata comes from the SEO registry; the canonical URL is derived from the
 * registry path (never from the visited URL), so `/contact?service=apostille` canonicalizes to
 * `/contact`. Runs during SSR / prerender, so everything is in the initial HTML.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly structuredData = inject(StructuredDataService);

  /** Call once from the root component. */
  init(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const seo = this.findSeoData(this.router.routerState.snapshot.root);
        if (seo) {
          this.apply(seo, event.urlAfterRedirects);
        }
      });
  }

  apply(seo: RouteSeoData, url: string, base: string = SITE.url): void {
    const indexable = seo.indexable !== false;
    const path = seo.path ?? url;
    const canonical = indexable ? canonicalUrl(base, path) : null;
    const image = canonicalUrl(base, SOCIAL_IMAGE_PATH);

    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({
      name: 'robots',
      // Fail closed: without a configured production domain no page asks to be indexed.
      content: indexable && normalizeBase(base) !== '' ? 'index, follow' : 'noindex, follow',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE.name });
    this.meta.updateTag({ property: 'og:locale', content: SITE.locale });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });

    if (image && indexable) {
      this.meta.updateTag({ property: 'og:image', content: image });
      this.meta.updateTag({ property: 'og:image:width', content: '1200' });
      this.meta.updateTag({ property: 'og:image:height', content: '630' });
      this.meta.updateTag({ property: 'og:image:alt', content: SOCIAL_IMAGE_ALT });
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:image', content: image });
    } else {
      for (const selector of [
        "property='og:image'",
        "property='og:image:width'",
        "property='og:image:height'",
        "property='og:image:alt'",
        "name='twitter:image'",
      ]) {
        this.meta.removeTag(selector);
      }
      this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    }

    if (canonical) {
      this.meta.updateTag({ property: 'og:url', content: canonical });
      this.setCanonicalLink(canonical);
    } else {
      this.meta.removeTag("property='og:url'");
      this.setCanonicalLink(null);
    }

    if (indexable && seo.key) {
      this.structuredData.applyPage(seo as SeoPage, base);
    } else {
      this.structuredData.remove('page');
    }
  }

  /** Canonical URL for a router path, or null while no production origin is configured. */
  canonicalUrl(url: string): string | null {
    return canonicalUrl(SITE.url, url);
  }

  private findSeoData(snapshot: ActivatedRouteSnapshot): RouteSeoData | null {
    let current: ActivatedRouteSnapshot | null = snapshot;
    let found: RouteSeoData | null = null;
    while (current) {
      const data = current.data['seo'] as RouteSeoData | undefined;
      if (data) {
        found = data;
      }
      current = current.firstChild;
    }
    return found;
  }

  private setCanonicalLink(href: string | null): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
