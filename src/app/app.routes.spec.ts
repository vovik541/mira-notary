import { RenderMode } from '@angular/ssr';
import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import {
  MAIN_NAV,
  MOBILE_NAV_PRIMARY,
  MOBILE_NAV_SECONDARY,
  SERVICE_LINKS,
} from './data/navigation.data';
import { SERVICES } from './data/services.data';

const routePaths = new Set(routes.map((r) => `/${r.path}`.replace(/\/$/, '') || '/'));

describe('routing', () => {
  it('every navigation link points to a real route', () => {
    const links = [
      ...MAIN_NAV,
      ...SERVICE_LINKS,
      ...MOBILE_NAV_PRIMARY,
      ...MOBILE_NAV_SECONDARY,
      ...SERVICES,
    ];
    for (const link of links) {
      expect(routePaths.has(link.path)).toBe(true);
    }
  });

  it('every route declares a unique SEO title and a description', () => {
    const seen = new Set<string>();
    for (const route of routes) {
      const seo = route.data?.['seo'] as { title: string; description: string } | undefined;
      expect(seo?.title).toBeTruthy();
      expect(seo?.description).toBeTruthy();
      expect(seen.has(seo?.title ?? '')).toBe(false);
      seen.add(seo?.title ?? '');
    }
  });

  it('describes the current service area in the Home meta description (no stale wording)', () => {
    const home = routes.find((r) => r.path === '');
    const description = (home?.data?.['seo'] as { description: string }).description;
    expect(description).toContain('Sacramento County and confirmed nearby communities');
    expect(description).toContain('English, Ukrainian and Russian');
    expect(description).not.toMatch(/Placer|Yolo|surrounding/);
  });

  it('keeps every route description free of the outdated Placer / Yolo service-area wording', () => {
    for (const route of routes) {
      const seo = route.data?.['seo'] as { description: string };
      expect(seo.description).not.toMatch(/Placer and Yolo|selected (surrounding )?communities/i);
    }
  });

  it('prerenders every page and server-renders only the wildcard', () => {
    for (const route of routes.filter((r) => r.path !== '**')) {
      const match = serverRoutes.find((s) => s.path === route.path);
      expect(match?.renderMode).toBe(RenderMode.Prerender);
    }
    expect(serverRoutes.find((s) => s.path === '**')?.renderMode).toBe(RenderMode.Server);
  });
});
