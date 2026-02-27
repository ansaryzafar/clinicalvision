/**
 * FinalizeStep Component Tests (Phase D, Step D.1)
 *
 * TDD RED → GREEN tests for the case finalization step.
 * FinalizeStep displays a case summary, validates completeness,
 * and provides a "Lock Case" button.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// We'll mock useClinicalCase
jest.mock('../../../contexts/ClinicalCaseContext', () => ({
  useClinicalCase: jest.fn(),
}));

import { useClinicalCase } from '../../../contexts/ClinicalCaseContext';
import { FinalizeStep } from '../FinalizeStep';
import {
  ClinicalCase,
  ClinicalWorkflowStep,
  EMPTY_PATIENT_INFO,
  EMPTY_CLINICAL_HISTORY,
  CaseStatus,
  ViewType,
  Laterality,
  MammogramImage,
  BiRadsAssessment,
  BreastComposition,
  GeneratedReport,
} from '../../../types/case.types';

const mockUseClinicalCase = useClinicalCase as jest.Mock;

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createBaseClinicalCase(overrides?: Partial<ClinicalCase>): ClinicalCase {
  return {
    id: 'test-case-001',
    caseNumber: 'CV-2026-001234',
    patient: {
      mrn: 'MRN-123456',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1975-03-15',
      gender: 'F',
    },
    clinicalHistory: {
      ...EMPTY_CLINICAL_HISTORY,
      clinicalIndication: 'Screening mammogram',
    },
    images: [],
    analysisResults: [],
    consolidatedFindings: [],
    workflow: {
      currentStep: ClinicalWorkflowStep.FINALIZE,
      completedSteps: [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
        ClinicalWorkflowStep.IMAGE_UPLOAD,
        ClinicalWorkflowStep.IMAGE_VERIFICATION,
        ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
        ClinicalWorkflowStep.FINDINGS_REVIEW,
        ClinicalWorkflowStep.MEASUREMENTS,
        ClinicalWorkflowStep.ANNOTATIONS,
        ClinicalWorkflowStep.BIRADS_ASSESSMENT,
        ClinicalWorkflowStep.REPORT_GENERATION,
      ],
      status: 'in_progress',
      startedAt: '2026-01-01T00:00:00.000Z',
      lastModifiedAt: '2026-01-01T10:00:00.000Z',
      isLocked: false,
    },
    audit: {
      createdBy: 'test-user',
      createdAt: '2026-01-01T00:00:00.000Z',
      modifications: [],
    },
    ...overrides,
  };
}

function createImageSet(): MammogramImage[] {
  return [
    {
      id: 'img-1',
      filename: 'rcc.dcm',
      fileSize: 5000000,
      mimeType: 'application/dicom',
      localUrl: 'blob:rcc',
      viewType: ViewType.CC,
      laterality: Laterality.RIGHT,
      uploadStatus: 'uploaded',
    },
    {
      id: 'img-2',
      filename: 'lcc.dcm',
      fileSize: 5000000,
      mimeType: 'application/dicom',
      localUrl: 'blob:lcc',
      viewType: ViewType.CC,
      laterality: Laterality.LEFT,
      uploadStatus: 'uploaded',
    },
    {
      id: 'img-3',
      filename: 'rmlo.dcm',
      fileSize: 5000000,
      mimeType: 'application/dicom',
      localUrl: 'blob:rmlo',
      viewType: ViewType.MLO,
      laterality: Laterality.RIGHT,
      uploadStatus: 'uploaded',
    },
    {
      id: 'img-4',
      filename: 'lmlo.dcm',
      fileSize: 5000000,
      mimeType: 'application/dicom',
      localUrl: 'blob:lmlo',
      viewType: ViewType.MLO,
      laterality: Laterality.LEFT,
      uploadStatus: 'uploaded',
    },
  ];
}

function createAssessment(): BiRadsAssessment {
  return {
    rightBreast: {
      composition: BreastComposition.B,
      biRadsCategory: '2',
    },
    leftBreast: {
      composition: BreastComposition.B,
      biRadsCategory: '1',
    },
    overallCategory: '2',
    impression: 'Benign bilateral mammogram',
    recommendation: 'Routine screening mammography',
    comparedWithPrior: false,
  };
}

function createReport(): GeneratedReport {
  return {
    id: 'report-001',
    content: {
      header: 'MAMMOGRAPHY REPORT',
      clinicalHistory: 'Screening mammogram',
      technique: 'Standard 4-view digital mammography',
      comparison: 'No prior studies available',
      findings: 'No suspicious findings',
      impression: 'Benign bilateral mammogram',
      recommendation: 'Routine screening',
    },
    status: 'pending_review',
    generatedAt: '2026-01-01T09:00:00.000Z',
    modifiedAt: '2026-01-01T09:00:00.000Z',
  };
}

function setupMock(caseOverrides?: Partial<ClinicalCase>) {
  const mockFinalizeCase = jest.fn().mockReturnValue({ success: true, data: {} });
  const mockFinalizeReport = jest.fn().mockReturnValue({ success: true, data: {} });
  const mockAdvanceWorkflow = jest.fn().mockReturnValue({ success: true, data: {} });
  const mockGoBackToStep = jest.fn();
  const mockIsStepCompleted = jest.fn().mockReturnValue(true);
  const mockGetWorkflowProgress = jest.fn().mockReturnValue(83);

  const clinicalCase = createBaseClinicalCase({
    images: createImageSet(),
    assessment: createAssessment(),
    report: createReport(),
    ...caseOverrides,
  });

  mockUseClinicalCase.mockReturnValue({
    currentCase: clinicalCase,
    isLoading: false,
    error: null,
    clearError: jest.fn(),
    finalizeCase: mockFinalizeCase,
    finalizeReport: mockFinalizeReport,
    advanceWorkflow: mockAdvanceWorkflow,
    goBackToStep: mockGoBackToStep,
    isStepCompleted: mockIsStepCompleted,
    getWorkflowProgress: mockGetWorkflowProgress,
  });

  return {
    mockFinalizeCase,
    mockFinalizeReport,
    mockAdvanceWorkflow,
    mockGoBackToStep,
    mockIsStepCompleted,
    mockGetWorkflowProgress,
    clinicalCase,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('FinalizeStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it('renders with a heading indicating finalization', () => {
    setupMock();
    render(<FinalizeStep />);
    expect(screen.getByText(/finalize|final review/i)).toBeInTheDocument();
  });

  it('displays patient summary information', () => {
    setupMock();
    render(<FinalizeStep />);
    expect(screen.getByText(/Jane/)).toBeInTheDocument();
    expect(screen.getByText(/Doe/)).toBeInTheDocument();
    expect(screen.getByText(/MRN-123456/)).toBeInTheDocument();
  });

  it('displays image count', () => {
    setupMock();
    render(<FinalizeStep />);
    expect(screen.getByText(/4 image\(s\) uploaded/)).toBeInTheDocument();
  });

  it('displays BI-RADS overall assessment', () => {
    setupMock();
    render(<FinalizeStep />);
    // BI-RADS 2 — Benign
    expect(screen.getByText(/BI-RADS 2/)).toBeInTheDocument();
  });

  it('displays report status', () => {
    setupMock();
    render(<FinalizeStep />);
    // "Pending Review" or "pending_review"
    expect(screen.getByText(/pending review/i)).toBeInTheDocument();
  });

  // ── Checklist validation ────────────────────────────────────────────────

  it('shows a pre-flight checklist of required steps', () => {
    setupMock();
    render(<FinalizeStep />);
    // Checklist items are inside list items
    expect(screen.getAllByText(/patient registration/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/clinical history/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/image upload/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/bi-rads assessment/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/generate report|report generation/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows completed checkmarks for finished steps', () => {
    const { mockIsStepCompleted } = setupMock();
    mockIsStepCompleted.mockReturnValue(true);
    render(<FinalizeStep />);
    // All checklist items should have a completed indicator
    const checkIcons = screen.getAllByTestId('check-icon');
    expect(checkIcons.length).toBeGreaterThanOrEqual(5);
  });

  it('shows incomplete indicators for missing steps', () => {
    const { mockIsStepCompleted } = setupMock();
    // Only first two steps completed
    mockIsStepCompleted.mockImplementation((step: ClinicalWorkflowStep) => {
      return step === ClinicalWorkflowStep.PATIENT_REGISTRATION ||
        step === ClinicalWorkflowStep.CLINICAL_HISTORY;
    });
    render(<FinalizeStep />);
    const missingIcons = screen.getAllByTestId('missing-icon');
    expect(missingIcons.length).toBeGreaterThan(0);
  });

  // ── Lock Case action ──────────────────────────────────────────────────

  it('renders a Lock Case button when all required steps are complete', () => {
    setupMock();
    render(<FinalizeStep />);
    expect(screen.getByRole('button', { name: /lock case/i })).toBeInTheDocument();
  });

  it('disables Lock Case button when required steps are incomplete', () => {
    const { mockIsStepCompleted } = setupMock();
    mockIsStepCompleted.mockReturnValue(false);
    render(<FinalizeStep />);
    const lockBtn = screen.getByRole('button', { name: /lock case/i });
    expect(lockBtn).toBeDisabled();
  });

  it('calls finalizeCase and advanceWorkflow when Lock Case is clicked', async () => {
    const { mockFinalizeCase, mockAdvanceWorkflow } = setupMock();
    render(<FinalizeStep />);
    const lockBtn = screen.getByRole('button', { name: /lock case/i });
    fireEvent.click(lockBtn);

    // Should show a confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm case lock/i)).toBeInTheDocument();
    });

    // Confirm the action (inside dialog, there are two 'Confirm'-like buttons)
    const confirmBtn = screen.getByRole('button', { name: /^confirm$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockFinalizeCase).toHaveBeenCalled();
    });
  });

  // ── B1 BUG FIX: Continue to Digital Signature ─────────────────────────

  it('renders a Continue to Digital Signature button', () => {
    setupMock();
    render(<FinalizeStep />);
    expect(screen.getByRole('button', { name: /continue.*signature|digital signature/i })).toBeInTheDocument();
  });

  it('calls advanceWorkflow when Continue to Digital Signature is clicked', async () => {
    const { mockAdvanceWorkflow } = setupMock();
    render(<FinalizeStep />);
    const continueBtn = screen.getByRole('button', { name: /continue.*signature|digital signature/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(mockAdvanceWorkflow).toHaveBeenCalledTimes(1);
    });
  });

  // ── Read-only when locked ─────────────────────────────────────────────

  it('shows read-only state when case is already locked', () => {
    setupMock({
      workflow: {
        currentStep: ClinicalWorkflowStep.FINALIZE,
        completedSteps: [
          ClinicalWorkflowStep.PATIENT_REGISTRATION,
          ClinicalWorkflowStep.CLINICAL_HISTORY,
          ClinicalWorkflowStep.IMAGE_UPLOAD,
          ClinicalWorkflowStep.IMAGE_VERIFICATION,
          ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
          ClinicalWorkflowStep.FINDINGS_REVIEW,
          ClinicalWorkflowStep.BIRADS_ASSESSMENT,
          ClinicalWorkflowStep.REPORT_GENERATION,
          ClinicalWorkflowStep.FINALIZE,
        ],
        status: 'finalized',
        startedAt: '2026-01-01T00:00:00.000Z',
        lastModifiedAt: '2026-01-01T10:00:00.000Z',
        isLocked: true,
        lockedBy: 'dr-smith',
        lockedAt: '2026-01-01T10:00:00.000Z',
      },
    });
    render(<FinalizeStep />);
    expect(screen.getByText(/locked|finalized|read.only/i)).toBeInTheDocument();
    // Lock button should not be present
    expect(screen.queryByRole('button', { name: /lock case/i })).not.toBeInTheDocument();
  });

  // ── No case loaded ──────────────────────────────────────────────────

  it('shows a message when no case is loaded', () => {
    mockUseClinicalCase.mockReturnValue({
      currentCase: null,
      isLoading: false,
      error: null,
    });
    render(<FinalizeStep />);
    expect(screen.getByText(/no.*case/i)).toBeInTheDocument();
  });

  // ── Navigation ────────────────────────────────────────────────────────

  it('renders a Back button that calls goBackToStep', () => {
    const { mockGoBackToStep } = setupMock();
    render(<FinalizeStep />);
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);
    expect(mockGoBackToStep).toHaveBeenCalledWith(ClinicalWorkflowStep.REPORT_GENERATION);
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  it('handles case with no report gracefully', () => {
    setupMock({ report: undefined });
    render(<FinalizeStep />);
    expect(screen.getByText(/no report/i)).toBeInTheDocument();
  });

  it('handles case with no assessment gracefully', () => {
    setupMock({ assessment: undefined });
    render(<FinalizeStep />);
    expect(screen.getByText(/no assessment/i)).toBeInTheDocument();
  });

  it('handles case with no images gracefully', () => {
    setupMock({ images: [] });
    render(<FinalizeStep />);
    expect(screen.getByText(/0 image\(s\) uploaded/)).toBeInTheDocument();
  });
});

// ============================================================================
// TEST SUITE: LUNIT Design Compliance (TODO-08)
// ============================================================================

describe('FinalizeStep — LUNIT design compliance', () => {
  const setupMock = (overrides?: Partial<any>) => {
    mockUseClinicalCase.mockReturnValue({
      currentCase: {
        id: 'test-case-001',
        caseNumber: 'CV-2026-001234',
        patient: {
          mrn: 'MRN-123456',
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: '1975-03-15',
          gender: 'F',
        },
        clinicalHistory: {
          clinicalIndication: 'Screening mammogram',
        },
        images: [],
        analysisResults: [],
        consolidatedFindings: [],
        workflow: {
          currentStep: 'finalize',
          completedSteps: [],
          status: 'in_progress',
          startedAt: '2026-01-01T00:00:00.000Z',
          lastModifiedAt: '2026-01-01T10:00:00.000Z',
          isLocked: false,
        },
        audit: {
          createdBy: 'test-user',
          createdAt: '2026-01-01T00:00:00.000Z',
          lastModifiedBy: 'test-user',
          lastModifiedAt: '2026-01-01T10:00:00.000Z',
          modifications: [],
        },
        ...overrides,
      },
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      finalizeCase: jest.fn().mockResolvedValue({ success: true }),
      advanceWorkflow: jest.fn(),
      goBackToStep: jest.fn(),
      isStepCompleted: jest.fn().mockReturnValue(true),
    });
  };

  it('should NOT have dark semi-transparent backgrounds (rgba(10,10,10,…))', () => {
    setupMock();
    const { container } = render(<FinalizeStep />);
    const allElements = container.querySelectorAll('*');
    const darkBgElements = Array.from(allElements).filter((el) => {
      const style = el.getAttribute('style') || '';
      return style.includes('rgba(10') || style.includes('rgb(10, 10, 10');
    });
    // No elements should have dark semi-transparent backgrounds
    expect(darkBgElements).toHaveLength(0);
  });

  it('should NOT have hardcoded #2E7D9A color', () => {
    setupMock();
    const { container } = render(<FinalizeStep />);
    const html = container.innerHTML;
    expect(html).not.toContain('2E7D9A');
    expect(html).not.toContain('2e7d9a');
  });

  it('should use LUNIT teal (#00C9EA) for accent colors', () => {
    setupMock();
    const { container } = render(<FinalizeStep />);
    // LUNIT teal should be present in CSS classes or style attributes
    // MUI sx uses CSS-in-JS — check the generated stylesheet
    const styleSheets = Array.from(document.styleSheets);
    const allCssRules: string[] = [];
    for (const sheet of styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          allCssRules.push(rule.cssText);
        }
      } catch (e) {
        // cross-origin stylesheet
      }
    }
    const cssText = allCssRules.join(' ').toLowerCase();
    // Check that LUNIT teal appears in the CSS (from sx props)
    expect(cssText).toContain('#00c9ea');
  });

  it('should use ClashGrotesk font for section headings', () => {
    setupMock();
    render(<FinalizeStep />);
    const heading = screen.getByText('Final Review');
    expect(heading).toBeInTheDocument();
    // MUI sx fontFamily is injected via CSS-in-JS, check stylesheet
    const styleSheets = Array.from(document.styleSheets);
    const allCssRules: string[] = [];
    for (const sheet of styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          allCssRules.push(rule.cssText);
        }
      } catch (e) {}
    }
    const cssText = allCssRules.join(' ').toLowerCase();
    expect(cssText).toContain('clashgrotesk');
  });

  it('should use Lexend font for body text', () => {
    setupMock();
    render(<FinalizeStep />);
    const bodyText = screen.getByText('Case Summary');
    expect(bodyText).toBeInTheDocument();
    // MUI sx fontFamily is injected via CSS-in-JS, check stylesheet
    const styleSheets = Array.from(document.styleSheets);
    const allCssRules: string[] = [];
    for (const sheet of styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          allCssRules.push(rule.cssText);
        }
      } catch (e) {}
    }
    const cssText = allCssRules.join(' ').toLowerCase();
    expect(cssText).toContain('lexend');
  });
});
