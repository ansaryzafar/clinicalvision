/**
 * Workflow Debug Utility
 * 
 * Use this to diagnose and fix workflow state issues.
 * Run in browser console: window.debugWorkflow()
 */

import { AnalysisSession, WorkflowStep } from '../types/clinical.types';

export interface WorkflowDiagnostics {
  sessionId: string;
  currentStep: { value: number; name: string };
  completedStepsArray: { value: number; name: string }[];
  actualDataState: {
    hasImages: boolean;
    imageCount: number;
    hasStoredResults: boolean;
    hasFindings: boolean;
    hasPatientId: boolean;
    patientIdValue: string | undefined;
    hasMeasurements: boolean;
    hasBirads: boolean;
    biradsValue: number | undefined;
    hasImpression: boolean;
    workflowStatus: string;
  };
  computedCompletion: {
    [key: string]: {
      shouldBeComplete: boolean;
      isMarkedComplete: boolean;
      mismatch: boolean;
    };
  };
  issues: string[];
  fixes: string[];
}

export function diagnoseWorkflow(session: AnalysisSession | null): WorkflowDiagnostics | null {
  if (!session) {
    console.error('❌ No session provided to diagnose');
    return null;
  }

  const issues: string[] = [];
  const fixes: string[] = [];

  // Actual data state
  const actualState = {
    hasImages: (session.images?.length || 0) > 0,
    imageCount: session.images?.length || 0,
    hasStoredResults: !!session.storedAnalysisResults,
    hasFindings: (session.findings?.length || 0) > 0,
    hasPatientId: typeof session.patientInfo?.patientId === 'string' && 
                  session.patientInfo.patientId.trim().length > 0,
    patientIdValue: session.patientInfo?.patientId,
    hasMeasurements: (session.measurements?.length || 0) > 0,
    hasBirads: session.assessment?.biradsCategory !== undefined && 
               session.assessment?.biradsCategory !== null,
    biradsValue: session.assessment?.biradsCategory as unknown as number,
    hasImpression: typeof session.assessment?.impression === 'string' && 
                   session.assessment.impression.trim().length > 0,
    workflowStatus: session.workflow?.status || 'unknown',
  };

  // What SHOULD be complete based on data
  const shouldBeComplete: Record<WorkflowStep, boolean> = {
    [WorkflowStep.UPLOAD]: actualState.hasImages,
    [WorkflowStep.AI_ANALYSIS]: actualState.hasStoredResults || actualState.hasFindings,
    [WorkflowStep.PATIENT_INFO]: actualState.hasPatientId,
    [WorkflowStep.MEASUREMENTS]: actualState.hasMeasurements,
    [WorkflowStep.ASSESSMENT]: actualState.hasBirads,
    [WorkflowStep.REPORT]: actualState.hasImpression && actualState.hasBirads,
    [WorkflowStep.FINALIZE]: actualState.workflowStatus === 'finalized' || 
                             actualState.workflowStatus === 'completed',
  };

  // What IS marked complete
  const completedSteps = session.workflow?.completedSteps || [];
  const isMarkedComplete: Record<WorkflowStep, boolean> = {
    [WorkflowStep.UPLOAD]: completedSteps.includes(WorkflowStep.UPLOAD),
    [WorkflowStep.AI_ANALYSIS]: completedSteps.includes(WorkflowStep.AI_ANALYSIS),
    [WorkflowStep.PATIENT_INFO]: completedSteps.includes(WorkflowStep.PATIENT_INFO),
    [WorkflowStep.MEASUREMENTS]: completedSteps.includes(WorkflowStep.MEASUREMENTS),
    [WorkflowStep.ASSESSMENT]: completedSteps.includes(WorkflowStep.ASSESSMENT),
    [WorkflowStep.REPORT]: completedSteps.includes(WorkflowStep.REPORT),
    [WorkflowStep.FINALIZE]: completedSteps.includes(WorkflowStep.FINALIZE),
  };

  // Check for mismatches
  const computedCompletion: WorkflowDiagnostics['computedCompletion'] = {};
  
  for (let stepValue = 0; stepValue <= 6; stepValue++) {
    const step = stepValue as WorkflowStep;
    const stepName = WorkflowStep[step];
    const should = shouldBeComplete[step];
    const is = isMarkedComplete[step];
    const mismatch = should !== is;
    
    computedCompletion[stepName] = { shouldBeComplete: should, isMarkedComplete: is, mismatch };
    
    if (mismatch) {
      if (is && !should) {
        issues.push(`❌ ${stepName} is marked complete but DATA says it's NOT complete`);
        fixes.push(`Remove ${step} from completedSteps array`);
      } else if (!is && should) {
        issues.push(`⚠️ ${stepName} has complete data but is NOT marked in completedSteps`);
        fixes.push(`Add ${step} to completedSteps array`);
      }
    }
  }

  // Check currentStep consistency
  const currentStep = session.workflow?.currentStep ?? 0;
  
  // If images exist and analysis done, currentStep should be at least AI_ANALYSIS or beyond
  if (actualState.hasImages && actualState.hasStoredResults && currentStep === WorkflowStep.UPLOAD) {
    issues.push(`❌ currentStep is UPLOAD but Upload AND AI Analysis are done!`);
    fixes.push(`Advance currentStep to PATIENT_INFO or ASSESSMENT`);
  }

  return {
    sessionId: session.sessionId,
    currentStep: { value: currentStep, name: WorkflowStep[currentStep] },
    completedStepsArray: completedSteps.map(s => ({ value: s, name: WorkflowStep[s] })),
    actualDataState: actualState,
    computedCompletion,
    issues,
    fixes,
  };
}

/**
 * Fix corrupted workflow state
 * Recomputes completedSteps based on actual data
 */
export function fixWorkflowState(session: AnalysisSession): AnalysisSession {
  const newCompletedSteps: WorkflowStep[] = [];
  
  // UPLOAD: complete if images exist
  if ((session.images?.length || 0) > 0) {
    newCompletedSteps.push(WorkflowStep.UPLOAD);
  }
  
  // AI_ANALYSIS: complete if results exist
  if (session.storedAnalysisResults || (session.findings?.length || 0) > 0) {
    newCompletedSteps.push(WorkflowStep.AI_ANALYSIS);
  }
  
  // PATIENT_INFO: ONLY complete if patient ID has content
  if (typeof session.patientInfo?.patientId === 'string' && 
      session.patientInfo.patientId.trim().length > 0) {
    newCompletedSteps.push(WorkflowStep.PATIENT_INFO);
  }
  
  // MEASUREMENTS: complete if any measurements
  if ((session.measurements?.length || 0) > 0) {
    newCompletedSteps.push(WorkflowStep.MEASUREMENTS);
  }
  
  // ASSESSMENT: complete if BI-RADS selected
  if (session.assessment?.biradsCategory !== undefined && 
      session.assessment?.biradsCategory !== null) {
    newCompletedSteps.push(WorkflowStep.ASSESSMENT);
  }
  
  // REPORT: complete if impression AND BI-RADS
  if (typeof session.assessment?.impression === 'string' && 
      session.assessment.impression.trim().length > 0 &&
      session.assessment?.biradsCategory !== undefined) {
    newCompletedSteps.push(WorkflowStep.REPORT);
  }
  
  // FINALIZE: complete if status is finalized
  if (session.workflow?.status === 'finalized' || session.workflow?.status === 'completed') {
    newCompletedSteps.push(WorkflowStep.FINALIZE);
  }
  
  // Determine correct currentStep
  let currentStep = WorkflowStep.UPLOAD;
  
  if (newCompletedSteps.includes(WorkflowStep.FINALIZE)) {
    currentStep = WorkflowStep.FINALIZE;
  } else if (newCompletedSteps.includes(WorkflowStep.REPORT)) {
    currentStep = WorkflowStep.FINALIZE;
  } else if (newCompletedSteps.includes(WorkflowStep.ASSESSMENT)) {
    currentStep = WorkflowStep.REPORT;
  } else if (newCompletedSteps.includes(WorkflowStep.AI_ANALYSIS)) {
    // If AI done, go to Assessment (skip optional steps)
    currentStep = WorkflowStep.ASSESSMENT;
  } else if (newCompletedSteps.includes(WorkflowStep.UPLOAD)) {
    currentStep = WorkflowStep.AI_ANALYSIS;
  }
  
  console.log('🔧 Fixed workflow state:');
  console.log('  Old completedSteps:', session.workflow?.completedSteps);
  console.log('  New completedSteps:', newCompletedSteps);
  console.log('  Old currentStep:', session.workflow?.currentStep, WorkflowStep[session.workflow?.currentStep ?? 0]);
  console.log('  New currentStep:', currentStep, WorkflowStep[currentStep]);
  
  return {
    ...session,
    workflow: {
      ...session.workflow,
      completedSteps: newCompletedSteps,
      currentStep: currentStep,
    },
  };
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  (window as any).diagnoseWorkflow = diagnoseWorkflow;
  (window as any).fixWorkflowState = fixWorkflowState;
}
