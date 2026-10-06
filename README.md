# Local Notary Signings by Mira Derkach

Public marketing website for Mira Derkach — mobile notary public, loan signing agent, California
apostille and document translation services in the Greater Sacramento area.

Goals, in order: get phone calls → get appointment requests → explain the services → build trust →
support future local SEO.

## Stack

- Angular 21 (standalone components, signals, built-in control flow), strict TypeScript, SCSS
- Angular SSR (`@angular/ssr`) running on **Cloudflare Workers**, with hydration and per-route render modes
- A small server-side API in the same Worker (`POST /api/appointments` → Resend)
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
npm start                  # ng dev server (client + SSR) on http://localhost:4200 — no API
npm run build              # production build: Worker bundle + static assets + prerendered pages
npm run preview:cloudflare # build, then run the real Worker locally (wrangler dev) — API works
npm run deploy             # build, then wrangler deploy
```

`ng serve` cannot run Cloudflare bindings, so the appointment form shows the "please call Mira"
fallback there. For the full flow use `npm run preview:cloudflare` (copy `.dev.vars.example` to
`.dev.vars` first, and browse `http://localhost:8788`, not `127.0.0.1`, because of the SSR host
allow-list).

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
│   └── services/      AppointmentRequestService (POSTs the contact form to /api/appointments)
├── data/              typed content: navigation, services, reviews, FAQ, pricing, service area
├── layout/            site-header, site-footer, mobile-cta (sticky mobile Call / Book bar)
├── pages/             one folder per route (home, services, mobile-notary, loan-signing, …)
├── shared/components/ icon, brand-logo, section-header, page-hero, service-card, review-card,
│                      review-carousel, faq-accordion, credential-list, check-list, price-list,
│                      cta-band, contact-card
├── app.routes.ts          lazy routes + per-route SEO data
└── app.routes.server.ts   render modes (all pages prerendered, wildcard server-rendered → real 404)
src/worker.ts              Cloudflare Worker entry: /api/appointments + Angular SSR
src/worker/                appointment API: validation, Turnstile, email content, provider boundary + Resend adapter, handler (+ specs)
src/shared/                request/response types shared by Angular and the Worker
wrangler.jsonc             Worker config: assets, rate limit, email vars
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
third-party requests (other than the Turnstile script on `/contact`, see below): every image, font and icon is local (icons are inline SVG paths in
`shared/components/icon`).

## SEO architecture

- Every page is a real URL, prerendered at build time, with one `<h1>` and semantic landmarks.
- Each route declares `data: { seo: { title, description } }` in `app.routes.ts`;
  `SeoService` applies title, description, robots, Open Graph and canonical tags on navigation.
- JSON-LD: a `Notary` business block on every page (verified facts only — no address, hours,
  price range or coordinates) and `FAQPage` on `/faq`. Add more through `StructuredDataService`.
- **Production domain TODO:** set `SITE.url` in `src/app/core/config/site.config.ts`. Until then
  canonical / `og:url` / JSON-LD `url` are deliberately omitted (no domain is invented). Also add
  the production host to `security.allowedHosts` in `angular.json`.
- **Sitemap:** not published yet (needs the real domain). Once known, generate `sitemap.xml` from
  `app.routes.ts` (excluding `**`) — e.g. a small build script writing `public/sitemap.xml` — and
  add the `Sitemap:` line to `public/robots.txt`.
- **Future local pages** (`/mobile-notary/sacramento`, …): add a route with its own `seo` data and
  a prerender entry (`getPrerenderParams`) in `app.routes.server.ts`. Do not create thin
  duplicate city pages.

## Appointment Email

The contact form posts to **`POST /api/appointments`**, handled by the same Worker that serves the
site (no separate backend, no database, nothing stored):

```
Angular form → POST /api/appointments → validate → rate limit → Turnstile siteverify → Resend API → recipient inbox
```

- Validation is repeated server-side (`src/worker/appointment-validation.ts`): allowed services and
  languages, required fields, lengths, email format, ISO date, header-injection characters.
- Turnstile is mandatory and verified server-side with the Worker secret (fail closed).
- Email goes through a provider boundary (`src/worker/email-provider.ts`). The only adapter is
  `ResendEmailSender` (`src/worker/resend-email-sender.ts`): a plain `fetch` call to
  `POST https://api.resend.com/emails` with `Authorization: Bearer <RESEND_API_KEY>`, JSON body
  `from`, `to`, `subject`, `html`, `text`, `reply_to`. No SDK. One attempt, 8 s timeout, no retries.
  Switching provider means writing another adapter; the form and validation do not change.
- **Sender and recipient come only from Worker configuration** (`EMAIL_FROM_ADDRESS`,
  `EMAIL_FROM_NAME`, `APPOINTMENT_RECIPIENT`). The browser payload cannot set `to`, `from`,
  `reply_to`, headers or the subject; extra fields in the request are ignored.
- The visitor's email (if valid) is used only as **Reply-To**, so Mira can press Reply.
- The HTML email is built from escaped values, with a plain-text alternative.
- Success is reported to the visitor only after Resend answers 2xx with a message id. Failures
  (network, timeout, 4xx, 5xx, malformed response) return a generic "please call Mira" message.
- Logs contain only categories, field names, Resend HTTP status, the Resend message id and the
  Cloudflare ray id — never names, phones, emails, message text, the recipient or any secret.
- Rate limiting: Workers Rate Limiting binding `APPOINTMENT_RATE_LIMIT` (5 requests / 60 s per IP per
  Cloudflare location, approximate). Turnstile remains the primary protection. For stricter control
  add a Cloudflare WAF rate-limiting rule for `POST /api/appointments`.

### Configuration

| Value | Kind | Where |
| --- | --- | --- |
| `RESEND_API_KEY` | **secret** | `npx wrangler secret put RESEND_API_KEY` (restricted "sending access" key) |
| `TURNSTILE_SECRET_KEY` | **secret** | `npx wrangler secret put TURNSTILE_SECRET_KEY` |
| `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | non-secret | `wrangler.jsonc` → `vars` |
| `APPOINTMENT_RECIPIENT` | non-secret, server-only | `wrangler.jsonc` → `vars` (empty until set) |
| Turnstile **site key** | public | `turnstileSiteKey` in `src/app/core/config/site.config.ts` |

Secrets never go in git, `src/`, `public/` or any Angular file. Local development reads them from
`.dev.vars` (git-ignored; copy `.dev.vars.example`).

If `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` or `APPOINTMENT_RECIPIENT` is missing, the API answers with
the "please call Mira" fallback and sends nothing.

### Transactional Email — Resend

- Resend handles **outgoing transactional messages only** (the appointment notification).
- **Current test sending domain: `notify.reiskra.com`** (sender `appointments@notify.reiskra.com`).
  This is **temporary test infrastructure** belonging to ReIskra, not Mira's domain. It must be
  replaced with Mira's own verified Resend sending domain before launch, and it must never appear
  in the website UI, SEO metadata or structured data (it appears only in server configuration).
- **Future production:** sending domain `notify.<MIRA_DOMAIN>`, sender
  `appointments@notify.<MIRA_DOMAIN>`, recipient `MiraNotary@gmail.com` or Mira's custom-domain
  mailbox (e.g. Proton).
- Resend and normal mailboxes stay independent. Mira's DNS can live in Cloudflare, her everyday mail
  (`mira@<MIRA_DOMAIN>`) can use Proton or Google Workspace MX records on the root domain, and the
  website sender uses only the isolated `notify.` subdomain. **Do not replace or edit the
  root-domain MX records** to set up Resend.
- Add only the DNS records Resend lists for the sending domain (they are generated per domain, so
  none are hard-coded here), wait until the domain shows as verified in Resend, then create a
  restricted sending API key and store it as the `RESEND_API_KEY` Worker secret.

### One controlled real test (local)

1. In Resend: verify `notify.reiskra.com` (done) and create a restricted sending API key.
2. In your git-ignored `.dev.vars` add: `RESEND_API_KEY=<key>` and
   `APPOINTMENT_RECIPIENT=<your own test mailbox>` (sender defaults to the value in
   `wrangler.jsonc`).
3. `npm run preview:cloudflare`, open `http://localhost:8788/contact`. Locally use Turnstile's dummy
   site key by temporarily setting `turnstileSiteKey` to `1x00000000000000000000AA` (the dummy
   secret in `.dev.vars.example` accepts it) — revert it afterwards.
4. Submit **one** form and check the inbox: subject, HTML rendering, plain-text part, Reply-To.

### Deploy checklist

1. `npx wrangler secret put RESEND_API_KEY` and `npx wrangler secret put TURNSTILE_SECRET_KEY`.
2. Set `APPOINTMENT_RECIPIENT` in `wrangler.jsonc` → `vars` (and confirm `EMAIL_FROM_*`).
3. Create a Turnstile widget for the production hostname and put its **site key** in
   `site.config.ts`.
4. Add the production hostname to `security.allowedHosts` in `angular.json` (`localhost` and
   `*.workers.dev` are already allowed) and set `SITE.url`.
5. `npm run deploy`.

### Migrating from the test setup to Mira's production setup (configuration only)

1. Add Mira's `notify.<MIRA_DOMAIN>` in Resend, add the DNS records Resend shows, wait for
   verification.
2. Create a new restricted Resend API key for it →
   `npx wrangler secret put RESEND_API_KEY`.
3. In `wrangler.jsonc` → `vars`: `EMAIL_FROM_ADDRESS` = `appointments@notify.<MIRA_DOMAIN>`,
   `APPOINTMENT_RECIPIENT` = `MiraNotary@gmail.com` (or her mailbox). Remove the "TEST" comment.
4. `npm run deploy`. No application code changes.

## Content rules

Copy comes from the approved Stitch design and brief. Do not add services, cities, claims, review
text, hours, an office address or payment methods that are not already approved. Reviews are
quoted verbatim and attributed; don't reuse their statements as business claims.
