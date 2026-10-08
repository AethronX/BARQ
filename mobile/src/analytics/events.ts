/**
 * Typed analytics events for the Best Deal Engine.
 *
 * No vendor is wired: choosing one, and sending anything off the device, is a
 * privacy decision (Oman PDPL, Royal Decree 6/2022) that belongs to counsel,
 * not to this file. The sink is a no-op in production builds and a console
 * line in development, so the call sites are real and auditable today.
 *
 * Payloads carry ids and counts only — never company names, prices, or
 * anything identifying a person.
 */
export type DealEvent =
  | { name: 'deal_engine_viewed'; rfqId: string; offers: number; basis: 'total' | 'goods_only' }
  | { name: 'deal_recommendation_shown'; rfqId: string; offers: number; reasons: number; scoreVersion: string }
  | { name: 'deal_score_opened'; rfqId: string; quoteId: string }
  | { name: 'deal_comparison_opened'; rfqId: string; offers: number }
  | { name: 'deal_alternative_selected'; rfqId: string; quoteId: string; label: string }
  | { name: 'deal_award_confirmed'; rfqId: string; quoteId: string; followedRecommendation: boolean; scoreVersion: string }
  | { name: 'decisions_section_tapped'; rfqId: string; pending: number };

export function track(event: DealEvent): void {
  if (__DEV__) console.log('[analytics]', event.name, event);
}
