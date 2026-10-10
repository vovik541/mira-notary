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

## Form validation, ZIP service area and service prefill

- **Shared rules:** `src/shared/validation.ts` (names, phone, email, dates), `src/shared/service-area.ts`
  (ZIP data and helpers) and `src/shared/appointment.model.ts` (services, limits, slugs) are imported by
  **both** the Angular form and the Worker, so browser and server cannot drift. The Worker stays
  authoritative: a forged request with a bad email, a missing name or a malformed ZIP is rejected
  with 400 before Turnstile or Resend are touched.
- **Required fields:** First Name, Last Name, Phone, Email, Service, ZIP Code, Preferred Date,
  Preferred Time (a structured choice, see below), and the contact-permission checkbox. Optional: number of signers, language,
  details (≤ 3000 chars), photos. (The old "Number of Documents" field was removed everywhere.)
- **Names (first and last):** required, ≤ 50 characters, Unicode letters of any script with single
  separators — a space, an apostrophe (' or ’) or a hyphen — only BETWEEN letter groups: Mira,
  O'Connor, O’Connor, Anne-Marie, Smith-Jones, Anna Maria, José, Мирослава are valid; digits, any other
  punctuation, and leading/trailing or doubled separators are not (John123, Mira@, John_Doe, 'John,
  John-, -John, John--Smith, John''Smith, John  Smith). The `appNameInput` directive filters while typing and
  pasting (keeps letters, spaces and both apostrophes, never changes case, caps at 50, trims on blur);
  the Worker re-validates with the same shared pattern and rejects (never trims or truncates).
- **Email:** required, ≤ 120 characters (`maxlength="120"`, client and Worker), no spaces, same
  `local@domain.tld` pattern on both sides. An over-long email is rejected, not truncated.
- **Phone:** a U.S. number **without** country code — exactly ten digits. The field is live-formatted by
  the `appPhoneInput` directive (`src/app/shared/directives/phone-input.directive.ts`, pure helpers in
  `src/shared/phone.ts`; adapted from the personal-page phone input: strip to digits, cap, reformat,
  restore the caret from the digits before it): typing `2795550100` shows `(2` → `(27` → `(279)` →
  `(279) 5` … `(279) 555-0100`. An 11th digit is refused (nothing grows or shifts); a paste is merged at
  the selection and formatted, but a paste that contains `+` or would exceed ten digits is rejected whole
  — never truncated into another number. Backspace/Delete over punctuation removes the neighbouring digit
  and the caret is preserved, so editing in the middle works. `maxlength="14"` only matches the longest
  display; the digit cap is the formatter's. Representations: the **Angular control holds the display
  text** (`(279) 555-0100`, so the validator and the red "Enter a valid 10-digit phone number." message
  see exactly what the user sees); the **request carries the ten digits** (`2795550100`); the Worker
  re-validates (ten digits, only spaces ( ) - tolerated, no `+`, no 11 digits) and the email shows it as
  `(279) 555-0100`.
- **Number of Signers:** optional; a numeric **text** field (`appDigitsInput`: digits only, 3 characters,
  no spinner), valid when 1–50. Leading zeros are normalized (`007` → 7); the client sends an integer and
  the Worker accepts only an integer from 1 to 50.
- Limits live in `src/shared/validation.ts` (`NAME_MAX_LENGTH`, `EMAIL_MAX_LENGTH`,
  `PHONE_DIGIT_COUNT`, `PHONE_INPUT_MAX_LENGTH`, `MIN_SIGNERS`, `MAX_SIGNERS`, `SIGNERS_INPUT_MAX_LENGTH`) and
  are imported by both sides.
- **Submit button:** one computed `canSubmit` (not sending, every field valid incl. consent and a valid
  Specific Time, no rejected photo selection). When it is disabled a single small red line under the
  button says why, by priority: photo problem → "Complete the required fields and agree to be contacted."
  → "Please agree to be contacted before submitting." → "Please choose a valid appointment time." (only a
  bad Specific Time) → "Please complete the required fields correctly." Same-day and Sunday requests never
  disable it. The consent field keeps its own helper.
- **UX:** errors appear after a field is left or on a submit attempt (never on page load), clear as
  soon as the value is corrected, use `aria-invalid` + `aria-describedby`, and an invalid submit
  focuses the first invalid field without calling the API.
- **ZIP data (two separate sets, both static and in-memory — no database or ZIP API):**
  `SACRAMENTO_COUNTY_ZIP_CODES` is *reference data*: exactly 131 ZIP codes from the State of
  California county-by-ZIP lookup, never edited to change coverage. `SUPPORTED_SERVICE_ZIP_CODES` is
  Mira's *confirmed online service area* (150 ZIPs today): the union of the Sacramento County set and
  `ADDITIONAL_CONFIRMED_SERVICE_ZIP_CODES` (19 ZIPs). It decides whether a ZIP is shown as "confirmed" (the form is accepted either way)
  automatically. The Contact form, the Service Area page and the Worker all use the same `checkZip`.
- **Confirmed nearby communities:** `CONFIRMED_NEARBY_COMMUNITIES` in `src/shared/service-area.ts`
  (community → county → ZIPs) is the single table behind the extra ZIPs, the "Confirmed Service Area"
  groups, the Home chips and the structured-data `areaServed`. Only individually confirmed
  communities are listed (Placer: Roseville, Rocklin, Lincoln, Loomis, Granite Bay, Auburn; Yolo:
  West Sacramento, Davis, Woodland; El Dorado: El Dorado Hills, Cameron Park) — never whole
  counties. Sacramento County alone is confirmed countywide. To extend coverage, add a row to that
  table; no validator or component changes. (Auburn PO Box ZIP 95604 is deliberately excluded.)
- **ZIP syntax:** exactly five digits, `^\d{5}$`. No ZIP+4, no trimming, no coercion: `95814-1234`,
  ` 95814 `, `9581`, `958140` and `9581A` are invalid (the Worker answers 400). Format is checked
  *before* the service area, so a malformed ZIP is never reported as "unconfirmed".
- **ZIP input (UI):** both ZIP fields use the shared `appZipInput` directive
  (`src/app/shared/directives/zip-input.directive.ts`): `type="text"` (never `number`),
  `inputmode="numeric"`, `autocomplete="postal-code"`, `maxlength="5"`, digits only. Typing and pasting
  are sanitized by `sanitizeZipInput` (`95a81-4` → `95814`, `123456` → `12345`); sanitizing is separate
  from validating. Errors appear after blur or a submit/Check attempt, never on page load.
- **ZIPs outside the standard service area (non-blocking):** the form checks that a ZIP is *well-formed*
  (exactly five digits) — it does not verify that the ZIP exists in USPS data (no external ZIP API). A
  well-formed ZIP outside the standard (confirmed) set is NOT an error: a short, amber note under the
  date row says "Outside standard service area — you can still submit. Mira will confirm travel
  availability and fee." (`role="note"`, no `aria-invalid`, no red border) and Submit stays available.
  The Worker accepts it too, and the email says "Service Area: Outside standard service area — confirm
  travel availability and fee" (or "Standard service area"). Only a malformed ZIP is a red error that
  blocks submission, on both sides. The Service Area page's checker still reports confirmed / not
  confirmed from the same `checkZip`.
- **Prefill:** `/contact?service=<slug>&zip=<zip>`. Slugs: `general-notary`, `loan-signing`,
  `california-apostille`, `document-translation`, `living-trust-estate`, `power-of-attorney`. Strict
  whitelist; anything unknown or missing selects General Notary. A ZIP from the URL is only used if
  it is exactly five digits (`?zip=9581` and `?zip=95814-1234` are ignored) and is then validated like
  typed input (e.g. `?zip=90210` is prefilled and shows the unconfirmed-area message). Service-specific CTAs pass their slug
  (`CtaBandComponent` takes an optional `service` input); generic CTAs stay plain `/contact`.

## Appointment wizard and session draft

The Contact form is **one Angular form shown in three steps** (no separate forms, no per-step routes):
1. **Appointment Details** — service, ZIP, date, preferred time (+ specific time), number of signers, and
   their notes (outside-area note, same-day / Sunday callouts, hours helper).
2. **Your Information** — first/last name, phone, email, preferred language.
3. **Request Details** — a compact recap of step 1 (service, "Oct 12, 2026 · Morning", ZIP; no personal
   data; "Edit appointment details" returns to step 1), additional details, photos, consent, privacy
   notice, Turnstile and the only submit button.

- **Validation:** *Continue* marks and checks **only the current step's controls** with the existing
  validators (a ZIP outside the standard area, same-day and Sunday all continue), stays put and focuses the
  first invalid field. A small red line under Continue (steps 1–2, visible from the start while the
  fields stay neutral) says what still blocks the step: "Please complete: …" (empty), "Please fix: …"
  (filled but invalid) or "Please complete or fix: …" (mixed); it is derived from the real controls, so an
  outside-area ZIP, an out-of-hours time and the optional Number of Signers (when empty) never appear.
  *Back* never clears or revalidates. A final submit that finds an earlier step
  invalid jumps to the earliest invalid step. Enter inside a field on steps 1–2 means "Continue".
- **History:** the step lives in `history.state` (`wizardStep`); the URL stays `/contact` (plus the
  legitimate `?service=` / `?zip=`). Continue pushes an entry, the browser Back/Forward buttons move
  between steps (clamped to the first invalid step, never pushing), and Back on step 1 leaves the page
  normally. The UI Back button uses `history.back()` so the stack never grows.
- **Progress / a11y:** an `ol` with `aria-current="step"`, "Step N of 3" + a step heading that receives
  focus on every change; phones show numbered dots only (no horizontal scroll). Steps swap with no slide
  animation (a 120 ms fade, off under `prefers-reduced-motion`).
- **Session draft** (`AppointmentDraftService`, tab-scoped `sessionStorage` only — never localStorage,
  the URL, a server, KV or a database): saved debounced (300 ms) and on every step change; restored after
  F5 / re-entry; expires after **2 hours**; version-checked; a corrupt, expired, tampered or unsupported
  draft is wiped silently; wiped on successful submission.
  - Stored in plain (non-sensitive): step, service, ZIP, date, time preference, specific time, signers,
    language, "photos were selected" flag, version, timestamp.
  - Stored **encrypted** (AES-GCM via Web Crypto, random IV per save): first/last name, phone, email,
    additional details. Opaque blob; no readable PII in storage.
  - **Never** stored: contact consent (always unticked after a reload), photos in any form (the form says
    they must be selected again), the Turnstile token.
  - Restore never marks fields touched; the restored step is never later than the first invalid step; an
    explicit `?service=` or well-formed `?zip=` beats the draft's value.
- **What the encryption is (not) for:** the AES key sits in the same sessionStorage (a pure front end has
  nowhere safer), so it does **not** protect against script running on this origin (XSS, a malicious
  extension) or anyone who can read the live tab. It only avoids leaving customer data as readable plain
  text in browser storage. Without Web Crypto (non-secure context) only the non-sensitive fields persist.
  A refresh within ~300 ms of the last keystroke can lose that last edit.

## Appointment Email

The contact form posts to **`POST /api/appointments`**, handled by the same Worker that serves the
site (no separate backend, no database, nothing stored):

```
Angular form → multipart POST /api/appointments → basic validation → consent → structured time →
ZIP / service → photo validation → Turnstile siteverify → Resend API (+ attachments) → inbox
```

### Photo attachments (optional, not stored)

- 0–5 photos; JPEG, PNG, WebP, HEIC/HEIF; ≤ 5 MB each; ≤ 15 MB in total. Nothing is written to a
  database, R2, KV or any storage: photos exist only while the request is processed and are sent to
  Resend as base64 email attachments (`attachments[{filename, content, content_type}]`).
- **Transport:** `multipart/form-data` on the same endpoint — one `payload` text part (JSON, typed
  booleans/numbers, ≤ 32 KB) plus repeated `photos` file parts. `AppointmentRequestService` builds the
  `FormData`; the components never see multipart. JSON posts are no longer accepted.
- **Request limit:** the Worker reads at most 15 MB + 1 MB overhead (`MAX_REQUEST_BYTES`), checking the
  declared Content-Length and counting while streaming; larger bodies get 413 with a clear message.
- **Server validation is authoritative** (`src/shared/photos.ts`, `src/worker/photo-processing.ts`):
  count, non-empty, size per file and total, allowed MIME, and the file signature (magic bytes) must
  match the declared type. Filenames are sanitized (basename, safe characters, extension that
  matches the verified type, never used as a path). Photo problems stop the request **before**
  Turnstile (the single-use token is not burned) and before Resend; Base64 encoding happens only after
  Turnstile succeeds.
- **Privacy:** logs contain only the photo count and aggregate bytes — never file names or contents.
  The form shows a Privacy Notice (this site does not save submissions in a website database; the
  email and attachments may be retained by Mira's email provider and the delivery service).
- Resend allows 40 MB per email after base64 (~33 % growth): 15 MB of photos is well within that.
  Attachment requests use a 30 s timeout (8 s without photos); still a single attempt.
- **Browser:** thumbnails use object URLs, which are revoked on remove, after success and on
  destroy. HEIC/HEIF files are accepted but show a placeholder (most browsers cannot render them).

### Preferred time (structured, standard hours)

There is no free-text time. The form has a `<select>` — Morning, Afternoon, Evening, Flexible / Any Time,
Specific Time — and, only for Specific Time, an `<input type="time">` with the note "Standard appointment
hours: 8:00 AM–8:00 PM. Need another time? Call Mira to check availability." (`tel:+12795298754`). There
are deliberately no "before / after hours" options.

The contract is `timePreference` (`morning | afternoon | evening | flexible | specific`) plus
`specificTime` (`HH:mm` or `null`), shared in `src/shared/appointment-timing.ts`. The Angular control
validates required + well-formed HH:mm (only while "specific" is selected) and the Worker validates
independently: unknown preferences, `specific` without a well-formed time, and any time sent with a
non-specific preference are rejected with 400. A legacy `preferredTime` string is not accepted.

**Standard hours (8:00 AM–8:00 PM, inclusive) are advisory, not a validation rule.** A well-formed time
outside them (07:30, 20:30, 23:00 …) keeps the control and the form valid, Continue and Submit stay
available (no red border, no `aria-invalid`); the form shows the same amber advisory note as the ZIP
note — "Outside standard hours — you can still submit. Mira will confirm availability and any additional
after-hours fee." (`role="note"`). The Worker accepts it and the email adds "Time Window: Outside standard
hours — confirm availability and additional fee". Only a missing or malformed time (e.g. 25:99) is a red
error / 400. The email shows readable labels ("Flexible / Any Time", "Specific Time — 2:30 PM").

### Same-day and Sunday requests (submit, then phone)

There is **no "urgent" checkbox and no `urgent` field** in the request. Same-day and Sunday status is
derived from `preferredDate` alone, in Mira's time zone (America/Los_Angeles); a client-sent `urgent` is
ignored, like any unknown field. Such requests **can be submitted** so Mira can review them (and any
photos), but submitting never confirms an appointment: the visitor must call Mira (**(279) 529-8754**).

- **Client:** an informational callout (not an error) with a **Call Mira** button appears for:
  today → "Same-day request"; a Sunday → "Sunday availability" (Sundays are never disabled; "may be
  available by request"); today being a Sunday → one "Same-day Sunday request" callout. Normal future
  dates (Monday–Saturday) show nothing. Submit is disabled only by invalid/missing required fields,
  consent or an invalid Specific Time. After sending, the success state ("Request sent … does not confirm
  a same-day / Sunday / same-day Sunday appointment") has **Call Mira Now**; normal requests keep the
  normal success state.
- **Worker:** derives `sameDay`, `sunday` and `phoneConfirmation` (`classifyDate`) at validation time and
  returns `phoneConfirmationRequired` in the success response. Consent, ZIP, structured time, photos,
  Turnstile and rate limiting all still apply. Exactly one email is sent: rows "Same-Day", "Sunday",
  "Phone Confirmation Required", an attention banner and subject prefix `SAME-DAY — `, `SUNDAY — ` or
  `SAME-DAY SUNDAY — ` (a future Sunday is not called same-day or urgent).

### Contact consent

A required, unchecked-by-default checkbox ("I agree that Mira may contact me by phone, text message,
or email regarding this request."). The Worker requires the boolean `contactConsent === true`
(not `"true"`, `1`, missing or false) and the email records "Contact Permission: Yes — phone, text or
email regarding this request."

### Phone numbers

**(279) 529-8754** is the primary number everywhere (header, footer, CTAs, structured data,
Worker messages, email). The former **(916) 759-0383** is shown only as "Secondary" in the Contact
page direct-contact panel (`BUSINESS.phones.secondary`). `phone-numbers.spec.ts` fails if the old number
appears anywhere else in `src/`.

- Validation (order: fields incl. consent, structured time and ZIP, with same-day/Sunday derived from the date → photos → Turnstile) is repeated server-side (`src/worker/appointment-validation.ts`): allowed services and
  languages, required fields, lengths, email format, ISO date, header-injection characters.
- Turnstile is mandatory and verified server-side with the Worker secret (fail closed).
- Email goes through a provider boundary (`src/worker/email-provider.ts`). The only adapter is
  `ResendEmailSender` (`src/worker/resend-email-sender.ts`): a plain `fetch` call to
  `POST https://api.resend.com/emails` with `Authorization: Bearer <RESEND_API_KEY>`, JSON body
  `from`, `to`, `subject`, `html`, `text`, `reply_to`, `attachments`. No SDK. One attempt, no retries.
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
