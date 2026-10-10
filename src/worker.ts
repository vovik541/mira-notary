import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { SITE } from './app/core/config/site.config';
import { APPOINTMENT_ENDPOINT } from './shared/appointment.model';
import { handleAppointmentRequest } from './worker/appointments-handler';
import { WorkerEnv } from './worker/env';
import { seoFileResponse, withIndexingPolicy } from './worker/seo-files';

/**
 * Cloudflare Worker entry point (built by `ng build`, deployed with `wrangler deploy`).
 *
 * - `/api/appointments` → appointment email API (server-side only)
 * - `/robots.txt`, `/sitemap.xml` → generated from the SEO registry and `SITE.url`
 * - everything else     → Angular SSR (prerendered pages and static files are served by the
 *                         Workers Assets layer before this code runs; `public/_headers` adds
 *                         `X-Robots-Tag: noindex` to those on workers.dev)
 */
const angularApp = new AngularAppEngine();

const renderAngular = async (request: Request): Promise<Response> =>
  (await angularApp.handle(request)) ?? new Response('Not found', { status: 404 });

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname, host } = new URL(request.url);

    if (pathname === APPOINTMENT_ENDPOINT) {
      return handleAppointmentRequest(request, env);
    }
    if (pathname.startsWith('/api/')) {
      return new Response(null, { status: 404 });
    }
    const seoFile = seoFileResponse(pathname, host, SITE.url);
    if (seoFile) {
      return seoFile;
    }
    return withIndexingPolicy(await renderAngular(request), SITE.url, host);
  },
};

/** Used by `ng serve` (Angular dev server); the API is only available under `wrangler dev`. */
export const reqHandler = createRequestHandler(renderAngular);
