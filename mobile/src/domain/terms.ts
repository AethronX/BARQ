/** How favourable each payment term is to the buyer (input to the BARQ Score). */
import type { PaymentTerms } from '../api/types';

export const TERMS_SCORE: Record<PaymentTerms, number> = {
  NET_60: 1,
  NET_30: 0.85,
  ADVANCE_30: 0.6,
  ADVANCE_50: 0.5,
  ADVANCE_100: 0.2,
};
