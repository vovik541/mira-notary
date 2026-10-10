# Production domain & Google Search Console — Setup

Status of this document: **REQUIRES PRODUCTION DOMAIN**. Nothing has been submitted to Google and no
verification token exists. No tracking JavaScript is needed for Search Console. Until the domain is
configured the site **fails closed**: `robots.txt` answers `Disallow: /`, `sitemap.xml` answers 404,
canonical / `og:url` / `og:image` are not emitted and Worker responses carry `X-Robots-Tag: noindex`.

## 1. Production domain checklist (the single source of truth)

Do these in order when the final domain is known. `https://www.<domain>` is the canonical host; do not
invent or guess it earlier.

1. **`SITE.url`** — `src/app/core/config/site.config.ts`: set to `https://www.<domain>` (https, no
   trailing slash). One value drives canonical, `og:url`, `og:image`, absolute JSON-LD URLs,
   `WebSite`, `BreadcrumbList`, `robots.txt` and `sitemap.xml`.
2. **Angular SSR `security.allowedHosts`** — `angular.json`: add exactly `www.<domain>` (and the apex
   only if it serves content). Currently `localhost` and `*.workers.dev` only. Do not add a wildcard
   for the new domain. Without it SSR answers 400 instead of the real 404 page.
3. **Cloudflare custom domain** — attach `www.<domain>` to the Worker; redirect the apex ↔ www (301) so
   one host serves the site. Do not point extra domains at this Worker (they would serve prerendered
   pages without the noindex policy). `npm run deploy`.
4. **Canonical verification** — view source of `/`, `/services/apostille`, `/contact?service=apostille`:
   one `<link rel="canonical">` each, https, no query; `/contact?...` canonicalizes to `/contact`.
5. **`robots.txt` verification** — `https://www.<domain>/robots.txt` → `Allow: /`, `Disallow: /api/`,
   `Sitemap: https://www.<domain>/sitemap.xml`.
6. **`sitemap.xml` verification** — 12 URLs, all `https://www.<domain>…`, no query strings, no 404, no
   `workers.dev`.
7. **workers.dev noindex verification** — `https://<worker>.<account>.workers.dev/` and `/robots.txt`:
   `X-Robots-Tag: noindex, nofollow` and `Disallow: /`; production responses must **not** carry
   `X-Robots-Tag`. An unknown URL on the production host returns HTTP 404.
8. **Search Console Domain property** — §2.
9. **Sitemap submission** — §3.

Expected local-test equivalents of steps 4–7 are in `src/worker/indexing-matrix.spec.ts` and
SEO-AUDIT.md §3.

## 2. Create and verify a Domain property

1. https://search.google.com/search-console → **Add property** → **Domain** → `<domain>`.
2. Google shows a **TXT record**; add it in Cloudflare DNS at the root (`@`) exactly as given (do not
   touch MX records), then **Verify**. Never commit the token.
3. A Domain property covers http/https and www/non-www.

## 3. Submit the sitemap

Search Console → **Sitemaps** → `sitemap.xml`. Expected: *Success*, 12 discovered URLs.

## 4. Inspect and request indexing

**URL Inspection** on Home, Mobile Notary, Loan Signing, Apostille, Service Area, Pricing, Contact: check
"Page is indexable", user-declared vs Google-selected canonical, rendered HTML. **Request indexing** for
those only; not for the 404 or query URLs.

## 5. Monitor — **REQUIRES SEARCH CONSOLE DATA**

- **Pages:** expect 12 indexed. "Alternate page with proper canonical", "Not found (404)" for stray URLs
  and "Excluded by noindex" for the 404 page are normal. Investigate "Crawled – currently not indexed"
  and "Duplicate without user-selected canonical".
- **Core Web Vitals:** appears after enough real-user data; compare with the lab numbers in SEO-AUDIT.md §5.
- **Search appearance:** breadcrumbs may appear; no review-star, FAQ or LocalBusiness reports are expected.
- **Security & manual actions:** should stay empty.

## 6. Validators (once live)

- Schema Markup Validator on `/`, `/about`, `/services/mobile-notary`.
- Rich Results Test on the same URLs. Valid schema is not rich-result eligibility; expect none except
  possibly breadcrumbs.
- PageSpeed Insights (mobile) on `/` and one service page.

Measurement plan: [SEO-MEASUREMENT.md](SEO-MEASUREMENT.md). GBP and citations:
[LOCAL-SEO-PLAN.md](LOCAL-SEO-PLAN.md).
