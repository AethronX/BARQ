import type { I18n } from '../i18n/I18nProvider';
import type { StringKey } from '../i18n/strings';
import type { Notification } from '../api/types';

/** Countdown parts: whole days plus an HH:MM:SS clock; null once closed. */
export function countdown(msLeft: number): { days: number; clock: string } | null {
  if (msLeft <= 0) return null;
  const s = Math.floor(msLeft / 1000);
  const days = Math.floor(s / 86400);
  const clock = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, '0')).join(':');
  return { days, clock };
}

export function dayCountLabel(i18n: I18n, days: number): string {
  if (i18n.lang === 'ar' && days === 1) return i18n.t('d_1');
  if (i18n.lang === 'ar' && days === 2) return i18n.t('d_2');
  return `${days} ${i18n.dayWord(days)}`;
}

export function formatStamp(i18n: I18n, iso: string): string {
  return new Date(iso).toLocaleString(i18n.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(i18n: I18n, iso: string): string {
  return new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function rfqRef(n: number): string {
  return `RFQ #BARQ-${n}`;
}

const KINDS = new Set([
  'rfq_new', 'quote_new', 'quote_updated', 'quote_withdrawn', 'quote_awarded', 'quote_not_selected',
  'rfq_cancelled', 'order_status', 'verification_changed', 'admin_deletion_request',
]);

/** Renders a server notification in the current language. */
export function notifText(i18n: I18n, n: Notification): string {
  if (!KINDS.has(n.kind)) return i18n.t('nk_unknown');
  const p: Record<string, string> = {};
  for (const [k, v] of Object.entries(n.params ?? {})) p[k] = v == null ? '' : String(v);
  if (n.kind === 'order_status' && p.status) p.status = i18n.t(`os_${p.status}` as StringKey);
  if (n.kind === 'verification_changed' && p.level) p.level = i18n.t(`v${p.level}` as StringKey);
  return i18n.t(`nk_${n.kind}` as StringKey, p);
}

/** Money input in OMR (up to 3 decimals) -> integer baisa, or null if invalid. */
export function parseOmr(input: string): number | null {
  const v = input.trim().replace(/,/g, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace('٫', '.');
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(v)) return null;
  const [w, f = ''] = v.split('.');
  const baisa = Number(w) * 1000 + Number(f.padEnd(3, '0'));
  return baisa > 0 ? baisa : null;
}
