/**
 * TDD — "Try Demo" Button & Registration Redirect Tests
 *
 * Tests:
 *  1. LandingPage renders a "Try Demo" button in the hero section
 *  2. Clicking "Try Demo" navigates to /register?redirect=/workflow
 *  3. RegisterPage reads the ?redirect param and navigates there after registration
 *  4. User tier defaults to 'demo' for new users
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================================
// Navigation mock
// ============================================================================

const mockNavigate = jest.fn();
const mockUseLocation = jest.fn(() => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
  Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

// ============================================================================
// Auth mock
// ============================================================================

const mockRegister = jest.fn();
const mockLogin = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    errorDetails: null,
    login: mockLogin,
    logout: jest.fn(),
    register: mockRegister,
    refreshAuth: jest.fn(),
    clearError: jest.fn(),
    canAccess: jest.fn(() => true),
  }),
}));

// ============================================================================
// IntersectionObserver: already mocked globally in setupTests.ts
// ============================================================================

// ============================================================================
// Tests — LandingPage "Try Demo" button
// ============================================================================

describe('LandingPage — Try Demo button', () => {
  // LandingPage is a large component; lazy-import inside describe to keep
  // isolated from other test files.
  let LandingPage: React.ComponentType;

  beforeAll(async () => {
    LandingPage = (await import('../../pages/LandingPage')).default;
  });

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders a "Try Demo" button in the hero section', () => {
    render(<LandingPage />);
    const demoBtn = screen.getByRole('button', { name: /try demo/i });
    expect(demoBtn).toBeInTheDocument();
  });

  it('navigates to /register?redirect=/workflow when "Try Demo" is clicked', () => {
    render(<LandingPage />);
    const demoBtn = screen.getByRole('button', { name: /try demo/i });
    fireEvent.click(demoBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/register?redirect=/workflow');
  });

  it('renders a "Sign In" button for returning users', () => {
    render(<LandingPage />);
    const signInBtns = screen.getAllByRole('button', { name: /sign in/i });
    expect(signInBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to /login when "Sign In" is clicked', () => {
    render(<LandingPage />);
    // Use getAllByRole since navbar may also have a sign-in button
    const signInBtns = screen.getAllByRole('button', { name: /sign in/i });
    fireEvent.click(signInBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('does NOT render a "See How It Works" button', () => {
    render(<LandingPage />);
    const oldBtn = screen.queryByRole('button', { name: /see how it works/i });
    expect(oldBtn).not.toBeInTheDocument();
  });

  it('does NOT render a "Start Analysis" button', () => {
    render(<LandingPage />);
    const oldBtn = screen.queryByRole('button', { name: /start analysis/i });
    expect(oldBtn).not.toBeInTheDocument();
  });
});

// ============================================================================
// Tests — User Tier defaults
// ============================================================================

describe('User Tier System', () => {
  it('getDefaultTier returns demo', () => {
    const { getDefaultTier, UserTier } = require('../../types/userTier.types');
    expect(getDefaultTier()).toBe(UserTier.DEMO);
  });

  it('demo tier includes workflow access', () => {
    const { canAccessFeature, UserTier } = require('../../types/userTier.types');
    expect(canAccessFeature(UserTier.DEMO, 'workflow')).toBe(true);
  });

  it('demo tier includes image upload access', () => {
    const { canAccessFeature, UserTier } = require('../../types/userTier.types');
    expect(canAccessFeature(UserTier.DEMO, 'image_upload')).toBe(true);
  });

  it('demo tier includes AI analysis access', () => {
    const { canAccessFeature, UserTier } = require('../../types/userTier.types');
    expect(canAccessFeature(UserTier.DEMO, 'ai_analysis')).toBe(true);
  });

  it('demo tier does NOT include PACS integration', () => {
    const { canAccessFeature, UserTier } = require('../../types/userTier.types');
    expect(canAccessFeature(UserTier.DEMO, 'pacs_integration')).toBe(false);
  });

  it('enterprise tier includes PACS integration', () => {
    const { canAccessFeature, UserTier } = require('../../types/userTier.types');
    expect(canAccessFeature(UserTier.ENTERPRISE, 'pacs_integration')).toBe(true);
  });

  it('isPaidTier returns false for demo', () => {
    const { isPaidTier, UserTier } = require('../../types/userTier.types');
    expect(isPaidTier(UserTier.DEMO)).toBe(false);
  });

  it('isPaidTier returns true for professional', () => {
    const { isPaidTier, UserTier } = require('../../types/userTier.types');
    expect(isPaidTier(UserTier.PROFESSIONAL)).toBe(true);
  });
});
