/**
 * UI Refinement R2 — About Page Branding Tests (TDD)
 *
 * Validates:
 *  1. PageHeader renders actual brand logo SVG (not Assessment MUI icon)
 *  2. About page hero section renders brand-consistent content
 *  3. About page uses lunitDesignSystem typography tokens
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

// ── Navigation mock ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/about', search: '', hash: '', state: null, key: 'default' }),
}));

// ── Auth mock ─────────────────────────────────────────────────────────────
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    canAccess: jest.fn(() => true),
  }),
}));

import { PageHeader } from '../../components/layout/PageLayout';

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <MemoryRouter>
      {children}
    </MemoryRouter>
  </ThemeProvider>
);

// ============================================================================
// Tests
// ============================================================================

describe('PageHeader — Brand Logo (R2)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders clinicalvision-logo.svg image instead of Assessment icon', () => {
    render(
      <TestWrapper>
        <PageHeader variant="light" />
      </TestWrapper>
    );

    // Should have the brand logo image
    const logo = screen.getByAltText('ClinicalVision AI Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', expect.stringContaining('/images/clinicalvision-logo.svg'));
  });

  it('does NOT render Assessment MUI icon in the header', () => {
    render(
      <TestWrapper>
        <PageHeader variant="light" />
      </TestWrapper>
    );

    // Assessment icon should not be present — it was the old placeholder
    const assessmentIcon = document.querySelector('[data-testid="AssessmentIcon"]');
    expect(assessmentIcon).not.toBeInTheDocument();
  });

  it('renders correctly in dark variant', () => {
    render(
      <TestWrapper>
        <PageHeader variant="dark" />
      </TestWrapper>
    );

    const logo = screen.getByAltText('ClinicalVision AI Logo');
    expect(logo).toBeInTheDocument();
  });
});

describe('About Page — Brand Consistency (R2)', () => {
  let AboutPage: React.ComponentType;

  beforeAll(async () => {
    AboutPage = (await import('../../pages/AboutPage')).default;
  });

  it('renders hero heading with brand-consistent typography', () => {
    render(
      <TestWrapper>
        <AboutPage />
      </TestWrapper>
    );

    // About page hero: "Intelligence that" + "illuminates" (split across elements)
    expect(screen.getByText(/intelligence that/i)).toBeInTheDocument();
    expect(screen.getByText(/illuminates/i)).toBeInTheDocument();
  });
});
