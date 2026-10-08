/**
 * Maps the rows the server returned into comparison offers.
 *
 * Fields BARQ has no data for stay null: ratings (no review system),
 * on-time rate (no delivery history), delivery cost (no carrier integration).
 * Fees and discounts are 0 because the schema has no such columns — not as a
 * placeholder for numbers we failed to fetch.
 */
import type { NormalizedOffer } from '../domain/offer';
import type { VerificationLevel } from '../domain/score';
import type { QuoteWithSupplier } from './queries';

export interface OfferSource {
  quotes: readonly QuoteWithSupplier[];
  stats: Record<string, { completed_orders: number } | undefined>;
  quantity: number;
  /** Delivery cost per quote, when a logistics provider produced one. */
  deliveryCost?: Record<string, number | null>;
}

export function toOffers({ quotes, stats, quantity, deliveryCost }: OfferSource): NormalizedOffer[] {
  return quotes.map((q) => ({
    quoteId: q.id,
    supplier: {
      id: q.supplier_company_id,
      name: q.supplier.name,
      verification: q.supplier.verification as VerificationLevel,
      completedOrders: stats[q.supplier_company_id]?.completed_orders ?? 0,
    },
    quantity,
    unitPrice: q.unit_price_baisa,
    goodsTotal: q.total_baisa,
    deliveryCost: deliveryCost?.[q.id] ?? null,
    fees: 0,
    discount: 0,
    minDays: q.min_days,
    maxDays: q.max_days,
    warrantyMonths: q.warranty_months,
    paymentTerms: q.payment_terms,
    rating: null,
    onTimeRate: null,
    validUntil: q.valid_until,
    status: q.status,
  }));
}
