/**
 * Centralized Route Constants
 * 
 * Single source of truth for ALL route paths in the application.
 * Every navigate(), <Link to={}>, <Route path={}>, sidebar item,
 * and test assertion MUST reference these constants — never hardcoded strings.
 * 
 * Benefits:
 * - Rename a route by changing ONE line (not 15+ files)
 * - TypeScript autocomplete for all routes
 * - Compile-time detection of invalid route references
 * - grep-friendly: find all usages of ROUTES.WORKFLOW instantly
 * 
 * @module routes/paths
 */

// =============================================================================
// Public Routes — No authentication required
// =============================================================================

export const ROUTES = {
  // ── Landing & Auth ──────────────────────────────────────────────────────
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // ── Info Pages ──────────────────────────────────────────────────────────
  ABOUT: '/about',
  FEATURES: '/features',
  PRICING: '/pricing',
  DEMO: '/demo',
  API: '/api',
  CAREERS: '/careers',
  RESEARCH: '/research',
  CONTACT: '/contact',
  DOCUMENTATION: '/documentation',
  BLOG: '/blog',
  SUPPORT: '/support',
  STATUS: '/status',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  SECURITY: '/security',
  COMPLIANCE: '/compliance',
  TECHNOLOGY: '/technology',
  PARTNERS: '/partners',
  EVENTS: '/events',

  // ── Solutions (cancer-type pages) ───────────────────────────────────────
  SOLUTION_BREAST_CANCER: '/solutions/breast-cancer',
  SOLUTION_LUNG_CANCER: '/solutions/lung-cancer',
  SOLUTION_PROSTATE_CANCER: '/solutions/prostate-cancer',
  SOLUTION_COLORECTAL_CANCER: '/solutions/colorectal-cancer',

  // ── Public Clinical ─────────────────────────────────────────────────────
  DIAGNOSTIC_VIEWER: '/diagnostic-viewer',

  // ── Protected Routes — Require authentication ───────────────────────────
  DASHBOARD: '/dashboard',
  WORKFLOW: '/workflow',
  CASES: '/cases',
  ANALYSIS_ARCHIVE: '/analysis-archive',
  ANALYSIS_SUITE: '/analysis-suite',
  HISTORY: '/history',
  SETTINGS: '/settings',
  FAIRNESS: '/fairness',
} as const;

// =============================================================================
// Type-safe route type (union of all route strings)
// =============================================================================

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

// =============================================================================
// Legacy Redirects — Old URLs that redirect to canonical routes
// These exist only for backward compatibility and can be removed once
// analytics confirm zero traffic on them.
// =============================================================================

export const LEGACY_REDIRECTS: Record<string, string> = {
  '/analyze': ROUTES.WORKFLOW,
  '/workflow-v2': ROUTES.WORKFLOW,
  '/diagnostic-workstation': ROUTES.WORKFLOW,
};

// =============================================================================
// Route Metadata Helpers
// =============================================================================

/** Routes that appear in the sidebar/main navigation */
export const SIDEBAR_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.WORKFLOW,
  ROUTES.ANALYSIS_ARCHIVE,
  ROUTES.CASES,
  ROUTES.HISTORY,
  ROUTES.FAIRNESS,
  ROUTES.SETTINGS,
  ROUTES.ABOUT,
] as const;

/** Default redirect after successful login */
export const DEFAULT_AUTH_REDIRECT = ROUTES.DASHBOARD;

/** Where to redirect on logout */
export const LOGOUT_REDIRECT = ROUTES.HOME;

/** Where to redirect unauthenticated users */
export const LOGIN_REDIRECT = ROUTES.LOGIN;
