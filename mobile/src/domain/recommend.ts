/**
 * Recommendation engine.
 *
 * It recommends exactly one offer and explains why from data that exists. It
 * does not select, award, or pre-tick anything: awarding stays a deliberate
 * buyer action confirmed on screen and re-checked by the server.
 *
 * Every reason below is a fact read off a row. There is deliberately no
 * "best value" or "BARQ recommends" reason, because those are conclusions
 * dressed as data.
 */
import type { Baisa } from './money';
import type { NormalizedOffer } from './offer';
import { compareScored, scoreOffers, type CostBasis, type ScoredOffer, type ScoreWeights, SCORE_WEIGHTS } from './score.ts';
import type { PaymentTerms } from '../api/types';

export type OfferLabel = 'best' | 'cheapest' | 'fastest' | 'top_rated';

export type Reason =
  | { kind: 'cheapest' }
  | { kind: 'fastest' }
  | { kind: 'cheaper_than_avg'; amount: Baisa }
  | { kind: 'verified'; level: 2 | 3 }
  | { kind: 'completed_orders'; n: number }
  | { kind: 'warranty'; months: number }
  | { kind: 'terms'; terms: PaymentTerms }
  | { kind: 'insufficient_data' };

export interface Savings {
  /** Best offer vs the most expensive one in this request. Never negative. */
  vsHighest: Baisa;
  /** Best offer vs the average of this request's offers. Never negative. */
  vsAverage: Baisa;
  /** How many offers the comparison covers. */
  offers: number;
  /** false when delivery costs are unknown, so the figures are goods-only. */
  complete: boolean;
}

export interface Recommendation {
  /** Ranked offers, best first. */
  ranked: ScoredOffer[];
  /** Exactly one recommended offer, or null when there is nothing to compare. */
  best: { offer: ScoredOffer; reasons: Reason[] } | null;
  /** quoteId → labels. A label is omitted when the offer already carries 'best'. */
  labels: Record<string, OfferLabel[]>;
  savings: Savings | null;
  basis: CostBasis;
}

const WARRANTY_WORTH_MENTIONING = 12;
const GOOD_TERMS: readonly PaymentTerms[] = ['NET_30', 'NET_60'];

export interface RecommendOptions {
  /**
   * false turns the single recommendation off: the buyer then sees only the
   * factual labels, the scores and the comparison. It is a display choice, so
   * the labels are no longer suppressed on the would-be winner's card.
   */
  recommend?: boolean;
}

export function recommend(
  offers: readonly NormalizedOffer[],
  weights: ScoreWeights = SCORE_WEIGHTS,
  options: RecommendOptions = {},
): Recommendation {
  const withBest = options.recommend !== false;
  const { offers: scored, basis } = scoreOffers(offers, weights);
  const ranked = [...scored].sort(compareScored);
  const empty: Recommendation = { ranked, best: null, labels: {}, savings: null, basis };

  // One offer is not a comparison: no recommendation, no badges, no savings.
  if (ranked.length < 2) return empty;

  const best = ranked[0];
  const minCost = Math.min(...ranked.map((o) => o.comparableCost));
  const maxCost = Math.max(...ranked.map((o) => o.comparableCost));
  const minDays = Math.min(...ranked.map((o) => o.maxDays));
  const rated = ranked.filter((o) => o.rating != null);
  const topRating = rated.length ? Math.max(...rated.map((o) => o.rating as number)) : null;
  const avgCost = Math.round(ranked.reduce((a, o) => a + o.comparableCost, 0) / ranked.length);

  const labels: Record<string, OfferLabel[]> = {};
  const add = (id: string, l: OfferLabel) => {
    if (withBest && id === best.quoteId) return; // the trophy already names this card
    (labels[id] ??= []).push(l);
  };
  if (withBest) labels[best.quoteId] = ['best'];
  // Extremes of real columns. Only the single best in each column is marked, so
  // the buyer gets three distinct alternatives rather than three copies.
  const cheapest = ranked.find((o) => o.comparableCost === minCost);
  const fastest = ranked.find((o) => o.maxDays === minDays);
  if (cheapest) add(cheapest.quoteId, 'cheapest');
  if (fastest) add(fastest.quoteId, 'fastest');
  // ⭐ is not emitted at all while no offer has a rating: there is no such column yet.
  if (topRating != null) {
    const top = rated.find((o) => o.rating === topRating);
    if (top) add(top.quoteId, 'top_rated');
  }

  const reasons: Reason[] = [];
  if (best.comparableCost === minCost) reasons.push({ kind: 'cheapest' });
  else if (best.comparableCost < avgCost) reasons.push({ kind: 'cheaper_than_avg', amount: avgCost - best.comparableCost });
  if (best.maxDays === minDays) reasons.push({ kind: 'fastest' });
  if (best.supplier.verification >= 2) reasons.push({ kind: 'verified', level: best.supplier.verification as 2 | 3 });
  if (best.supplier.completedOrders > 0) reasons.push({ kind: 'completed_orders', n: best.supplier.completedOrders });
  if (best.warrantyMonths >= WARRANTY_WORTH_MENTIONING) reasons.push({ kind: 'warranty', months: best.warrantyMonths });
  if (GOOD_TERMS.includes(best.paymentTerms)) reasons.push({ kind: 'terms', terms: best.paymentTerms });
  if (reasons.length === 0) reasons.push({ kind: 'insufficient_data' });

  const savings: Savings = {
    vsHighest: Math.max(0, maxCost - best.comparableCost),
    vsAverage: Math.max(0, avgCost - best.comparableCost),
    offers: ranked.length,
    complete: basis === 'total',
  };

  return { ranked, best: withBest ? { offer: best, reasons } : null, labels, savings, basis };
}
