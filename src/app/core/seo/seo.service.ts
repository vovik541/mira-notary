import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SITE } from '../config/site.config';

export interface RouteSeoData {
  readonly title: string;
  readonly description: string;
  /** Set on pages that should not be indexed (e.g. the 404 page). */
  readonly noindex?: boolean;
}

/**
 * Applies per-route title / description / canonical / Open Graph tags.
 * Routes declare their metadata in `data: { seo: RouteSeoData }`.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

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

  apply(seo: RouteSeoData, url: string): void {
    this.title.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({
      name: 'robots',
      content: seo.noindex ? 'noindex, follow' : 'index, follow',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE.name });
    this.meta.updateTag({ property: 'og:locale', content: SITE.locale });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });

    const canonical = this.canonicalUrl(url);
    if (canonical && !seo.noindex) {
      this.meta.updateTag({ property: 'og:url', content: canonical });
      this.setCanonicalLink(canonical);
    } else {
      this.meta.removeTag("property='og:url'");
      this.setCanonicalLink(null);
    }
  }

  /** Canonical URL for a router path, or null while no production origin is configured. */
  canonicalUrl(url: string): string | null {
    if (!SITE.url) {
      return null;
    }
    const path = url.split(/[?#]/)[0];
    return `${SITE.url}${path === '/' ? '' : path}` || SITE.url;
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
