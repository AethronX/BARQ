# BARQ — MVP Scope

Principle: smallest high-quality slice that proves **RFQ → competing quotes → informed selection → delivery**, in Muscat, in one vertical (proposed: HVAC/MEP/electrical supplies — pending founder confirmation).

## In scope (first production launch)
Priority order, per brief §33:

1. **Auth** — registration, login, OTP verification, forgot password, session management. Roles: BUYER, SUPPLIER, LOGISTICS_PROVIDER, ADMIN.
2. **Company profile** — buyer/supplier/provider profile; verification status model (UNVERIFIED → BASIC → BUSINESS → FULLY_VERIFIED); status set only by admin.
3. **RFQ** — create (product, category, qty, unit, specs, attachments, delivery location, required-by date, terms), validate, publish, deadline, lifecycle (DRAFT→PUBLISHED→OPEN→QUOTES_RECEIVED→EVALUATION→AWARDED→CLOSED/CANCELLED).
4. **Supplier quotes** — supplier RFQ inbox, submit, revise (immutable revisions), withdraw rules, validity, delivery time, warranty, payment terms.
5. **Comparison** — price, unit price, delivery, rating, reliability, terms, BARQ Score v0 (transparent formula, documented). **No auto-select of cheapest.**
6. **Selection → Order** — explicit confirm step, idempotent; order lifecycle PENDING→…→COMPLETED/CANCELLED.
7. **Basic logistics request** — supplier-delivers option + request quotes from onboarded local providers (capability flags modelled). Provider data is **mock until real contracts exist**.
8. **Tracking** — status timeline with manually/provider-updated events and proof of delivery upload. No fabricated live tracking.
9. **Notifications** — in-app + push for the eight events in brief §11.
10. **Admin console (web, minimal)** — company/supplier verification, RFQ/quote monitoring, user suspension, audit log viewer, disputes queue (manual).
11. **Cross-cutting** — i18n (AR default + EN), RTL, loading/empty/error/offline states, audit logging, analytics events interface, CI, tests on critical paths.

## Explicitly out of scope (backlog)
| Deferred | Why |
|---|---|
| Real-time reverse auctions / bidding wars | Complexity + manipulation risk; plain RFQ first |
| International freight marketplace (mockup 5) | Different licensing, ops and data; Muscat-local first |
| Online payments / escrow / invoicing | Licensing and money-handling risk (STOP item); payment status tracked manually at MVP |
| ERP/accounting integrations | Post-validation |
| Real carrier APIs (Asyad, Nool, Oman Post, …) | No contracts/APIs known; never assume |
| AI quote parsing / recommendations | Premature |
| Reviews/ratings by users | Manipulation risk; MVP score uses verified transaction data only |
| Gamification, social features, chat | Not needed; revisit after pilot |
| Multi-city / multi-vertical | Architecture allows it, scope doesn't |
| Advanced analytics dashboards | Event pipeline first |

## MVP acceptance (user-visible)
A verified buyer publishes an RFQ; ≥1 verified supplier sees it, quotes; buyer compares with an explainable score, selects deliberately; an order is created exactly once; a logistics option is requested; shipment status progresses to delivered with proof; all steps audited; works in Arabic RTL and on a slow connection.

## Operational prerequisites (not code)
Supplier verification procedure, dispute handling procedure, support channel, pilot supplier/buyer commitments, legal review of Terms/Privacy, written list of regulatory questions (company registration, logistics licensing, payments, data protection).
