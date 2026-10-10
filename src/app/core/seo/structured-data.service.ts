import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { SITE } from '../config/site.config';
import { SeoPage } from './seo-pages';
import { normalizeBase } from './site-url';
import { JsonLd, pageGraph } from './structured-data';

export type { JsonLd } from './structured-data';

/** Adds / replaces / removes `<script type="application/ld+json">` blocks in the document head. */
@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  private readonly document = inject(DOCUMENT);

  set(id: string, data: JsonLd): void {
    const elementId = `ld-${id}`;
    let script = this.document.getElementById(elementId);
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', elementId);
      this.document.head.appendChild(script);
    }
    // `<` is escaped so the payload can never close the script element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }

  remove(id: string): void {
    this.document.getElementById(`ld-${id}`)?.remove();
  }

  /** The page's `@graph` (WebSite / Organization / Person / Service / BreadcrumbList). */
  applyPage(page: SeoPage, origin: string = SITE.url): void {
    const graph = pageGraph(page, normalizeBase(origin));
    if (graph) {
      this.set('page', graph);
    } else {
      this.remove('page');
    }
  }
}
