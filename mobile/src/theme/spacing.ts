/** 4-based spacing scale. Screens use these, not arbitrary numbers. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Horizontal page gutter, matched by every screen container. */
export const GUTTER = space.lg;

/** Minimum touch target per the accessibility guidelines. */
export const TOUCH = 44;

/** Fixed control heights, so buttons and inputs line up across screens. */
export const size = {
  buttonSm: 40,
  button: 52,
  input: 52,
  icon: 22,
  iconSm: 17,
  iconLg: 26,
  cardPadding: space.lg,
} as const;

/** Phone / large-phone / tablet. Used for column counts and max widths. */
export const breakpoint = { sm: 360, md: 480, lg: 768 } as const;
