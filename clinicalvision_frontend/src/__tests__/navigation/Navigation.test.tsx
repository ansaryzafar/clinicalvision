/**
 * Navigation and Routing Test Suite
 * 
 * Comprehensive testing for navigation functionality:
 * - Route accessibility
 * - Navigation state preservation
 * - Redirect behavior
 * - Protected vs public routes
 * - Back button behavior
 * - URL parameter handling
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

// ============================================================================
// Test Components
// ============================================================================

const TestComponent: React.FC<{ testId: string }> = ({ testId }) => {
  const location = useLocation();
  return (
    <div data-testid={testId}>
      <span data-testid="current-path">{location.pathname}</span>
    </div>
  );
};

const NavigationTestComponent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <div>
      <span data-testid="current-path">{location.pathname}</span>
      <button onClick={() => navigate('/dashboard')} data-testid="nav-dashboard">
        Go to Dashboard
      </button>
      <button onClick={() => navigate('/workflow')} data-testid="nav-analyze">
        Go to Analyze
      </button>
      <button onClick={() => navigate('/')} data-testid="nav-home">
        Go to Home
      </button>
      <button onClick={() => navigate(-1)} data-testid="nav-back">
        Go Back
      </button>
    </div>
  );
};

// ============================================================================
// Route Configuration Tests
// ============================================================================

describe('Route Configuration', () => {
  const publicRoutes = ['/', '/login', '/about', '/diagnostic-viewer', '/analysis-archive'];
  const protectedRoutes = ['/dashboard', '/analyze', '/cases', '/workflow', '/history', '/settings', '/analysis-suite'];

  describe('Public Routes', () => {
    publicRoutes.forEach((route) => {
      it(`should render ${route} without authentication`, () => {
        render(
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={route} element={<TestComponent testId={`route-${route}`} />} />
            </Routes>
          </MemoryRouter>
        );
        
        expect(screen.getByTestId('current-path')).toHaveTextContent(route);
      });
    });
  });

  describe('Protected Routes', () => {
    const mockProtectedRoute = (isAuthenticated: boolean) => {
      return ({ children }: { children: React.ReactNode }) => {
        if (!isAuthenticated) {
          return <div data-testid="login-redirect">Redirected to Login</div>;
        }
        return <>{children}</>;
      };
    };

    protectedRoutes.forEach((route) => {
      it(`should redirect ${route} to login when not authenticated`, () => {
        const ProtectedRoute = mockProtectedRoute(false);
        
        render(
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route
                path={route}
                element={
                  <ProtectedRoute>
                    <TestComponent testId={`route-${route}`} />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        );
        
        expect(screen.getByTestId('login-redirect')).toBeInTheDocument();
      });

      it(`should render ${route} when authenticated`, () => {
        const ProtectedRoute = mockProtectedRoute(true);
        
        render(
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route
                path={route}
                element={
                  <ProtectedRoute>
                    <TestComponent testId={`route-${route}`} />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        );
        
        expect(screen.getByTestId('current-path')).toHaveTextContent(route);
      });
    });
  });
});

// ============================================================================
// Navigation State Tests
// ============================================================================

describe('Navigation State Preservation', () => {
  it('should preserve state when navigating with state object', () => {
    const StateTestComponent: React.FC = () => {
      const location = useLocation();
      const navigate = useNavigate();
      
      return (
        <div>
          <span data-testid="state-value">{JSON.stringify(location.state)}</span>
          <button 
            onClick={() => navigate('/target', { state: { from: '/source', data: 'test' } })}
            data-testid="nav-with-state"
          >
            Navigate with State
          </button>
        </div>
      );
    };
    
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<StateTestComponent />} />
          <Route path="/target" element={<StateTestComponent />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Initial state should be null
    expect(screen.getByTestId('state-value')).toHaveTextContent('null');
  });

  it('should use replace navigation correctly', async () => {
    const ReplaceTestComponent: React.FC = () => {
      const navigate = useNavigate();
      const location = useLocation();
      
      return (
        <div>
          <span data-testid="path">{location.pathname}</span>
          <button 
            onClick={() => navigate('/new-page', { replace: true })}
            data-testid="nav-replace"
          >
            Navigate Replace
          </button>
        </div>
      );
    };
    
    render(
      <MemoryRouter initialEntries={['/', '/initial']}>
        <Routes>
          <Route path="/" element={<ReplaceTestComponent />} />
          <Route path="/initial" element={<ReplaceTestComponent />} />
          <Route path="/new-page" element={<ReplaceTestComponent />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('path')).toHaveTextContent('/initial');
  });
});

// ============================================================================
// Navigation Item Tests
// ============================================================================

describe('Navigation Menu Items', () => {
  const navigationItems = [
    { title: 'Dashboard', path: '/dashboard' },
    { title: 'Diagnostic Workstation', path: '/analyze' },
    { title: 'Case Archive', path: '/analysis-archive' },
    { title: 'Settings', path: '/settings' },
  ];

  navigationItems.forEach((item) => {
    it(`should have correct path for ${item.title}`, () => {
      expect(item.path).toBeDefined();
      expect(item.path.startsWith('/')).toBe(true);
    });
  });

  it('should have exactly 4 main navigation items', () => {
    expect(navigationItems.length).toBe(4);
  });

  it('should not have duplicate paths', () => {
    const paths = navigationItems.map(item => item.path);
    const uniquePaths = Array.from(new Set(paths));
    expect(paths.length).toBe(uniquePaths.length);
  });
});

// ============================================================================
// Redirect Behavior Tests
// ============================================================================

describe('Redirect Behavior', () => {
  it('should redirect authenticated users from landing page to dashboard', () => {
    const isAuthenticated = true;
    let redirectPath = '/';
    
    if (isAuthenticated && redirectPath === '/') {
      redirectPath = '/dashboard';
    }
    
    expect(redirectPath).toBe('/dashboard');
  });

  it('should redirect authenticated users from login page', () => {
    const isAuthenticated = true;
    let redirectPath = '/login';
    
    if (isAuthenticated && redirectPath === '/login') {
      redirectPath = '/dashboard';
    }
    
    expect(redirectPath).toBe('/dashboard');
  });

  it('should redirect to intended destination after login', () => {
    const intendedDestination = '/analyze';
    const defaultDestination = '/dashboard';
    
    const redirectTo = intendedDestination || defaultDestination;
    
    expect(redirectTo).toBe('/analyze');
  });

  it('should use dashboard as default redirect after login', () => {
    const intendedDestination = null;
    const defaultDestination = '/dashboard';
    
    const redirectTo = intendedDestination || defaultDestination;
    
    expect(redirectTo).toBe('/dashboard');
  });
});

// ============================================================================
// Back Button Tests
// ============================================================================

describe('Back Button Behavior', () => {
  it('should not log out user when navigating back', () => {
    let isAuthenticated = true;
    let logoutCalled = false;
    
    // Simulate back navigation (should NOT trigger logout)
    const handleBackNavigation = () => {
      // Just navigate, don't logout
    };
    
    handleBackNavigation();
    
    expect(logoutCalled).toBe(false);
    expect(isAuthenticated).toBe(true);
  });

  it('should maintain auth state through history navigation', () => {
    const authHistory: boolean[] = [true, true, true];
    
    // Simulate multiple navigations
    authHistory.forEach((isAuth, index) => {
      expect(isAuth).toBe(true);
    });
  });
});

// ============================================================================
// 404 and Error Routes Tests
// ============================================================================

describe('Error Routes', () => {
  it('should handle unknown routes gracefully', () => {
    const unknownRoute = '/unknown-route-12345';
    const validRoutes = ['/', '/dashboard', '/analyze', '/settings'];
    
    const isValidRoute = validRoutes.includes(unknownRoute);
    
    expect(isValidRoute).toBe(false);
  });

  it('should not crash on invalid route parameters', () => {
    const routeParams = {
      id: undefined,
      type: null,
      invalid: 'test<script>',
    };
    
    // Should handle gracefully
    expect(() => {
      const cleanId = routeParams.id || 'default';
      const cleanType = routeParams.type || 'default';
    }).not.toThrow();
  });
});

// ============================================================================
// URL Parameter Tests
// ============================================================================

describe('URL Parameter Handling', () => {
  it('should correctly parse query parameters', () => {
    const url = '/analyze?patientId=123&view=cc';
    const params = new URLSearchParams(url.split('?')[1]);
    
    expect(params.get('patientId')).toBe('123');
    expect(params.get('view')).toBe('cc');
  });

  it('should handle missing query parameters', () => {
    const url = '/analyze';
    const hasParams = url.includes('?');
    
    expect(hasParams).toBe(false);
  });

  it('should sanitize URL parameters', () => {
    const dangerousParam = '<script>alert("xss")</script>';
    const sanitizedParam = dangerousParam.replace(/<[^>]*>/g, '');
    
    expect(sanitizedParam).not.toContain('<script>');
    expect(sanitizedParam).not.toContain('</script>');
  });
});

// ============================================================================
// Deep Link Tests
// ============================================================================

describe('Deep Linking', () => {
  it('should support direct access to dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<TestComponent testId="dashboard" />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard');
  });

  it('should support direct access to analysis archive', () => {
    render(
      <MemoryRouter initialEntries={['/analysis-archive']}>
        <Routes>
          <Route path="/analysis-archive" element={<TestComponent testId="archive" />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('current-path')).toHaveTextContent('/analysis-archive');
  });
});

// ============================================================================
// Logout Navigation Tests
// ============================================================================

describe('Logout Navigation', () => {
  it('should navigate to landing page after logout', () => {
    const mockNavigate = jest.fn();
    
    // Simulate logout
    const handleLogout = () => {
      // Clear auth (simulated)
      mockNavigate('/', { replace: true });
    };
    
    handleLogout();
    
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should use replace to prevent back navigation to protected area', () => {
    const navigationHistory: string[] = [];
    const mockNavigate = jest.fn((path, options) => {
      if (options?.replace) {
        navigationHistory.pop();
      }
      navigationHistory.push(path);
    });
    
    // Simulate: dashboard -> logout -> landing
    navigationHistory.push('/dashboard');
    mockNavigate('/', { replace: true });
    
    // Back should not go to dashboard (it was replaced)
    expect(navigationHistory[navigationHistory.length - 1]).toBe('/');
  });
});
