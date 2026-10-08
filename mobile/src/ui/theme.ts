/**
 * BARQ design tokens, matching the approved mockups.
 *
 * BARQ has ONE theme: this light one. It does not follow the device's dark
 * mode, now or later — `userInterfaceStyle: "light"` in app.json locks the
 * native side, and every colour below is a fixed value rather than a
 * light/dark pair. The navy surfaces (header, tab bar, hero) are brand, not a
 * dark theme. Anyone adding a dark variant has to revisit this file, the app
 * config and the status bar together, so the decision stays deliberate.
 */
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
  bg: '#F8FAFC',
  card: '#FFFFFF',
  tile: '#F4F7FB',
  line: '#E8EDF4',
  hair: '#EFF3F8',
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
export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;

export const type = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 20, fontWeight: '700' },
  h3: { fontSize: 16.5, fontWeight: '700' },
  body: { fontSize: 14 },
  small: { fontSize: 12 },
  tiny: { fontSize: 11 },
} as const;

/**
 * Light, premium elevation: a wide, very faint shadow reads as paper lifted off
 * a page, where a tight dark one reads as a drop shadow from the 2000s.
 */
export const shadow = {
  card: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.045,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  /** For surfaces that should float above the page: sheets, hero panels. */
  raised: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
} as const;

/** Minimum touch target per accessibility guidelines. */
export const TOUCH = 44;
