import { Routes } from '@angular/router';
import { SEO_PAGES } from './core/seo/seo-pages';
import { RouteSeoData } from './core/seo/seo.service';

/** Title, description, robots and structured data come from the SEO registry (seo-pages.ts). */
const seo = (data: RouteSeoData): { seo: RouteSeoData } => ({ seo: data });

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    data: seo(SEO_PAGES.home),
  },
  {
    path: 'services',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/services/services.component').then((m) => m.ServicesComponent),
    data: seo(SEO_PAGES.services),
  },
  {
    path: 'services/mobile-notary',
    loadComponent: () =>
      import('./pages/mobile-notary/mobile-notary.component').then((m) => m.MobileNotaryComponent),
    data: seo(SEO_PAGES.mobileNotary),
  },
  {
    path: 'services/loan-signing',
    loadComponent: () =>
      import('./pages/loan-signing/loan-signing.component').then((m) => m.LoanSigningComponent),
    data: seo(SEO_PAGES.loanSigning),
  },
  {
    path: 'services/apostille',
    loadComponent: () =>
      import('./pages/apostille/apostille.component').then((m) => m.ApostilleComponent),
    data: seo(SEO_PAGES.apostille),
  },
  {
    path: 'services/translation',
    loadComponent: () =>
      import('./pages/translation/translation.component').then((m) => m.TranslationComponent),
    data: seo(SEO_PAGES.translation),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
    data: seo(SEO_PAGES.about),
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./pages/pricing/pricing.component').then((m) => m.PricingComponent),
    data: seo(SEO_PAGES.pricing),
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./pages/reviews/reviews.component').then((m) => m.ReviewsComponent),
    data: seo(SEO_PAGES.reviews),
  },
  {
    path: 'service-area',
    loadComponent: () =>
      import('./pages/service-area/service-area.component').then((m) => m.ServiceAreaComponent),
    data: seo(SEO_PAGES.serviceArea),
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq.component').then((m) => m.FaqComponent),
    data: seo(SEO_PAGES.faq),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact.component').then((m) => m.ContactComponent),
    data: seo(SEO_PAGES.contact),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    data: seo(SEO_PAGES.notFound),
  },
];
