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

  // ── Unified card design system ────────────────────────────────
  /** Light blue diagonal gradient for all analytics cards */
  cardDiagonalGradient: string;
  /** Hover variant of the diagonal gradient */
  cardDiagonalGradientHover: string;
  /** Uniform card border radius (px) */
  cardBorderRadius: number;
  /** Subtle card shadow */
  cardShadow: string;
  /** Hover card shadow (lifted) */
  cardShadowHover: string;
  /** Logo-branded gradient for hover info cards */
  logoGradient: string;
  /** Metallic arc gradient stops for gauge/donut charts */
  metallicGradient: readonly [string, string, string];
  /** Secondary metallic (danger) */
  metallicGradientDanger: readonly [string, string, string];

  // Typography
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // ── Uniform card typography ───────────────────────────────────
  cardTitleSize: string;
  cardTitleWeight: number;
  cardValueSize: string;
  cardValueWeight: number;
  cardCaptionSize: string;

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

  // ── Unified card design system ────────────────────────────────
  cardDiagonalGradient:
    'linear-gradient(135deg, rgba(0, 201, 234, 0.08) 0%, rgba(26, 29, 58, 0.95) 40%, rgba(96, 165, 250, 0.06) 100%)',
  cardDiagonalGradientHover:
    'linear-gradient(135deg, rgba(0, 201, 234, 0.14) 0%, rgba(30, 33, 69, 0.95) 40%, rgba(96, 165, 250, 0.10) 100%)',
  cardBorderRadius: 16,
  cardShadow: '0 2px 12px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 201, 234, 0.08)',
  cardShadowHover: '0 8px 28px rgba(0, 0, 0, 0.35), 0 0 1px rgba(0, 201, 234, 0.18)',
  logoGradient: 'linear-gradient(135deg, #00C9EA 0%, #60A5FA 50%, #00C9EA 100%)',
  metallicGradient: ['#b8e6f0', '#00C9EA', '#007a8f'] as const,
  metallicGradientDanger: ['#f8b4b4', '#EF4444', '#991b1b'] as const,

  // Typography
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", monospace',
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',

  // ── Uniform card typography ───────────────────────────────────
  cardTitleSize: '0.85rem',
  cardTitleWeight: 600,
  cardValueSize: '1.05rem',
  cardValueWeight: 700,
  cardCaptionSize: '0.7rem',

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

  // Tooltip — light blue background for on-hover info cards
  tooltipBackground: '#E0F2FE',
  tooltipBorder: 'rgba(0, 201, 234, 0.25)',
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

  // ── Unified card design system ────────────────────────────────
  cardDiagonalGradient:
    'linear-gradient(135deg, rgba(0, 201, 234, 0.05) 0%, #FFFFFF 40%, rgba(96, 165, 250, 0.06) 100%)',
  cardDiagonalGradientHover:
    'linear-gradient(135deg, rgba(0, 201, 234, 0.10) 0%, #FAFBFF 40%, rgba(96, 165, 250, 0.10) 100%)',
  cardBorderRadius: 16,
  cardShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 0 1px rgba(37, 99, 235, 0.08)',
  cardShadowHover: '0 8px 28px rgba(0, 0, 0, 0.10), 0 0 1px rgba(37, 99, 235, 0.15)',
  logoGradient: 'linear-gradient(135deg, #0284C7 0%, #60A5FA 50%, #0284C7 100%)',
  metallicGradient: ['#b8e6f0', '#0284C7', '#075985'] as const,
  metallicGradientDanger: ['#fca5a5', '#DC2626', '#7f1d1d'] as const,

  // Typography
  fontHeading: '"ClashGrotesk", "Inter", sans-serif',
  fontBody: '"Lexend", "Inter", sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", monospace',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',

  // ── Uniform card typography ───────────────────────────────────
  cardTitleSize: '0.85rem',
  cardTitleWeight: 600,
  cardValueSize: '1.05rem',
  cardValueWeight: 700,
  cardCaptionSize: '0.7rem',

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

  // Tooltip — light blue background for on-hover info cards
  tooltipBackground: '#E0F2FE',
  tooltipBorder: 'rgba(37, 99, 235, 0.20)',
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
  backgroundColor: '#E0F2FE',
  border: '1px solid rgba(0, 201, 234, 0.25)',
  borderRadius: DASHBOARD_THEME.cardBorderRadius,
  color: '#0F172A',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
  backdropFilter: 'blur(8px)',
};

// ────────────────────────────────────────────────────────────────────────────
// Type-safe access helper
// ────────────────────────────────────────────────────────────────────────────

export type DashboardThemeKey = keyof DashboardThemeTokens;

// ────────────────────────────────────────────────────────────────────────────
// Metallic gradient helper — generates 3 stops (light, base, dark)
// for SVG <linearGradient> defs on bar / pie / gauge fills
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate metallic gradient stop triplet from a hex colour.
 * Returns [highlight, base, shadow] hex values.
 *
 *  - highlight: 40% towards white
 *  - base:      original colour
 *  - shadow:    30% towards black
 */
export function metallicStops(hex: string): [string, string, string] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lr = Math.min(255, Math.round(r + (255 - r) * 0.4));
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.4));
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.4));

  const dr = Math.round(r * 0.7);
  const dg = Math.round(g * 0.7);
  const db = Math.round(b * 0.7);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return [
    `#${toHex(lr)}${toHex(lg)}${toHex(lb)}`,
    hex,
    `#${toHex(dr)}${toHex(dg)}${toHex(db)}`,
  ];
}
