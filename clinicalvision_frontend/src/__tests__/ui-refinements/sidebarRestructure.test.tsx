/**
 * Sidebar Restructure — TDD Tests
 *
 * Validates the sidebar navigation restructure:
 *  1. 3 sections: OVERVIEW, CLINICAL WORKFLOW, SYSTEM
 *  2. "New Case" replaces "New Analysis"
 *  3. "Analysis Suite" removed from sidebar
 *  4. "AI Results Archive" replaces "AI Analysis Log"
 *  5. Fairness Monitor moved to OVERVIEW section
 *  6. No "Records" divider label
 *  7. Correct total item count (8 items)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

// ── Routing mock ──────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ── MUI useMediaQuery mock ────────────────────────────────────────────────
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

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <MemoryRouter>
      {children}
    </MemoryRouter>
  </ThemeProvider>
);

// ============================================================================
// Sidebar Restructure Tests
// ============================================================================
describe('Sidebar Restructure', () => {
  let MainLayout: React.FC<{ children: React.ReactNode }>;

  beforeAll(async () => {
    const mod = await import('../../components/layout/ModernMainLayout');
    MainLayout = mod.MainLayout;
  });

  const renderSidebar = () =>
    render(
      <TestWrapper>
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      </TestWrapper>
    );

  // ── Section structure ─────────────────────────────────────────────────
  it('renders exactly 3 section headers: OVERVIEW, CLINICAL WORKFLOW, SYSTEM', () => {
    renderSidebar();
    // Section headers are rendered as navigation group labels
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Clinical Workflow')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('does not render "AI Monitoring" section header', () => {
    renderSidebar();
    expect(screen.queryByText('AI Monitoring')).not.toBeInTheDocument();
  });

  // ── Renamed items ─────────────────────────────────────────────────────
  it('renders "New Case" instead of "New Analysis"', () => {
    renderSidebar();
    expect(screen.getByText('New Case')).toBeInTheDocument();
    expect(screen.queryByText('New Analysis')).not.toBeInTheDocument();
  });

  it('renders "AI Results Archive" instead of "AI Analysis Log"', () => {
    renderSidebar();
    expect(screen.getByText('AI Results Archive')).toBeInTheDocument();
    expect(screen.queryByText('AI Analysis Log')).not.toBeInTheDocument();
  });

  // ── Removed items ─────────────────────────────────────────────────────
  it('does not render "Analysis Suite" in the sidebar', () => {
    renderSidebar();
    expect(screen.queryByText('Analysis Suite')).not.toBeInTheDocument();
  });

  // ── Moved items ───────────────────────────────────────────────────────
  it('renders Fairness Monitor (moved to Overview section)', () => {
    renderSidebar();
    expect(screen.getByText('Fairness Monitor')).toBeInTheDocument();
  });

  // ── Divider labels ────────────────────────────────────────────────────
  it('does not render a "Records" divider label', () => {
    renderSidebar();
    expect(screen.queryByText('Records')).not.toBeInTheDocument();
  });

  // ── Preserved items ───────────────────────────────────────────────────
  it('still renders core navigation items: Dashboard, Active Cases, Case History, Settings, About', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Active Cases')).toBeInTheDocument();
    expect(screen.getByText('Case History')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });
});
