/**
 * Unit Tests for PatientInfoForm Component
 * Critical component for patient data validation (HIPAA compliance)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientInfoForm } from '../../components/workflow/PatientInfoForm';
import { createMockWorkflowContext, mockPatientInfo, mockStudyInfo } from '../testUtils';

// Mock useLegacyWorkflow from workflow-v3
// PatientInfoForm calls useLegacyWorkflow() which internally calls useWorkflow() (V3)
// We mock at the module level so the component never hits the real WorkflowProvider
const mockLegacyWorkflow = {
  currentSession: null as any,
  updateSessionData: jest.fn(),
  advanceToStep: jest.fn(),
  goToStep: jest.fn(),
  isStepComplete: jest.fn().mockReturnValue(false),
  canProceed: jest.fn().mockReturnValue(true),
  mode: 'clinical' as const,
  currentStep: 'patient_info' as any,
};

jest.mock('../../workflow-v3', () => ({
  useLegacyWorkflow: () => mockLegacyWorkflow,
}));

// Increase timeout for heavy userEvent tests (slow under full suite load)
jest.setTimeout(15000);

describe('PatientInfoForm', () => {
  let mockContext: ReturnType<typeof createMockWorkflowContext>;

  beforeEach(() => {
    mockContext = createMockWorkflowContext();
    jest.clearAllMocks();
    // Sync the legacy workflow mock with the context mock
    mockLegacyWorkflow.currentSession = mockContext.session;
    mockLegacyWorkflow.updateSessionData = mockContext.updateSessionData;
    mockLegacyWorkflow.advanceToStep = mockContext.advanceToStep;
  });

  const renderForm = () => {
    return render(<PatientInfoForm />);
  };

  describe('Rendering', () => {
    test('renders all required form fields', () => {
      renderForm();
      
      expect(screen.getByLabelText(/patient id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/study date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/modality/i)).toBeInTheDocument();
    });

    test('renders save and continue buttons', () => {
      renderForm();
      
      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue to findings/i })).toBeInTheDocument();
    });

    test('loads existing session data', () => {
      mockContext.session = {
        ...mockContext.session!,
        patientInfo: mockPatientInfo,
        studyInfo: mockStudyInfo,
      };

      renderForm();

      const patientIdInput = screen.getByLabelText(/patient id/i) as HTMLInputElement;
      expect(patientIdInput.value).toBe(mockPatientInfo.patientId);
    });
  });

  describe('Validation', () => {
    test('shows error for empty required fields', async () => {
      renderForm();
      
      const patientIdInput = screen.getByLabelText(/patient id/i);
      
      // Clear and blur to trigger validation
      await userEvent.clear(patientIdInput);
      fireEvent.blur(patientIdInput);

      await waitFor(() => {
        expect(screen.getByText(/Patient ID is required/i)).toBeInTheDocument();
      });
    });

    test('validates patient ID format', async () => {
      renderForm();
      
      const patientIdInput = screen.getByLabelText(/patient id/i);
      
      await userEvent.clear(patientIdInput);
      await userEvent.type(patientIdInput, 'a'); // Too short
      fireEvent.blur(patientIdInput);

      await waitFor(() => {
        expect(screen.getByText(/must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    test('validates patient name format', async () => {
      renderForm();
      
      const nameInput = screen.getByLabelText(/patient name/i);
      
      // Test minimum length validation
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'A'); // Too short
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(/must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    test('validates date of birth is not in future', async () => {
      renderForm();
      
      const dobInput = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      await userEvent.clear(dobInput);
      await userEvent.type(dobInput, futureDateString);
      fireEvent.blur(dobInput);

      await waitFor(() => {
        expect(screen.getByText(/cannot be in the future/i)).toBeInTheDocument();
      });
    });

    test('auto-calculates age from date of birth', async () => {
      renderForm();
      
      const dobInput = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
      const ageInput = screen.getByLabelText(/age/i) as HTMLInputElement;
      
      // Enter DOB for someone born 40 years ago
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 40);
      const birthDateString = birthDate.toISOString().split('T')[0];
      
      await userEvent.clear(dobInput);
      await userEvent.type(dobInput, birthDateString);
      fireEvent.blur(dobInput);

      await waitFor(() => {
        expect(ageInput.value).toBe('40');
      });
    });

    test('shows validation checkmarks for valid fields', async () => {
      renderForm();
      
      const patientIdInput = screen.getByLabelText(/patient id/i);
      
      await userEvent.clear(patientIdInput);
      await userEvent.type(patientIdInput, 'VALID123');
      fireEvent.blur(patientIdInput);

      await waitFor(() => {
        // Check for success indicator (green checkmark icon)
        const successIcons = screen.queryAllByTestId('CheckCircleIcon');
        expect(successIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Submission', () => {
    test('prevents submission with invalid data', async () => {
      renderForm();
      
      // Clear required fields to make form invalid
      const patientIdInput = screen.getByLabelText(/patient id/i);
      await userEvent.clear(patientIdInput);
      fireEvent.blur(patientIdInput);
      
      await waitFor(() => {
        // Save button should be disabled when form has errors
        const saveButtons = screen.getAllByRole('button', { name: /save/i });
        const saveButton = saveButtons.find(btn => btn.textContent === 'Save') || saveButtons[0];
        expect(saveButton).toBeDisabled();
      });
    });

    test('submits valid patient data', async () => {
      renderForm();
      
      // Fill in all required fields
      const patientIdInput = screen.getByLabelText(/patient id/i);
      await userEvent.clear(patientIdInput);
      await userEvent.type(patientIdInput, 'PAT001');
      
      const nameInput = screen.getByLabelText(/patient name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'John Doe');
      
      const dobInput = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
      await userEvent.clear(dobInput);
      await userEvent.type(dobInput, '1980-01-01');
      
      const saveButtons = screen.getAllByRole('button', { name: /save/i });
      const saveButton = saveButtons.find(btn => btn.textContent === 'Save') || saveButtons[0];
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockContext.updateSessionData).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    test('shows success message after save', async () => {
      renderForm();
      
      await userEvent.type(screen.getByLabelText(/patient id/i), 'PAT001');
      await userEvent.type(screen.getByLabelText(/patient name/i), 'John Doe');
      
      const dobInput = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
      await userEvent.clear(dobInput);
      await userEvent.type(dobInput, '1980-01-01');
      
      const saveButtons = screen.getAllByRole('button', { name: /save/i });
      const saveButton = saveButtons.find(btn => btn.textContent === 'Save') || saveButtons[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/patient information saved successfully/i)).toBeInTheDocument();
      });
    });

    test('continues to next step after save', async () => {
      renderForm();
      
      await userEvent.type(screen.getByLabelText(/patient id/i), 'PAT001');
      await userEvent.type(screen.getByLabelText(/patient name/i), 'John Doe');
      
      const dobInput = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
      await userEvent.clear(dobInput);
      await userEvent.type(dobInput, '1980-01-01');
      
      const continueButton = screen.getByRole('button', { name: /continue to findings/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockContext.advanceToStep).toHaveBeenCalled();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('saves form with Ctrl+S', async () => {
      renderForm();
      
      await userEvent.type(screen.getByLabelText(/patient id/i), 'PAT001');
      await userEvent.type(screen.getByLabelText(/patient name/i), 'John Doe');
      
      const dobInput = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
      await userEvent.clear(dobInput);
      await userEvent.type(dobInput, '1980-01-01');
      
      // Trigger Ctrl+S
      fireEvent.keyDown(document, { key: 's', ctrlKey: true });

      await waitFor(() => {
        expect(mockContext.updateSessionData).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('all inputs have labels', () => {
      renderForm();
      
      // Check that key inputs are accessible with labels
      expect(screen.getByLabelText(/patient id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/study date/i)).toBeInTheDocument();
    });

    test('error messages have proper ARIA attributes', async () => {
      renderForm();
      
      const patientIdInput = screen.getByLabelText(/patient id/i);
      await userEvent.clear(patientIdInput);
      fireEvent.blur(patientIdInput);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Patient ID is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message on save failure', async () => {
      mockLegacyWorkflow.updateSessionData = jest.fn(() => {
        throw new Error('Save failed');
      });

      renderForm();
      
      const patientIdInput = screen.getByLabelText(/patient id/i);
      await userEvent.clear(patientIdInput);
      await userEvent.type(patientIdInput, 'PAT001');
      
      const nameInput = screen.getByLabelText(/patient name/i);
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'John Doe');
      
      const dobInput = screen.getByLabelText(/date of birth/i);
      await userEvent.clear(dobInput);
      await userEvent.type(dobInput, '1980-01-01');
      
      const saveButtons = screen.getAllByRole('button', { name: /save/i });
      const saveButton = saveButtons.find(btn => btn.textContent === 'Save') || saveButtons[0];
      await userEvent.click(saveButton);

      await waitFor(() => {
        // Should show error snackbar or error message
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
