import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { BUSINESS } from '../config/business.config';
import { SITE } from '../config/site.config';
import { FAQ_ITEMS } from '../../data/faq.data';
import { SERVICE_AREA_COMMUNITIES, SERVICE_AREA_COUNTIES } from '../../data/service-area.data';

export type JsonLd = Record<string, unknown>;

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

  /** Verified facts only — no address, hours, price range or coordinates. */
  businessSchema(): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'Notary',
      name: `${BUSINESS.name} by ${BUSINESS.ownerName}`,
      telephone: BUSINESS.phones.primary.href.replace('tel:', ''),
      email: BUSINESS.email,
      knowsLanguage: BUSINESS.languages,
      ...(SITE.url ? { url: SITE.url } : {}),
      areaServed: [
        ...SERVICE_AREA_COUNTIES.map((name) => ({ '@type': 'AdministrativeArea', name })),
        ...SERVICE_AREA_COMMUNITIES.map((name) => ({ '@type': 'City', name })),
      ],
      employee: { '@type': 'Person', name: BUSINESS.ownerName },
    };
  }

  faqSchema(): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    };
  }
}
