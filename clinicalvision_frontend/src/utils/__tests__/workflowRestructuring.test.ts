/**
 * Workflow Restructuring Tests — Phase 2 (TDD)
 *
 * Verifies the 12-step → 10-step workflow restructuring:
 *   - MEASUREMENTS and ANNOTATIONS steps removed
 *   - FINDINGS_REVIEW now transitions directly to BIRADS_ASSESSMENT
 *   - STEP_INDEX correctly maps 10 steps (indices 0-9)
 *   - TOTAL_WORKFLOW_STEPS = 10
 *   - WORKFLOW_STEP_CONFIG has exactly 10 entries
 *   - Workflow progress calculations updated for 10 steps
 *
 * @jest-environment jsdom
 */

import {
  ClinicalWorkflowStep,
  STEP_INDEX,
  TOTAL_WORKFLOW_STEPS,
  WORKFLOW_STEP_CONFIG,
} from '../../types/case.types';

import {
  getNextStep,
  getPreviousStep,
  getWorkflowProgress,
} from '../workflowStateMachine';

// ============================================================================
// STRUCTURAL TESTS
// ============================================================================

describe('Workflow Restructuring — 10-step workflow', () => {
  describe('ClinicalWorkflowStep enum', () => {
    it('should NOT contain MEASUREMENTS step', () => {
      const allSteps = Object.values(ClinicalWorkflowStep);
      expect(allSteps).not.toContain('measurements');
    });

    it('should NOT contain ANNOTATIONS step', () => {
      const allSteps = Object.values(ClinicalWorkflowStep);
      expect(allSteps).not.toContain('annotations');
    });

    it('should contain exactly 10 step values', () => {
      const allSteps = Object.values(ClinicalWorkflowStep);
      expect(allSteps).toHaveLength(10);
    });

    it('should still contain FINDINGS_REVIEW step', () => {
      expect(ClinicalWorkflowStep.FINDINGS_REVIEW).toBe('findings_review');
    });
  });

  describe('STEP_INDEX', () => {
    it('should map exactly 10 steps', () => {
      const stepCount = Object.keys(STEP_INDEX).length;
      expect(stepCount).toBe(10);
    });

    it('should assign FINDINGS_REVIEW index 5', () => {
      expect(STEP_INDEX[ClinicalWorkflowStep.FINDINGS_REVIEW]).toBe(5);
    });

    it('should assign BIRADS_ASSESSMENT index 6 (directly after FINDINGS_REVIEW)', () => {
      expect(STEP_INDEX[ClinicalWorkflowStep.BIRADS_ASSESSMENT]).toBe(6);
    });

    it('should assign REPORT_GENERATION index 7', () => {
      expect(STEP_INDEX[ClinicalWorkflowStep.REPORT_GENERATION]).toBe(7);
    });

    it('should assign FINALIZE index 8', () => {
      expect(STEP_INDEX[ClinicalWorkflowStep.FINALIZE]).toBe(8);
    });

    it('should assign DIGITAL_SIGNATURE index 9', () => {
      expect(STEP_INDEX[ClinicalWorkflowStep.DIGITAL_SIGNATURE]).toBe(9);
    });

    it('should have contiguous indices from 0 to 9', () => {
      const indices = Object.values(STEP_INDEX).sort((a, b) => a - b);
      expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('TOTAL_WORKFLOW_STEPS', () => {
    it('should equal 10', () => {
      expect(TOTAL_WORKFLOW_STEPS).toBe(10);
    });
  });

  describe('WORKFLOW_STEP_CONFIG', () => {
    it('should have exactly 10 entries', () => {
      expect(WORKFLOW_STEP_CONFIG).toHaveLength(10);
    });

    it('should not include any measurements or annotations config', () => {
      const stepValues = WORKFLOW_STEP_CONFIG.map(c => c.step);
      expect(stepValues).not.toContain('measurements');
      expect(stepValues).not.toContain('annotations');
    });

    it('should have FINDINGS_REVIEW at index 5', () => {
      expect(WORKFLOW_STEP_CONFIG[5].step).toBe(ClinicalWorkflowStep.FINDINGS_REVIEW);
    });

    it('should have BIRADS_ASSESSMENT at index 6', () => {
      expect(WORKFLOW_STEP_CONFIG[6].step).toBe(ClinicalWorkflowStep.BIRADS_ASSESSMENT);
    });

    it('should label FINDINGS_REVIEW as "Image Analysis"', () => {
      const findingsConfig = WORKFLOW_STEP_CONFIG.find(
        c => c.step === ClinicalWorkflowStep.FINDINGS_REVIEW
      );
      expect(findingsConfig?.label).toBe('Image Analysis');
    });
  });

  describe('Transition map', () => {
    it('should transition FINDINGS_REVIEW directly to BIRADS_ASSESSMENT', () => {
      const nextStep = getNextStep(ClinicalWorkflowStep.FINDINGS_REVIEW);
      expect(nextStep).toBe(ClinicalWorkflowStep.BIRADS_ASSESSMENT);
    });

    it('should transition BATCH_AI_ANALYSIS to FINDINGS_REVIEW', () => {
      const nextStep = getNextStep(ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      expect(nextStep).toBe(ClinicalWorkflowStep.FINDINGS_REVIEW);
    });

    it('should show FINDINGS_REVIEW as previous step from BIRADS_ASSESSMENT', () => {
      const prevStep = getPreviousStep(ClinicalWorkflowStep.BIRADS_ASSESSMENT);
      expect(prevStep).toBe(ClinicalWorkflowStep.FINDINGS_REVIEW);
    });
  });

  describe('Progress calculations', () => {
    it('should calculate progress at FINDINGS_REVIEW as 60%', () => {
      // Index 5, total 10: (5+1)/10 = 60%
      const progress = getWorkflowProgress(ClinicalWorkflowStep.FINDINGS_REVIEW);
      expect(progress).toBe(60);
    });

    it('should calculate progress at BIRADS_ASSESSMENT as 70%', () => {
      // Index 6, total 10: (6+1)/10 = 70%
      const progress = getWorkflowProgress(ClinicalWorkflowStep.BIRADS_ASSESSMENT);
      expect(progress).toBe(70);
    });

    it('should calculate progress at DIGITAL_SIGNATURE as 100%', () => {
      // Index 9, total 10: (9+1)/10 = 100%
      const progress = getWorkflowProgress(ClinicalWorkflowStep.DIGITAL_SIGNATURE);
      expect(progress).toBe(100);
    });
  });
});
