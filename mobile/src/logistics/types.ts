/**
 * Logistics handoff — ARCHITECTURE ONLY.
 *
 * BARQ has no carrier agreement with any company. Nothing here is an
 * integration, and no real carrier is named anywhere in this module: naming
 * Asyad, Nool or Oman Post would present a partnership that does not exist.
 * Every quote this module can produce today is tagged `source: 'MOCK'` and must
 * be rendered with a visible test-data marker.
 */
import type { Baisa } from '../domain/money';
import type { Location, Unit } from '../api/types';

export interface LogisticsQuoteRequest {
  rfqId: string;
  from: Location | null;
  to: Location;
  quantity: number;
  unit: Unit;
}

export interface LogisticsQuote {
  providerId: string;
  /** Display name. Mock providers carry an explicitly fictional name. */
  providerName: { ar: string; en: string };
  cost: Baisa;
  minDays: number;
  maxDays: number;
  /** 'MOCK' = generated for testing. No 'LIVE' producer exists yet. */
  source: 'MOCK' | 'LIVE';
}

export interface LogisticsProvider {
  id: string;
  /** True for any provider whose numbers are not from a real carrier. */
  isMock: boolean;
  quote(req: LogisticsQuoteRequest): Promise<LogisticsQuote[]>;
}
