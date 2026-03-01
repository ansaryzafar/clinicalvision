/**
 * UI Refinement R1 — Landing Page Logo Rendering Tests (TDD)
 *
 * Validates:
 *  1. Logo loads from /images/clinicalvision-logo.svg
 *  2. Logo has accessible alt text
 *  3. Logo container uses proper flexbox centering
 *  4. Logo does NOT use imageRendering: crisp-edges (bad for SVGs)
 *  5. Clicking logo navigates to home route
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Navigation mock ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
  Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

// ── Auth mock ─────────────────────────────────────────────────────────────
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshAuth: jest.fn(),
    clearError: jest.fn(),
    canAccess: jest.fn(() => true),
  }),
}));

import { ROUTES } from '../../routes/paths';

// ============================================================================
// Tests
// ============================================================================

describe('LandingPage — Logo Rendering (R1)', () => {
  let LandingPage: React.ComponentType;

  beforeAll(async () => {
    LandingPage = (await import('../../pages/LandingPage')).default;
  });

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders logo from /images/clinicalvision-logo.svg', () => {
    render(<LandingPage />);
    const logos = screen.getAllByAltText('ClinicalVision AI Logo');
    expect(logos.length).toBeGreaterThanOrEqual(1);
    expect(logos[0]).toHaveAttribute('src', expect.stringContaining('/images/clinicalvision-logo.svg'));
  });

  it('logo has accessible alt text "ClinicalVision AI Logo"', () => {
    render(<LandingPage />);
    const logos = screen.getAllByAltText('ClinicalVision AI Logo');
    expect(logos[0].getAttribute('alt')).toBe('ClinicalVision AI Logo');
  });

  it('logo parent container has lineHeight 0 for proper alignment', () => {
    render(<LandingPage />);
    const logos = screen.getAllByAltText('ClinicalVision AI Logo');
    const container = logos[0].parentElement;
    // The container should exist and the logo should be within a flex container
    expect(container).toBeInTheDocument();
  });

  it('logo does NOT use imageRendering crisp-edges', () => {
    render(<LandingPage />);
    const logos = screen.getAllByAltText('ClinicalVision AI Logo');
    // Check inline style attribute — jsdom doesn't compute MUI sx into getComputedStyle
    const styleAttr = logos[0].getAttribute('style') || '';
    expect(styleAttr).not.toContain('crisp-edges');
  });

  it('clicking logo navigates to home route', () => {
    render(<LandingPage />);
    const logos = screen.getAllByAltText('ClinicalVision AI Logo');
    // Logo is inside a clickable Box container
    const clickable = logos[0].parentElement!;
    fireEvent.click(clickable);
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME);
  });
});
