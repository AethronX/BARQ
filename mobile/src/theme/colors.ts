/**
 * BARQ colour tokens. The only place a hex value is allowed to appear.
 *
 * Two layers: brand/neutral values, then semantic names that screens use.
 * Status colours always travel with an icon and a word, never on their own —
 * colour alone is not an indicator (accessibility, and colour-blind users).
 */
export const palette = {
  navy: '#0F172A',
  navy2: '#14213D',
  navy3: '#1E2F52',
  navyInk: '#CBD5E1',
  amber: '#F8A91B',
  amber2: '#F59E0B',
  amberSoft: '#FEF4DF',
  amberInk: '#1A1204',
  amberText: '#9A5B00',

  white: '#FFFFFF',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  tile: '#F4F7FB',
  line: '#E2E8F0',
  hair: '#EFF3F8',

  ink: '#0F172A',
  ink2: '#334155',
  muted: '#64748B',

  success: '#15803D',
  successSoft: '#E3F6EA',
  successIcon: '#16A34A',
  warning: '#B45309',
  warningSoft: '#FEF4DF',
  error: '#B91C1C',
  errorSoft: '#FDEDE4',
  info: '#0369A1',
  infoSoft: '#EAF1FD',
} as const;

/**
 * Names screens use. Kept backward-compatible with the values the app already
 * imports (green/blue/red/error/mock*) so no screen had to be rewritten for
 * the token refactor.
 */
export const colors = {
  ...palette,
  // semantic aliases
  text: palette.ink,
  textSecondary: palette.muted,
  border: palette.line,
  card: palette.surface,
  // legacy names still used across the app, now pointing at the tokens
  green: palette.success,
  greenSoft: palette.successSoft,
  greenIcon: palette.successIcon,
  blue: palette.info,
  blueSoft: palette.infoSoft,
  red: palette.error,
  redSoft: palette.errorSoft,
  error: '#E11D48',
  mockBg: palette.amberSoft,
  mockInk: '#92400E',
} as const;

export type ColorName = keyof typeof colors;
