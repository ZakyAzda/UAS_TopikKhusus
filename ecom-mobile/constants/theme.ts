/**
 * Tema warna untuk ecom-mobile
 * Brand color: Hijau segar (#1A6B3C)
 */

import { Platform } from 'react-native';

// ─── Brand Colors ──────────────────────────────────────────────────────────────
export const Brand = {
  primary:      '#1A6B3C',
  primaryLight: '#2D9158',
  primaryDark:  '#0F4526',
  primaryMuted: '#E8F5EE',
  accent:       '#F5A623',
  accentLight:  '#FFF3DC',
};

// ─── Semantic Colors (Light & Dark) ───────────────────────────────────────────
export const Colors = {
  light: {
    // Background
    background:   '#F7F8FA',
    surface:      '#FFFFFF',
    surfaceAlt:   '#F0F2F5',

    // Text
    text:         '#111827',
    textSecondary:'#6B7280',
    textMuted:    '#9CA3AF',
    textInverse:  '#FFFFFF',

    // Brand (alias)
    tint:         Brand.primary,
    tabIconDefault:  '#9CA3AF',
    tabIconSelected: Brand.primary,
    icon:         '#6B7280',

    // Border & Shadow
    border:       '#E5E7EB',
    borderLight:  '#F3F4F6',
    shadow:       'rgba(0,0,0,0.08)',
    shadowMd:     'rgba(0,0,0,0.12)',

    // Status
    success:      '#10B981',
    error:        '#EF4444',
    warning:      '#F59E0B',
    info:         '#3B82F6',
  },

  dark: {
    // Background
    background:   '#0D1117',
    surface:      '#161B22',
    surfaceAlt:   '#21262D',

    // Text
    text:         '#E6EDF3',
    textSecondary:'#8B949E',
    textMuted:    '#6E7681',
    textInverse:  '#0D1117',

    // Brand (alias)
    tint:         Brand.primaryLight,
    tabIconDefault:  '#6E7681',
    tabIconSelected: Brand.primaryLight,
    icon:         '#8B949E',

    // Border & Shadow
    border:       '#30363D',
    borderLight:  '#21262D',
    shadow:       'rgba(0,0,0,0.3)',
    shadowMd:     'rgba(0,0,0,0.5)',

    // Status
    success:      '#3FB950',
    error:        '#F85149',
    warning:      '#D29922',
    info:         '#58A6FF',
  },
};

// ─── Fonts ────────────────────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ─── Spacing & Radius ─────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  full: 9999,
};