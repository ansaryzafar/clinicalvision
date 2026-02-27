/**
 * TDD — RegisterPage password hint visual feedback
 *
 * Tests the grey tick → green tick → red cross icon system:
 * - Grey CheckCircle when password is empty (initial state)
 * - Green CheckCircle when requirement is met
 * - Red Cancel (cross) when requirement is not met
 * 
 * Also tests validateStep enforces all 5 password requirements.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================================
// Router mock
// ============================================================================
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(''), jest.fn()],
  Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}));

// ============================================================================
// Auth mock
// ============================================================================
const mockRegister = jest.fn().mockResolvedValue(undefined);

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    errorDetails: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: mockRegister,
    refreshAuth: jest.fn(),
    clearError: jest.fn(),
    canAccess: jest.fn(() => true),
  }),
}));

// ============================================================================
// Tests
// ============================================================================
describe('RegisterPage — Password Hints Visual Feedback', () => {
  let RegisterPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import('../../pages/RegisterPage');
    RegisterPage = (mod as any).RegisterPage || (mod as any).default;
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    mockRegister.mockClear();
  });

  /**
   * Helper: type into the password field
   */
  const typePassword = (value: string) => {
    const passwordInput = screen.getByLabelText(/^password$/i) || screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value } });
  };

  // --------------------------------------------------------------------------
  // Initial State (empty password — no hints visible)
  // --------------------------------------------------------------------------
  it('shows no password hints when password field is empty', () => {
    render(<RegisterPage />);
    // Hints only appear after typing starts
    expect(screen.queryByText(/Password must contain/i)).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Grey ticks: When password is typed but nothing matches
  // Wait — actually when password length > 0, hints show with red crosses for unmet
  // --------------------------------------------------------------------------
  it('shows red cross icons for all unmet requirements when typing begins', () => {
    render(<RegisterPage />);
    typePassword('a');
    // All requirements should show since password is non-empty
    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/One uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/One lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/One digit/i)).toBeInTheDocument();
    expect(screen.getByText(/One special character/i)).toBeInTheDocument();
  });

  it('shows green check for lowercase when password has lowercase letter', () => {
    render(<RegisterPage />);
    typePassword('a');
    // Lowercase is met, others are not
    expect(screen.getByTestId('check-lowercase')).toBeInTheDocument();
    expect(screen.getByTestId('cross-length')).toBeInTheDocument();
    expect(screen.getByTestId('cross-uppercase')).toBeInTheDocument();
    expect(screen.getByTestId('cross-digit')).toBeInTheDocument();
    expect(screen.getByTestId('cross-special')).toBeInTheDocument();
  });

  it('shows green check for uppercase when password has uppercase letter', () => {
    render(<RegisterPage />);
    typePassword('A');
    expect(screen.getByTestId('check-uppercase')).toBeInTheDocument();
    expect(screen.getByTestId('cross-lowercase')).toBeInTheDocument();
  });

  it('shows green check for digit when password has a number', () => {
    render(<RegisterPage />);
    typePassword('1');
    expect(screen.getByTestId('check-digit')).toBeInTheDocument();
    expect(screen.getByTestId('cross-uppercase')).toBeInTheDocument();
    expect(screen.getByTestId('cross-lowercase')).toBeInTheDocument();
  });

  it('shows green check for special when password has special character', () => {
    render(<RegisterPage />);
    typePassword('!');
    expect(screen.getByTestId('check-special')).toBeInTheDocument();
    expect(screen.getByTestId('cross-length')).toBeInTheDocument();
  });

  it('shows green check for length when password has 8+ characters', () => {
    render(<RegisterPage />);
    typePassword('abcdefgh');
    expect(screen.getByTestId('check-length')).toBeInTheDocument();
    expect(screen.getByTestId('check-lowercase')).toBeInTheDocument();
    // Uppercase, digit, special should still be red crosses
    expect(screen.getByTestId('cross-uppercase')).toBeInTheDocument();
    expect(screen.getByTestId('cross-digit')).toBeInTheDocument();
    expect(screen.getByTestId('cross-special')).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // All requirements met — all green checks
  // --------------------------------------------------------------------------
  it('shows all green checks when all requirements are met', () => {
    render(<RegisterPage />);
    typePassword('Demo123!');
    expect(screen.getByTestId('check-length')).toBeInTheDocument();
    expect(screen.getByTestId('check-uppercase')).toBeInTheDocument();
    expect(screen.getByTestId('check-lowercase')).toBeInTheDocument();
    expect(screen.getByTestId('check-digit')).toBeInTheDocument();
    expect(screen.getByTestId('check-special')).toBeInTheDocument();
    // No red crosses should be present
    expect(screen.queryByTestId('cross-length')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cross-uppercase')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cross-lowercase')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cross-digit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cross-special')).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Password strength indicator
  // --------------------------------------------------------------------------
  it('shows password strength indicator when password is typed', () => {
    render(<RegisterPage />);
    typePassword('a');
    expect(screen.getByText(/Password Strength/i)).toBeInTheDocument();
  });

  it('shows "Weak" for very simple passwords', () => {
    render(<RegisterPage />);
    typePassword('abc');
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows "Strong" for passwords meeting all criteria', () => {
    render(<RegisterPage />);
    typePassword('MyStr0ng!Pass');
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Validation: step 0 enforces all 5 requirements
  // --------------------------------------------------------------------------
  it('blocks step advance when password missing special character', async () => {
    render(<RegisterPage />);
    // Fill email
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    // Fill password WITHOUT special char
    typePassword('Abcdefg1');
    // Fill confirm password
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(confirmInput, { target: { value: 'Abcdefg1' } });
    // Click Next
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    // Should show error — password helper text contains "special character"
    await waitFor(() => {
      const helperText = screen.getByText(/must contain at least one special character/i);
      expect(helperText).toBeInTheDocument();
    });
  });

  it('blocks step advance when password missing lowercase letter', async () => {
    render(<RegisterPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    typePassword('ABCDEFG1!');
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(confirmInput, { target: { value: 'ABCDEFG1!' } });
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    await waitFor(() => {
      const helperText = screen.getByText(/must contain at least one lowercase/i);
      expect(helperText).toBeInTheDocument();
    });
  });

  it('allows step advance when password meets all requirements', async () => {
    render(<RegisterPage />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    typePassword('Demo123!');
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(confirmInput, { target: { value: 'Demo123!' } });
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    // Should advance to step 2 (Personal Info) — First Name field appears
    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });
  });
});
