# BARQ — Project Status

_As of 2026-10-08. Maintained by engineering; update at every milestone._

## 1. Current state (verified by inspection)

| Area | State |
|---|---|
| Repository | `AethronX/BARQ`, **empty**: no commits on any branch, no remote branches |
| Expo / React Native app | **Does not exist** |
| Backend / API / database | **Does not exist**; no technology chosen |
| Auth, RFQ, quotes, orders, logistics | Not implemented |
| CI/CD, lint, tests, env config | Not implemented |
| Design | 5 Arabic-first mobile mockups (images, not code) supplied with the brief |
| Docs | Created in this commit (this file + 4 siblings) |

**Conclusion:** BARQ is at "idea + visual design" stage. The brief's phrase "from a prototype" refers to the mockups, not working software. Nothing here is production-ready, and no launch-checklist item is satisfied.

## 2. What the mockups show (design inputs, not requirements)

1. **Home / dashboard** — active RFQs with countdown timers, KPI tiles (active RFQs, supplier bidding, quotes received, qualified suppliers), activity feed, bottom tabs.
2. **Create RFQ** — product name, quantity + unit, specs (0/1000), delivery location, "send to all qualified suppliers".
3. **Quote comparison ("B2B Reverse Auction")** — supplier cards with price, expected delivery, verification tick, rating, years in market; toggle cheapest/fastest; "Accept offer" per card.
4. **Local delivery comparison** — logistics offers (price, ETA, tracking, insurance, 24/7 support), sort by best/nearest/fastest/cheapest.
5. **International shipment comparison** — China→Oman sea+land offers.

### Gaps / defects spotted in the mockups (to resolve in design, not copy)
- **Auto-"best"/"cheapest" highlighting** conflicts with the principle "never auto-select the cheapest" and the BARQ Score concept. Highlights must be explained, multi-factor, and never pre-select.
- **"Accept offer" directly on a card** with no confirmation, comparison, or terms step — risky for irreversible actions (idempotency, confirmation, audit).
- **"Reverse auction" framing** (header "B2B Reverse Auction") contradicts MVP scope control (complex auctions deferred). Treat as RFQ comparison.
- **Real brands in mock data** (Nool, Asyad, Mwasalat, Oman Post logos, ratings such as 4.8 (1,240), "trusted partner" copy). Must be replaced with clearly-labelled fictional providers; using real marks/ratings implies partnership. See R09/R13.
- **Verified badges and ratings** appear on every supplier. Verification must be real data-driven states (UNVERIFIED … FULLY_VERIFIED).
- **Mixed-language leakage:** English CTA "Send to Suppliers" in the Arabic RFQ screen; bilingual KPI labels. All strings go through i18n.
- **Currency:** OMR has 3 decimal places (baisa); mockups show 0–2. Format via a single money utility using integer baisa.
- **Missing required MVP surfaces:** auth/OTP, supplier & logistics-provider apps, admin, order, tracking, notifications list, empty/error/offline states, attachments, deadline & required-by date, preferred terms, category.
- **Notifications dot, countdown timers** need server-authoritative time (client clocks are untrustworthy for deadlines).
- Mixed Western digits in Arabic UI: decide a policy (see design system, later).

## 3. Decisions pending (blocked on the founder — see ARCHITECTURE_REVIEW §6)
Backend stack and hosting; auth provider/OTP channel; monetization; initial vertical; whether supplier/admin surfaces are mobile or web.

## 4. Next step
Milestone 1 (see `ROADMAP_6_MONTHS.md` §Milestone 1): ADRs for the pending decisions → Expo project scaffold with strict TS, i18n/RTL, design tokens, CI → clickable mock-data prototype of the buyer RFQ→compare flow.

## 5. Launch readiness
**Not launch-ready.** 0 of the launch-checklist items are satisfied. Production readiness additionally requires operations, marketplace trust, legal review and real users (brief §42).
