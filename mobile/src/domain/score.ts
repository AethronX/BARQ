/**
 * BARQ Score v0 — a published, transparent formula applied identically to
 * every quote. Paid plans or advertising have no input here by design.
 * Changing weights is a product decision that must be versioned and announced.
 */
import type { Baisa } from './money';

export const SCORE_VERSION = 'v0';

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
  rating: number; // 0–5
  onTimeRate: number; // 0–100
  verification: VerificationLevel;
  /** 0–1, how favourable the payment terms are to the buyer. */
  termsScore: number;
}

export interface ScoreResult {
  score: number; // 0–100
  factors: Record<ScoreFactor, number>; // each 0–1
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function scoreQuotes<T extends ScoreInput>(quotes: readonly T[]): (T & ScoreResult)[] {
  if (quotes.length === 0) return [];
  const minPrice = Math.min(...quotes.map((q) => q.unitPrice));
  const minDays = Math.min(...quotes.map((q) => q.maxDays));
  return quotes.map((q) => {
    const factors: Record<ScoreFactor, number> = {
      price: clamp01(minPrice / q.unitPrice),
      speed: clamp01(minDays / q.maxDays),
      rating: clamp01(q.rating / 5),
      reliability: clamp01(q.onTimeRate / 100),
      verification: clamp01(q.verification / 3),
      terms: clamp01(q.termsScore),
    };
    const total = (Object.keys(SCORE_WEIGHTS) as ScoreFactor[]).reduce(
      (sum, k) => sum + SCORE_WEIGHTS[k] * factors[k],
      0,
    );
    return { ...q, factors, score: Math.round(total * 100) };
  });
}
