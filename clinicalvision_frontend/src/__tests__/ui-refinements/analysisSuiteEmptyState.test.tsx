/**
 * UI Refinement R4 — Analysis Suite Empty State Tests (TDD)
 *
 * Validates:
 *  1. Empty state renders a gradient banner/header
 *  2. Empty state shows capability cards (at least 3)
 *  3. Empty state shows supported image format information
 *  4. Empty state has CTA button to workflow
 *  5. Empty state renders "Analysis Suite" title text
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';

// ── Navigation mock ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/analysis-suite', search: '', hash: '', state: null, key: 'default' }),
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
// Tests
// ============================================================================

describe('Analysis Suite — Empty State (R4)', () => {
  let ImageAnalysisPage: React.ComponentType;

  beforeAll(async () => {
    ImageAnalysisPage = (await import('../../pages/ImageAnalysisPage')).default;
  });

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders "Analysis Suite" title text', () => {
    render(
      <TestWrapper>
        <ImageAnalysisPage />
      </TestWrapper>
    );

    const titles = screen.getAllByText(/analysis suite/i);
    expect(titles.length).toBeGreaterThanOrEqual(1);
    // The main heading should be present
    const heading = titles.find(el => el.tagName.match(/^H[1-6]$/i));
    expect(heading).toBeTruthy();
  });

  it('renders a gradient banner/header section', () => {
    render(
      <TestWrapper>
        <ImageAnalysisPage />
      </TestWrapper>
    );

    // The banner should exist with a data-testid for targeting
    const banner = document.querySelector('[data-testid="analysis-suite-banner"]');
    expect(banner).toBeInTheDocument();
  });

  it('shows at least 3 capability cards', () => {
    render(
      <TestWrapper>
        <ImageAnalysisPage />
      </TestWrapper>
    );

    // Capability cards should be present
    const cards = document.querySelectorAll('[data-testid="capability-card"]');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it('shows supported image format information', () => {
    render(
      <TestWrapper>
        <ImageAnalysisPage />
      </TestWrapper>
    );

    // Should mention supported formats
    expect(screen.getByText(/dicom/i)).toBeInTheDocument();
  });

  it('has CTA button that navigates to workflow', () => {
    render(
      <TestWrapper>
        <ImageAnalysisPage />
      </TestWrapper>
    );

    const ctaButton = screen.getByRole('button', { name: /workflow|upload|start|begin/i });
    expect(ctaButton).toBeInTheDocument();
    fireEvent.click(ctaButton);
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.WORKFLOW);
  });
});
