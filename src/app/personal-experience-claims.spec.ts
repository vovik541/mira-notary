import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SEO_PAGE_LIST } from './core/seo/seo-pages';
import { organizationSchema, pageGraph, personSchema } from './core/seo/structured-data';
import { FAQ_ITEMS } from './data/faq.data';
import * as PRICING from './data/pricing.data';
import { REVIEWS } from './data/reviews.data';
import { SERVICES, WHY_MIRA } from './data/services.data';
import { SiteFooterComponent } from './layout/site-footer/site-footer.component';
import { AboutComponent } from './pages/about/about.component';
import { ApostilleComponent } from './pages/apostille/apostille.component';
import { FaqComponent } from './pages/faq/faq.component';
import { HomeComponent } from './pages/home/home.component';
import { LoanSigningComponent } from './pages/loan-signing/loan-signing.component';
import { MobileNotaryComponent } from './pages/mobile-notary/mobile-notary.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { PricingComponent } from './pages/pricing/pricing.component';
import { ReviewsComponent } from './pages/reviews/reviews.component';
import { ServiceAreaComponent } from './pages/service-area/service-area.component';
import { ServicesComponent } from './pages/services/services.component';
import { TranslationComponent } from './pages/translation/translation.component';

/** The website does not use the phrase at all — not for services, SEO or personal background. */
const REAL_ESTATE = /real[\s-]*estate/i;

/** Personal real-estate career claims (also covered by the blanket rule above). */
const PERSONAL_CLAIMS: readonly RegExp[] = [
  /real estate experience/i,
  /since 2010/i,
  /appraisers?,?\s+inspectors?/i,
  /buyers, sellers, title and escrow professionals/i,
];

const PAGES: readonly [string, Type<unknown>][] = [
  ['Home', HomeComponent],
  ['About', AboutComponent],
  ['Services', ServicesComponent],
  ['Mobile Notary', MobileNotaryComponent],
  ['Loan Signing', LoanSigningComponent],
  ['Apostille', ApostilleComponent],
  ['Translation', TranslationComponent],
  ['Pricing', PricingComponent],
  ['FAQ', FaqComponent],
  ['Reviews', ReviewsComponent],
  ['Service Area', ServiceAreaComponent],
  ['Not Found', NotFoundComponent],
  ['Footer', SiteFooterComponent],
];

function renderedHtml(component: Type<unknown>): string {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  // innerHTML also covers alt text, aria-labels and other attributes, not only visible text.
  return (fixture.nativeElement as HTMLElement).innerHTML;
}

describe('production content never mentions "real estate"', () => {
  it.each(PAGES)('%s page (text, alt text and attributes)', (_name, component) => {
    const html = renderedHtml(component);
    expect(html).not.toMatch(REAL_ESTATE);
    for (const pattern of PERSONAL_CLAIMS) {
      expect(html.replace(/\s+/g, ' ')).not.toMatch(pattern);
    }
  });

  it('shared data: services, why-Mira cards, FAQ, pricing and reviews', () => {
    const data = JSON.stringify([SERVICES, WHY_MIRA, FAQ_ITEMS, PRICING, REVIEWS]);
    expect(data).not.toMatch(REAL_ESTATE);
  });

  it('SEO metadata: titles, descriptions and every other SEO field', () => {
    expect(JSON.stringify(SEO_PAGE_LIST)).not.toMatch(REAL_ESTATE);
    for (const page of SEO_PAGE_LIST) {
      expect(`${page.title} ${page.description}`).not.toMatch(REAL_ESTATE);
    }
  });

  it('structured data: Organization, Person and every page graph', () => {
    const origin = 'https://miranotary.com';
    expect(JSON.stringify(organizationSchema(origin))).not.toMatch(REAL_ESTATE);
    expect(JSON.stringify(personSchema(origin))).not.toMatch(REAL_ESTATE);
    for (const page of SEO_PAGE_LIST) {
      expect(JSON.stringify(pageGraph(page, origin))).not.toMatch(REAL_ESTATE);
    }
  });

  it('keeps the approved loan-signing and banking/lending terms', () => {
    const loan = renderedHtml(LoanSigningComponent).replace(/\s+/g, ' ');
    expect(loan).toContain('loan and lending transactions');
    expect(loan).toContain('more than 16 years in banking and consumer lending.');
    expect(WHY_MIRA.map((item) => item.title)).toEqual([
      'Banking & Lending Background',
      'Trilingual Service',
      'Fully Mobile',
    ]);
  });
});
