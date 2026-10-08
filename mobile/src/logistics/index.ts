/**
 * Returns a logistics provider only when mock logistics is explicitly enabled.
 * With no provider, delivery cost stays unknown and the UI says the cost is not
 * calculated — which is the truth until a carrier is actually integrated.
 */
import { mockLogisticsProvider } from './mockProvider';
import type { LogisticsProvider } from './types';

export const MOCK_LOGISTICS = process.env.EXPO_PUBLIC_MOCK_LOGISTICS === 'true';

export function getLogisticsProvider(): LogisticsProvider | null {
  return MOCK_LOGISTICS ? mockLogisticsProvider : null;
}

export * from './types';
