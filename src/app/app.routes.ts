import { Routes } from '@angular/router';
import { BUSINESS } from './core/config/business.config';
import { RouteSeoData } from './core/seo/seo.service';

const seo = (data: RouteSeoData): { seo: RouteSeoData } => ({ seo: data });

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    data: seo({
      title: 'Mobile Notary & Loan Signing Agent in Sacramento | Mira Derkach',
      description:
        'Mobile notary and loan signing services throughout Sacramento County and confirmed nearby communities across the Greater Sacramento area. English, Ukrainian and Russian.',
    }),
  },
  {
    path: 'services',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/services/services.component').then((m) => m.ServicesComponent),
    data: seo({
      title: 'Notary, Loan Signing, Apostille & Translation Services | Mira Derkach',
      description:
        'Mobile notary, loan signing, California apostille and document translation services from Mira Derkach in the Sacramento area.',
    }),
  },
  {
    path: 'services/mobile-notary',
    loadComponent: () =>
      import('./pages/mobile-notary/mobile-notary.component').then((m) => m.MobileNotaryComponent),
    data: seo({
      title: 'Mobile Notary Services in Sacramento | Mira Derkach',
      description:
        'Mobile notary service at your home, office, hospital or another agreed location in Sacramento and nearby communities. Acknowledgments, jurats, powers of attorney and more.',
    }),
  },
  {
    path: 'services/loan-signing',
    loadComponent: () =>
      import('./pages/loan-signing/loan-signing.component').then((m) => m.LoanSigningComponent),
    data: seo({
      title: 'Loan Signing Agent in Sacramento | Mira Derkach',
      description:
        'NNA Certified loan signing agent for buyer, seller, refinance, HELOC, reverse mortgage and loan modification signings, with mobile printing and scanning.',
    }),
  },
  {
    path: 'services/apostille',
    loadComponent: () =>
      import('./pages/apostille/apostille.component').then((m) => m.ApostilleComponent),
    data: seo({
      title: 'California Apostille Services in Sacramento | Mira Derkach',
      description:
        'Assistance with California apostille processing for documents intended for use outside the United States. Transparent pricing confirmed before service.',
    }),
  },
  {
    path: 'services/translation',
    loadComponent: () =>
      import('./pages/translation/translation.component').then((m) => m.TranslationComponent),
    data: seo({
      title: 'Document Translation Services | Ukrainian, Russian & English | Mira Derkach',
      description:
        'Certified document translation for Ukrainian ↔ English and Russian ↔ English, with a professional network for additional languages. Request a quote.',
    }),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
    data: seo({
      title: 'About Mira Derkach | Sacramento Mobile Notary',
      description:
        'Meet Mira Derkach, a California Notary Public and NNA Certified Signing Agent with banking, lending and real estate experience serving the greater Sacramento area.',
    }),
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./pages/pricing/pricing.component').then((m) => m.PricingComponent),
    data: seo({
      title: 'Notary & Apostille Pricing in Sacramento | Mira Derkach',
      description:
        'Clear pricing for mobile travel, notarial services and California apostille. Final pricing is confirmed before service.',
    }),
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./pages/reviews/reviews.component').then((m) => m.ReviewsComponent),
    data: seo({
      title: 'Client Reviews | Mira Derkach Mobile Notary',
      description:
        'Read Google reviews from clients, lenders and title professionals who have worked with Mira Derkach.',
    }),
  },
  {
    path: 'service-area',
    loadComponent: () =>
      import('./pages/service-area/service-area.component').then((m) => m.ServiceAreaComponent),
    data: seo({
      title: 'Mobile Notary Service Area | Sacramento County & Greater Sacramento',
      description:
        'Mira serves Sacramento County and confirmed nearby communities across Greater Sacramento, including Roseville, Rocklin, Davis, West Sacramento, Woodland and El Dorado Hills.',
    }),
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq.component').then((m) => m.FaqComponent),
    data: seo({
      title: 'Notary FAQ | Mira Derkach Mobile Notary',
      description:
        'Answers about what to bring, travel, same-day appointments, languages, pricing, apostille and translation requests.',
    }),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact.component').then((m) => m.ContactComponent),
    data: seo({
      title: 'Request an Appointment | Mira Derkach Mobile Notary',
      description: `Request a mobile notary, loan signing, apostille or translation appointment with Mira Derkach, or call ${BUSINESS.phones.primary.display}.`,
    }),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    data: seo({
      title: 'Page Not Found | Mira Derkach Mobile Notary',
      description: 'The page you were looking for could not be found.',
      noindex: true,
    }),
  },
];
