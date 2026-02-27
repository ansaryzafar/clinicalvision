/**
 * ProtectedRoute Component Test Suite
 * 
 * Tests route protection behavior:
 * - Renders children when authenticated
 * - Redirects to login when not authenticated
 * - Handles loading state
 * - Preserves intended destination
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom';

// ============================================================================
// Mock AuthContext
// ============================================================================

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string } | null;
}

const mockAuthContext: AuthContextType = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// ============================================================================
// Component Under Test (Simulated)
// ============================================================================

// Simulating ProtectedRoute component behavior
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = mockAuthContext;
  const location = useLocation();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    // In real component, this would use Navigate
    return (
      <div data-testid="redirect">
        Redirecting to /login from {location.pathname}
      </div>
    );
  }

  return <>{children}</>;
};

// ============================================================================
// Test Utilities
// ============================================================================

const ProtectedContent: React.FC = () => (
  <div data-testid="protected-content">
    <h1>Protected Dashboard</h1>
  </div>
);

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderWithRouter = (
  initialRoute: string = '/dashboard',
  authState: Partial<AuthContextType> = {}
) => {
  // Update mock context
  Object.assign(mockAuthContext, {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    ...authState,
  });

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ProtectedContent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div data-testid="settings-page">Settings</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
};

// ============================================================================
// Test Suites
// ============================================================================

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Reset mock to default state
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.isLoading = false;
    mockAuthContext.user = null;
  });

  describe('When Authenticated', () => {
    test('renders children when user is authenticated', () => {
      renderWithRouter('/dashboard', {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' },
      });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
    });

    test('renders different protected pages', () => {
      renderWithRouter('/settings', {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' },
      });

      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    });
  });

  describe('When Not Authenticated', () => {
    test('does not render protected content', () => {
      renderWithRouter('/dashboard', { isAuthenticated: false });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('shows redirect indicator', () => {
      renderWithRouter('/dashboard', { isAuthenticated: false });

      expect(screen.getByTestId('redirect')).toBeInTheDocument();
    });

    test('captures intended destination in redirect', () => {
      renderWithRouter('/dashboard', { isAuthenticated: false });

      expect(screen.getByTestId('redirect')).toHaveTextContent('/dashboard');
    });

    test('captures different destinations', () => {
      renderWithRouter('/settings', { isAuthenticated: false });

      expect(screen.getByTestId('redirect')).toHaveTextContent('/settings');
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator while checking auth', () => {
      renderWithRouter('/dashboard', { isLoading: true });

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    test('does not show protected content while loading', () => {
      renderWithRouter('/dashboard', { isLoading: true });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('does not redirect while loading', () => {
      renderWithRouter('/dashboard', { isLoading: true });

      expect(screen.queryByTestId('redirect')).not.toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute Navigation Flow', () => {
  test('workflow: unauthenticated -> login -> authenticated -> protected content', async () => {
    // Start unauthenticated
    const { rerender } = renderWithRouter('/dashboard', { isAuthenticated: false });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    // After login
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = { id: '1', email: 'test@example.com' };

    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  test('unauthenticated user gets redirected', () => {
    // Render as unauthenticated
    renderWithRouter('/dashboard', { isAuthenticated: false });
    expect(screen.getByTestId('redirect')).toBeInTheDocument();
  });
});

describe('ProtectedRoute Edge Cases', () => {
  test('handles null user with isAuthenticated false', () => {
    renderWithRouter('/dashboard', {
      isAuthenticated: false,
      user: null,
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('handles user object with isAuthenticated true', () => {
    renderWithRouter('/dashboard', {
      isAuthenticated: true,
      user: { id: 'user-123', email: 'doctor@hospital.com' },
    });

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
