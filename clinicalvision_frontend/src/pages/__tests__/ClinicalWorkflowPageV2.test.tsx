/**
 * ClinicalWorkflowPageV2 — UI/UX Audit Compliance Tests
 *
 * TDD tests verifying:
 *  - PlaceholderStep renders SVG icons (not font-ligature <Icon>)
 *  - No "coming soon" text anywhere in the workflow
 *  - LUNIT design tokens applied consistently
 *  - StepNavItem renders step icon in the circle
 *  - Proper WCAG-compliant contrast
 *  - Professional wording (no placeholder language)
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// ── Mock react-router-dom ────────────────────────────────────────────────
const mockLocationState: { state?: any } = { state: null };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/workflow',
    search: '',
    hash: '',
    state: mockLocationState.state,
    key: 'default',
  }),
}));

// ── Mock the ClinicalCaseContext ──────────────────────────────────────────
const mockUseClinicalCase = jest.fn();
jest.mock('../../contexts/ClinicalCaseContext', () => ({
  useClinicalCase: () => mockUseClinicalCase(),
}));

// ── Mock step components to isolate page-level tests ──────────────────────
jest.mock('../../components/workflow/PatientInfoStep', () => ({
  PatientInfoStep: () => <div data-testid="patient-info-step">PatientInfoStep</div>,
}));
jest.mock('../../components/workflow/ClinicalHistoryStep', () => ({
  ClinicalHistoryStep: () => <div data-testid="clinical-history-step">ClinicalHistoryStep</div>,
}));
jest.mock('../../components/upload/MultiImageUpload', () => ({
  MultiImageUpload: () => <div data-testid="multi-image-upload">MultiImageUpload</div>,
}));
jest.mock('../../components/BatchAnalysisRunner', () => ({
  __esModule: true,
  default: () => <div data-testid="batch-analysis-runner">BatchAnalysisRunner</div>,
  BatchAnalysisRunner: () => <div data-testid="batch-analysis-runner">BatchAnalysisRunner</div>,
}));
jest.mock('../../components/workflow/BiRadsAssessmentStep', () => ({
  BiRadsAssessmentStep: () => <div data-testid="birads-step">BiRadsAssessmentStep</div>,
}));
jest.mock('../../components/workflow/ReportPreview', () => ({
  ReportPreview: () => <div data-testid="report-preview">ReportPreview</div>,
  __esModule: true,
}));
jest.mock('../../components/workflow/FinalizeStep', () => ({
  FinalizeStep: () => <div data-testid="finalize-step">FinalizeStep</div>,
}));
jest.mock('../../components/workflow/DigitalSignatureStep', () => ({
  DigitalSignatureStep: () => <div data-testid="signature-step">DigitalSignatureStep</div>,
}));
jest.mock('../../components/workflow/WorkflowAnalysisSuite', () => ({
  WorkflowAnalysisSuite: () => <div data-testid="workflow-analysis-suite">WorkflowAnalysisSuite</div>,
}));

import { ClinicalWorkflowPageV2 } from '../ClinicalWorkflowPageV2';
import {
  ClinicalWorkflowStep,
  WORKFLOW_STEP_CONFIG,
  EMPTY_CLINICAL_HISTORY,
} from '../../types/case.types';

// ============================================================================
// TEST HELPERS
// ============================================================================

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

/** Create a clinical case at a specific step */
function createCaseAtStep(step: ClinicalWorkflowStep, completedSteps: ClinicalWorkflowStep[] = []) {
  return {
    id: 'test-case-001',
    caseNumber: 'CV-2026-001',
    patient: { mrn: 'MRN123', firstName: 'Test', lastName: 'Patient', dateOfBirth: '2000-01-01', gender: 'F' },
    clinicalHistory: { ...EMPTY_CLINICAL_HISTORY, clinicalIndication: 'Screening' },
    images: [{ id: 'img-1', filename: 'test.png', uploadStatus: 'uploaded', addedAt: new Date().toISOString() }],
    analysisResults: [],
    consolidatedFindings: [],
    workflow: {
      currentStep: step,
      completedSteps,
      status: 'in_progress',
      startedAt: '2026-01-01T00:00:00Z',
      lastModifiedAt: '2026-01-01T00:00:00Z',
      isLocked: false,
    },
    audit: { createdBy: 'test', createdAt: '2026-01-01T00:00:00Z', modifiedBy: 'test', modifiedAt: '2026-01-01T00:00:00Z' },
  };
}

function setupContextWithCase(step: ClinicalWorkflowStep, completedSteps: ClinicalWorkflowStep[] = []) {
  const clinicalCase = createCaseAtStep(step, completedSteps);
  mockUseClinicalCase.mockReturnValue({
    currentCase: clinicalCase,
    isLoading: false,
    error: null,
    clearError: jest.fn(),
    createCase: jest.fn(),
    advanceWorkflow: jest.fn(),
    goBackToStep: jest.fn(),
    updateAssessment: jest.fn(),
    updateReport: jest.fn(),
    generateReport: jest.fn(),
    finalizeReport: jest.fn(),
    signReport: jest.fn(),
    updateAnalysisResults: jest.fn(),
    getWorkflowProgress: jest.fn(() => (completedSteps.length / 10) * 100),
    isStepCompleted: jest.fn((s: ClinicalWorkflowStep) => completedSteps.includes(s)),
    finalizeCase: jest.fn(),
    clearCurrentCase: jest.fn(),
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('ClinicalWorkflowPageV2 — UI/UX Audit Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────
  // TODO-02: PlaceholderStep icons — must render SVG, not font-ligature text
  // ────────────────────────────────────────────────────────────────────────
  describe('PlaceholderStep icons (TODO-02)', () => {
    const placeholderSteps = [
      { step: ClinicalWorkflowStep.IMAGE_VERIFICATION, label: 'Verify Images' },
    ];

    placeholderSteps.forEach(({ step, label }) => {
      it(`should render an SVG icon (not text) for "${label}"`, () => {
        const priorSteps = WORKFLOW_STEP_CONFIG
          .filter((_, idx) => idx < WORKFLOW_STEP_CONFIG.findIndex(c => c.step === step))
          .map(c => c.step);
        setupContextWithCase(step, priorSteps);
        const { container } = renderWithTheme(<ClinicalWorkflowPageV2 />);

        // There should be NO <span class="MuiIcon-root"> (font-ligature Icon) in step content
        const fontIcons = container.querySelectorAll('.MuiIcon-root');
        expect(fontIcons.length).toBe(0);

        // There SHOULD be an SVG icon rendered
        const svgIcons = container.querySelectorAll('svg.MuiSvgIcon-root');
        expect(svgIcons.length).toBeGreaterThan(0);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // TODO-03: No "coming soon" text
  // ────────────────────────────────────────────────────────────────────────
  describe('Professional wording (TODO-03)', () => {
    const placeholderSteps = [
      ClinicalWorkflowStep.IMAGE_VERIFICATION,
    ];

    placeholderSteps.forEach((step) => {
      it(`should NOT show "coming soon" for step ${step}`, () => {
        const priorSteps = WORKFLOW_STEP_CONFIG
          .filter((_, idx) => idx < WORKFLOW_STEP_CONFIG.findIndex(c => c.step === step))
          .map(c => c.step);
        setupContextWithCase(step, priorSteps);
        renderWithTheme(<ClinicalWorkflowPageV2 />);

        expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
      });
    });

    it('should use professional action-oriented wording on buttons', () => {
      const priorSteps = WORKFLOW_STEP_CONFIG
        .filter((_, idx) => idx < WORKFLOW_STEP_CONFIG.findIndex(c => c.step === ClinicalWorkflowStep.IMAGE_VERIFICATION))
        .map(c => c.step);
      setupContextWithCase(ClinicalWorkflowStep.IMAGE_VERIFICATION, priorSteps);
      renderWithTheme(<ClinicalWorkflowPageV2 />);

      // ImageVerificationStep uses "Continue" (not "Mark Complete")
      expect(screen.queryByText(/Mark Complete/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Empty state — gradient page banner present
  // ────────────────────────────────────────────────────────────────────────
  describe('Empty state page banner', () => {
    it('should render the gradient page banner with "New Analysis" title', () => {
      mockUseClinicalCase.mockReturnValue({
        currentCase: null,
        isLoading: false,
        error: null,
        clearError: jest.fn(),
        createCase: jest.fn(),
        advanceWorkflow: jest.fn(),
        goBackToStep: jest.fn(),
        updateAssessment: jest.fn(),
        updateReport: jest.fn(),
        generateReport: jest.fn(),
        finalizeReport: jest.fn(),
        signReport: jest.fn(),
        updateAnalysisResults: jest.fn(),
        getWorkflowProgress: jest.fn(() => 0),
        isStepCompleted: jest.fn(() => false),
        finalizeCase: jest.fn(),
        clearCurrentCase: jest.fn(),
      });
      renderWithTheme(<ClinicalWorkflowPageV2 />);

      expect(screen.getByText('New Analysis')).toBeInTheDocument();
      expect(screen.getByText(/10.step clinical mammogram/i)).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Active case — gradient page banner present
  // ────────────────────────────────────────────────────────────────────────────
  describe('Active case page banner', () => {
    it('should render the gradient page banner in active case state', () => {
      setupContextWithCase(ClinicalWorkflowStep.PATIENT_REGISTRATION, []);
      renderWithTheme(<ClinicalWorkflowPageV2 />);

      // Banner title
      expect(screen.getByText('New Analysis')).toBeInTheDocument();
      expect(screen.getByText(/10.step clinical mammogram/i)).toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // TODO-13 / TODO-14: WCAG Contrast & Keyboard Accessibility
  // ────────────────────────────────────────────────────────────────────────
  describe('WCAG Accessibility (TODO-13 / TODO-14)', () => {
    it('should not use #CFD6D7 (1.5:1 contrast) for any text or borders on white', () => {
      setupContextWithCase(ClinicalWorkflowStep.IMAGE_UPLOAD, [ClinicalWorkflowStep.PATIENT_REGISTRATION]);
      renderWithTheme(<ClinicalWorkflowPageV2 />);

      // Gather all CSS rules — #CFD6D7 should not appear (too low contrast)
      const styleSheets = Array.from(document.styleSheets);
      const allCssRules: string[] = [];
      for (const sheet of styleSheets) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            allCssRules.push(rule.cssText);
          }
        } catch (e) {}
      }
      const cssText = allCssRules.join(' ').toLowerCase();
      
      // #CFD6D7 is too low contrast (1.5:1 on white), should be replaced
      expect(cssText).not.toContain('#cfd6d7');
    });

    it('should not use #95A3A4 (2.9:1 contrast) for text on white backgrounds', () => {
      setupContextWithCase(ClinicalWorkflowStep.IMAGE_UPLOAD, [ClinicalWorkflowStep.PATIENT_REGISTRATION]);
      renderWithTheme(<ClinicalWorkflowPageV2 />);

      const styleSheets = Array.from(document.styleSheets);
      const allCssRules: string[] = [];
      for (const sheet of styleSheets) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            allCssRules.push(rule.cssText);
          }
        } catch (e) {}
      }
      const cssText = allCssRules.join(' ').toLowerCase();

      // #95A3A4 is below 4.5:1 contrast on white — should be replaced
      expect(cssText).not.toContain('#95a3a4');
    });

    it('should provide focus-visible outlines on stepper nav buttons', () => {
      setupContextWithCase(ClinicalWorkflowStep.PATIENT_REGISTRATION, []);
      const { container } = renderWithTheme(<ClinicalWorkflowPageV2 />);

      // All stepper nav buttons should have focus-visible styles in the stylesheet
      const styleSheets = Array.from(document.styleSheets);
      const allCssRules: string[] = [];
      for (const sheet of styleSheets) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            allCssRules.push(rule.cssText);
          }
        } catch (e) {}
      }
      const cssText = allCssRules.join(' ');
      
      // Should have focus-visible styles defined
      expect(cssText).toMatch(/focus-visible/i);
    });

    it('should use step number font size of at least 0.7rem', () => {
      setupContextWithCase(ClinicalWorkflowStep.IMAGE_UPLOAD, [ClinicalWorkflowStep.PATIENT_REGISTRATION]);
      const { container } = renderWithTheme(<ClinicalWorkflowPageV2 />);

      // Gather all CSS rules — step number font size should NOT be 0.65rem
      const styleSheets = Array.from(document.styleSheets);
      const allCssRules: string[] = [];
      for (const sheet of styleSheets) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            allCssRules.push(rule.cssText);
          }
        } catch (e) {}
      }
      const cssText = allCssRules.join(' ');

      // 0.65rem is too small for step numbers — should be 0.7rem or larger
      expect(cssText).not.toContain('0.65rem');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // WorkflowAnalysisSuite integration (replaces FindingsReviewStep for FINDINGS_REVIEW)
  // ────────────────────────────────────────────────────────────────────────
  describe('WorkflowAnalysisSuite integration', () => {
    it('should render WorkflowAnalysisSuite at the FINDINGS_REVIEW step', () => {
      const priorSteps = WORKFLOW_STEP_CONFIG
        .filter((_, idx) => idx < WORKFLOW_STEP_CONFIG.findIndex(c => c.step === ClinicalWorkflowStep.FINDINGS_REVIEW))
        .map(c => c.step);
      setupContextWithCase(ClinicalWorkflowStep.FINDINGS_REVIEW, priorSteps);
      renderWithTheme(<ClinicalWorkflowPageV2 />);

      expect(screen.getByTestId('workflow-analysis-suite')).toBeInTheDocument();
    });

    it('should NOT render PlaceholderStep at the FINDINGS_REVIEW step', () => {
      const priorSteps = WORKFLOW_STEP_CONFIG
        .filter((_, idx) => idx < WORKFLOW_STEP_CONFIG.findIndex(c => c.step === ClinicalWorkflowStep.FINDINGS_REVIEW))
        .map(c => c.step);
      setupContextWithCase(ClinicalWorkflowStep.FINDINGS_REVIEW, priorSteps);
      renderWithTheme(<ClinicalWorkflowPageV2 />);

      // PlaceholderStep would show "Confirm & Continue" button
      expect(screen.queryByText('Confirm & Continue')).not.toBeInTheDocument();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // B2 BUG FIX: Stale case state when navigating from archive
  // ────────────────────────────────────────────────────────────────────────
  describe('Stale case cleanup (B2)', () => {
    it('should call clearCurrentCase when navigating from archive (fromArchive=true)', () => {
      const mockClearCurrentCase = jest.fn();
      mockLocationState.state = { fromArchive: true, patientId: 'P123' };

      mockUseClinicalCase.mockReturnValue({
        currentCase: createCaseAtStep(ClinicalWorkflowStep.FINALIZE, []),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
        createCase: jest.fn(),
        advanceWorkflow: jest.fn(),
        goBackToStep: jest.fn(),
        updateAssessment: jest.fn(),
        updateReport: jest.fn(),
        generateReport: jest.fn(),
        finalizeReport: jest.fn(),
        signReport: jest.fn(),
        updateAnalysisResults: jest.fn(),
        getWorkflowProgress: jest.fn(() => 0),
        isStepCompleted: jest.fn(() => false),
        finalizeCase: jest.fn(),
        clearCurrentCase: mockClearCurrentCase,
      });

      renderWithTheme(<ClinicalWorkflowPageV2 />);

      expect(mockClearCurrentCase).toHaveBeenCalled();
    });

    it('should NOT call clearCurrentCase on normal mount (no fromArchive)', () => {
      const mockClearCurrentCase = jest.fn();
      mockLocationState.state = null;

      mockUseClinicalCase.mockReturnValue({
        currentCase: createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION, []),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
        createCase: jest.fn(),
        advanceWorkflow: jest.fn(),
        goBackToStep: jest.fn(),
        updateAssessment: jest.fn(),
        updateReport: jest.fn(),
        generateReport: jest.fn(),
        finalizeReport: jest.fn(),
        signReport: jest.fn(),
        updateAnalysisResults: jest.fn(),
        getWorkflowProgress: jest.fn(() => 0),
        isStepCompleted: jest.fn(() => false),
        finalizeCase: jest.fn(),
        clearCurrentCase: mockClearCurrentCase,
      });

      renderWithTheme(<ClinicalWorkflowPageV2 />);

      expect(mockClearCurrentCase).not.toHaveBeenCalled();
    });

    it('should call clearCurrentCase on unmount', () => {
      const mockClearCurrentCase = jest.fn();
      mockLocationState.state = null;

      mockUseClinicalCase.mockReturnValue({
        currentCase: createCaseAtStep(ClinicalWorkflowStep.PATIENT_REGISTRATION, []),
        isLoading: false,
        error: null,
        clearError: jest.fn(),
        createCase: jest.fn(),
        advanceWorkflow: jest.fn(),
        goBackToStep: jest.fn(),
        updateAssessment: jest.fn(),
        updateReport: jest.fn(),
        generateReport: jest.fn(),
        finalizeReport: jest.fn(),
        signReport: jest.fn(),
        updateAnalysisResults: jest.fn(),
        getWorkflowProgress: jest.fn(() => 0),
        isStepCompleted: jest.fn(() => false),
        finalizeCase: jest.fn(),
        clearCurrentCase: mockClearCurrentCase,
      });

      const { unmount } = renderWithTheme(<ClinicalWorkflowPageV2 />);

      // Should NOT be called on mount (no fromArchive)
      expect(mockClearCurrentCase).not.toHaveBeenCalled();

      unmount();

      expect(mockClearCurrentCase).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // B3 BUG FIX: LUNIT design token consistency
  // ────────────────────────────────────────────────────────────────────────
  describe('LUNIT token consistency (B3)', () => {
    it('should NOT use uppercase textTransform for phase labels', () => {
      setupContextWithCase(ClinicalWorkflowStep.IMAGE_UPLOAD, [ClinicalWorkflowStep.PATIENT_REGISTRATION]);
      const { container } = renderWithTheme(<ClinicalWorkflowPageV2 />);

      const styleSheets = Array.from(document.styleSheets);
      const allCssRules: string[] = [];
      for (const sheet of styleSheets) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            allCssRules.push(rule.cssText);
          }
        } catch (e) {}
      }
      const cssText = allCssRules.join(' ').toLowerCase();
      expect(cssText).not.toContain('text-transform: uppercase');
    });

    it('should NOT use Poppins font anywhere', () => {
      setupContextWithCase(ClinicalWorkflowStep.PATIENT_REGISTRATION, []);
      const { container } = renderWithTheme(<ClinicalWorkflowPageV2 />);

      const styleSheets = Array.from(document.styleSheets);
      const allCssRules: string[] = [];
      for (const sheet of styleSheets) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            allCssRules.push(rule.cssText);
          }
        } catch (e) {}
      }
      const cssText = allCssRules.join(' ').toLowerCase();
      expect(cssText).not.toContain('poppins');
    });
  });
});
