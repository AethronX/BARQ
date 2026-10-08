/** Deterministic fake carrier quotes for internal testing. Never real data. */
import type { LogisticsProvider, LogisticsQuote, LogisticsQuoteRequest } from './types';

const PROVIDERS = [
  { id: 'mock-a', providerName: { ar: 'مزود تجريبي أ', en: 'Test provider A' }, base: 12_000, perUnit: 150, minDays: 2, maxDays: 4 },
  { id: 'mock-b', providerName: { ar: 'مزود تجريبي ب', en: 'Test provider B' }, base: 8_000, perUnit: 260, minDays: 3, maxDays: 6 },
] as const;

export const mockLogisticsProvider: LogisticsProvider = {
  id: 'mock',
  isMock: true,
  async quote(req: LogisticsQuoteRequest): Promise<LogisticsQuote[]> {
    const qty = Math.max(1, req.quantity);
    return PROVIDERS.map((p) => ({
      providerId: p.id,
      providerName: p.providerName,
      cost: p.base + p.perUnit * qty,
      minDays: p.minDays,
      maxDays: p.maxDays,
      source: 'MOCK' as const,
    }));
  },
};
