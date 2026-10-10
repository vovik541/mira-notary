# Local SEO Plan (off-site)

Status: **REQUIRES GBP** (everything in this document is off-site work, not implemented in code; the website side is in SEO-AUDIT.md).

Website SEO is only one part of local visibility. Google's local ranking is commonly described as
relevance, distance and prominence; the items below are the legitimate levers. Nothing here guarantees
a ranking.

## 1. Google Business Profile (GBP) — checklist

Mira is a **service-area business**: she travels to customers and her home address must not be shown.

- [ ] **Business name:** exactly the real name, `Local Notary Signings by Mira Derkach`. Do **not** add
      keywords ("Best Sacramento Mobile Notary") — that violates GBP guidelines and risks suspension.
- [ ] **Business location:** choose "I don't have a location customers can visit" and hide the address.
      Google still needs a real address for verification (no PO box / virtual office); it is not shown
      publicly. Never publish it in the site, schema, or citations.
- [ ] **Primary category:** *Notary Public* — widely used by US notaries and cited in NNA guidance, but
      **verify the exact wording in the GBP category picker**; Google changes the list and no official
      list could be retrieved here. Add secondary categories **only for services Mira actually
      provides** (search the picker for "notary", "apostille", "translation"); do not pad.
- [ ] **Service areas:** list the confirmed area from the website's Service Area page (Sacramento
      County and the confirmed communities). Keep it tight and truthful; Google advises areas within ~2
      hours of the base.
- [ ] **Phone:** primary `(279) 529-8754` (same as the website). The 916 number must not be the GBP
      primary; it may be added as an additional number only if desired.
- [ ] **Website:** the canonical production URL (https, one host). Optionally add UTM only to GBP's
      "website" link if you want GBP traffic separated in analytics — not needed for Search Console.
- [ ] **Hours:** set real hours; use "by appointment" wording supported by GBP. Do not claim 24/7.
- [ ] **Services:** Mobile Notary, Loan Signing, California Apostille, Document Translation, with short
      factual descriptions and prices only if they match the website's Pricing page.
- [ ] **Description:** factual (what, where, languages, credentials: California Notary Public, NNA
      Certified Signing Agent, background screened, $1M E&O). No promotions, links or keyword lists.
- [ ] **Photos:** real photos (Mira at work, mobile-office setup, credentials badge). No stock, no
      street-address-revealing photos, no private client documents.
- [ ] **Attributes / Q&A:** fill what applies (languages spoken, appointment required). Seed Q&A with
      real FAQs answered by the owner.
- [ ] **Booking / "Appointment link":** the website's `/contact` request form.

## 2. Google reviews

The site already shows real reviews and a **Leave a Google Review** link
(`EXTERNAL_LINKS.googleReview`). Audit result: the link is present on Home and Reviews.

Do:
- Ask **every** client after a completed appointment, in a neutral way, with the direct review link
  (text / email / printed card). Make it easy, never conditional.
- **Reply to every review**, positive and negative, politely and without sharing private details.
- Keep review recency steady (a few per month beats a burst).

Never:
- Fake, purchased or friends-and-family reviews; review **gating** (only asking happy customers,
  or filtering before directing to Google); incentives (discounts, gifts) for reviews; bulk requests.
- Marking up the site's own reviews as star ratings (ineligible per Google policy — see SEO-AUDIT.md).

## 3. Citations / directories (consistency over volume)

Goal: identical **Name · primary phone · website · service-area positioning** everywhere. Do not
publish a residential address anywhere.

| Priority | Profile | Notes |
|---|---|---|
| 1 | Google Business Profile | Above |
| 1 | NNA Signing Agent profile (exists) | `signingagent.com/profile/160327553` — link to the website, keep phone/name identical |
| 1 | NotaryCafe (exists) | Same NAP; link to the website |
| 2 | Bing Places for Business | Import from GBP; hide address for service-area businesses |
| 2 | Apple Business Connect | Service-area listing |
| 3 | Snapdocs / notary marketplace profiles (if Mira uses them) | These rank for language and signing-agent queries; keep consistent |
| 3 | Yelp / Facebook Business | Only if Mira will maintain them (reviews need replies) |
| — | Mass "directory submission" services | **Do not use** — low-quality links, risk, no benefit |

## 4. Backlinks (realistic, legitimate)

- Notary / signing-agent association directories that allow a website link (NNA profile already exists).
- Local business organizations or chambers (a real membership, not a paid link scheme).
- Relationships that naturally link: title / escrow companies, mortgage brokers, real-estate agents,
  law offices (as referrals — Mira gives no legal advice) via a "recommended professionals" mention.
- Local resource pages (senior-care, community, Ukrainian / Russian community organizations) where a
  factual listing is appropriate.
- No purchased links, PBNs, link blasts or comment spam.

## 5. After launch — order of operations

1. Set `SITE.url`, add the host to `allowedHosts`, deploy, verify (SEARCH-CONSOLE-SETUP.md).
2. Verify Search Console, submit the sitemap.
3. Create / verify GBP, then Bing Places and Apple Business Connect with identical NAP.
4. Start the review-request routine.
5. Review Search Console + GBP Insights after 4 and 12 weeks (SEO-MEASUREMENT.md).
