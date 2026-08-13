/**
 * ─── Ammarli Responsive Scaling Utility ──────────────────────────────────────
 * Usage:
 *   import { s, vs, ms, mf, wp, hp } from '../../utils/responsive';
 *
 *   fontSize: mf(16)       → font size scales moderately
 *   padding: s(20)         → scales with screen width
 *   height: vs(60)         → scales with screen height
 *   width: wp(90)          → 90% of screen width
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Base design dimensions (iPhone 14 / ~390pt width)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const widthRatio = SCREEN_W / BASE_WIDTH;
const heightRatio = SCREEN_H / BASE_HEIGHT;

/** Horizontal scale — padding, margin, width, borderRadius */
export const s = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel(size * widthRatio));

/** Vertical scale — height, vertical padding/margin */
export const vs = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel(size * heightRatio));

/** Moderate scale — fontSize and icon sizes */
export const ms = (size: number, factor = 0.5): number =>
  Math.round(PixelRatio.roundToNearestPixel(size + (s(size) - size) * factor));

/** Font scale (conservative, prevents text from getting too large on tablets) */
export const mf = (size: number): number => ms(size, 0.4);

/** Width percentage */
export const wp = (percent: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_W * percent) / 100));

/** Height percentage */
export const hp = (percent: number): number =>
  Math.round(PixelRatio.roundToNearestPixel((SCREEN_H * percent) / 100));

export const SCREEN = {
  width: SCREEN_W,
  height: SCREEN_H,
  isSmall: SCREEN_W < 375,
  isMedium: SCREEN_W >= 375 && SCREEN_W < 414,
  isLarge: SCREEN_W >= 414 && SCREEN_W < 768,
  isTablet: SCREEN_W >= 768,
};

export const getGridColumns = (): number => {
  if (SCREEN.isTablet) return 3;
  return 2;
};
