/**
 * Declarative Route Configuration
 * 
 * Every route in the app is defined here as a typed config object.
 * The AppRoutes renderer iterates this array to produce <Route> elements,
 * guaranteeing consistent auth guards, layout wrapping, and lazy loading.
 * 
 * Route shape:
 *   path        — from ROUTES constants (single source of truth)
 *   component   — React.lazy or eager component
 *   auth        — whether ProtectedRoute wraps it
 *   layout      — whether MainLayout wraps it
 *   redirectTo  — if set, renders <Navigate> instead of a component
 * 
 * Adding a new page = adding ONE entry here. No more editing 3 files.
 * 
 * @module routes/routeConfig
 */

import React from 'react';
import { ROUTES, LEGACY_REDIRECTS } from './paths';

// Eagerly-loaded pages — critical path, must load instantly
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import ClinicalDashboard from '../pages/ClinicalDashboard';
import { ClinicalWorkflowPageV2 } from '../pages/ClinicalWorkflowPageV2';
import { CasesDashboard } from '../pages/CasesDashboard';
import PatientRecords from '../pages/PatientRecords';
import SettingsPage from '../pages/SettingsPage';

// =============================================================================
// Lazy-loaded page components (non-critical pages loaded on demand)
// =============================================================================

// Footer / info pages — rarely visited, safe to lazy load
const FeaturesPage = React.lazy(() => import('../pages/FeaturesPage'));
const PricingPage = React.lazy(() => import('../pages/PricingPage'));
const DemoPage = React.lazy(() => import('../pages/DemoPage'));
const ApiPage = React.lazy(() => import('../pages/ApiPage'));
const CareersPage = React.lazy(() => import('../pages/CareersPage'));
const ResearchPage = React.lazy(() => import('../pages/ResearchPage'));
const ContactPage = React.lazy(() => import('../pages/ContactPage'));
const DocumentationPage = React.lazy(() => import('../pages/DocumentationPage'));
const BlogPage = React.lazy(() => import('../pages/BlogPage'));
const SupportPage = React.lazy(() => import('../pages/SupportPage'));
const StatusPage = React.lazy(() => import('../pages/StatusPage'));
const PrivacyPage = React.lazy(() => import('../pages/PrivacyPage'));
const TermsPage = React.lazy(() => import('../pages/TermsPage'));
const SecurityPage = React.lazy(() => import('../pages/SecurityPage'));
const CompliancePage = React.lazy(() => import('../pages/CompliancePage'));
const AboutPage = React.lazy(() => import('../pages/AboutPage'));
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'));
const DiagnosticViewer = React.lazy(() => import('../pages/DiagnosticViewer'));
const FairnessDashboard = React.lazy(() => import('../pages/FairnessDashboard'));
const AnalysisArchive = React.lazy(() => import('../pages/AnalysisArchive').then(m => ({ default: m.AnalysisArchive })));
const ImageAnalysisPage = React.lazy(() => import('../pages/ImageAnalysisPage'));

// New pages — technology, partners, events, solutions
const TechnologyPage = React.lazy(() => import('../pages/TechnologyPage'));
const PartnersPage = React.lazy(() => import('../pages/PartnersPage'));
const EventsPage = React.lazy(() => import('../pages/EventsPage'));
const BreastCancerSolutionPage = React.lazy(() => import('../pages/solutions/BreastCancerSolutionPage'));
const ComingSoonSolutionPage = React.lazy(() => import('../pages/solutions/ComingSoonSolutionPage'));

// =============================================================================
// Route Config Interface
// =============================================================================

export interface RouteEntry {
  /** Path from ROUTES constants */
  path: string;
  /** Component to render (lazy or eager) */
  component?: React.ComponentType;
  /** Require authentication? */
  auth: boolean;
  /** Wrap in MainLayout (sidebar + header)? */
  layout: boolean;
  /** If set, render <Navigate to={redirectTo}> instead of component */
  redirectTo?: string;
}

// =============================================================================
// Route Definitions — Ordered by category
// =============================================================================

export const routeConfig: RouteEntry[] = [
  // ── Public: Auth Flow ───────────────────────────────────────────────────
  { path: ROUTES.HOME,            component: LandingPage,       auth: false, layout: false },
  { path: ROUTES.LOGIN,           component: LoginPage,         auth: false, layout: false },
  { path: ROUTES.REGISTER,        component: RegisterPage,      auth: false, layout: false },
  { path: ROUTES.VERIFY_EMAIL,    component: VerifyEmailPage,   auth: false, layout: false },
  { path: ROUTES.FORGOT_PASSWORD, component: ForgotPasswordPage,auth: false, layout: false },
  { path: ROUTES.RESET_PASSWORD,  component: ResetPasswordPage, auth: false, layout: false },

  // ── Public: Info Pages (lazy) ───────────────────────────────────────────
  { path: ROUTES.ABOUT,           component: AboutPage,         auth: false, layout: false },
  { path: ROUTES.FEATURES,        component: FeaturesPage,      auth: false, layout: false },
  { path: ROUTES.PRICING,         component: PricingPage,       auth: false, layout: false },
  { path: ROUTES.DEMO,            component: DemoPage,          auth: false, layout: false },
  { path: ROUTES.API,             component: ApiPage,           auth: false, layout: false },
  { path: ROUTES.CAREERS,         component: CareersPage,       auth: false, layout: false },
  { path: ROUTES.RESEARCH,        component: ResearchPage,      auth: false, layout: false },
  { path: ROUTES.CONTACT,         component: ContactPage,       auth: false, layout: false },
  { path: ROUTES.DOCUMENTATION,   component: DocumentationPage, auth: false, layout: false },
  { path: ROUTES.BLOG,            component: BlogPage,          auth: false, layout: false },
  { path: ROUTES.SUPPORT,         component: SupportPage,       auth: false, layout: false },
  { path: ROUTES.STATUS,          component: StatusPage,        auth: false, layout: false },
  { path: ROUTES.PRIVACY,         component: PrivacyPage,       auth: false, layout: false },
  { path: ROUTES.TERMS,           component: TermsPage,         auth: false, layout: false },
  { path: ROUTES.SECURITY,        component: SecurityPage,      auth: false, layout: false },
  { path: ROUTES.COMPLIANCE,      component: CompliancePage,    auth: false, layout: false },

  // ── Public: New pages (technology, partners, events, solutions) ─────────
  { path: ROUTES.TECHNOLOGY,             component: TechnologyPage,            auth: false, layout: false },
  { path: ROUTES.PARTNERS,              component: PartnersPage,              auth: false, layout: false },
  { path: ROUTES.EVENTS,                component: EventsPage,                auth: false, layout: false },
  { path: ROUTES.SOLUTION_BREAST_CANCER, component: BreastCancerSolutionPage, auth: false, layout: false },
  { path: '/solutions/:cancerType',      component: ComingSoonSolutionPage,   auth: false, layout: false },

  // ── Public: Clinical Demo ───────────────────────────────────────────────
  { path: ROUTES.DIAGNOSTIC_VIEWER, component: DiagnosticViewer, auth: false, layout: false },

  // ── Protected: Core Clinical ────────────────────────────────────────────
  { path: ROUTES.DASHBOARD,        component: ClinicalDashboard,       auth: true, layout: true },
  { path: ROUTES.WORKFLOW,         component: ClinicalWorkflowPageV2,  auth: true, layout: true },
  { path: ROUTES.CASES,            component: CasesDashboard,          auth: true, layout: true },
  { path: ROUTES.ANALYSIS_ARCHIVE, component: AnalysisArchive,         auth: true, layout: true },
  { path: ROUTES.ANALYSIS_SUITE,   component: ImageAnalysisPage,       auth: true, layout: true },
  { path: ROUTES.HISTORY,          component: PatientRecords,          auth: true, layout: true },
  { path: ROUTES.SETTINGS,         component: SettingsPage,            auth: true, layout: true },
  { path: ROUTES.FAIRNESS,         component: FairnessDashboard,       auth: true, layout: true },

  // ── Legacy Redirects ────────────────────────────────────────────────────
  ...Object.entries(LEGACY_REDIRECTS).map(([from, to]) => ({
    path: from,
    auth: false,
    layout: false,
    redirectTo: to,
  })),

  // ── 404 Catch-All (must be last) ───────────────────────────────────────
  { path: '*',                     component: NotFoundPage,     auth: false, layout: false },
];
