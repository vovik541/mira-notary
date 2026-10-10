# SEO Audit — Local Notary Signings by Mira Derkach

Audit date: 2026-10-09 (pre-commit safety pass included). Companion documents:
[KEYWORD-MAP.md](KEYWORD-MAP.md) · [LOCAL-SEO-PLAN.md](LOCAL-SEO-PLAN.md) ·
[SEARCH-CONSOLE-SETUP.md](SEARCH-CONSOLE-SETUP.md) (contains the **one** production-domain checklist) ·
[SEO-MEASUREMENT.md](SEO-MEASUREMENT.md).

## Status legend

Every item in these documents is one of:

| Label | Meaning |
|---|---|
| **IMPLEMENTED NOW** | In the code, covered by tests and/or verified locally |
| **REQUIRES PRODUCTION DOMAIN** | Cannot work until the real domain exists (`SITE.url`) |
| **REQUIRES GBP** | Google Business Profile / off-site work (see LOCAL-SEO-PLAN.md) |
| **REQUIRES SEARCH CONSOLE DATA** | Only knowable after launch, from real data |
| **FUTURE / OPTIONAL** | Not started; only if justified |

## 0. How the research was done — and what it cannot tell us

- No SEO data plugin (volume / difficulty / rank tracker) was active. Research used web search and page
  fetches of Sacramento results and competitor sites, plus Google Search Central, Cloudflare and
  schema.org documentation.
- **Everything about queries and competitors below is an observation from search results at the time of
  the review — not a measured ranking, not a volume figure.** No search volume, keyword difficulty,
  traffic potential or expected position was available, and none is stated.
- Local-pack and "near me" results are personalised and cannot be observed here.

## 1. SERP / competitor observations (intent- and SERP-based)

| Observation | Implication |
|---|---|
| "Mobile notary Sacramento" results are crowded with single-notary sites, small teams, directory profiles (Snapdocs, NotaryCafe, Thumbtack) and GBP listings. | A realistic aim is specificity, trust signals and a complete Google Business Profile rather than assuming a head-term result. |
| Language queries ("Russian / Ukrainian speaking notary") returned mostly individual **Snapdocs profile pages**, not local business sites. | A **promising SERP / content-gap candidate**: naming English, Ukrainian and Russian plainly on service pages. **To be validated with Search Console / keyword data** — demand size is unknown. |
| Hospital / same-day queries returned sites with dedicated hospital pages and "24/7" claims. | Mira's FAQ says same-day requests are booked by phone; no 24/7 claim is made. A hospital-visit page is a future candidate only with unique, accurate content. |
| Apostille results mix mobile notaries who "facilitate" apostilles with the California Secretary of State's own pages. | The apostille page explains honestly what an apostille is and that notarization usually comes first; it promises no turnaround. |

Competitors reviewed (observed on their pages; backlink, speed and GBP data were not available):

| Site | Observed pattern | Gap relative to this site |
|---|---|---|
| sacramentonotaryco.com | Title "Mobile Notary Sacramento CA \| …", H1 "Mobile Notary Sacramento", ~1,800 words, many service / city / hospital pages | More content depth and many city pages (thin-content risk) |
| sbkmobilenotary.com/sacramento | H1 "Mobile Notary Public For the Sacramento Area", ~750 words, fee schedule | Similar depth |
| brooksidemobilenotary.com | Apostille / POA / estate / hospital pages, list of ~150 ZIP codes | ZIP-list pattern is doorway-like; the ZIP checker here is the better pattern |
| sactownmobilenotary.com | ~1,600 words, six counties, hospital and senior-care pages | Broader area claims; this site claims only confirmed areas |

## 2. Implemented now

| # | Before | After |
|---|---|---|
| 1 | No canonical / `og:image` / sitemap; static `robots.txt` with a TODO | One SEO registry; canonical / OG / Twitter from one service; Worker-generated `robots.txt` and `sitemap.xml` behind a single `SITE.url` switch |
| 2 | Repetitive titles; Home and Mobile Notary shared an intent | Unique titles / descriptions / H1s, one primary intent per page (KEYWORD-MAP.md) |
| 3 | A `Notary` node on every page (a `LegalService` subtype that implies an address) plus `FAQPage` | `WebSite` + `Organization` (home), `Organization` + `Person` (About), `Service` + `BreadcrumbList` (service pages). **`FAQPage` removed** |
| 4 | Thin service pages (196–316 words) | Short factual sections on Mobile Notary, Apostille, Translation; contextual links on Pricing, Service Area, Loan Signing |
| 5 | No breadcrumbs | Visible trail + `BreadcrumbList` on the four service pages only |
| 6 | Logo alt "Local Notary Signings"; portrait alt "Portrait of Mira Derkach" | Full business name; descriptive portrait alt |
| 7 | Layout shift on service pages (lab CLS 0.17–0.20) from web-font swap re-wrapping text | Two above-the-fold fonts self-hosted and preloaded with `font-display: optional` (see §5); lab CLS ≈ 0 on every page |
| 8 | workers.dev would be indexable | Host-specific `_headers` rule + Worker host logic (§3) |
| 9 | Translation page claimed "Certified document translation services" | Reworded to "Document translation services" **pending Mira's confirmation** (§6) |
| 10 | Home H2 "…& Surrounding Communities" | "Serving Sacramento County & Confirmed Nearby Communities" (aligned with the Service Area page) |

Verified with no change needed: `<html lang="en">`, no hreflang, no `<meta name="keywords">`, one H1 per
page, meaningful images have width/height and descriptive alt, hero portrait is the only eager /
high-priority content image, favicon and manifest serve with correct content types, 421 internal links
crawled with 0 broken / 0 trailing-slash / 0 `http:` links, primary phone 279 everywhere except the
intentional "Secondary" line on `/contact`.

## 3. Indexing behaviour (verified over real local Worker HTTP responses)

Hosts were simulated with a `Host` header against local `wrangler dev` with a temporary `SITE.url`
(production host = `localhost:8788`); logic is also covered by `src/worker/indexing-matrix.spec.ts`.

| State / host | HTML pages | Unknown URL | `/robots.txt` | `/sitemap.xml` |
|---|---|---|---|---|
| **Production host** | 200, **no** `X-Robots-Tag`, canonical = production URL | **404**, meta `noindex, follow`, no `X-Robots-Tag` | `Allow: /`, `Disallow: /api/`, `Sitemap:` line | 200, 12 canonical URLs |
| **workers.dev / version preview** | 200, `X-Robots-Tag: noindex, nofollow` (static pages via `public/_headers`, Worker-generated pages via Worker code) | 404, `noindex, nofollow` | `Disallow: /` | 404 |
| **No domain configured (`SITE.url` = '')** | Every prerendered page carries `<meta name="robots" content="noindex, follow">`; Worker responses also get `X-Robots-Tag: noindex, nofollow`; no canonical / `og:url` / `og:image`; JSON-LD has no absolute URL, no `WebSite` / `BreadcrumbList` | 404 | `Disallow: /` | 404 |
| Other non-production hosts (e.g. a second custom domain) | Worker responses are noindex; **prerendered static pages are not** (they carry a canonical to the production URL) | 404 / 400 | `Disallow: /` | 404 |

Notes:
- `public/_headers` contains one host-specific rule — `https://:worker.:subdomain.workers.dev/*` →
  `X-Robots-Tag: noindex, nofollow` — and **cannot** match a custom domain (regression test included).
  Cloudflare `_headers` rules do not apply to Worker-generated responses, which is why the Worker
  applies the same policy by host.
- The last row is a known, accepted limitation: do not point additional custom domains at this Worker.
  If staging on a custom domain is ever needed, route all HTML through the Worker (`run_worker_first`)
  so the host policy applies to static pages too.
- An unknown URL on a host that is not in `angular.json → security.allowedHosts` answers **400**, not
  404 (Angular's host validation). `allowedHosts` is unchanged: `localhost` and `*.workers.dev`; no
  hostname was invented or loosened.
- **Trailing slash:** `/services/` → **307** → `/services` (Cloudflare assets `html_handling`). The
  canonical, every internal link and the sitemap already use `/services`, so the 307 is low priority.
  A permanent 301 would be a Cloudflare Redirect Rule at the edge after launch (**REQUIRES PRODUCTION
  DOMAIN**); no redirect system was added.

## 4. Structured data

**Emitted (production domain configured):**

| Route | Type | `@id` | `url` | Relationship |
|---|---|---|---|---|
| `/` | WebSite | `<SITE.url>/#website` | `<SITE.url>` | publisher → Organization |
| `/` | Organization | `<SITE.url>/#organization` | `<SITE.url>` | — |
| `/about` | Organization | `<SITE.url>/#organization` | `<SITE.url>` | — |
| `/about` | Person | `<SITE.url>/#mira-derkach` | `<SITE.url>/about` | worksFor → Organization |
| `/services/mobile-notary` `/loan-signing` `/apostille` `/translation` | Service | `<SITE.url>/#service-<slug>` | page URL | provider → Organization |
| the same four | BreadcrumbList | — | — | Home › Services › page |
| all other routes | none | | | |

With `SITE.url` empty: `Organization`, `Person` and `Service` are emitted with fragment `@id`s (`#organization`)
and **no** `url` / `logo`; `WebSite` and `BreadcrumbList` are omitted (they require absolute URLs).

Confirmed in the generated HTML: no address / geo / hours / price range, no `AggregateRating` / `Review`,
telephone is `+12795298754`, `sameAs` = NNA profile + NotaryCafe (both verified to exist), no 916 number,
no real-estate-business data, and `<` is escaped as `<` in the script payload (test + build check).

**Not used, and why**

| Type | Reason |
|---|---|
| `LocalBusiness` / `ProfessionalService` | Google's LocalBusiness guidance requires `address`; Mira is a service-area business and her address must not be published |
| `Notary` / `LegalService` | `Notary` is a `LegalService` subtype; implies legal-service semantics and an address, and Mira may not give legal advice |
| `AggregateRating` / `Review` | A business that controls its own reviews is ineligible for review stars (Google); visible reviews still help users |
| `FAQPage` | **Decision: removed.** Google no longer shows FAQ rich results, and keeping it only added a component lifecycle and a spec for zero benefit |
| `hreflang`, `geo`, `openingHours`, `priceRange` | No alternate-language pages; no truthful public values |

External validators (Schema Markup Validator, Rich Results Test) were **not run** — they need a public
URL / were not reachable. **REQUIRES PRODUCTION DOMAIN**, then see SEARCH-CONSOLE-SETUP.md §6. Valid
schema is not the same as rich-result eligible; none of these types produces a rich result for this
business except possibly breadcrumbs.

## 5. Performance (lab only) and fonts

Mobile Lighthouse, simulated Slow 4G, local `wrangler dev` (no CDN, no compression): SEO 100, best
practices 100; FCP ≈ 2.3–2.7 s, LCP ≈ 3.1–3.8 s (LCP element is hero text, not an image), TBT ≈ 0, CLS
0–0.004. Field data comes only from Search Console / CrUX after launch (**REQUIRES SEARCH CONSOLE DATA**).

Font audit (above-the-fold usage measured in Chrome at 390 and 1440 px on 8 pages):

| Font | Used above the fold | Preload? |
|---|---|---|
| Manrope 800 | H1 / H2 on 16/16 views | **Yes** — sizes the headline; self-hosted at `/fonts/manrope-latin-800-normal.woff2` |
| Inter 400 | Body / hero lead on 16/16 views | **Yes** — sizes the lead text; `/fonts/inter-latin-400-normal.woff2` |
| Inter 600 | Buttons / links on 12/16 | No (fontsource, `swap`) |
| Manrope 700, Inter 500, Inter 700, Manrope 600 | Header / small UI text | No |

Both preloaded faces use `font-display: optional`: on a normal connection the web font is used; on a
very slow first view the system font stays for that page view instead of re-wrapping the text late
(that late swap was the FAQ and service-page layout shift). Trade-off: a first, uncached view on a slow
network may show system fonts. No preload warnings appear in Chrome. FAQ CLS: 0.27 → 0.005 (same Slow-4G
method, repeated runs); FAQ hero link no longer uses a heavier font weight.

## 6. Decisions for the owner

1. **Production domain** — **REQUIRES PRODUCTION DOMAIN.** `SITE.url` is intentionally empty. Follow the
   checklist in SEARCH-CONSOLE-SETUP.md §1. Until then the site fails closed (noindex, no sitemap).
2. **Translation wording** — the exact customer-facing sentence was *"Certified document translation
   services are available for Ukrainian ↔ English and Russian ↔ English."* (Translation page hero) and
   the same wording in the Services overview summary. "Certified" described the *service*, which can
   read as a claim about certified translations or translator status. It now reads "Document translation
   services …" until Mira confirms what she may claim.
3. **GBP exact categories** — **REQUIRES GBP**; confirm in the GBP category picker.
4. **Trailing-slash 301** — optional, after launch.

## 7. Future content (max 10; evidence = SERP observations above, no volume data)

| # | Topic | Intent | Page type | Expand existing instead? |
|---|---|---|---|---|
| 1 | Hospital / care-facility visits | Urgent local | Section on Mobile Notary first; standalone page only with unique accurate content | **Yes** |
| 2 | What to bring to an appointment | Informational | FAQ (exists) | Yes |
| 3 | California apostille process | Informational + commercial | Expand `/services/apostille` | Yes |
| 4 | Notarizing foreign-language documents | Informational | FAQ (exists) + Translation page | Yes |
| 5 | Russian / Ukrainian-speaking notary | Commercial, language | Language mention on key pages (done) — candidate to validate with Search Console data | Yes |
| 6 | Loan signing: what borrowers expect | Informational | Expand `/services/loan-signing` | Yes |
| 7 | Power of attorney notarization | Commercial | Section on Mobile Notary | Yes |
| 8 | Notary fees / travel fee explained | Commercial | `/pricing` (exists) | Yes |
| 9 | City pages | Local | **Not recommended** (doorway risk) unless unique local content exists per city | — |
| 10 | Parental travel consent / vehicle documents | Informational | FAQ entries, only if Mira performs them | Yes |

No blog is proposed.

## 8. What is implemented vs. what needs Google

- **Implemented technically:** titles, descriptions, canonicals, OG / Twitter, sitemap, robots, host
  indexing policy, structured data, breadcrumbs, internal links, image alt, font changes, tests.
- **Observed in search results (not measured):** intent separation, language / hospital gaps, competitor depth.
- **Requires Google to index:** all of it, after the production domain is live and submitted.
- **Requires GBP work:** local pack visibility, reviews, categories, photos.
- **Requires Search Console data:** which queries and pages actually earn impressions. No ranking claim is made.
