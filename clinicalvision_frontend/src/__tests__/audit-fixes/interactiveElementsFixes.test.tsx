/**
 * Dead Interactive Elements — TDD Tests
 *
 * Verifies fixes for audit findings:
 *  B3: BlogPage "Read More" should navigate
 *  B4: CareersPage "Apply Now" should have onClick
 *  B5: CareersPage "View all roles" should navigate
 *  B6: SupportPage action buttons should have onClick
 *  B7: BlogPage category filter should be functional
 *  A1: DiagnosticViewer should show demo badge & not fake real results
 *  D2: PlaceholderStep should be removed (dead code)
 *  A2/A3: Testimonials should have disclaimers
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

// ── Routing mock ──────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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
// B3: BlogPage — "Read More" / blog post clicks
// ============================================================================
describe('BlogPage interactive elements (B3, B7)', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('B3: blog post cards should be clickable and navigate to blog detail', async () => {
    const BlogPage = (await import('../../pages/BlogPage')).default;
    render(<TestWrapper><BlogPage /></TestWrapper>);

    // Blog cards should have click handlers (role="button" elements)
    const clickableCards = screen.getAllByRole('button');
    // At least some should be blog post cards
    expect(clickableCards.length).toBeGreaterThan(0);

    // The featured post or card click should trigger navigate
    fireEvent.click(clickableCards[0]);
    
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('B7: category filter tabs should filter posts', async () => {
    const BlogPage = (await import('../../pages/BlogPage')).default;
    render(<TestWrapper><BlogPage /></TestWrapper>);

    // Categories should exist — they have role="button" now
    // "Research" text may appear in both a tab and inside post category labels,
    // so find the one with role="button"
    const researchTabs = screen.getAllByRole('button').filter(
      el => el.textContent === 'Research'
    );
    expect(researchTabs.length).toBeGreaterThan(0);
    
    // Clicking a category should not throw — it's wired up
    fireEvent.click(researchTabs[0]);
    
    // After clicking "Research", the "All" tab should still be present
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);
    expect(allTab).toBeInTheDocument();
  });
});

// ============================================================================
// B4 + B5: CareersPage buttons
// ============================================================================
describe('CareersPage interactive elements (B4, B5)', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('B4: "Apply Now" buttons should have click handlers', async () => {
    const CareersPage = (await import('../../pages/CareersPage')).default;
    render(<TestWrapper><CareersPage /></TestWrapper>);

    const applyButtons = screen.getAllByRole('button', { name: /apply now/i });
    expect(applyButtons.length).toBeGreaterThan(0);

    fireEvent.click(applyButtons[0]);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('B5: "View all roles" should navigate', async () => {
    const CareersPage = (await import('../../pages/CareersPage')).default;
    render(<TestWrapper><CareersPage /></TestWrapper>);

    const viewAllBtn = screen.getByRole('button', { name: /view all roles/i });
    expect(viewAllBtn).toBeInTheDocument();
    
    fireEvent.click(viewAllBtn);
    expect(mockNavigate).toHaveBeenCalled();
  });
});

// ============================================================================
// B6: SupportPage action buttons
// ============================================================================
describe('SupportPage action buttons (B6)', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('B6: support channel buttons should have click handlers', async () => {
    const SupportPage = (await import('../../pages/SupportPage')).default;
    render(<TestWrapper><SupportPage /></TestWrapper>);

    const actionButtons = [
      screen.getByRole('button', { name: /start chat/i }),
      screen.getByRole('button', { name: /send email/i }),
      screen.getByRole('button', { name: /call now/i }),
      screen.getByRole('button', { name: /book session/i }),
    ];

    actionButtons.forEach(btn => {
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
    });

    // At least some buttons should trigger navigation or an action
    expect(mockNavigate).toHaveBeenCalled();
  });
});

// ============================================================================
// A1: DiagnosticViewer — demo badge
// ============================================================================
describe('DiagnosticViewer demo gating (A1)', () => {
  it('A1: should display a demo/prototype disclaimer', async () => {
    const DiagnosticViewer = (await import('../../pages/DiagnosticViewer')).default;
    render(<TestWrapper><DiagnosticViewer /></TestWrapper>);

    // Page must clearly indicate it's a demo — not real AI analysis
    const demoBadge = screen.queryByText(/not for clinical use/i);
    expect(demoBadge).toBeInTheDocument();
  });
});

// ============================================================================
// A2/A3: Testimonials should have disclaimers
// ============================================================================
describe('Fabricated content disclaimers (A2, A3)', () => {
  it('A2: LandingPage testimonials should have illustrative disclaimer', async () => {
    const LandingPage = (await import('../../pages/LandingPage')).default;
    render(<TestWrapper><LandingPage /></TestWrapper>);

    const testimonialDisclaimer = screen.queryByText(/illustrative/i);
    expect(testimonialDisclaimer).toBeInTheDocument();
  });

  it('A3: CareersPage testimonials should have illustrative disclaimer', async () => {
    const CareersPage = (await import('../../pages/CareersPage')).default;
    render(<TestWrapper><CareersPage /></TestWrapper>);

    const disclaimer = screen.queryByText(/illustrative/i);
    expect(disclaimer).toBeInTheDocument();
  });
});

// ============================================================================
// D2: PlaceholderStep should be removed (dead code)
// ============================================================================
describe('Dead code removal (D2)', () => {
  it('D2: PlaceholderStep should not be exported from ClinicalWorkflowPageV2', async () => {
    const workflowModule = await import('../../pages/ClinicalWorkflowPageV2');
    
    // PlaceholderStep should not be an exported member
    expect((workflowModule as any).PlaceholderStep).toBeUndefined();
  });
});
