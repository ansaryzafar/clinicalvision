/**
 * Dashboard Theme Tokens
 *
 * Centralised design-system constants for the AI Analytics Dashboard.
 * All dashboard chart and card components reference these values so that
 * colour, font, and layout changes propagate from a single source.
 *
 * Supports both light and dark modes with a diagonal blue gradient
 * in both themes for brand consistency.
 *
 * Palette derived from the LUNIT design system + reference analytics
 * dashboards (Appendix C of AI_METRICS_DASHBOARD_BLUEPRINT.md).
 */

// ────────────────────────────────────────────────────────────────────────────
// Type definition
// ────────────────────────────────────────────────────────────────────────────

export interface DashboardThemeTokens {
  // Base surfaces
  background: string;
  pageGradient: string;
  cardBackground: string;
  cardBackgroundHover: string;
  cardBorder: string;
  cardGradient: string;
  cardGradientHover: string;

  // Typography
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Chart data-series colours
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  success: string;
  warning: string;
  danger: string;
  neutral: string;

  // Gradient fills (area charts)
  primaryGradient: readonly [string, string];
  successGradient: readonly [string, string];
  dangerGradient: readonly [string, string];

  // Axes / grid
  gridStroke: string;
  axisStroke: string;
  axisFontSize: number;

  // Tooltip
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipBorderRadius: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Dark Theme (default — medical imaging optimised)
// ────────────────────────────────────────────────────────────────────────────

export const DASHBOARD_THEME_DARK: DashboardThemeTokens = {
  // Base surfaces
  background: '#0F1022',
  pageGradient: 'linear-gradient(135deg, rgba(15, 16, 34, 0.97) 0%, rgba(10, 25, 47, 0.95) 50%, rgba(15, 16, 34, 0.97) 100%)',
  cardBackground: '#1A1D3A',
  cardBackgroundHover: '#1E2145',
  cardBorder: 'rgba(0, 201, 234, 0.12)',
  cardGradient: 'linear-gradient(135deg, #1A1D3A 0%, #161832 50%, #141628 100%)',
  cardGradientHover: 'linear-gradient(135deg, #1E2145 0%, #1A1D3A 50%, #171A36 100%)',

  // Typography
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", monospace',
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',

  // Chart data-series colours
  primary: '#00C9EA',
  secondary: '#8B5CF6',
  tertiary: '#EC4899',
  quaternary: '#14B8A6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  neutral: '#94A3B8',

  // Gradient fills (area charts)
  primaryGradient: ['rgba(0, 201, 234, 0.3)', 'rgba(0, 201, 234, 0.0)'],
  successGradient: ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.0)'],
  dangerGradient: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.0)'],

  // Axes / grid
  gridStroke: 'rgba(255, 255, 255, 0.07)',
  axisStroke: '#94A3B8',
  axisFontSize: 11,

  // Tooltip
  tooltipBackground: '#161832',
  tooltipBorder: 'rgba(0, 201, 234, 0.2)',
  tooltipBorderRadius: 8,
};

// ────────────────────────────────────────────────────────────────────────────
// Light Theme — clean professional with subtle blue gradient
// ────────────────────────────────────────────────────────────────────────────

export const DASHBOARD_THEME_LIGHT: DashboardThemeTokens = {
  // Base surfaces
  background: '#F8FAFC',
  pageGradient: 'linear-gradient(135deg, rgba(248, 250, 252, 0.97) 0%, rgba(224, 238, 255, 0.6) 50%, rgba(248, 250, 252, 0.97) 100%)',
  cardBackground: '#FFFFFF',
  cardBackgroundHover: '#F8FAFC',
  cardBorder: 'rgba(37, 99, 235, 0.1)',
  cardGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #F1F5F9 100%)',
  cardGradientHover: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #EFF6FF 100%)',

  // Typography
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", monospace',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',

  // Chart data-series colours (slightly deeper for light backgrounds)
  primary: '#0284C7',
  secondary: '#7C3AED',
  tertiary: '#DB2777',
  quaternary: '#0D9488',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  neutral: '#64748B',

  // Gradient fills (area charts — more opaque for light backgrounds)
  primaryGradient: ['rgba(2, 132, 199, 0.2)', 'rgba(2, 132, 199, 0.0)'],
  successGradient: ['rgba(22, 163, 74, 0.2)', 'rgba(22, 163, 74, 0.0)'],
  dangerGradient: ['rgba(220, 38, 38, 0.2)', 'rgba(220, 38, 38, 0.0)'],

  // Axes / grid
  gridStroke: 'rgba(0, 0, 0, 0.06)',
  axisStroke: '#64748B',
  axisFontSize: 11,

  // Tooltip
  tooltipBackground: '#FFFFFF',
  tooltipBorder: 'rgba(37, 99, 235, 0.15)',
  tooltipBorderRadius: 8,
};

// ────────────────────────────────────────────────────────────────────────────
// Theme getter — selects light or dark based on mode
// ────────────────────────────────────────────────────────────────────────────

export function getDashboardTheme(mode: 'light' | 'dark'): DashboardThemeTokens {
  return mode === 'light' ? DASHBOARD_THEME_LIGHT : DASHBOARD_THEME_DARK;
}

// ────────────────────────────────────────────────────────────────────────────
// Default export (dark) — for backward compatibility with all existing
// chart components that do `import { DASHBOARD_THEME } from './dashboardTheme'`
// ────────────────────────────────────────────────────────────────────────────

export const DASHBOARD_THEME = DASHBOARD_THEME_DARK;

// ────────────────────────────────────────────────────────────────────────────
// BI-RADS colour mapping
// ────────────────────────────────────────────────────────────────────────────

export const BIRADS_COLORS: Record<string, string> = {
  '1': '#22C55E', // Negative
  '2': '#86EFAC', // Benign
  '3': '#F59E0B', // Probably benign
  '4': '#F97316', // Suspicious
  '5': '#EF4444', // Highly suspicious
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Risk-level colour mapping
// ────────────────────────────────────────────────────────────────────────────

export const RISK_COLORS: Record<string, string> = {
  low: '#22C55E',
  moderate: '#F59E0B',
  high: '#EF4444',
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Shared recharts tooltip style (dark mode default; light-mode components
// can build their own from getDashboardTheme)
// ────────────────────────────────────────────────────────────────────────────

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: DASHBOARD_THEME.tooltipBackground,
  border: `1px solid ${DASHBOARD_THEME.tooltipBorder}`,
  borderRadius: DASHBOARD_THEME.tooltipBorderRadius,
  color: '#FFFFFF',
  fontSize: 12,
};

// ────────────────────────────────────────────────────────────────────────────
// Type-safe access helper
// ────────────────────────────────────────────────────────────────────────────

export type DashboardThemeKey = keyof DashboardThemeTokens;
