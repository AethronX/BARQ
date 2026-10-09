/**
 * Light, premium elevation: a wide, very faint shadow reads as paper lifted
 * off a page, where a tight dark one reads as a drop shadow from the 2000s.
 */
export const shadow = {
  card: { shadowColor: '#0B1220', shadowOpacity: 0.045, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  /** Surfaces that float above the page: sheets, hero panels. */
  raised: { shadowColor: '#0B1220', shadowOpacity: 0.08, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
} as const;
