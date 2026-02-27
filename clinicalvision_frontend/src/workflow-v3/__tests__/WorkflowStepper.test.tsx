/**
 * WorkflowStepper Tests (TDD - Write Tests First)
 * 
 * Tests for the visual stepper component.
 * Key focus: correct visual states and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowStep, createNewSession, WorkflowSession } from '../types';
import { WorkflowStepper } from '../WorkflowStepper';
import { WorkflowProvider } from '../useWorkflow';

// Mock the useWorkflow hook
const mockUseWorkflow = {
  session: null as WorkflowSession | null,
  isLoading: false,
  error: null,
  createSession: jest.fn(),
  updateSession: jest.fn(),
  navigateToStep: jest.fn(),
  deleteSession: jest.fn(),
  clearError: jest.fn(),
  isStepComplete: jest.fn(),
  canNavigateToStep: jest.fn(),
  getStepState: jest.fn(),
  validateStep: jest.fn(),
  completionPercentage: 0,
};

jest.mock('../useWorkflow', () => ({
  useWorkflow: () => mockUseWorkflow,
  WorkflowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('WorkflowStepper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflow.session = createNewSession('clinical');
    mockUseWorkflow.completionPercentage = 0;
    mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
      if (step === mockUseWorkflow.session?.currentStep) return 'current';
      return 'locked';
    });
    mockUseWorkflow.canNavigateToStep.mockReturnValue(false);
    mockUseWorkflow.isStepComplete.mockReturnValue(false);
  });

  describe('Rendering', () => {
    it('should render all steps for clinical mode', () => {
      render(<WorkflowStepper />);
      
      expect(screen.getByText('Upload')).toBeInTheDocument();
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByText('Measure')).toBeInTheDocument();
      expect(screen.getByText('Assess')).toBeInTheDocument();
      expect(screen.getByText('Report')).toBeInTheDocument();
      expect(screen.getByText('Finalize')).toBeInTheDocument();
    });

    it('should render only quick mode steps when mode is quick', () => {
      mockUseWorkflow.session = createNewSession('quick');
      
      render(<WorkflowStepper />);
      
      expect(screen.getByText('Upload')).toBeInTheDocument();
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.getByText('Assess')).toBeInTheDocument();
      
      // Should NOT have clinical-only steps
      expect(screen.queryByText('Patient')).not.toBeInTheDocument();
      expect(screen.queryByText('Measure')).not.toBeInTheDocument();
      expect(screen.queryByText('Report')).not.toBeInTheDocument();
      expect(screen.queryByText('Finalize')).not.toBeInTheDocument();
    });

    it('should not render anything when session is null', () => {
      mockUseWorkflow.session = null;
      
      const { container } = render(<WorkflowStepper />);
      
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Step States', () => {
    it('should show current step with current styling', () => {
      mockUseWorkflow.session = createNewSession('clinical');
      mockUseWorkflow.session.currentStep = WorkflowStep.UPLOAD;
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'current';
        return 'locked';
      });
      
      render(<WorkflowStepper />);
      
      // The Upload step should have current indicator styling
      const uploadStep = screen.getByTestId('step-indicator-0');
      expect(uploadStep).toHaveAttribute('data-state', 'current');
    });

    it('should show completed steps with completed styling', () => {
      mockUseWorkflow.session = createNewSession('clinical');
      mockUseWorkflow.session.currentStep = WorkflowStep.AI_ANALYSIS;
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'completed';
        if (step === WorkflowStep.AI_ANALYSIS) return 'current';
        return 'locked';
      });
      
      render(<WorkflowStepper />);
      
      const uploadStep = screen.getByTestId('step-indicator-0');
      expect(uploadStep).toHaveAttribute('data-state', 'completed');
    });

    it('should show available steps with available styling', () => {
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'current';
        if (step === WorkflowStep.PATIENT_INFO) return 'available';
        return 'locked';
      });
      
      render(<WorkflowStepper />);
      
      const patientStep = screen.getByTestId('step-indicator-2');
      expect(patientStep).toHaveAttribute('data-state', 'available');
    });

    it('should show locked steps with locked styling', () => {
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'current';
        return 'locked';
      });
      
      render(<WorkflowStepper />);
      
      const analysisStep = screen.getByTestId('step-indicator-1');
      expect(analysisStep).toHaveAttribute('data-state', 'locked');
    });

    it('Bug #2 Fix: current step should show as current even if complete', () => {
      // This tests the critical bug fix
      mockUseWorkflow.session = createNewSession('clinical');
      mockUseWorkflow.session.currentStep = WorkflowStep.UPLOAD;
      mockUseWorkflow.session.images = [{ id: '1', file: null, fileName: 'x', fileSize: 1, preview: '', uploadedAt: '', metadata: { width: 1, height: 1, type: '' } }];
      
      // Even though UPLOAD is complete, since it's current, should show as 'current'
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'current'; // NOT 'completed'
        return 'locked';
      });
      mockUseWorkflow.isStepComplete.mockImplementation((step: WorkflowStep) => {
        return step === WorkflowStep.UPLOAD;
      });
      
      render(<WorkflowStepper />);
      
      const uploadStep = screen.getByTestId('step-indicator-0');
      expect(uploadStep).toHaveAttribute('data-state', 'current');
    });
  });

  describe('User Interactions', () => {
    it('should call navigateToStep when clicking an available step', () => {
      mockUseWorkflow.canNavigateToStep.mockImplementation((step: WorkflowStep) => {
        return step === WorkflowStep.PATIENT_INFO;
      });
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'current';
        if (step === WorkflowStep.PATIENT_INFO) return 'available';
        return 'locked';
      });
      mockUseWorkflow.navigateToStep.mockReturnValue(true);
      
      render(<WorkflowStepper />);
      
      const patientStep = screen.getByTestId('step-indicator-2');
      fireEvent.click(patientStep);
      
      expect(mockUseWorkflow.navigateToStep).toHaveBeenCalledWith(WorkflowStep.PATIENT_INFO);
    });

    it('should not navigate when clicking a locked step', () => {
      mockUseWorkflow.canNavigateToStep.mockReturnValue(false);
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'current';
        return 'locked';
      });
      
      render(<WorkflowStepper />);
      
      const analysisStep = screen.getByTestId('step-indicator-1');
      fireEvent.click(analysisStep);
      
      expect(mockUseWorkflow.navigateToStep).not.toHaveBeenCalled();
    });

    it('should allow clicking on completed steps to go back', () => {
      mockUseWorkflow.session = createNewSession('clinical');
      mockUseWorkflow.session.currentStep = WorkflowStep.AI_ANALYSIS;
      mockUseWorkflow.canNavigateToStep.mockReturnValue(true);
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'completed';
        if (step === WorkflowStep.AI_ANALYSIS) return 'current';
        return 'locked';
      });
      mockUseWorkflow.navigateToStep.mockReturnValue(true);
      
      render(<WorkflowStepper />);
      
      const uploadStep = screen.getByTestId('step-indicator-0');
      fireEvent.click(uploadStep);
      
      expect(mockUseWorkflow.navigateToStep).toHaveBeenCalledWith(WorkflowStep.UPLOAD);
    });
  });

  describe('Progress Bar', () => {
    it('should show 0% progress for new session', () => {
      mockUseWorkflow.completionPercentage = 0;
      
      render(<WorkflowStepper />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should show correct progress percentage', () => {
      mockUseWorkflow.completionPercentage = 43;
      
      render(<WorkflowStepper />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '43');
    });

    it('should show 100% when all steps complete', () => {
      mockUseWorkflow.completionPercentage = 100;
      
      render(<WorkflowStepper />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels on steps', () => {
      render(<WorkflowStepper />);
      
      const uploadStep = screen.getByTestId('step-indicator-0');
      expect(uploadStep).toHaveAttribute('aria-label');
    });

    it('should indicate current step to screen readers', () => {
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'current';
        return 'locked';
      });
      
      render(<WorkflowStepper />);
      
      const uploadStep = screen.getByTestId('step-indicator-0');
      expect(uploadStep).toHaveAttribute('aria-current', 'step');
    });

    it('should indicate disabled state for locked steps', () => {
      mockUseWorkflow.getStepState.mockReturnValue('locked');
      
      render(<WorkflowStepper />);
      
      const lockedStep = screen.getByTestId('step-indicator-1');
      expect(lockedStep).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Step Icons', () => {
    it('should show checkmark icon for completed steps', () => {
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'completed';
        return 'locked';
      });
      
      render(<WorkflowStepper />);
      
      const uploadStep = screen.getByTestId('step-indicator-0');
      const checkIcon = uploadStep.querySelector('[data-icon="check"]');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should show step number for non-completed steps', () => {
      mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
        if (step === WorkflowStep.UPLOAD) return 'current';
        return 'locked';
      });
      
      render(<WorkflowStepper />);
      
      const uploadStep = screen.getByTestId('step-indicator-0');
      expect(uploadStep).toHaveTextContent('1');
    });
  });
});

describe('WorkflowStepper - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflow.session = createNewSession('clinical');
    mockUseWorkflow.completionPercentage = 0;
    mockUseWorkflow.getStepState.mockImplementation((step: WorkflowStep) => {
      if (step === mockUseWorkflow.session?.currentStep) return 'current';
      return 'locked';
    });
    mockUseWorkflow.canNavigateToStep.mockReturnValue(false);
    mockUseWorkflow.isStepComplete.mockReturnValue(false);
  });

  it('should handle rapid step changes gracefully', () => {
    mockUseWorkflow.canNavigateToStep.mockReturnValue(true);
    mockUseWorkflow.getStepState.mockReturnValue('available');
    mockUseWorkflow.navigateToStep.mockReturnValue(true);
    
    render(<WorkflowStepper />);
    
    // Rapid clicks
    const step1 = screen.getByTestId('step-indicator-1');
    const step2 = screen.getByTestId('step-indicator-2');
    
    fireEvent.click(step1);
    fireEvent.click(step2);
    fireEvent.click(step1);
    
    expect(mockUseWorkflow.navigateToStep).toHaveBeenCalledTimes(3);
  });

  it('should update display when session changes', () => {
    const { rerender } = render(<WorkflowStepper />);
    
    // Initial state
    expect(screen.getByTestId('step-indicator-0')).toBeInTheDocument();
    
    // Change to quick mode
    mockUseWorkflow.session = createNewSession('quick');
    
    rerender(<WorkflowStepper />);
    
    // Should now only show quick mode steps
    expect(screen.queryByText('Report')).not.toBeInTheDocument();
  });
});
