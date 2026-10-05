# Product Requirements Document (PRD) & Project Brief
## Local Notary Signings by Mira Derkach

---

### 1. Executive Summary & Brand Overview
* **Business Name**: Local Notary Signings
* **Owner & Operator**: Mira Derkach (Commissioned California Notary Public, NNA Certified & Background-Screened Loan Signing Agent)
* **Service Area**: Greater Sacramento Region (Sacramento, Roseville, Rocklin, Folsom, Elk Grove, Citrus Heights, Rancho Cordova, Davis, and surrounding counties)
* **Core Philosophy**: Approachable, highly punctual, accurate, and trustworthy mobile notary, loan signing, California apostille processing, and certified Ukrainian/Russian translation services. Mira pairs deep banking and lending operational experience with white-glove, stress-free mobile execution.
* **Primary Contact Channels**:
  * Direct Call / SMS: `(916) 759-0383` | `(279) 529-8754`
  * Primary Email: `info@localnotarysignings.com` / `mira@localnotarysignings.com`

---

### 2. Strategic Objectives & Success Metrics
1. **Conversion Velocity**: Enable Sacramento individuals, families, real estate professionals, lenders, and escrow officers to schedule appointments or request quotes in under 60 seconds across both mobile and desktop devices.
2. **Instant Professional Trust**: Establish immediate credibility using authentic client assets (Mira’s verified professional headshot, real vehicle-based mobile office photo, official NNA 2026 certification badge, and real verbatim 5-star Google reviews).
3. **Multi-Audience Architecture**: Seamlessly serve two distinct market segments without mutual interference:
   * **B2C (General Public & Families)**: Punctual mobile notarizations (POAs, trusts, health directives, affidavits, certified translations, Sacramento apostille courier filing).
   * **B2B (Lenders, Title & Escrow Officers, Real Estate Professionals)**: Reliable loan closing execution (buyer/seller packages, refinances, HELOCs, reverse mortgages, instant mobile scanbacks, and expedited courier drop-offs).
4. **Strict Legal Compliance**: Prominently display mandatory California statutory disclaimers (*"I am not an attorney licensed to practice law in California and may not give legal advice or accept fees for legal advice"*) across all conversion points and footers.

---

### 3. User Personas & Core Journeys

| Persona | Motivation & Context | Key UX Requirements |
| :--- | :--- | :--- |
| **Escrow / Title Officer** *(e.g., lara tessadri)* | Urgent real estate closing; needs a zero-error signing agent who can print dual-tray packages and scan back immediately from the field. | Clear verification of NNA certification, mobile office printing/scanning specs, direct tap-to-call, loan package specialization grid. |
| **Mortgage Lender / Broker** *(e.g., Vasya K)* | Closing refinances or purchases on strict calendar deadlines; demands 7-year verified reliability and meticulous execution. | Scanback/courier capabilities strip, transparent communication, seamless scheduling workflow. |
| **Family / Individual Client** *(e.g., Liudmyla Petruk)* | Needs an urgent hospital, assisted-living, or at-home notarization for a Power of Attorney or Living Trust. | Warm, trustworthy face, simple checklist of common services, calm guidance, transparent travel fees. |
| **International Document Holder** | Needs a California birth certificate or power of attorney apostilled via the Sacramento Secretary of State, or certified Ukrainian/Russian document translation. | Step-by-step apostille timeline, hand-delivery guarantee to SOS Sacramento, clear translation guidelines. |

---

### 4. Information Architecture & Navigation

The application is structured as a high-performance single-page interactive web application (`#view-*` routing) with persistent top navigation, sticky mobile conversion bars, and rich modular sections:

* **1. Home View (`#view-home`)**:
  * **Hero Section**: High-impact value proposition, Mira's professional portrait, key trust badges (NNA 2026, 5-Star Google Rating, Sacramento-based), and primary CTAs (`Schedule Appointment`, `Call Mira`).
  * **Common Notary Services**: Lightweight 3-column checklist (Acknowledgments, Jurats, Affidavits, POAs, Trusts, Travel Consents, Oaths, POA Certified Copies, Subscribing Witness).
  * **Loan Signing Services**: 6 compact primary cards (Buyer, Seller, Refinance, HELOC, Reverse Mortgage, Loan Modification) + "Additional Signing Support" strip (Scanbacks, Courier Drop-Offs) + Authentic Mobile Office Showcase.
  * **Reviews Showcase**: Verified 5-star Google reviews from Liudmyla Petruk, Vasya K, and lara tessadri. 3-column grid on desktop; fluid swipe carousel on mobile with peek previews and pagination dots.
  * **Why Choose Mira**: Banking/lending background summary, error-free commitment, punctuality guarantee.
  * **Interactive Booking / Quote Modal**: Direct scheduling wizard.
* **2. Services Directory (`#view-services`)**:
  * Unified hub covering Mobile Notary, Loan Signings, Apostille Processing, and Certified Translations with direct routing.
* **3. Mobile Notary Dedicated View (`#view-mobile-notary`)**:
  * Travel radii, emergency hospital/nursing home protocols, standard California statutory notarization pricing ($15/signature) plus competitive regional travel fees.
* **4. Loan Signing View (`#view-loan-signing`)**:
  * Detailed packaging protocols, dual-tray laser printing capabilities, secure mobile scanning specs, escrow billing options.
* **5. California Apostille View (`#view-apostille`)**:
  * Direct Sacramento Secretary of State hand-delivery filing service, expedited timelines, Hague Convention guidance.
* **6. Document Translation View (`#view-translation`)**:
  * Certified Ukrainian, Russian, and English translation services for vital records, diplomas, transcripts, affidavits, and official submissions.
* **7. About Mira View (`#view-about`)**:
  * Mira Derkach’s personal professional story: banking background, operational lending experience, community dedication, and active certifications.
* **8. Reviews View (`#view-reviews`)**:
  * Full customer testimonials archive with attribution rules and architectural capacity for future additions (e.g., Alex Lubic).
* **9. Contact & Booking View (`#view-contact`)**:
  * Comprehensive intake form, phone direct links, coverage map, and operating hours.

---

### 5. Design System & Brand Visual Guidelines

* **Design System Reference**: `Sacramento Notary & Apostille System` (`{{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}}`)
* **Color Palette**:
  * **Primary Brand Navy**: `#082F57` (Deep executive navy communicating institutional authority, legal reliability, and stability)
  * **Secondary Brand Blue**: `#1D5A94` (Interactive states, secondary emphasis, badges)
  * **Warm Gold / Seal Accent**: `#C29547` (5-star ratings, certificate seals, decorative highlights)
  * **Neutral Surface Light**: `#F8FAFC` to `#F9F9FF` (Airy, clean backgrounds)
  * **Container White**: `#FFFFFF` (Surface cards, dialogs, form containers)
  * **Borders & Dividers**: `#E2E8F0` / `#E5EAF0` (Subtle 1px architectural lines)
  * **Text Primary**: `#0F172A` / `#1E293B` (High-contrast typography meeting WCAG AAA)
  * **Text Muted**: `#475569` / `#64748B` (Secondary descriptions and labels)
* **Typography**:
  * **Headings**: `Manrope` (Geometric, clean, modern, authoritative)
  * **Body & UI Elements**: `Inter` / System Sans-Serif (Crisp readability at dense data scales)
* **Component Styling Principles**:
  * Avoid heavy form-input borders on non-interactive content.
  * Use lightweight checklists rather than repetitive heavy cards for basic categorical lists.
  * Modest hover elevations (`translate-y-[-2px]`, subtle soft shadows) without jarring transitions.
  * Native CSS scroll-snap carousel on mobile viewports for testimonials.

---

### 6. Approved Brand Assets & Photo Inventory

1. **`{{DATA:IMAGE:IMAGE_5}}` - Local Notary Signings Official Logo**:
   * Elegant calligraphy wordmark with navy quill pen icon; placed in top left navigation header and footer.
2. **`{{DATA:IMAGE:IMAGE_4}}` - 2026 NNA Certified Notary Signing Agent Badge**:
   * Official National Notary Association credential seal; featured prominently in hero credentials strip, about section, and loan signing overview.
3. **`{{DATA:IMAGE:IMAGE_3}}` - Authentic Professional Portrait of Mira Derkach**:
   * Polished, friendly, approachable business portrait of Mira in a warm green blouse with glasses; placed in hero section and About Mira view.
4. **`{{DATA:IMAGE:IMAGE_2}}` - Mobile Office Vehicle Workspace**:
   * Real photograph of Mira's equipped vehicle trunk setup featuring mobile Brother dual-tray laser printer, laptop workstation, inverter power supply, and organized legal document folios; reinforces genuine mobile capabilities.

---

### 7. Verbatim Testimonials & Social Proof Repository

* **Review 1 — Liudmyla Petruk** *(Personal Client Experience)*:
  > *"She is professional, attentive, and very knowledgeable in her work. The entire process was smooth, clear, and handled with great care and accuracy. Mira is punctual, friendly, and trustworthy, and she makes even complex notarizations easy and stress-free."*
* **Review 2 — Vasya K** *(Lending Team Collaboration)*:
  > *"Excellent customer service, goes above and beyond to help us lenders close on time. She has been doing signings for our lending team the last 7 years. Thank you Mira!"*
* **Review 3 — lara tessadri** *(Title & Escrow Endorsement)*:
  > *"Mira is one of our top notaries most requested. She is trusted by our title companies and lenders and always takes great care of our clients. I cannot recommend Mira enough to anyone that requires a notary!"*
* **Attribution & Truth Rule**: Testimonial claims must remain inside quotes attributed directly to the named reviewer and must never be repurposed as unattributed factual business claims.

---

### 8. Technical & Performance Requirements
* **Mobile-First Responsive Layout**: Fully optimized down to 360px viewport width up to 4K ultra-wide screens.
* **Persistent Conversion Bar**: Sticky mobile bottom bar with tap-to-call `(916) 759-0383` and `Book Appointment` routing, designed with proper safe-area padding so it never covers content.
* **Accessibility (a11y)**: Semantic HTML5 landmark tags (`<header>`, `<main>`, `<nav>`, `<section>`, `<footer>`), valid ARIA attributes, explicit image `alt` tags, and high-contrast color ratios.
* **SEO & Local Search Readiness**: Schema-compatible metadata for LocalBusiness, NotaryService, Sacramento area service schema, and fast-loading single-bundle delivery.
