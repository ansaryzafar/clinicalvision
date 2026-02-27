/**
 * Dead Elements Fixes — TDD Tests
 *
 * Verifies fixes for audit findings:
 *  B1: "Request Demo" CTA navigates to /demo
 *  B2: "Schedule Consultation" CTA navigates to /contact
 *  C1: /cases appears in ModernMainLayout sidebar
 *  C2: /analysis-suite appears in ModernMainLayout sidebar
 *  B9: ContextualHelp confidence link points to valid route
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

// ── Routing mock ──────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ── MUI useMediaQuery mock (no matchMedia in jsdom) ───────────────────────
jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(false),
}));

// ── Auth mock ─────────────────────────────────────────────────────────────
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@test.com', full_name: 'Test User', role: 'admin' },
    isAuthenticated: true,
    logout: jest.fn(),
    login: jest.fn(),
  }),
}));

import { ROUTES } from '../../routes/paths';

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <MemoryRouter>
      {children}
    </MemoryRouter>
  </ThemeProvider>
);

// ============================================================================
// C1 + C2: Sidebar navigation completeness
// ============================================================================
describe('ModernMainLayout sidebar navigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('C1: should include Cases Dashboard (/cases) in navigation', async () => {
    const { MainLayout } = await import('../../components/layout/ModernMainLayout');
    
    render(
      <TestWrapper>
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      </TestWrapper>
    );

    // The sidebar should contain a "Cases" navigation item
    const casesItem = screen.getByText(/^Cases$/i);
    expect(casesItem).toBeInTheDocument();
  });

  it('C2: should include Analysis Suite (/analysis-suite) in navigation', async () => {
    const { MainLayout } = await import('../../components/layout/ModernMainLayout');
    
    render(
      <TestWrapper>
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      </TestWrapper>
    );

    // The sidebar should contain an "Analysis Suite" navigation item
    const suiteItem = screen.getByText(/analysis suite/i);
    expect(suiteItem).toBeInTheDocument();
  });
});

// ============================================================================
// B1 + B2: LandingPage CTA buttons
// ============================================================================
describe('LandingPage CTA buttons', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('B1: "Request Demo" button should have an onClick handler', async () => {
    const LandingPage = (await import('../../pages/LandingPage')).default;
    
    render(
      <TestWrapper>
        <LandingPage />
      </TestWrapper>
    );
    
    // Find all "Request Demo" buttons — at least one should be clickable
    const demoButtons = screen.getAllByRole('button', { name: /request demo/i });
    expect(demoButtons.length).toBeGreaterThan(0);
    
    // Click the last one (the CTA section one)
    fireEvent.click(demoButtons[demoButtons.length - 1]);
    
    // Should navigate to demo page
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.DEMO);
  });

  it('B2: "Schedule Consultation" button should have an onClick handler', async () => {
    const LandingPage = (await import('../../pages/LandingPage')).default;
    
    render(
      <TestWrapper>
        <LandingPage />
      </TestWrapper>
    );
    
    const consultButtons = screen.getAllByRole('button', { name: /schedule consultation/i });
    expect(consultButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(consultButtons[consultButtons.length - 1]);
    
    // Should navigate to contact page
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.CONTACT);
  });
});

// ============================================================================
// B9: ContextualHelp confidence link validity
// ============================================================================
describe('ContextualHelp link validity', () => {
  it('B9: confidence-score learnMoreUrl should NOT point to /docs/confidence', () => {
    const { helpContent } = require('../../components/shared/ContextualHelp');
    
    const confidenceHelp = helpContent['confidence-score'];
    expect(confidenceHelp).toBeDefined();
    
    // The URL should NOT be '/docs/confidence' (a 404 route)
    if (confidenceHelp.learnMoreUrl) {
      expect(confidenceHelp.learnMoreUrl).not.toBe('/docs/confidence');
      // It should point to a valid route
      const validRoutes = Object.values(ROUTES);
      expect(validRoutes).toContain(confidenceHelp.learnMoreUrl);
    }
  });
});
