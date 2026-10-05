# Local Notary Signings by Mira Derkach

Public marketing website for Mira Derkach — mobile notary public, loan signing agent, California
apostille and document translation services in the Greater Sacramento area.

Goals, in order: get phone calls → get appointment requests → explain the services → build trust →
support future local SEO.

## Stack

- Angular 21 (standalone components, signals, built-in control flow), strict TypeScript, SCSS
- Angular SSR (`@angular/ssr` + Express) with hydration and per-route render modes
- Vitest (via `ng test`) for unit tests
- No UI framework, no Tailwind, no carousel/icon libraries — plain SCSS with design tokens
- Fonts (Inter, Manrope) are self-hosted via `@fontsource` (latin subset) and bundled by the build —
  no requests to Google Fonts or any other third party at runtime

## Prerequisites

- Node.js `^20.19`, `^22.12` or `^24` (Angular 21 requirement)
- npm 10+

## Install

```bash
npm install
```

`.npmrc` sets `legacy-peer-deps=true` to work around an npm 11.0 resolver crash
(`Cannot read properties of null (reading 'edgesOut')`). It can be removed once npm is updated.

## Develop

```bash
npm start            # dev server (client + SSR) on http://localhost:4200
npm run build        # production build: browser + server bundles + prerendered pages
npm run serve:ssr:mira-notary   # run the built SSR server on http://localhost:4000
```

## Quality

```bash
npm test             # unit tests (Vitest), add -- --no-watch for a single run
npm run format       # Prettier (write)
npm run format:check # Prettier (verify)
```

ESLint is not configured yet (`ng add angular-eslint` when wanted).

## Project structure

```
src/app/
├── core/
│   ├── config/        business.config.ts (name, phones, email, commission #, logo), site.config.ts (site URL)
│   ├── seo/           SeoService (title/description/canonical/OG per route), StructuredDataService (JSON-LD)
│   └── services/      AppointmentRequestService (backend boundary for the contact form)
├── data/              typed content: navigation, services, reviews, FAQ, pricing, service area
├── layout/            site-header, site-footer, mobile-cta (sticky mobile Call / Book bar)
├── pages/             one folder per route (home, services, mobile-notary, loan-signing, …)
├── shared/components/ icon, brand-logo, section-header, page-hero, service-card, review-card,
│                      review-carousel, faq-accordion, credential-list, check-list, price-list,
│                      cta-band, contact-card
├── app.routes.ts          lazy routes + per-route SEO data
└── app.routes.server.ts   render modes (all pages prerendered, wildcard server-rendered → real 404)
src/styles.scss            design tokens (CSS custom properties) + layout/button primitives
public/                    favicons, robots.txt, site.webmanifest, assets/
docs/reference/stitch/     OFFLINE design reference only (Stitch export code.html, DESIGN.md, PRD brief,
                           screen.png) — not served, not bundled, not used at runtime
docs/reference/source-assets/  original, unmodified client asset files
```

### Routes

`/`, `/services`, `/services/mobile-notary`, `/services/loan-signing`, `/services/apostille`,
`/services/translation`, `/about`, `/pricing`, `/reviews`, `/service-area`, `/faq`,
`/contact` (accepts `?zip=` to prefill the location), and `**` (404, `noindex`).

### Assets

| File | Used for |
| --- | --- |
| `public/assets/brand/local-notary-signings-logo.webp` | header + footer logo (800×332, transparent) |
| `public/assets/images/mira-portrait.webp` | home hero, About |
| `public/assets/images/mira-mobile-office.webp` | Loan Signing "Fully Equipped Mobile Office", About "Mobile & Ready to Work" |
| `public/assets/credentials/nna-certified-2026.webp` | home credential panel, Loan Signing, About |
| `public/*.png`, `favicon.ico`, `site.webmanifest` | favicons / app icons |

Original, unmodified source files are kept in `docs/reference/source-assets/`. The app makes no
third-party requests: every image, font and icon is local (icons are inline SVG paths in
`shared/components/icon`).

## SEO architecture

- Every page is a real URL, prerendered at build time, with one `<h1>` and semantic landmarks.
- Each route declares `data: { seo: { title, description } }` in `app.routes.ts`;
  `SeoService` applies title, description, robots, Open Graph and canonical tags on navigation.
- JSON-LD: a `Notary` business block on every page (verified facts only — no address, hours,
  price range or coordinates) and `FAQPage` on `/faq`. Add more through `StructuredDataService`.
- **Production domain TODO:** set `SITE.url` in `src/app/core/config/site.config.ts`. Until then
  canonical / `og:url` / JSON-LD `url` are deliberately omitted (no domain is invented). Also add
  the production host to `security.allowedHosts` in `angular.json` (or set `NG_ALLOWED_HOSTS`).
- **Sitemap:** not published yet (needs the real domain). Once known, generate `sitemap.xml` from
  `app.routes.ts` (excluding `**`) — e.g. a small build script writing `public/sitemap.xml` — and
  add the `Sitemap:` line to `public/robots.txt`.
- **Future local pages** (`/mobile-notary/sacramento`, …): add a route with its own `seo` data and
  a prerender entry (`getPrerenderParams`) in `app.routes.server.ts`. Do not create thin
  duplicate city pages.

## Contact form — backend TODO

The form (`pages/contact`) is a typed Reactive Form with validation, but **nothing is sent
anywhere**. `AppointmentRequestService.submit()` is the integration boundary: replace its body with
an `HttpClient` POST (add `provideHttpClient(withFetch())` to `app.config.ts`) and return
`delivered: true` only when the server confirms. Until then, after a valid submit the page states
plainly that the request was **not delivered** and offers a pre-filled `mailto:` link and the phone
number.

## Content rules

Copy comes from the approved Stitch design and brief. Do not add services, cities, claims, review
text, hours, an office address or payment methods that are not already approved. Reviews are
quoted verbatim and attributed; don't reuse their statements as business claims.
