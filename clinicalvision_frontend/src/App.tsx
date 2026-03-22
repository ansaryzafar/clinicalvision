import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeContextProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
// V3 Workflow - Clean rewrite with TDD
import { WorkflowProvider } from './workflow-v3';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClinicalCaseProvider } from './contexts/ClinicalCaseContext';
import ScrollToTop from './components/utils/ScrollToTop';
// Centralized routing system
import AppRoutes from './routes/AppRoutes';
// GDPR/CCPA-compliant cookie consent banner
import CookieConsentBanner from './components/shared/CookieConsentBanner';

/**
 * ClinicalVision AI - Main Application
 * 
 * Production-grade breast cancer detection frontend.
 * 
 * Architecture:
 * - Route definitions live in src/routes/routeConfig.tsx (single source of truth)
 * - Route constants live in src/routes/paths.ts (no hardcoded strings)
 * - AppRoutes component auto-applies auth guards + layout wrappers
 * - Lazy loading for non-critical pages (footer, info pages)
 * - 404 catch-all for unmatched routes
 * 
 * Provider hierarchy: Theme → Auth → ClinicalCase → Workflow → Router → Routes
 */

/**
 * Wrapper that bridges AuthContext → ClinicalCaseContext.
 * Must live inside <AuthProvider> so useAuth() works.
 * Passes the authenticated user's ID to ClinicalCaseProvider,
 * falling back to 'anonymous' for unauthenticated users.
 */
const AuthenticatedClinicalCaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return (
    <ClinicalCaseProvider userId={user?.id || 'anonymous'}>
      {children}
    </ClinicalCaseProvider>
  );
};

function App() {
  return (
    <HelmetProvider>
    <ThemeContextProvider>
      <CssBaseline />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0D1117',
            color: '#FFFFFF',
            border: '1px solid rgba(46, 125, 154, 0.3)',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
          },
          success: {
            iconTheme: {
              primary: '#2ECC71',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#E74C3C',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
      <AuthProvider>
        <AuthenticatedClinicalCaseProvider>
          <WorkflowProvider>
            <Router>
              <ScrollToTop />
              <AppRoutes />
              <CookieConsentBanner />
            </Router>
          </WorkflowProvider>
        </AuthenticatedClinicalCaseProvider>
      </AuthProvider>
    </ThemeContextProvider>
    </HelmetProvider>
  );
}

export default App;
