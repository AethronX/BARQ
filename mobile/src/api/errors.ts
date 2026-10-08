import type { StringKey } from '../i18n/strings';

/** Server error codes raised by the database functions. */
const KNOWN = [
  'not_authenticated', 'forbidden', 'not_found', 'invalid_role', 'categories_required', 'company_not_verified',
  'invalid_required_by', 'invalid_closing', 'rate_limited', 'rfq_closed', 'invalid_validity', 'invalid_transition',
  'too_many_revisions', 'already_awarded', 'quote_unavailable', 'quote_expired', 'invalid_level', 'invalid_link',
] as const;

/** Maps any thrown error to a human-readable i18n key; technical details stay in logs. */
export function errorKey(e: unknown): StringKey {
  const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  const code = KNOWN.find((k) => msg === k || msg.includes(k));
  if (code) return `err_${code}` as StringKey;
  if (/network|fetch|timeout|Failed to fetch/i.test(msg)) return 'err_network';
  if (/rate limit|too many/i.test(msg)) return 'err_rate_limited';
  if (/Token has expired|invalid.*otp|otp.*invalid/i.test(msg)) return 'err_otp';
  if (__DEV__) console.warn('[api]', msg);
  return 'err_generic';
}

/** Throws the Supabase error so React Query can surface it. */
export function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
