/**
 * AppRoutes — Declarative Route Renderer
 * 
 * Iterates the routeConfig array and renders <Route> elements
 * with consistent auth guards, layout wrapping, and Suspense boundaries.
 * 
 * This replaces the 34-line manual <Route> block in App.tsx.
 * Auth + layout wrapping is guaranteed by construction — no more
 * forgetting to add <ProtectedRoute> or <MainLayout>.
 * 
 * @module routes/AppRoutes
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './paths';
import { Box, CircularProgress, Typography } from '@mui/material';
import { routeConfig } from './routeConfig';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { MainLayout } from '../components/layout/ModernMainLayout';

// =============================================================================
// Suspense Fallback for lazy-loaded pages
// =============================================================================

const PageLoadingFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 2,
    }}
  >
    <CircularProgress size={48} sx={{ color: '#2E7D9A' }} />
    <Typography variant="body2" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

// =============================================================================
// Route Element Builder
// =============================================================================

/**
 * Wraps a component with auth guard and/or layout based on route config.
 * Order: Suspense → ProtectedRoute → MainLayout → Component
 */
const buildRouteElement = (
  Component: React.ComponentType | undefined,
  auth: boolean,
  layout: boolean,
  redirectTo?: string,
): React.ReactElement => {
  // Redirect route — no component needed
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!Component) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  // Build inside-out: Component → Layout → Auth → Suspense
  let element: React.ReactElement = <Component />;

  if (layout) {
    element = <MainLayout>{element}</MainLayout>;
  }

  if (auth) {
    element = <ProtectedRoute>{element}</ProtectedRoute>;
  }

  // Suspense wraps everything for lazy-loaded components
  element = <Suspense fallback={<PageLoadingFallback />}>{element}</Suspense>;

  return element;
};

// =============================================================================
// AppRoutes Component
// =============================================================================

const AppRoutes: React.FC = () => (
  <Routes>
    {routeConfig.map((route) => (
      <Route
        key={route.path}
        path={route.path}
        element={buildRouteElement(
          route.component,
          route.auth,
          route.layout,
          route.redirectTo,
        )}
      />
    ))}
  </Routes>
);

export default AppRoutes;
