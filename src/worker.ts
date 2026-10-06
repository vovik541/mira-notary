import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { APPOINTMENT_ENDPOINT } from './shared/appointment.model';
import { handleAppointmentRequest } from './worker/appointments-handler';
import { WorkerEnv } from './worker/env';

/**
 * Cloudflare Worker entry point (built by `ng build`, deployed with `wrangler deploy`).
 *
 * - `/api/appointments` → appointment email API (server-side only)
 * - everything else     → Angular SSR (prerendered pages and static files are served by the
 *                         Workers Assets layer before this code runs)
 */
const angularApp = new AngularAppEngine();

const renderAngular = async (request: Request): Promise<Response> =>
  (await angularApp.handle(request)) ?? new Response('Not found', { status: 404 });

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === APPOINTMENT_ENDPOINT) {
      return handleAppointmentRequest(request, env);
    }
    if (pathname.startsWith('/api/')) {
      return new Response(null, { status: 404 });
    }
    return renderAngular(request);
  },
};

/** Used by `ng serve` (Angular dev server); the API is only available under `wrangler dev`. */
export const reqHandler = createRequestHandler(renderAngular);
