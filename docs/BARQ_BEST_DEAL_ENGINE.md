# BARQ Best Deal Engine — Design

_Written 2026-10-08, before implementation. This document is the contract for the
engine: what it computes, what it refuses to compute, and how it is tested._

## 0. Non-negotiables

1. **Nothing is invented.** A number that is not in the database is shown as
   missing ("تكلفة التوصيل غير محسوبة", "لا توجد بيانات كافية للتقييم"), never
   estimated, never defaulted to zero inside a comparison.
2. **No auto-selection.** The engine *recommends* one offer and explains why.
   Awarding stays a deliberate buyer action behind a confirmation checkbox, and
   the recommendation is never the cheapest-by-construction.
3. **No pay-to-win.** Subscription tier, ads and spend are not inputs and must
   never become inputs. The weight table is public inside the app.
4. **Server is the authority.** The engine is a *presentation and decision-support*
   layer. It can rank and explain; it cannot grant access. Awarding remains
   `award_quote()` in Postgres, which re-checks the caller.

## 1. What already exists (do not rebuild)

| Piece | Where | State |
|---|---|---|
| Integer-baisa money | `mobile/src/domain/money.ts` | Keep as-is; all costs are `Baisa` integers |
| BARQ Score v1 | `mobile/src/domain/score.ts` | 6 factors, missing factors excluded + weights re-normalised. **Reused, re-weighted → v2** |
| Quote comparison screen | `mobile/src/app/buyer/rfq/[id].tsx` | Sort segment (score/price/fast), ribbon on first card, score sheet, compare table. **Extended, not replaced** |
| Offer card | `mobile/src/ui/OfferCard.tsx` | Company block + 2 tiles + navy accept. **Extended with total-cost tile + badges** |
| Buyer dashboard | `mobile/src/app/buyer/(tabs)/index.tsx` | Hero + KPIs + "my RFQs" + recent activity. **One new section added** |
| State machines | `mobile/src/domain/stateMachines.ts` | RFQ / order transition tables. **Reused** |
| Quotes + stats data | `mobile/src/api/queries.ts` → `useRfqQuotes` | quotes + supplier + `supplier_stats` RPC. **Reused** |
| Audit log | `supabase/migrations/…_core.sql` → `private.audit()` | Append-only, admin-readable. **Reused for award decisions** |

Data that does **not** exist yet and therefore cannot be scored: supplier
ratings (no review system), on-time delivery rate (needs completed-order
history), delivery cost (no logistics integration), additional fees, discounts.

## 2. Domain model

New file `mobile/src/domain/offer.ts`.

```ts
/** A quote normalised for comparison. All money in integer baisa. */
export interface NormalizedOffer {
  quoteId: string;
  supplier: { id: string; name: string; verification: 0|1|2|3; completedOrders: number };
  quantity: number;            // from the RFQ, not the quote
  unitPrice: Baisa;
  goodsTotal: Baisa;           // server-computed unitPrice × quantity
  deliveryCost: Baisa | null;  // null = unknown. NEVER 0 as a stand-in
  fees: Baisa;                 // 0 only when the schema says there are none
  discount: Baisa;             // 0 only when the schema says there are none
  minDays: number; maxDays: number;
  warrantyMonths: number;
  paymentTerms: PaymentTerms;
  rating: number | null;       // null until a review system exists
  onTimeRate: number | null;   // null until delivery history exists
  validUntil: string | null;
  status: QuoteStatus;
}

export interface TotalCost {
  goods: Baisa; delivery: Baisa | null; fees: Baisa; discount: Baisa;
  /** goods + (delivery ?? 0) + fees − discount */
  total: Baisa;
  /** false when delivery is unknown → the UI must say so and must not compare totals as if complete. */
  complete: boolean;
}
```

`totalCost(o)` returns `complete: false` whenever `deliveryCost === null`. Any
UI that prints a total built from an incomplete cost prints the
"delivery not included" note beside it. Incomplete totals are still comparable
to each other (same missing component) but are never presented as final.

## 3. BARQ Score v2

`SCORE_VERSION = 'v2'`, weights configurable in one place and overridable per
call (`scoreOffers(offers, weights)`), so a product decision changes one
constant and the UI, the explanation sheet and the tests follow.

| Factor | Weight | Definition | When data is missing |
|---|---|---|---|
| `price` | **0.40** | `minComparableTotal / thisTotal` on *total cost*, falling back to goods-only totals when any delivery cost is unknown (all offers then use the same basis) | never missing |
| `supplierQuality` | **0.25** | `0.6 × verification/3 + 0.4 × min(completedOrders, 10)/10` | verification always exists (0 = unverified, scores 0); completed orders ≥ 0 |
| `deliverySpeed` | **0.20** | `minMaxDays / thisMaxDays` — the promise, not the best case | never missing |
| `rating` | **0.10** | `rating/5` | **excluded**, remaining weights re-normalised |
| `paymentTerms` | **0.05** | `TERMS_SCORE[terms]` (NET_60 = 1 … ADVANCE_100 = 0.2) | never missing |

v1's separate `reliability` (on-time rate) and `verification` factors are folded
into `supplierQuality`; on-time rate re-enters it as a third term the day
delivery history exists. Missing-factor handling is unchanged from v1: excluded,
never imputed. With today's data every offer scores on price +
supplierQuality + deliverySpeed + paymentTerms = 0.90 of the weight, and the
score sheet shows `rating` as "لا بيانات".

`score` is `round(Σ wᵢfᵢ / Σ wᵢ × 100)`, 0–100. Ties break by: lower total cost,
then faster `maxDays`, then earlier `quoteId` — deterministic, so two devices
never disagree.

## 4. Recommendation engine

`recommend(offers)` in `mobile/src/domain/recommend.ts` returns:

```ts
interface Recommendation {
  best: { offer: Scored; reasons: Reason[] } | null;   // exactly one 🏆, or null
  labels: Map<quoteId, OfferLabel[]>;                  // 💰 / ⚡ / ⭐ / 🏆
  savings: Savings | null;
  basis: 'total' | 'goods_only';                       // what price meant here
}
type Reason =
  | { kind: 'cheapest' } | { kind: 'fastest' }
  | { kind: 'cheaper_than_avg'; amount: Baisa }
  | { kind: 'verified'; level: 2|3 }
  | { kind: 'completed_orders'; n: number }
  | { kind: 'warranty'; months: number }
  | { kind: 'terms'; terms: PaymentTerms }
  | { kind: 'insufficient_data' };
```

Rules:
- `best` = highest v2 score. **One only.** With `< 2` live offers there is no
  recommendation (nothing to compare) — the UI shows the single offer plainly.
- Alternative labels mark the extremes of real columns: 💰 lowest total cost,
  ⚡ fastest `maxDays`, ⭐ highest rating — and ⭐ **is not emitted at all**
  while no rating data exists. A label is dropped when the same offer already
  carries 🏆, so the buyer never sees "best deal" and "cheapest" on one card
  claiming to be different choices.
- `reasons` are derived facts only. Each reason maps to an i18n key with real
  numbers substituted. If an offer wins on score but every reason would be
  speculative, the single reason is `insufficient_data` →
  "لا توجد بيانات كافية للتقييم".
- A reason is never "best value" or "recommended by BARQ" — those are
  conclusions, not data.

### Savings intelligence
`savings` is emitted **only** with ≥ 2 offers on the same cost basis:
`vsHighest = highestTotal − bestTotal` and `vsAverage = avgTotal − bestTotal`,
each labelled with its basis ("مقارنة بأعلى عرض", "مقارنة بمتوسط العروض"). No
market averages, no historical baselines, no "you saved X% with BARQ" — none of
that data exists. When totals are incomplete the savings line carries the same
delivery-not-included note.

## 5. UI (additive)

1. **`mobile/src/ui/DealBadge.tsx`** — the four labels as pills (trophy/tag/bolt/star
   icons, which all exist in `Icon.tsx`).
2. **`mobile/src/ui/TotalCostRow.tsx`** — goods / delivery / fees / discount /
   total breakdown, with the delivery-unknown note.
3. **`mobile/src/ui/WhyBest.tsx`** — the 🏆 reason list.
4. **`mobile/src/app/buyer/rfq/[id].tsx`** — mobile-first comparison cards
   gain: a total-cost tile, deal badges on the ribbon, a "why" block on the
   recommended card, savings line above the list, and the score sheet gains the
   v2 factor rows and the full breakdown. The existing sort segment, accept
   confirmation sheet, cancel flow and compare table stay.
5. **`mobile/src/screens/DecisionsSection.tsx`** → used on the buyer dashboard
   as **"طلبات تحتاج قرارك"**: RFQs with ≥ 1 live quote and a status in
   `OPEN | QUOTES_RECEIVED | EVALUATION`, sorted by closing time, each row
   showing quote count and time left. Empty → the section is not rendered.

Design tokens unchanged (navy `#0F172A`, amber `#F59E0B`, bg `#F8FAFC`, white
cards). Every string goes through `strings.ts` (`ar` source of truth + `en`).
Touch targets stay ≥ 44.

## 6. Logistics handoff (architecture only, clearly mock)

`mobile/src/logistics/` with:
- `types.ts` — `LogisticsQuoteRequest`, `LogisticsQuote { providerId, cost, minDays, maxDays, source: 'MOCK' | 'LIVE' }`, `LogisticsProvider` interface.
- `mockProvider.ts` — returns deterministic quotes, every one tagged
  `source: 'MOCK'`, provider names **`مزود تجريبي أ/ب`** — *not* Asyad, Nool or
  Oman Post. BARQ has no carrier agreements; naming a real carrier here would
  be a fabricated partnership.
- `index.ts` — `getLogisticsProvider()` returns the mock only when
  `EXPO_PUBLIC_MOCK_LOGISTICS === 'true'`, otherwise `null`. With `null`,
  `deliveryCost` stays `null` and the UI says the cost is not calculated.
  Any UI fed by the mock carries a visible "بيانات تجريبية" marker.

Nothing in this module writes to the database and nothing in the score consumes
a mock cost unless mock logistics is explicitly switched on.

## 7. State machines

No new RFQ or order states. The engine's own lifecycle, enforced by a
transition table in `mobile/src/domain/offer.ts` and mirrored by the existing
quote statuses: `SUBMITTED → AWARDED | NOT_SELECTED | WITHDRAWN`, with
`AWARDED`/`NOT_SELECTED` terminal. Only `SUBMITTED` (and the already-awarded
quote) enters comparison; `WITHDRAWN` and expired (`validUntil < now`) offers
are excluded from scoring and shown as expired rather than silently dropped.

## 8. Security & RBAC

- Only the RFQ's buyer company sees its quotes — already enforced by RLS; the
  engine adds no new query path and no new table.
- Scoring runs client-side on rows the server already allowed. It is
  decision support; it grants nothing. Awarding stays `award_quote()`, which
  re-checks the caller, the RFQ owner, the quote state and idempotency.
- Suppliers never receive competitors' quotes, so they can never see their own
  score relative to others. No supplier-facing score surface in this change.
- Award continues to write an audit row. The audit meta gains the score
  version, the recommended quote and whether the buyer followed the
  recommendation — so a future "did the engine steer buyers badly?" question is
  answerable from data.

## 9. Analytics events

Defined in `mobile/src/analytics/events.ts` as a typed union with a no-op sink
(no vendor is wired, and adding one is a privacy decision, not a code one):
`deal_engine_viewed`, `deal_recommendation_shown`, `deal_score_opened`,
`deal_comparison_opened`, `deal_alternative_selected`, `deal_award_confirmed`
(with `followedRecommendation: boolean`), `decisions_section_tapped`. Payloads
carry ids and counts, never company names, prices or user identities.

## 10. Test plan (`mobile/src/domain/__tests__/`)

Edge cases that must be covered:
1. Zero offers → no recommendation, no savings, no crash.
2. One offer → no recommendation, no badges, no savings.
3. Two identical offers → deterministic tie-break, exactly one 🏆.
4. Cheapest offer is unverified with no history → does **not** win on score.
5. `deliveryCost === null` on one offer → basis falls back to `goods_only` for
   all, `complete: false`, no invented zero.
6. All ratings null → `rating` factor excluded, weights re-normalised, no ⭐ label.
7. Expired `validUntil` → excluded from scoring.
8. Withdrawn quote → excluded.
9. 🏆 and 💰 on the same offer → 💰 suppressed.
10. Savings never negative; absent with a single offer.
11. Score stays within 0–100 for extreme inputs (price 1 baisa vs 10⁹).
12. Weight overrides change the ranking as expected (configurability is real).

## 11. Known limitations (honest list)

- No ratings, no on-time history, no real delivery cost → the score runs on
  0.90 of its weight and ⭐ never appears. This is visible to the buyer.
- Scoring is client-side: two app versions could rank differently. Acceptable
  while it is advisory; moving it into Postgres is the follow-up before any
  contractual claim about "best deal".
- Savings are computed within one RFQ only.
- Logistics is an interface plus a mock. No carrier is integrated.
