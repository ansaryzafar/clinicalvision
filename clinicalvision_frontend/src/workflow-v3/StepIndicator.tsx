/**
 * StepIndicator Component - V3
 * 
 * Individual step indicator in the workflow stepper.
 * Pure presentational component - receives all props from parent.
 */

import React from 'react';
import {
  Check,
  CloudUpload,
  Psychology,
  Person,
  Straighten,
  Assignment,
  Description,
  CheckCircle,
} from '@mui/icons-material';
import { StepState, WorkflowStep } from './types';

// Simple classnames utility
const cn = (...classes: (string | undefined | false | null)[]): string => 
  classes.filter(Boolean).join(' ');

// ============================================================================
// TYPES
// ============================================================================

interface StepIndicatorProps {
  step: WorkflowStep;
  label: string;
  state: StepState;
  stepNumber: number;
  isClickable: boolean;
  onClick: () => void;
  isLast: boolean;
}

// ============================================================================
// STEP ICONS
// ============================================================================

const STEP_ICONS: Record<WorkflowStep, React.ElementType> = {
  [WorkflowStep.UPLOAD]: CloudUpload,
  [WorkflowStep.AI_ANALYSIS]: Psychology,
  [WorkflowStep.PATIENT_INFO]: Person,
  [WorkflowStep.MEASUREMENTS]: Straighten,
  [WorkflowStep.ASSESSMENT]: Assignment,
  [WorkflowStep.REPORT]: Description,
  [WorkflowStep.FINALIZE]: CheckCircle,
};

// ============================================================================
// STYLES
// ============================================================================

const STATE_STYLES = {
  current: {
    circle: 'bg-blue-600 border-blue-600 text-white shadow-lg ring-2 ring-blue-200',
    label: 'text-blue-600 font-semibold',
    connector: 'bg-gray-200',
  },
  completed: {
    circle: 'bg-emerald-500 border-emerald-500 text-white',
    label: 'text-emerald-600 font-medium',
    connector: 'bg-emerald-500',
  },
  available: {
    circle: 'bg-white border-blue-400 border-dashed text-blue-400 hover:bg-blue-50 hover:border-blue-500',
    label: 'text-gray-600',
    connector: 'bg-gray-200',
  },
  locked: {
    circle: 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed',
    label: 'text-gray-400',
    connector: 'bg-gray-200',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function StepIndicator({
  step,
  label,
  state,
  stepNumber,
  isClickable,
  onClick,
  isLast,
}: StepIndicatorProps) {
  const styles = STATE_STYLES[state];
  const Icon = STEP_ICONS[step];
  
  const handleClick = () => {
    if (isClickable) {
      onClick();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
      e.preventDefault();
      onClick();
    }
  };
  
  return (
    <div className="flex items-center">
      {/* Step Circle */}
      <div
        data-testid={`step-indicator-${step}`}
        data-state={state}
        role="button"
        tabIndex={isClickable ? 0 : -1}
        aria-label={`Step ${stepNumber}: ${label}`}
        aria-current={state === 'current' ? 'step' : undefined}
        aria-disabled={state === 'locked'}
        className={cn(
          'relative flex items-center justify-center',
          'w-10 h-10 rounded-full border-2 transition-all duration-200',
          styles.circle,
          isClickable && 'cursor-pointer'
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Show check icon for completed, step number or icon otherwise */}
        {state === 'completed' ? (
          <Check sx={{ width: 20, height: 20 }} data-icon="check" />
        ) : (
          <span className="text-sm font-medium">{stepNumber}</span>
        )}
      </div>
      
      {/* Step Label (below circle on mobile, beside on desktop) */}
      <div className="hidden sm:block ml-2 mr-4">
        <span className={cn('text-sm whitespace-nowrap', styles.label)}>
          {label}
        </span>
      </div>
      
      {/* Connector Line */}
      {!isLast && (
        <div
          className={cn(
            'hidden sm:block flex-1 h-0.5 min-w-[24px] mx-2',
            styles.connector
          )}
        />
      )}
    </div>
  );
}

// ============================================================================
// MOBILE STEP INDICATOR (Compact version)
// ============================================================================

export function MobileStepIndicator({
  step,
  label,
  state,
  stepNumber,
  isClickable,
  onClick,
}: Omit<StepIndicatorProps, 'isLast'>) {
  const styles = STATE_STYLES[state];
  
  const handleClick = () => {
    if (isClickable) {
      onClick();
    }
  };
  
  return (
    <button
      data-testid={`mobile-step-${step}`}
      data-state={state}
      disabled={!isClickable}
      onClick={handleClick}
      className={cn(
        'flex flex-col items-center p-2 rounded-lg transition-all',
        isClickable && 'hover:bg-gray-50',
        state === 'current' && 'bg-blue-50',
        !isClickable && 'opacity-50'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm',
          styles.circle
        )}
      >
        {state === 'completed' ? (
          <Check sx={{ width: 16, height: 16 }} />
        ) : (
          stepNumber
        )}
      </div>
      <span className={cn('text-xs mt-1', styles.label)}>
        {label}
      </span>
    </button>
  );
}
