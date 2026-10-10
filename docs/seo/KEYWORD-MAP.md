# Keyword Map

Status: **IMPLEMENTED NOW** (titles, descriptions, H1s); keyword demand **REQUIRES SEARCH CONSOLE DATA** to validate.

One primary intent per page. **Intent- and SERP-based** — no search volume or difficulty figures are
available (see SEO-AUDIT.md §0). Titles / descriptions below are the ones implemented in
`src/app/core/seo/seo-pages.ts` (source of truth). Natural wording beats repetition: "Sacramento" is
used where it reads naturally, not in every heading. No `<meta name="keywords">`.

| Page | Primary intent / keyword | Secondary / semantic terms | Local modifiers | User intent | Cannibalization watch |
|---|---|---|---|---|---|
| `/` Home | mobile notary Sacramento | mobile notary services, loan signing agent, notary public, English / Ukrainian / Russian | Sacramento County, Greater Sacramento | Broad local: "who can come to me?" | vs Mobile Notary — Home stays brand/broad; Mobile Notary owns visit locations |
| `/services` | notary / document services overview | mobile notary, loan signing, apostille, translation | Sacramento | Compare services | Do not target "mobile notary Sacramento" |
| `/services/mobile-notary` | traveling / mobile notary public (home, office, hospital visits) | acknowledgments, jurats, powers of attorney, hospital notary, what to bring | Sacramento, nearby communities | "Will a notary come to my location?" | Home (broad) — anchor text here is specific ("mobile notary service area") |
| `/services/loan-signing` | loan signing agent Sacramento | notary signing agent, NNA certified, buyer / seller / refinance / HELOC / reverse mortgage, scanbacks, courier | Sacramento, Greater Sacramento | Lenders, title/escrow, borrowers | none |
| `/services/apostille` | California apostille services | apostille Sacramento, document authentication, notarize before apostille | Sacramento | Documents for use abroad | FAQ apostille entries support it |
| `/services/translation` | Ukrainian / Russian document translation | Ukrainian ↔ English, Russian ↔ English, foreign-language documents | Sacramento (via provider) | Language-specific | "Certified" removed from copy until Mira confirms the claim |
| `/about` | Mira Derkach (brand / trust) | California Notary Public, NNA Certified Signing Agent, banking and lending background | Greater Sacramento | Trust / credentials | Branded query page |
| `/pricing` | mobile notary pricing Sacramento | notary fees, travel fee, after-hours, apostille cost | Sacramento | Commercial: "how much?" | none |
| `/reviews` | Mira Derkach reviews | client reviews, Google reviews | Sacramento | Trust | Branded / trust |
| `/service-area` | mobile notary service area | Sacramento County, Placer / Yolo / El Dorado confirmed communities, ZIP check | Greater Sacramento | "Do you serve my area?" | Only confirmed areas; no city pages |
| `/faq` | mobile notary questions (appointments, pricing, apostille) | what to bring, same-day, hours, payment, languages | Sacramento | Informational with commercial intent | Supports commercial pages |
| `/contact` | request a notary appointment | book a notary, call Mira | Sacramento | Conversion | Query-prefilled URLs canonicalize here |
| 404 | — | — | — | — | `noindex`, real 404 |

## Implemented titles (before → after)

| Route | Before | After |
|---|---|---|
| `/` | Mobile Notary & Loan Signing Agent in Sacramento \| Mira Derkach | Mobile Notary in Sacramento \| Local Notary Signings by Mira Derkach |
| `/services` | Notary, Loan Signing, Apostille & Translation Services \| Mira Derkach | Notary, Loan Signing, Apostille & Translation Services \| Sacramento |
| `/services/mobile-notary` | Mobile Notary Services in Sacramento \| Mira Derkach | Mobile Notary Services in Sacramento \| Home, Office & Hospital Visits |
| `/services/loan-signing` | Loan Signing Agent in Sacramento \| Mira Derkach | Loan Signing Agent in Sacramento \| NNA Certified Notary Signing Agent |
| `/services/apostille` | California Apostille Services in Sacramento \| Mira Derkach | California Apostille Services in Sacramento \| Local Notary Signings |
| `/services/translation` | Document Translation Services \| Ukrainian, Russian & English \| Mira Derkach | Ukrainian & Russian Document Translation \| Sacramento \| Mira Derkach |
| `/about` | About Mira Derkach \| Sacramento Mobile Notary | About Mira Derkach \| Sacramento Mobile Notary & Signing Agent |
| `/pricing` | Notary & Apostille Pricing in Sacramento \| Mira Derkach | Mobile Notary Pricing in Sacramento \| Fees & Travel Rates |
| `/reviews` | Client Reviews \| Mira Derkach Mobile Notary | Client Reviews \| Mira Derkach, Sacramento Mobile Notary |
| `/service-area` | Mobile Notary Service Area \| Sacramento County & Greater Sacramento | Mobile Notary Service Area \| Sacramento County & Nearby Communities |
| `/faq` | Notary FAQ \| Mira Derkach Mobile Notary | Mobile Notary FAQ \| Appointments, Pricing & Apostille \| Sacramento |
| `/contact` | Request an Appointment \| Mira Derkach Mobile Notary | Request a Notary Appointment \| Mira Derkach, Sacramento |

Descriptions are in `seo-pages.ts` (unique per page, accurate, no unsupported claims; automated test
rejects "24/7", "guaranteed", "certified translat…", legal-advice wording and any 916 number).

## H1 changes

| Route | Before | After |
|---|---|---|
| `/` | Professional Mobile Notary Services — Wherever You Need It | Mobile Notary & Loan Signing Services in Greater Sacramento |
| `/services/mobile-notary` | Mobile Notary Services in the Sacramento Area | Mobile Notary Services at Your Home, Office or Hospital |
| `/services/translation` | Document Translation Services | Ukrainian & Russian Document Translation |
| `/pricing` | Clear Notary Pricing | Mobile Notary Pricing |
| `/faq` | Frequently Asked Questions | Mobile Notary Questions & Answers |

Other H1s unchanged (Loan Signing, Apostille, Service Area, Services, About, Reviews, Contact already
state their intent).

## Rules for future edits

- Do not give two pages the same primary keyword; update this table when a page is added.
- "Near me" phrasing is not used in copy; Google derives it from location.
- Language demand is served by naming English / Ukrainian / Russian on relevant pages; no
  Ukrainian/Russian site versions and no hreflang until translated pages actually exist.
- City-specific pages are not part of this phase (doorway/thin-content risk). Propose only with
  unique, useful local content per page.
