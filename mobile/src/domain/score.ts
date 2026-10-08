/**
 * BARQ Score — a published, transparent formula applied identically to every
 * offer. Subscriptions, advertising and supplier spend have no input here, by
 * design, and must never gain one.
 *
 * Two rules make the score honest:
 *  1. A factor without real data (a supplier with no ratings yet) is EXCLUDED
 *     and the remaining weights are re-normalised. A missing number is never
 *     replaced by an invented one.
 *  2. Price is compared on one basis for all offers. If any delivery cost is
 *     unknown, every offer is compared on goods only, and the UI says so.
 *
 * Changing weights is a product decision: bump SCORE_VERSION and announce it.
 */
import type { NormalizedOffer } from './offer';
import { totalCost } from './offer.ts';
import { TERMS_SCORE } from './terms.ts';

export const SCORE_VERSION = 'v2';

export const SCORE_WEIGHTS = {
  price: 0.4,
  supplierQuality: 0.25,
  deliverySpeed: 0.2,
  rating: 0.1,
  paymentTerms: 0.05,
} as const;

export type ScoreFactor = keyof typeof SCORE_WEIGHTS;
export type ScoreWeights = Record<ScoreFactor, number>;

/** 0 = unverified … 3 = fully verified. Set only by BARQ admins after real checks. */
export type VerificationLevel = 0 | 1 | 2 | 3;

/** Completed orders beyond this add no further quality signal. */
export const EXPERIENCE_CAP = 10;

export interface ScoreResult {
  score: number; // 0–100
  /** Each 0–1, or null when the factor had no data and was excluded. */
  factors: Record<ScoreFactor, number | null>;
  /** Sum of the weights that actually applied (1 when nothing was excluded). */
  weightApplied: number;
  version: string;
}

export type ScoredOffer = NormalizedOffer & ScoreResult & {
  /** Comparable cost used by the price factor, on the basis below. */
  comparableCost: number;
  total: ReturnType<typeof totalCost>;
};

/** 'total' = every delivery cost known; 'goods_only' = at least one unknown. */
export type CostBasis = 'total' | 'goods_only';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Verification plus real BARQ history. Both components always exist (0 is a real 0). */
export function supplierQuality(verification: VerificationLevel, completedOrders: number): number {
  const experience = clamp01(Math.max(0, completedOrders) / EXPERIENCE_CAP);
  return clamp01(0.6 * (verification / 3) + 0.4 * experience);
}

export function costBasis(offers: readonly NormalizedOffer[]): CostBasis {
  return offers.every((o) => o.deliveryCost != null) ? 'total' : 'goods_only';
}

export function scoreOffers(
  offers: readonly NormalizedOffer[],
  weights: ScoreWeights = SCORE_WEIGHTS,
): { offers: ScoredOffer[]; basis: CostBasis } {
  const basis = costBasis(offers);
  if (offers.length === 0) return { offers: [], basis };

  const prepared = offers.map((o) => {
    const total = totalCost(o);
    return { o, total, comparableCost: Math.max(1, basis === 'total' ? total.total : o.goodsTotal) };
  });
  const minCost = Math.min(...prepared.map((p) => p.comparableCost));
  const minDays = Math.min(...prepared.map((p) => Math.max(1, p.o.maxDays)));

  const scored = prepared.map(({ o, total, comparableCost }) => {
    const factors: Record<ScoreFactor, number | null> = {
      price: clamp01(minCost / comparableCost),
      supplierQuality: supplierQuality(o.supplier.verification, o.supplier.completedOrders),
      deliverySpeed: clamp01(minDays / Math.max(1, o.maxDays)),
      rating: o.rating == null ? null : clamp01(o.rating / 5),
      paymentTerms: clamp01(TERMS_SCORE[o.paymentTerms]),
    };
    let weighted = 0;
    let weightSum = 0;
    for (const k of Object.keys(weights) as ScoreFactor[]) {
      const f = factors[k];
      if (f == null || weights[k] <= 0) continue;
      weighted += weights[k] * f;
      weightSum += weights[k];
    }
    const score = weightSum > 0 ? Math.round((weighted / weightSum) * 100) : 0;
    return { ...o, factors, score, weightApplied: weightSum, version: SCORE_VERSION, comparableCost, total };
  });

  return { offers: scored, basis };
}

/**
 * Ranking order: score, then lower cost, then faster promise, then id.
 * Fully deterministic so two devices never disagree about the recommendation.
 */
export function compareScored(a: ScoredOffer, b: ScoredOffer): number {
  return (
    b.score - a.score ||
    a.comparableCost - b.comparableCost ||
    a.maxDays - b.maxDays ||
    a.quoteId.localeCompare(b.quoteId)
  );
}
