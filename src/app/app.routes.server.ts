import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Every real page is prerendered at build time. The wildcard (404) is rendered per request so
 * the server can answer with a proper 404 status.
 *
 * Future local-SEO routes (e.g. /mobile-notary/:city) can be prerendered with
 * `getPrerenderParams` once they exist.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'services', renderMode: RenderMode.Prerender },
  { path: 'services/mobile-notary', renderMode: RenderMode.Prerender },
  { path: 'services/loan-signing', renderMode: RenderMode.Prerender },
  { path: 'services/apostille', renderMode: RenderMode.Prerender },
  { path: 'services/translation', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'pricing', renderMode: RenderMode.Prerender },
  { path: 'reviews', renderMode: RenderMode.Prerender },
  { path: 'service-area', renderMode: RenderMode.Prerender },
  { path: 'faq', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Server },
];
