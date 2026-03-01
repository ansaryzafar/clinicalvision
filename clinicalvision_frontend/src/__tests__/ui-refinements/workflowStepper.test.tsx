/**
 * UI Refinement R3 — Workflow Stepper Visibility Tests (TDD)
 *
 * Tests config-level correctness + the StepNavItem opacity constant in the
 * source file. Full-page rendering is intentionally avoided because
 * ClinicalWorkflowPageV2 depends on 15+ context methods that are hard to
 * mock reliably.
 *
 * Validates:
 *  1. All 5 phase labels exist in PHASES config
 *  2. "Completion" phase label is present (not abbreviated / truncated)
 *  3. Locked step opacity value in source is >= 0.5 (WCAG readable)
 *  4. All 10 step labels exist in WORKFLOW_STEP_CONFIG
 *  5. Phase stepIndices cover all 10 steps without gaps
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import * as fs from 'fs';
import * as path from 'path';

// Import the config constants directly — no rendering required
import { WORKFLOW_STEP_CONFIG, TOTAL_WORKFLOW_STEPS } from '../../types/case.types';

// ============================================================================
// Tests
// ============================================================================

describe('Workflow Stepper — Phase Visibility (R3)', () => {
  // Read the source file to extract the PHASES array and opacity value
  const sourceFile = fs.readFileSync(
    path.resolve(__dirname, '../../pages/ClinicalWorkflowPageV2.tsx'),
    'utf-8',
  );

  it('PHASES config contains all 5 phase labels: Setup, Imaging, Analysis, Reporting, Completion', () => {
    const expectedPhases = ['Setup', 'Imaging', 'Analysis', 'Reporting', 'Completion'];
    expectedPhases.forEach(phase => {
      expect(sourceFile).toContain(`label: '${phase}'`);
    });
  });

  it('"Completion" phase label is the full word (not abbreviated)', () => {
    // Must match "label: 'Completion'" — not 'Compl…' or 'Done' or truncated
    expect(sourceFile).toMatch(/label:\s*['"]Completion['"]/);
  });

  it('locked/inaccessible steps use opacity >= 0.5 for WCAG readability', () => {
    // The StepNavItem sets `opacity: accessible ? 1 : <VALUE>`
    // Extract the locked-state opacity value from the source
    const opacityMatch = sourceFile.match(/opacity:\s*accessible\s*\?\s*1\s*:\s*([\d.]+)/);
    expect(opacityMatch).not.toBeNull();
    const lockedOpacity = parseFloat(opacityMatch![1]);
    expect(lockedOpacity).toBeGreaterThanOrEqual(0.5);
  });

  it('WORKFLOW_STEP_CONFIG contains all 10 step labels', () => {
    const expectedLabels = [
      'Patient Registration',
      'Clinical History',
      'Image Upload',
      'Verify Images',
      'AI Analysis',
      'Image Analysis',
      'BI-RADS Assessment',
      'Generate Report',
      'Finalize',
      'Sign Report',
    ];

    expect(WORKFLOW_STEP_CONFIG).toHaveLength(TOTAL_WORKFLOW_STEPS);
    expect(WORKFLOW_STEP_CONFIG).toHaveLength(10);

    const actualLabels = WORKFLOW_STEP_CONFIG.map(cfg => cfg.label);
    expectedLabels.forEach(label => {
      expect(actualLabels).toContain(label);
    });
  });

  it('phase stepIndices cover all 10 steps without gaps', () => {
    // Extract PHASES stepIndices arrays from source
    const stepIndicesMatches = [...sourceFile.matchAll(/stepIndices:\s*\[([^\]]+)\]/g)];
    expect(stepIndicesMatches.length).toBe(5); // 5 phases

    const allIndices = stepIndicesMatches
      .flatMap(m => m[1].split(',').map(s => parseInt(s.trim(), 10)))
      .sort((a, b) => a - b);

    // Should be [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    expect(allIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
