const { colors } = require('./lib/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        foreground: colors.foreground,
        muted: colors.muted,
        'muted-foreground': colors.mutedForeground,
        border: colors.border,
        primary: colors.primary,
        'primary-foreground': colors.primaryForeground,
        accent: colors.accent,
        'accent-foreground': colors.accentForeground,
        destructive: colors.destructive,
        'destructive-foreground': colors.destructiveForeground,
        success: colors.success,
        warning: colors.warning,
      },
    },
  },
  plugins: [],
};
