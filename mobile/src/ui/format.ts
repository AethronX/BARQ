import type { I18n } from '../i18n/I18nProvider';
import { STRINGS, type StringKey } from '../i18n/strings';
import type { Notif } from '../state/store';

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

export function formatStamp(i18n: I18n, ms: number): string {
  return new Date(ms).toLocaleString(i18n.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function isToday(ms: number): boolean {
  return new Date(ms).toDateString() === new Date().toDateString();
}

/** Renders a stored notification in the current language. */
export function notifText(i18n: I18n, n: Notif): string {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(n.params)) {
    if (typeof v === 'string') params[k] = v in STRINGS.ar ? i18n.t(v as StringKey) : v;
    else params[k] = i18n.L(v);
  }
  return i18n.t(n.key, params);
}
