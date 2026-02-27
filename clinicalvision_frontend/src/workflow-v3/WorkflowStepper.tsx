/**
 * WorkflowStepper Component - V3
 * 
 * Visual workflow progress indicator.
 * Displays steps, current position, and allows navigation.
 * 
 * Design Decisions:
 * 1. Gets all state from useWorkflow hook
 * 2. Visual state is determined by getStepState (priority: current > completed > available > locked)
 * 3. Clicks only work for navigable steps
 */

import React from 'react';
import { useWorkflow } from './useWorkflow';
import { StepIndicator, MobileStepIndicator } from './StepIndicator';
import { getVisibleSteps } from './constants';
import { WorkflowStep } from './types';

// Simple classnames utility
const cn = (...classes: (string | undefined | false | null)[]): string => 
  classes.filter(Boolean).join(' ');

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowStepperProps {
  className?: string;
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WorkflowStepper({ className, compact = false }: WorkflowStepperProps) {
  const {
    session,
    navigateToStep,
    canNavigateToStep,
    getStepState,
    completionPercentage,
  } = useWorkflow();
  
  // Don't render if no session
  if (!session) {
    return null;
  }
  
  const visibleSteps = getVisibleSteps(session.mode);
  
  const handleStepClick = (step: WorkflowStep) => {
    if (canNavigateToStep(step)) {
      navigateToStep(step);
    }
  };
  
  // Mobile compact view
  if (compact) {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        {visibleSteps.map((stepConfig, index) => (
          <MobileStepIndicator
            key={stepConfig.step}
            step={stepConfig.step}
            label={stepConfig.shortLabel}
            state={getStepState(stepConfig.step)}
            stepNumber={index + 1}
            isClickable={canNavigateToStep(stepConfig.step)}
            onClick={() => handleStepClick(stepConfig.step)}
          />
        ))}
      </div>
    );
  }
  
  // Desktop full view
  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">
            Workflow Progress
          </span>
          <span className="text-sm font-medium text-gray-900">
            {completionPercentage}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Workflow completion progress"
          className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
        >
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Steps */}
      <nav aria-label="Workflow steps" className="flex items-center">
        {visibleSteps.map((stepConfig, index) => (
          <StepIndicator
            key={stepConfig.step}
            step={stepConfig.step}
            label={stepConfig.shortLabel}
            state={getStepState(stepConfig.step)}
            stepNumber={index + 1}
            isClickable={canNavigateToStep(stepConfig.step)}
            onClick={() => handleStepClick(stepConfig.step)}
            isLast={index === visibleSteps.length - 1}
          />
        ))}
      </nav>
      
      {/* Current Step Description (optional) */}
      <div className="mt-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {visibleSteps.find(s => s.step === session.currentStep)?.label || 'Unknown Step'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {visibleSteps.find(s => s.step === session.currentStep)?.description || ''}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MINI STEPPER (For sidebar/header)
// ============================================================================

interface MiniStepperProps {
  className?: string;
}

export function MiniStepper({ className }: MiniStepperProps) {
  const { session, completionPercentage, getStepState } = useWorkflow();
  
  if (!session) {
    return null;
  }
  
  const visibleSteps = getVisibleSteps(session.mode);
  const currentIndex = visibleSteps.findIndex(s => s.step === session.currentStep);
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Step dots */}
      <div className="flex gap-1">
        {visibleSteps.map((stepConfig, index) => {
          const state = getStepState(stepConfig.step);
          return (
            <div
              key={stepConfig.step}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                state === 'current' && 'bg-blue-600 scale-125',
                state === 'completed' && 'bg-emerald-500',
                state === 'available' && 'bg-blue-300',
                state === 'locked' && 'bg-gray-300'
              )}
              title={stepConfig.label}
            />
          );
        })}
      </div>
      
      {/* Step count */}
      <span className="text-xs text-gray-500">
        Step {currentIndex + 1} of {visibleSteps.length}
      </span>
    </div>
  );
}

// ============================================================================
// VERTICAL STEPPER (For sidebar navigation)
// ============================================================================

interface VerticalStepperProps {
  className?: string;
}

export function VerticalStepper({ className }: VerticalStepperProps) {
  const {
    session,
    navigateToStep,
    canNavigateToStep,
    getStepState,
    isStepComplete,
  } = useWorkflow();
  
  if (!session) {
    return null;
  }
  
  const visibleSteps = getVisibleSteps(session.mode);
  
  return (
    <nav aria-label="Workflow navigation" className={cn('space-y-2', className)}>
      {visibleSteps.map((stepConfig, index) => {
        const state = getStepState(stepConfig.step);
        const isClickable = canNavigateToStep(stepConfig.step);
        const isComplete = isStepComplete(stepConfig.step);
        
        return (
          <button
            key={stepConfig.step}
            onClick={() => isClickable && navigateToStep(stepConfig.step)}
            disabled={!isClickable}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
              state === 'current' && 'bg-blue-50 border-l-4 border-blue-600',
              state === 'completed' && 'hover:bg-gray-50',
              state === 'available' && 'hover:bg-gray-50',
              state === 'locked' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Step Number/Check */}
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                state === 'current' && 'bg-blue-600 text-white',
                state === 'completed' && 'bg-emerald-500 text-white',
                state === 'available' && 'border-2 border-blue-400 text-blue-400',
                state === 'locked' && 'bg-gray-200 text-gray-400'
              )}
            >
              {isComplete ? '✓' : index + 1}
            </div>
            
            {/* Step Label */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-sm font-medium truncate',
                  state === 'current' && 'text-blue-600',
                  state === 'completed' && 'text-gray-700',
                  state === 'available' && 'text-gray-600',
                  state === 'locked' && 'text-gray-400'
                )}
              >
                {stepConfig.label}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
