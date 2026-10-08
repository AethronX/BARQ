/** RFQ form validation. Returns error keys (i18n keys), never user-facing text. */

export const RFQ_LIMITS = {
  productMin: 3,
  productMax: 120,
  specMin: 10,
  specMax: 1000,
  qtyMin: 1,
  qtyMax: 100_000,
} as const;

export interface RfqDraft {
  product: string;
  category: string;
  quantity: string;
  unit: string;
  spec: string;
  location: string;
  requiredBy: string; // YYYY-MM-DD
}

export type RfqErrors = Partial<Record<keyof RfqDraft, string>>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function validateRfq(draft: RfqDraft, today: Date = new Date()): RfqErrors {
  const e: RfqErrors = {};
  const product = draft.product.trim();
  if (product.length < RFQ_LIMITS.productMin || product.length > RFQ_LIMITS.productMax) e.product = 'e_product';
  const qty = Number(draft.quantity);
  if (!Number.isInteger(qty) || qty < RFQ_LIMITS.qtyMin || qty > RFQ_LIMITS.qtyMax) e.quantity = 'e_qty';
  const spec = draft.spec.trim();
  if (spec.length < RFQ_LIMITS.specMin || spec.length > RFQ_LIMITS.specMax) e.spec = 'e_spec';
  if (!draft.location) e.location = 'e_location';
  const date = parseDateOnly(draft.requiredBy);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!date || date <= startOfToday) e.requiredBy = 'e_date';
  return e;
}
