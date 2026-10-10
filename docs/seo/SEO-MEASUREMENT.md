# SEO Measurement Plan

Status: **REQUIRES SEARCH CONSOLE DATA** — nothing here can be measured before launch.

Organic Google impressions come from **Google Search Console** — not from code on the site. Do not add
GA4, Meta Pixel or other visitor-tracking scripts for this; if conversion analytics is wanted later,
decide it separately with its privacy and consent implications (the site is currently
tracking-free; only the Turnstile script loads on `/contact`).

No improvement may be claimed until Search Console has real post-launch data.

## Baseline

1. Verify the Domain property on launch day (SEARCH-CONSOLE-SETUP.md).
2. Wait for data (Search Console fills after a few days). Record the first full **28-day** window as
   the baseline: Performance → Search results, last 28 days, with *Compare* = previous period once a
   previous period exists.
3. Record these numbers in a dated table (one row per month): impressions, clicks, CTR, average
   position — **separately** for branded and non-branded.
4. After ~3 months use "Last 3 months" for trends, comparing like with like.

## Branded vs non-branded

In Search Console → Performance → add a **Query** filter:

- **Branded:** queries *containing* `mira derkach`, `local notary signings`, `derkach notary`
  (custom regex: `mira|derkach|local notary signings`).
- **Non-branded:** the same filter set to *Doesn't match regex*.

Non-branded growth is the signal of real SEO progress; branded queries mostly reflect existing awareness
and GBP / word of mouth.

## Primary KPIs

| KPI | Where | Notes |
|---|---|---|
| Non-branded impressions | GSC Performance, non-branded filter | Leading indicator |
| Non-branded clicks | same | Result |
| Organic CTR | same (and by page) | Improve titles/descriptions only after enough impressions |
| Average position (trend) | same, by query and page | Use as a trend, never as a precise rank; position varies by location/device |
| Indexed pages | GSC Pages | Target 12 / 12 |
| Core Web Vitals | GSC Core Web Vitals | Mobile good URLs |
| Appointment requests from organic | Later, if conversion analytics is added | Requires a privacy-reviewed analytics decision |

Useful dimensions: Queries, Pages, Countries (US), Devices (mobile first), Search appearance.

## Local KPIs (Google Business Profile)

- Profile views from Search vs Maps; searches that surfaced the profile (GBP shows grouped queries).
- Calls, website clicks, direction/message interactions where available (service-area businesses show
  fewer direction actions).
- Review count, average rating and **recency** (new reviews per month); reply rate.

## Review cadence

| When | What |
|---|---|
| Weekly (first month) | GSC Pages (indexing errors), Sitemaps status |
| Monthly | Impressions / clicks / CTR / position, branded vs non-branded; top queries and pages; GBP insights |
| Quarterly | 3-month trends; decide content or title updates from real queries (see future-content table in SEO-AUDIT.md §6) |

## Rules

- A vanity "SEO score" is not a KPI.
- Do not edit titles/descriptions repeatedly within a few weeks — let Google settle, then change based
  on query data.
- Record changes (date + what) next to the monthly numbers so effects can be attributed.
