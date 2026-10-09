/**
 * Type scale. Arabic needs more line height than Latin at the same size, so
 * every entry carries its own lineHeight rather than relying on a multiplier.
 */
export const type = {
  h1: { fontSize: 24, fontWeight: '800', lineHeight: 34 },
  h2: { fontSize: 20, fontWeight: '700', lineHeight: 30 },
  h3: { fontSize: 16.5, fontWeight: '700', lineHeight: 26 },
  bodyStrong: { fontSize: 14, fontWeight: '700', lineHeight: 23 },
  body: { fontSize: 14, fontWeight: '500', lineHeight: 23 },
  small: { fontSize: 12.5, fontWeight: '500', lineHeight: 20 },
  tiny: { fontSize: 11.5, fontWeight: '500', lineHeight: 18 },
} as const;

/** Caps the OS font-scale so an extreme setting cannot break Arabic layout. */
export const MAX_FONT_SCALE = 1.4;
