# BARQ — Risk Register (Top 20)

Score = Impact (1–5) × Probability (1–5). Estimates are engineering judgement as of 2026-10-08, not measured data. Revisit monthly.

| ID | Risk | I | P | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R01 | **No backend exists / stack undecided**; all trust, authz and idempotency depend on it; delays everything | 5 | 5 | 25 | ADR + founder decision in M1; thin vertical-slice backend; mock API interface in the meantime | CTO |
| R02 | **Marketplace cold start**: buyers without suppliers (or vice versa) → empty comparisons | 5 | 5 | 25 | One vertical, one city; seed suppliers manually before buyers; concierge onboarding; measure quotes-per-RFQ | Founder |
| R03 | **Team capacity vs 6-month scope** (buyer+supplier+logistics+admin+backend) | 5 | 4 | 20 | Strict MVP_SCOPE; web admin minimal; cut logistics depth first | Founder/CTO |
| R04 | **Scope creep** from mockups (reverse auction, international freight, ETA/insurance claims) | 4 | 5 | 20 | Backlog discipline; every feature must pass product-review questions (brief §38) | CTO |
| R05 | **Supplier verification** undefined, manual, or faked → trust collapse | 5 | 4 | 20 | Define levels + evidence per level; admin tool; never display "verified" without a recorded check | Ops |
| R06 | **Business model undefined** (commission/subscription/lead fee) | 4 | 4 | 16 | Decide before pilot; affects leakage controls and payment-licensing | Founder |
| R07 | **Disintermediation**: parties exchange contacts and transact off-platform after first RFQ | 4 | 4 | 16 | Value beyond matching (compare, audit, logistics, history); contact details released only after award; monitor | Product |
| R08 | **Incumbent workflow inertia** (WhatsApp/email/phone procurement) | 4 | 4 | 16 | Faster than WhatsApp for first quote; supplier onboarding via link/WhatsApp share; pilot with friendly buyers | Product |
| R09 | **Logistics integrations assumed**: no verified APIs/contracts; mockups use real carrier brands/ratings | 4 | 4 | 16 | Mock providers fictional + labelled; onboard providers as BARQ users; capability flags; no brand use without permission | Product/Legal |
| R10 | **Legal/regulatory unknowns** (commercial registration, data protection, e-commerce, logistics & payment licensing, VAT, terms) | 5 | 3 | 15 | Written question list to Omani counsel; no compliance claims; payments out of scope | Founder/Legal |
| R11 | **Cross-tenant data leakage / IDOR** (pricing, identities, RFQs, files) | 5 | 3 | 15 | Server-side tenant checks on every query; authz test suite; no sequential IDs; signed file URLs; security review per feature | CTO |
| R12 | **Quote manipulation & collusion**, fake/spam RFQs, withdrawal abuse, last-second edits | 4 | 3 | 12 | Immutable revisions, edit/withdraw rules, rate limits, anomaly flags, admin review; sealed quotes decision | Product |
| R13 | **Mock data mistaken for real** (demos, screenshots, app store) | 4 | 3 | 12 | `isMock` on all fixtures, visible banner, fictional names, no real ratings/logos | CTO |
| R14 | **Duplicate RFQs/orders** from double-tap or network retry on poor connectivity | 4 | 3 | 12 | Idempotency keys server-side; disabled-on-submit UI; tests | CTO |
| R15 | **Malicious/oversized uploads** | 4 | 3 | 12 | Size/MIME/extension checks, private storage, scan hook, signed URLs, audit | CTO |
| R16 | **Arabic/RTL/i18n defects** (mixed-language strings seen in mockups; OMR 3-decimals; icon direction) | 3 | 4 | 12 | RTL-native layout, i18n lint (no hardcoded strings), integer-baisa money util, RTL snapshot tests, native-speaker review | CTO |
| R17 | **Suppliers/admin need web**, mobile-only won't suffice | 3 | 4 | 12 | Plan supplier web portal + admin web early; validate with pilot suppliers | Product |
| R18 | **Payment/dispute friction**: off-platform payments, no escrow → disputes with no recourse | 3 | 4 | 12 | Manual dispute queue, payment status tracking only, document terms; escrow deferred pending licensing review | Ops/Legal |
| R19 | **BARQ Score perceived as biased/pay-to-win**, or gamed | 4 | 3 | 12 | Published formula, no paid input, version + audit, show factor breakdown | Product |
| R20 | **OTP/SMS & push delivery in Oman** (sender-ID rules, cost, reliability) | 3 | 3 | 9 | Evaluate providers early; fallback email OTP; rate limiting | CTO |

## Watch list (below cut)
Observability/support tooling gaps; hosting/data-residency requirements (unknown); Expo SDK upgrade churn; app-store review of B2B marketplace listing; key-person dependency.

## Review rule
Any risk scoring ≥15 must have a named mitigation task on the active milestone before work proceeds on dependent features.
