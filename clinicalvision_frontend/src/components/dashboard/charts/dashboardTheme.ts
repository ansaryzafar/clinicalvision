/**
 * Dashboard Theme Tokens
 *
 * Centralised design-system constants for the AI Analytics Dashboard.
 * All dashboard chart and card components reference these values so that
 * colour, font, and layout changes propagate from a single source.
 *
 * Palette derived from the LUNIT design system + reference dark-analytics
 * dashboards (Appendix C of AI_METRICS_DASHBOARD_BLUEPRINT.md).
 */

// ────────────────────────────────────────────────────────────────────────────
// Core palette
// ────────────────────────────────────────────────────────────────────────────

export const DASHBOARD_THEME = {
  // Base surfaces
  background: '#0F1022',
  cardBackground: '#1A1D3A',
  cardBackgroundHover: '#1E2145',
  cardBorder: 'rgba(0, 201, 234, 0.12)',
  cardGradient: 'linear-gradient(135deg, #1A1D3A 0%, #161832 50%, #141628 100%)',
  cardGradientHover: 'linear-gradient(135deg, #1E2145 0%, #1A1D3A 50%, #171A36 100%)',

  // Typography
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", monospace',
  textPrimary: '#F1F5F9',     // High-contrast heading text
  textSecondary: '#CBD5E1',   // Sub-heading text
  textMuted: '#94A3B8',       // Muted labels (WCAG AA compliant on dark)

  // Chart data-series colours
  primary: '#00C9EA',
  secondary: '#8B5CF6',
  tertiary: '#EC4899',
  quaternary: '#14B8A6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  neutral: '#94A3B8',  // Bumped from #6B7280 → #94A3B8 for WCAG AA compliance

  // Gradient fills (area charts)
  primaryGradient: ['rgba(0, 201, 234, 0.3)', 'rgba(0, 201, 234, 0.0)'] as const,
  successGradient: ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.0)'] as const,
  dangerGradient: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.0)'] as const,

  // Axes / grid
  gridStroke: 'rgba(255, 255, 255, 0.07)',
  axisStroke: '#94A3B8',
  axisFontSize: 11,

  // Tooltip
  tooltipBackground: '#161832',
  tooltipBorder: 'rgba(0, 201, 234, 0.2)',
  tooltipBorderRadius: 8,
} as const;

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
// Shared recharts tooltip style
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

export type DashboardThemeKey = keyof typeof DASHBOARD_THEME;
