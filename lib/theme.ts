// lib/theme.ts
// V1 theme. V2 will replace this file with cyberpunk tokens.
// All styling throughout the app MUST reference these tokens,
// either directly or via NativeWind config.

export const colors = {
  background: '#ffffff',
  foreground: '#0a0a0a',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  border: '#e4e4e7',
  primary: '#18181b',
  primaryForeground: '#fafafa',
  accent: '#f4f4f5',
  accentForeground: '#18181b',
  destructive: '#ef4444',
  destructiveForeground: '#fafafa',
  success: '#22c55e',
  warning: '#eab308',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;
