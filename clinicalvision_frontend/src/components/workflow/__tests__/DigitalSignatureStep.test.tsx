/**
 * DigitalSignatureStep Component Tests (Phase D, Step D.2)
 *
 * TDD RED → GREEN tests for the digital signature step.
 * DigitalSignatureStep displays the final report, captures the radiologist's
 * intent to sign, generates a SHA-256 hash, and transitions the case to
 * finalized/completed status.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../contexts/ClinicalCaseContext', () => ({
  useClinicalCase: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import { useClinicalCase } from '../../../contexts/ClinicalCaseContext';
import { DigitalSignatureStep } from '../DigitalSignatureStep';
import {
  ClinicalCase,
  ClinicalWorkflowStep,
  EMPTY_CLINICAL_HISTORY,
  GeneratedReport,
} from '../../../types/case.types';

const mockUseClinicalCase = useClinicalCase as jest.Mock;

// ============================================================================
// FIXTURES
// ============================================================================

function createReport(): GeneratedReport {
  return {
    id: 'report-001',
    content: {
      header: 'MAMMOGRAPHY REPORT',
      clinicalHistory: 'Screening mammogram',
      technique: 'Standard 4-view digital mammography',
      comparison: 'No prior studies',
      findings: 'No suspicious findings identified',
      impression: 'Benign bilateral mammogram. BI-RADS 2.',
      recommendation: 'Routine annual screening mammography recommended',
    },
    status: 'pending_review',
    generatedAt: '2026-01-01T09:00:00.000Z',
    modifiedAt: '2026-01-01T09:00:00.000Z',
  };
}

function createClinicalCase(overrides?: Partial<ClinicalCase>): ClinicalCase {
  return {
    id: 'test-case-sig-001',
    caseNumber: 'CV-2026-005678',
    patient: {
      mrn: 'MRN-789012',
      firstName: 'Alice',
      lastName: 'Johnson',
      dateOfBirth: '1968-11-22',
      gender: 'F',
    },
    clinicalHistory: {
      ...EMPTY_CLINICAL_HISTORY,
      clinicalIndication: 'Screening mammogram',
    },
    images: [],
    analysisResults: [],
    consolidatedFindings: [],
    report: createReport(),
    workflow: {
      currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
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
      status: 'in_progress',
      startedAt: '2026-01-01T00:00:00.000Z',
      lastModifiedAt: '2026-01-01T11:00:00.000Z',
      isLocked: true,
      lockedBy: 'dr-johnson',
      lockedAt: '2026-01-01T10:30:00.000Z',
    },
    audit: {
      createdBy: 'dr-johnson',
      createdAt: '2026-01-01T00:00:00.000Z',
      modifications: [],
    },
    ...overrides,
  };
}

function setupMock(caseOverrides?: Partial<ClinicalCase>) {
  const mockSignReport = jest.fn().mockReturnValue({ success: true, data: {} });
  const mockFinalizeCase = jest.fn().mockResolvedValue({ success: true, data: {} });
  const mockGoBackToStep = jest.fn();
  const mockClearCurrentCase = jest.fn();

  const clinicalCase = createClinicalCase(caseOverrides);

  mockUseClinicalCase.mockReturnValue({
    currentCase: clinicalCase,
    isLoading: false,
    error: null,
    clearError: jest.fn(),
    signReport: mockSignReport,
    finalizeCase: mockFinalizeCase,
    goBackToStep: mockGoBackToStep,
    clearCurrentCase: mockClearCurrentCase,
  });

  return { mockSignReport, mockFinalizeCase, mockGoBackToStep, mockClearCurrentCase, clinicalCase };
}

// ============================================================================
// TESTS
// ============================================================================

describe('DigitalSignatureStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    // Mock crypto.subtle for SHA-256
    const mockDigest = jest.fn().mockImplementation(async () => {
      const buffer = new ArrayBuffer(32);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < 32; i++) view[i] = i + 1;
      return buffer;
    });
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: { digest: mockDigest },
        getRandomValues: jest.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it('renders with a heading about digital signature', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    expect(screen.getByRole('heading', { name: /digital signature/i })).toBeInTheDocument();
  });

  it('displays the report content in read-only mode', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    // Report sections should be visible
    expect(screen.getByText(/MAMMOGRAPHY REPORT/)).toBeInTheDocument();
    expect(screen.getByText(/No suspicious findings identified/)).toBeInTheDocument();
    expect(screen.getByText(/Benign bilateral mammogram/i)).toBeInTheDocument();
  });

  it('displays the patient info for verification', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Johnson/)).toBeInTheDocument();
  });

  // ── Signature input ────────────────────────────────────────────────────

  it('renders a typed name input for signature', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    expect(screen.getByLabelText(/full name|typed name|name/i)).toBeInTheDocument();
  });

  it('renders a password/PIN confirmation input', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    expect(screen.getByLabelText(/password|pin|credential/i)).toBeInTheDocument();
  });

  it('renders a Sign Report button', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    expect(screen.getByRole('button', { name: /sign report/i })).toBeInTheDocument();
  });

  // ── Validation ─────────────────────────────────────────────────────────

  it('disables sign button when name field is empty', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    const signBtn = screen.getByRole('button', { name: /sign report/i });
    expect(signBtn).toBeDisabled();
  });

  it('disables sign button when password field is empty', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    const nameInput = screen.getByLabelText(/full name|typed name|name/i);
    fireEvent.change(nameInput, { target: { value: 'Dr. Alice Johnson' } });
    const signBtn = screen.getByRole('button', { name: /sign report/i });
    expect(signBtn).toBeDisabled();
  });

  it('enables sign button when both name and password are filled', () => {
    setupMock();
    render(<DigitalSignatureStep />);
    const nameInput = screen.getByLabelText(/full name|typed name|name/i);
    const passInput = screen.getByLabelText(/password|pin|credential/i);
    fireEvent.change(nameInput, { target: { value: 'Dr. Alice Johnson' } });
    fireEvent.change(passInput, { target: { value: 'secure123' } });
    const signBtn = screen.getByRole('button', { name: /sign report/i });
    expect(signBtn).toBeEnabled();
  });

  // ── Sign action ────────────────────────────────────────────────────────

  it('calls signReport with a hash when signing', async () => {
    const { mockSignReport } = setupMock();
    render(<DigitalSignatureStep />);

    const nameInput = screen.getByLabelText(/full name/i);
    const passInput = screen.getByLabelText(/password/i);
    fireEvent.change(nameInput, { target: { value: 'Dr. Alice Johnson' } });
    fireEvent.change(passInput, { target: { value: 'secure123' } });

    const signBtn = screen.getByRole('button', { name: /sign report/i });
    
    await waitFor(() => {
      expect(signBtn).toBeEnabled();
    });

    fireEvent.click(signBtn);

    await waitFor(() => {
      expect(mockSignReport).toHaveBeenCalledTimes(1);
    });
    // Hash should be a non-empty string
    const hash = mockSignReport.mock.calls[0][0];
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  // ── B1 BUG FIX: finalizeCase called reactively after report is signed ──

  it('auto-finalizes when case report status is signed but workflow is not finalized', async () => {
    // Set up a case where signing has already happened (report.status = 'signed')
    // but finalization hasn't yet occurred (workflow.status = 'in_progress')
    const mockFinalizeCase = jest.fn().mockResolvedValue({ success: true, data: {} });
    const signedCase = createClinicalCase({
      report: { ...createReport(), status: 'signed' as any },
      audit: {
        createdBy: 'dr-johnson',
        createdAt: '2026-01-01T00:00:00.000Z',
        modifications: [],
        signedBy: 'dr-johnson',
        signedAt: '2026-01-01T12:00:00.000Z',
        signatureHash: 'hash-from-signing',
      },
      workflow: {
        currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
        completedSteps: [],
        status: 'in_progress' as any,
        startedAt: '2026-01-01T00:00:00.000Z',
        lastModifiedAt: '2026-01-01T11:00:00.000Z',
        isLocked: true,
        lockedBy: 'dr-johnson',
        lockedAt: '2026-01-01T10:30:00.000Z',
      },
    });

    mockUseClinicalCase.mockReturnValue({
      currentCase: signedCase,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      signReport: jest.fn().mockReturnValue({ success: true }),
      finalizeCase: mockFinalizeCase,
      goBackToStep: jest.fn(),
    });

    render(<DigitalSignatureStep />);

    // The useEffect should automatically call finalizeCase with the signatureHash
    await waitFor(() => {
      expect(mockFinalizeCase).toHaveBeenCalledTimes(1);
      expect(mockFinalizeCase).toHaveBeenCalledWith('hash-from-signing');
    });
  });

  // ── Already signed ─────────────────────────────────────────────────────

  it('shows signed status when report is already signed', () => {
    setupMock({
      report: { ...createReport(), status: 'signed' },
      audit: {
        createdBy: 'dr-johnson',
        createdAt: '2026-01-01T00:00:00.000Z',
        modifications: [],
        signedBy: 'dr-johnson',
        signedAt: '2026-01-01T12:00:00.000Z',
        signatureHash: 'abc123hash',
      },
    });
    render(<DigitalSignatureStep />);
    expect(screen.getByText(/Report Signed & Completed/)).toBeInTheDocument();
    // Sign button should not be present
    expect(screen.queryByRole('button', { name: /sign report/i })).not.toBeInTheDocument();
  });

  // ── No case / no report ────────────────────────────────────────────────

  it('shows a message when no case is loaded', () => {
    mockUseClinicalCase.mockReturnValue({
      currentCase: null,
      isLoading: false,
      error: null,
    });
    render(<DigitalSignatureStep />);
    expect(screen.getByText(/no.*case/i)).toBeInTheDocument();
  });

  it('shows a warning when report is missing', () => {
    setupMock({ report: undefined });
    render(<DigitalSignatureStep />);
    expect(screen.getByText(/no report/i)).toBeInTheDocument();
  });

  // ── Navigation ─────────────────────────────────────────────────────────

  it('renders a Back button that navigates to FINALIZE step', () => {
    const { mockGoBackToStep } = setupMock();
    render(<DigitalSignatureStep />);
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);
    expect(mockGoBackToStep).toHaveBeenCalledWith(ClinicalWorkflowStep.FINALIZE);
  });
});

// ============================================================================
// TEST SUITE: LUNIT Design Compliance (TODO-08)
// ============================================================================

describe('DigitalSignatureStep — LUNIT design compliance', () => {
  function setupDesignMock() {
    mockUseClinicalCase.mockReturnValue({
      currentCase: {
        id: 'test-case-sig-001',
        caseNumber: 'CV-2026-005678',
        patient: {
          mrn: 'MRN-789012',
          firstName: 'Alice',
          lastName: 'Johnson',
          dateOfBirth: '1982-07-20',
          gender: 'F',
        },
        clinicalHistory: { clinicalIndication: 'Screening' },
        images: [],
        analysisResults: [],
        consolidatedFindings: [],
        report: createReport(),
        workflow: {
          currentStep: 'digital_signature',
          completedSteps: [],
          status: 'in_progress',
          startedAt: '2026-01-01T00:00:00.000Z',
          lastModifiedAt: '2026-01-01T10:00:00.000Z',
          isLocked: true,
        },
        audit: {
          createdBy: 'test-user',
          createdAt: '2026-01-01T00:00:00.000Z',
          lastModifiedBy: 'test-user',
          lastModifiedAt: '2026-01-01T10:00:00.000Z',
          modifications: [],
        },
      },
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      signReport: jest.fn().mockReturnValue({ success: true }),
      goBackToStep: jest.fn(),
    });
  }

  it('should NOT have dark semi-transparent backgrounds', () => {
    setupDesignMock();
    const { container } = render(<DigitalSignatureStep />);
    const allElements = container.querySelectorAll('*');
    const darkBgElements = Array.from(allElements).filter((el) => {
      const style = el.getAttribute('style') || '';
      return style.includes('rgba(10') || style.includes('rgb(10, 10, 10');
    });
    expect(darkBgElements).toHaveLength(0);
  });

  it('should NOT have hardcoded #2E7D9A color', () => {
    setupDesignMock();
    const { container } = render(<DigitalSignatureStep />);
    const html = container.innerHTML;
    expect(html).not.toContain('2E7D9A');
    expect(html).not.toContain('2e7d9a');
  });

  it('should use LUNIT teal (#00C9EA) in styles', () => {
    setupDesignMock();
    render(<DigitalSignatureStep />);
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
    expect(cssText).toContain('#00c9ea');
  });

  it('should use ClashGrotesk font for the heading', () => {
    setupDesignMock();
    render(<DigitalSignatureStep />);
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
});

// ============================================================================
// POST-SIGN NAVIGATION TESTS
// ============================================================================

describe('DigitalSignatureStep post-sign actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  function setupSignedMock() {
    const mockClearCurrentCase = jest.fn();
    const clinicalCase = createClinicalCase({
      report: { ...createReport(), status: 'signed' },
      workflow: {
        currentStep: ClinicalWorkflowStep.DIGITAL_SIGNATURE,
        completedSteps: [],
        status: 'finalized',
        startedAt: '2026-01-01T00:00:00.000Z',
        lastModifiedAt: '2026-01-01T11:00:00.000Z',
        isLocked: true,
      },
      audit: {
        createdBy: 'dr-johnson',
        createdAt: '2026-01-01T00:00:00.000Z',
        modifications: [],
        signedBy: 'Dr. Alice Johnson',
        signedAt: '2026-01-01T11:00:00.000Z',
        signatureHash: 'abc123def456',
      },
    });
    mockUseClinicalCase.mockReturnValue({
      currentCase: clinicalCase,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      signReport: jest.fn(),
      finalizeCase: jest.fn().mockResolvedValue({ success: true }),
      goBackToStep: jest.fn(),
      clearCurrentCase: mockClearCurrentCase,
    });
    return { mockClearCurrentCase, clinicalCase };
  }

  it('shows post-sign actions after case is signed', () => {
    setupSignedMock();
    render(<DigitalSignatureStep />);

    expect(screen.getByText(/signed and finalized/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View All Cases/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start New Case/i })).toBeInTheDocument();
  });

  it('navigates to /cases when "View All Cases" is clicked', () => {
    setupSignedMock();
    render(<DigitalSignatureStep />);

    fireEvent.click(screen.getByRole('button', { name: /View All Cases/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/cases');
  });

  it('clears case and navigates to /workflow when "Start New Case" is clicked', () => {
    const { mockClearCurrentCase } = setupSignedMock();
    render(<DigitalSignatureStep />);

    fireEvent.click(screen.getByRole('button', { name: /Start New Case/i }));
    expect(mockClearCurrentCase).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/workflow');
  });
});
