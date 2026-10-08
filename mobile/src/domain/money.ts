/**
 * Money is stored as integer baisa (1 OMR = 1000 baisa) so that totals never
 * accumulate floating-point error. Formatting is the only place we divide.
 */
export type Baisa = number;

export const BAISA_PER_OMR = 1000;

export function omrToBaisa(omr: number): Baisa {
  return Math.round(omr * BAISA_PER_OMR);
}

export interface MoneyParts {
  currency: 'OMR';
  whole: string;
  /** Three-digit baisa part without the dot, or null when hidden in compact mode. */
  fraction: string | null;
}

/**
 * Splits an amount for display. `compact` hides ".000" for whole-rial amounts
 * (used on dense cards); full mode always shows the three baisa digits.
 */
export function moneyParts(amount: Baisa, compact = false): MoneyParts {
  if (!Number.isInteger(amount)) throw new Error('Money must be integer baisa');
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / BAISA_PER_OMR).toLocaleString('en-US');
  const rest = abs % BAISA_PER_OMR;
  const fraction = compact && rest === 0 ? null : String(rest).padStart(3, '0');
  return { currency: 'OMR', whole: sign + whole, fraction };
}

export function formatMoney(amount: Baisa, compact = false): string {
  const p = moneyParts(amount, compact);
  return `${p.currency} ${p.whole}${p.fraction === null ? '' : '.' + p.fraction}`;
}
