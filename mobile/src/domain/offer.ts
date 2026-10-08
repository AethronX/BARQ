/**
 * Offer normalisation and total cost.
 *
 * The rule that shapes this file: a cost component we do not have is `null`,
 * never 0. A missing delivery cost must travel through the engine as "unknown"
 * all the way to the screen, which says so in words, because a total that
 * silently omits delivery is a wrong number presented as a right one.
 */
import type { Baisa } from './money';
import type { PaymentTerms, QuoteStatus } from '../api/types';
import type { VerificationLevel } from './score';

export interface OfferSupplier {
  id: string;
  name: string;
  verification: VerificationLevel;
  /** Completed orders on BARQ. 0 for a new supplier — a real 0, not a guess. */
  completedOrders: number;
}

/** A quote normalised for comparison. All money is integer baisa. */
export interface NormalizedOffer {
  quoteId: string;
  supplier: OfferSupplier;
  quantity: number;
  unitPrice: Baisa;
  /** Server-computed unitPrice × quantity. */
  goodsTotal: Baisa;
  /** null = not calculated. Never 0 as a stand-in for unknown. */
  deliveryCost: Baisa | null;
  fees: Baisa;
  discount: Baisa;
  minDays: number;
  maxDays: number;
  warrantyMonths: number;
  paymentTerms: PaymentTerms;
  /** 0–5, or null while no review system exists. */
  rating: number | null;
  /** 0–100, or null while no delivery history exists. */
  onTimeRate: number | null;
  validUntil: string | null;
  status: QuoteStatus;
}

export interface TotalCost {
  goods: Baisa;
  delivery: Baisa | null;
  fees: Baisa;
  discount: Baisa;
  /** goods + (delivery ?? 0) + fees − discount. Never below zero. */
  total: Baisa;
  /** false when a component is unknown: the UI must label the total as partial. */
  complete: boolean;
}

export function totalCost(o: NormalizedOffer): TotalCost {
  const total = Math.max(0, o.goodsTotal + (o.deliveryCost ?? 0) + o.fees - o.discount);
  return { goods: o.goodsTotal, delivery: o.deliveryCost, fees: o.fees, discount: o.discount, total, complete: o.deliveryCost != null };
}

/**
 * Which quote states may enter a comparison. Mirrors the server's quote
 * lifecycle; the server remains the authority, this only keeps withdrawn and
 * rejected offers out of the ranking.
 */
export const COMPARABLE_STATUSES: readonly QuoteStatus[] = ['SUBMITTED', 'AWARDED'];

export const QUOTE_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  SUBMITTED: ['AWARDED', 'NOT_SELECTED', 'WITHDRAWN'],
  AWARDED: [],
  NOT_SELECTED: [],
  WITHDRAWN: [],
};

export function isExpired(o: NormalizedOffer, now: number): boolean {
  return o.validUntil != null && new Date(o.validUntil).getTime() < now;
}

/** Offers that compete (live state, not expired) and the ones set aside, kept for display. */
export function partitionOffers(offers: readonly NormalizedOffer[], now: number) {
  const live: NormalizedOffer[] = [];
  const setAside: { offer: NormalizedOffer; why: 'expired' | 'withdrawn' }[] = [];
  for (const o of offers) {
    if (!COMPARABLE_STATUSES.includes(o.status)) setAside.push({ offer: o, why: 'withdrawn' });
    else if (isExpired(o, now)) setAside.push({ offer: o, why: 'expired' });
    else live.push(o);
  }
  return { live, setAside };
}
