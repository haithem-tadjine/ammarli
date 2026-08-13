/**
 * ─── Ammarli Design System — Typography ──────────────────────────────────────
 * Uses Cairo font loaded via @expo-google-fonts/cairo.
 * Cairo is a Humanist Sans Serif designed for Arabic & Latin scripts.
 */

export const FONTS = {
  regular: 'Cairo-Regular',
  semiBold: 'Cairo-SemiBold',
  bold: 'Cairo-Bold',
} as const;

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const LINE_HEIGHTS = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8,
} as const;

export const LETTER_SPACING = {
  tight: -0.3,
  normal: 0,
  wide: 0.5,
  xWide: 1.0,
} as const;
