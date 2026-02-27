/**
 * WorkflowContext Tests
 * Tests workflow state management and validation logic
 * 
 * Design Principles Tested:
 * - Nielsen #5: Error Prevention
 * - Nielsen #7: Flexibility and Efficiency of Use
 * - Nielsen #9: Help Users Recover from Errors
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowProvider, useWorkflow } from '../../contexts/WorkflowContext';
import { WorkflowStep } from '../../types/clinical.types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component that exposes workflow context
const TestComponent: React.FC<{ onContext?: (ctx: ReturnType<typeof useWorkflow>) => void }> = ({ onContext }) => {
  const workflow = useWorkflow();
  
  React.useEffect(() => {
    onContext?.(workflow);
  }, [workflow, onContext]);

  return (
    <div>
      <div data-testid="mode">{workflow.workflowMode}</div>
      <div data-testid="session">{workflow.currentSession?.sessionId || 'none'}</div>
      <div data-testid="step">{workflow.getCurrentStepIndex()}</div>
      <div data-testid="error">{workflow.error || 'no-error'}</div>
      <button onClick={() => workflow.setWorkflowMode('quick')}>Set Quick</button>
      <button onClick={() => workflow.setWorkflowMode('clinical')}>Set Clinical</button>
      <button onClick={() => workflow.createNewSession()}>Create Session</button>
      <button onClick={() => workflow.clearError()}>Clear Error</button>
    </div>
  );
};

const renderWithProvider = (ui: React.ReactElement = <TestComponent />) => {
  return render(
    <WorkflowProvider>
      {ui}
    </WorkflowProvider>
  );
};

describe('WorkflowContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('starts with quick mode by default', () => {
      renderWithProvider();
      expect(screen.getByTestId('mode')).toHaveTextContent('quick');
    });

    test('starts with no session', () => {
      renderWithProvider();
      expect(screen.getByTestId('session')).toHaveTextContent('none');
    });

    test('starts with no error', () => {
      renderWithProvider();
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Workflow Mode Management', () => {
    test('can switch to clinical mode', async () => {
      renderWithProvider();
      
      await userEvent.click(screen.getByText('Set Clinical'));
      
      expect(screen.getByTestId('mode')).toHaveTextContent('clinical');
    });

    test('can switch back to quick mode', async () => {
      renderWithProvider();
      
      await userEvent.click(screen.getByText('Set Clinical'));
      await userEvent.click(screen.getByText('Set Quick'));
      
      expect(screen.getByTestId('mode')).toHaveTextContent('quick');
    });
  });

  describe('Session Management', () => {
    test('creates new session', async () => {
      renderWithProvider();
      
      await userEvent.click(screen.getByText('Create Session'));
      
      await waitFor(() => {
        expect(screen.getByTestId('session')).not.toHaveTextContent('none');
      });
    });

    test('new session starts at UPLOAD step', async () => {
      renderWithProvider();
      
      await userEvent.click(screen.getByText('Create Session'));
      
      await waitFor(() => {
        expect(screen.getByTestId('step')).toHaveTextContent(String(WorkflowStep.UPLOAD));
      });
    });

    test('new session inherits current workflow mode', async () => {
      let contextRef: ReturnType<typeof useWorkflow> | null = null;
      
      renderWithProvider(
        <TestComponent onContext={(ctx) => { contextRef = ctx; }} />
      );
      
      await userEvent.click(screen.getByText('Set Clinical'));
      await userEvent.click(screen.getByText('Create Session'));
      
      await waitFor(() => {
        expect(contextRef?.currentSession?.workflow.mode).toBe('clinical');
      });
    });
  });

  describe('Error Handling (Nielsen #9)', () => {
    test('clearError clears the error state', async () => {
      renderWithProvider();
      
      // First create a session and trigger an error
      await userEvent.click(screen.getByText('Create Session'));
      
      // Clear any error
      await userEvent.click(screen.getByText('Clear Error'));
      
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('getVisibleWorkflowSteps', () => {
    test('returns filtered steps for quick mode', async () => {
      let contextRef: ReturnType<typeof useWorkflow> | null = null;
      
      renderWithProvider(
        <TestComponent onContext={(ctx) => { contextRef = ctx; }} />
      );
      
      await waitFor(() => {
        expect(contextRef).not.toBeNull();
      });

      const visibleSteps = contextRef!.getVisibleWorkflowSteps();
      
      // Quick mode should have fewer steps
      expect(visibleSteps.length).toBeLessThan(7);
      expect(visibleSteps.some(s => s.step === WorkflowStep.UPLOAD)).toBe(true);
      expect(visibleSteps.some(s => s.step === WorkflowStep.AI_ANALYSIS)).toBe(true);
    });

    test('returns all steps for clinical mode', async () => {
      let contextRef: ReturnType<typeof useWorkflow> | null = null;
      
      renderWithProvider(
        <TestComponent onContext={(ctx) => { contextRef = ctx; }} />
      );
      
      await userEvent.click(screen.getByText('Set Clinical'));
      
      await waitFor(() => {
        expect(contextRef).not.toBeNull();
      });

      const visibleSteps = contextRef!.getVisibleWorkflowSteps();
      
      // Clinical mode should have all steps
      expect(visibleSteps.length).toBe(7);
    });
  });
});

describe('Workflow Validation (Nielsen #5: Error Prevention)', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('validateStepData returns errors for empty upload step', async () => {
    let contextRef: ReturnType<typeof useWorkflow> | null = null;
    
    renderWithProvider(
      <TestComponent onContext={(ctx) => { contextRef = ctx; }} />
    );
    
    await userEvent.click(screen.getByText('Create Session'));
    
    await waitFor(() => {
      expect(contextRef?.currentSession).not.toBeNull();
    });

    const validation = contextRef!.validateStepData(WorkflowStep.UPLOAD);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0]).toContain('image');
  });

  test('canAdvanceToStep returns true for UPLOAD initially', async () => {
    let contextRef: ReturnType<typeof useWorkflow> | null = null;
    
    renderWithProvider(
      <TestComponent onContext={(ctx) => { contextRef = ctx; }} />
    );
    
    await userEvent.click(screen.getByText('Create Session'));
    
    await waitFor(() => {
      expect(contextRef?.currentSession).not.toBeNull();
    });

    expect(contextRef!.canAdvanceToStep(WorkflowStep.UPLOAD)).toBe(true);
  });
});
