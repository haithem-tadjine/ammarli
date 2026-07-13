/**
 * ─── Ammarli Design System — Color Tokens ────────────────────────────────────
 * Single source of truth for all colors in the app.
 * Both Customer and Driver apps import from here.
 */

export const COLORS = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  navy: '#003366',
  navyDark: '#002855',
  navyDeep: '#001E3C',

  yellow: '#F3CD0D',
  yellowLight: 'rgba(243, 205, 13, 0.15)',

  // ── Neutrals ───────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  bgLight: '#F5F7FA',
  bgCard: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary: '#003366',
  textSecondary: '#6B7280',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // ── Status ──────────────────────────────────────────────────────────────────
  green: '#10B981',
  greenLight: '#D1FADF',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',

  // ── Overlay ──────────────────────────────────────────────────────────────────
  overlay: 'rgba(0, 30, 60, 0.6)',
  overlayLight: 'rgba(255, 255, 255, 0.9)',
} as const;

export type ColorKey = keyof typeof COLORS;
