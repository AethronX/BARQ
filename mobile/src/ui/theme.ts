/** BARQ design tokens, matching the approved mockups. */
export const colors = {
  navy: '#0F172A',
  navy2: '#14213D',
  navy3: '#1E2F52',
  navyInk: '#CBD5E1',
  amber: '#F8A91B',
  amber2: '#F59E0B',
  amberSoft: '#FEF4DF',
  amberInk: '#1A1204',
  amberText: '#9A5B00',
  bg: '#F4F6FA',
  card: '#FFFFFF',
  tile: '#F5F7FB',
  line: '#E5EAF1',
  ink: '#0F172A',
  ink2: '#334155',
  muted: '#7B8798',
  green: '#15803D',
  greenSoft: '#E3F6EA',
  greenIcon: '#16A34A',
  blue: '#2563EB',
  blueSoft: '#EAF1FD',
  red: '#C2410C',
  redSoft: '#FDEDE4',
  error: '#E11D48',
  mockBg: '#FEF4DF',
  mockInk: '#92400E',
  white: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;

export const type = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 20, fontWeight: '700' },
  h3: { fontSize: 16.5, fontWeight: '700' },
  body: { fontSize: 14 },
  small: { fontSize: 12 },
  tiny: { fontSize: 11 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

/** Minimum touch target per accessibility guidelines. */
export const TOUCH = 44;
