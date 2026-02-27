/**
 * Form Submission Fixes — TDD Tests
 *
 * Verifies fixes for audit findings:
 *  A5: ContactPage form calls API instead of console.log
 *  A6: DemoPage form calls API instead of console.log
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

// ── Mock API service ──────────────────────────────────────────────────────
const mockSubmitContactForm = jest.fn();
const mockSubmitDemoRequest = jest.fn();

jest.mock('../../services/api', () => ({
  __esModule: true,
  api: {
    submitContactForm: (...args: any[]) => mockSubmitContactForm(...args),
    submitDemoRequest: (...args: any[]) => mockSubmitDemoRequest(...args),
  },
  default: {
    submitContactForm: (...args: any[]) => mockSubmitContactForm(...args),
    submitDemoRequest: (...args: any[]) => mockSubmitDemoRequest(...args),
  },
}));

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <MemoryRouter>
      {children}
    </MemoryRouter>
  </ThemeProvider>
);

// Helper: fast form fill using fireEvent.change instead of slow userEvent.type
const fillInput = (element: HTMLElement, value: string) => {
  fireEvent.change(element, { target: { value } });
};

// ============================================================================
// A5: ContactPage form submission
// ============================================================================
describe('ContactPage form submission (A5)', () => {
  beforeEach(() => {
    mockSubmitContactForm.mockClear();
    mockSubmitContactForm.mockResolvedValue({ success: true });
  });

  it('should call api.submitContactForm on submit, not console.log', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const ContactPage = (await import('../../pages/ContactPage')).default;
    
    render(<TestWrapper><ContactPage /></TestWrapper>);

    // Fill out the form using actual labels (fireEvent.change is fast)
    fillInput(screen.getByLabelText(/full name/i), 'Test User');
    fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
    fillInput(screen.getByLabelText(/message/i), 'Test message');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitBtn);

    // Should NOT use console.log for form data
    const consoleLogCalls = consoleSpy.mock.calls.filter(
      call => typeof call[0] === 'string' && call[0].includes('Form submitted')
    );
    expect(consoleLogCalls).toHaveLength(0);

    // Should call the API method
    await waitFor(() => {
      expect(mockSubmitContactForm).toHaveBeenCalledTimes(1);
    });

    consoleSpy.mockRestore();
  }, 15000);

  it('should show success feedback after contact form submission', async () => {
    mockSubmitContactForm.mockResolvedValue({ success: true });
    const ContactPage = (await import('../../pages/ContactPage')).default;
    
    render(<TestWrapper><ContactPage /></TestWrapper>);

    fillInput(screen.getByLabelText(/full name/i), 'Test User');
    fillInput(screen.getByLabelText(/email address/i), 'test@example.com');
    fillInput(screen.getByLabelText(/message/i), 'Test message');

    const submitBtn = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitBtn);

    // Should show some kind of success feedback
    await waitFor(() => {
      const successIndicator = screen.queryByText(/thank|success|sent|received/i);
      expect(successIndicator).toBeInTheDocument();
    });
  });
});

// ============================================================================
// A6: DemoPage form submission
// ============================================================================
describe('DemoPage form submission (A6)', () => {
  beforeEach(() => {
    mockSubmitDemoRequest.mockClear();
    mockSubmitDemoRequest.mockResolvedValue({ success: true });
  });

  it('should call api.submitDemoRequest on submit, not silently discard data', async () => {
    const DemoPage = (await import('../../pages/DemoPage')).default;
    
    render(<TestWrapper><DemoPage /></TestWrapper>);

    // Fill required fields using actual DemoPage labels
    fillInput(screen.getByLabelText(/first name/i), 'Test');
    fillInput(screen.getByLabelText(/last name/i), 'User');
    fillInput(screen.getByLabelText(/work email/i), 'test@example.com');

    // Two "Request Demo" buttons exist: one in navbar (type="button") and
    // the form submit button (type="submit"). Select by type attribute.
    const submitBtn = document.querySelector('button[type="submit"]') as HTMLElement;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.textContent).toMatch(/request demo/i);
    fireEvent.click(submitBtn);

    // API should be called
    await waitFor(() => {
      expect(mockSubmitDemoRequest).toHaveBeenCalledTimes(1);
    });
  });
});
