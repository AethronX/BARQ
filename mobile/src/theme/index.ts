/**
 * BARQ design tokens.
 *
 * BARQ has ONE theme: this light one. It does not follow the device's dark
 * mode — `userInterfaceStyle: "light"` in app.json locks the native side and
 * every value here is a single colour, not a light/dark pair. The navy
 * surfaces (header, tab bar, hero) are brand, not a dark theme. Adding a dark
 * variant means revisiting this folder, app.json and the status bar together,
 * so the decision stays deliberate.
 */
export { colors, palette, type ColorName } from './colors';
export { space, GUTTER, TOUCH, size, breakpoint } from './spacing';
export { radius } from './radii';
export { type, MAX_FONT_SCALE } from './typography';
export { shadow } from './shadows';
