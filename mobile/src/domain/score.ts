/**
 * BARQ Score — a published, transparent formula applied identically to every
 * quote. Paid plans or advertising have no input here by design.
 *
 * Factors without real data (e.g. a new supplier with no completed orders) are
 * left out and the remaining weights are re-normalised, so missing history is
 * never replaced by an invented number. Changing weights is a product decision
 * that must be versioned and announced.
 */
import type { Baisa } from './money';

export const SCORE_VERSION = 'v1';

export const SCORE_WEIGHTS = {
  price: 0.35,
  speed: 0.2,
  rating: 0.15,
  reliability: 0.15,
  verification: 0.1,
  terms: 0.05,
} as const;

export type ScoreFactor = keyof typeof SCORE_WEIGHTS;

/** 0 = unverified … 3 = fully verified. Set only by BARQ admins after real checks. */
export type VerificationLevel = 0 | 1 | 2 | 3;

export interface ScoreInput {
  unitPrice: Baisa;
  /** Worst-case delivery in days (we score the promise, not the best case). */
  maxDays: number;
  /** 0–5, or null when the supplier has no ratings yet. */
  rating: number | null;
  /** 0–100 share of orders delivered on time, or null without history. */
  onTimeRate: number | null;
  verification: VerificationLevel;
  /** 0–1, how favourable the payment terms are to the buyer. */
  termsScore: number;
}

export interface ScoreResult {
  score: number; // 0–100
  /** Each 0–1, or null when the factor had no data and was excluded. */
  factors: Record<ScoreFactor, number | null>;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function scoreQuotes<T extends ScoreInput>(quotes: readonly T[]): (T & ScoreResult)[] {
  if (quotes.length === 0) return [];
  const minPrice = Math.min(...quotes.map((q) => q.unitPrice));
  const minDays = Math.min(...quotes.map((q) => q.maxDays));
  return quotes.map((q) => {
    const factors: Record<ScoreFactor, number | null> = {
      price: clamp01(minPrice / q.unitPrice),
      speed: clamp01(minDays / q.maxDays),
      rating: q.rating == null ? null : clamp01(q.rating / 5),
      reliability: q.onTimeRate == null ? null : clamp01(q.onTimeRate / 100),
      verification: clamp01(q.verification / 3),
      terms: clamp01(q.termsScore),
    };
    let weighted = 0;
    let weightSum = 0;
    for (const k of Object.keys(SCORE_WEIGHTS) as ScoreFactor[]) {
      const f = factors[k];
      if (f == null) continue;
      weighted += SCORE_WEIGHTS[k] * f;
      weightSum += SCORE_WEIGHTS[k];
    }
    return { ...q, factors, score: Math.round((weighted / weightSum) * 100) };
  });
}
