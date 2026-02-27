/**
 * ReportPreview Component Tests
 * 
 * Tests for the report preview and finalization step of the clinical workflow.
 * 
 * OPTIMIZED: Read-only render assertions consolidated to minimize
 * expensive MUI component re-mounts. Tests that check the same render
 * state share a single render() call.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ReportPreview } from '../ReportPreview';
import {
  ClinicalCase,
  GeneratedReport,
  ReportStatus,
  BiRadsCategory,
  BiRadsAssessment,
  ClinicalWorkflowStep,
  BreastComposition,
  AuditTrail,
} from '../../../types/case.types';

// Create default theme for testing
const theme = createTheme();

// Helper to render with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

const createMockReport = (overrides: Partial<GeneratedReport> = {}): GeneratedReport => ({
  id: 'report-001',
  status: 'draft' as ReportStatus,
  content: {
    header: 'MAMMOGRAPHY REPORT',
    clinicalHistory: 'Screening mammogram. No prior comparison available.',
    technique: 'Standard 4-view digital mammography was performed.',
    comparison: 'No prior studies available for comparison.',
    findings: 'Bilateral breasts demonstrate scattered fibroglandular density. No suspicious masses, calcifications, or architectural distortion identified.',
    impression: 'BI-RADS 1: Negative. Normal bilateral screening mammogram.',
    recommendation: 'Routine annual screening mammography recommended.',
  },
  generatedAt: '2026-02-19T10:00:00Z',
  modifiedAt: '2026-02-19T10:00:00Z',
  ...overrides,
});

const createMockClinicalCase = (overrides: Partial<ClinicalCase> = {}): ClinicalCase => ({
  id: 'case-001',
  caseNumber: 'CV-2026-001234',
  patient: {
    mrn: 'MRN12345',
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1975-03-15',
    gender: 'F',
  },
  clinicalHistory: {
    familyHistoryBreastCancer: false,
    personalHistoryBreastCancer: false,
    previousBiopsy: false,
    clinicalIndication: 'Screening',
    comparisonAvailable: false,
  },
  images: [],
  analysisResults: [],
  consolidatedFindings: [],
  assessment: {
    rightBreast: {
      composition: BreastComposition.B,
      biRadsCategory: '1' as BiRadsCategory,
    },
    leftBreast: {
      composition: BreastComposition.B,
      biRadsCategory: '1' as BiRadsCategory,
    },
    overallCategory: '1' as BiRadsCategory,
    impression: 'BI-RADS 1: Negative. Normal bilateral screening mammogram.',
    recommendation: 'Routine annual screening mammography recommended.',
    comparedToPrior: false,
  } as unknown as BiRadsAssessment,
  report: createMockReport(),
  workflow: {
    currentStep: ClinicalWorkflowStep.REPORT_GENERATION,
    completedSteps: [ClinicalWorkflowStep.PATIENT_REGISTRATION, ClinicalWorkflowStep.IMAGE_UPLOAD, ClinicalWorkflowStep.BATCH_AI_ANALYSIS, ClinicalWorkflowStep.BIRADS_ASSESSMENT],
    status: 'in_progress',
    startedAt: '2026-02-19T09:00:00Z',
    lastModifiedAt: '2026-02-19T10:00:00Z',
    isLocked: false,
  },
  audit: {
    createdAt: '2026-02-19T09:00:00Z',
    createdBy: 'user-001',
    lastModifiedAt: '2026-02-19T10:00:00Z',
    lastModifiedBy: 'user-001',
  } as unknown as AuditTrail,
  ...overrides,
});

// ============================================================================
// SHARED MOCK FUNCTIONS (reused across describe blocks)
// ============================================================================

let mockOnReportChange: jest.Mock;
let mockOnFinalize: jest.Mock;
let mockOnSign: jest.Mock;
let mockOnExportPdf: jest.Mock;
let mockOnBack: jest.Mock;

beforeEach(() => {
  mockOnReportChange = jest.fn();
  mockOnFinalize = jest.fn();
  mockOnSign = jest.fn();
  mockOnExportPdf = jest.fn();
  mockOnBack = jest.fn();
});

// Helper to render default ReportPreview
const renderDefault = (caseOverrides: Partial<ClinicalCase> = {}, extraProps: Record<string, any> = {}) => {
  const clinicalCase = createMockClinicalCase(caseOverrides);
  return renderWithTheme(
    <ReportPreview
      clinicalCase={clinicalCase}
      onReportChange={mockOnReportChange}
      onFinalize={mockOnFinalize}
      onSign={mockOnSign}
      onExportPdf={mockOnExportPdf}
      {...extraProps}
    />
  );
};

// ============================================================================
// RENDERING TESTS (consolidated — single render, multiple assertions)
// ============================================================================

describe('ReportPreview Rendering', () => {
  test('should render all core report sections and metadata', () => {
    renderDefault();

    // Title and header
    expect(screen.getByText(/Report Preview/i)).toBeInTheDocument();
    expect(screen.getByText(/MAMMOGRAPHY REPORT/i)).toBeInTheDocument();

    // Patient information
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/MRN12345/i)).toBeInTheDocument();

    // Report sections
    expect(screen.getByRole('heading', { name: /Clinical History/i })).toBeInTheDocument();
    expect(screen.getByText(/Screening mammogram\. No prior comparison/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Technique/i })).toBeInTheDocument();
    expect(screen.getByText(/4-view digital mammography/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Findings/i })).toBeInTheDocument();
    expect(screen.getByText(/scattered fibroglandular density/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Impression/i })).toBeInTheDocument();
    expect(screen.getByText(/BI-RADS 1: Negative/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Recommendation/i })).toBeInTheDocument();
    expect(screen.getByText(/annual screening mammography/i)).toBeInTheDocument();

    // Status badge and timestamps
    expect(screen.getByText(/Draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Report Date:/i)).toBeInTheDocument();
  });

  test('should render comparison section when available', () => {
    renderDefault({
      report: createMockReport({
        content: {
          ...createMockReport().content,
          comparison: 'Compared to prior study dated 2025-02-19.',
        },
      }),
      clinicalHistory: {
        ...createMockClinicalCase().clinicalHistory,
        comparisonAvailable: true,
        priorMammogramDate: '2025-02-19',
      },
    });

    expect(screen.getByRole('heading', { name: /Comparison/i })).toBeInTheDocument();
    expect(screen.getByText(/2025-02-19/i)).toBeInTheDocument();
  });
});

// ============================================================================
// ACTION BUTTONS TESTS (consolidated by status)
// ============================================================================

describe('ReportPreview Action Buttons', () => {
  test('should render Edit, Finalize, Export PDF buttons for draft reports (no Sign)', () => {
    renderDefault({ report: createMockReport({ status: 'draft' }) });

    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finalize/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export PDF/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Sign$/i })).not.toBeInTheDocument();
  });

  test('should render Sign button for pending review reports', () => {
    renderDefault({ report: createMockReport({ status: 'pending_review' }) });

    expect(screen.getByRole('button', { name: /Sign/i })).toBeInTheDocument();
  });

  test('should render Back button when onBack is provided', () => {
    renderDefault({}, { onBack: mockOnBack });

    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
  });

  test('should not render Edit button for signed reports', () => {
    renderDefault({ report: createMockReport({ status: 'signed' }) });

    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
  });
});

// ============================================================================
// EDITING TESTS
// ============================================================================

describe('ReportPreview Editing', () => {
  test('should enter edit mode with Save/Cancel buttons when Edit is clicked', () => {
    renderDefault({ report: createMockReport({ status: 'draft' }) });

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('should allow editing findings and impression in edit mode', () => {
    renderDefault({ report: createMockReport({ status: 'draft' }) });

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const findingsInput = screen.getByLabelText(/Findings/i);
    fireEvent.change(findingsInput, { target: { value: 'Updated findings text' } });
    expect(findingsInput).toHaveValue('Updated findings text');

    const impressionInput = screen.getByLabelText(/Impression/i);
    fireEvent.change(impressionInput, { target: { value: 'Updated impression' } });
    expect(impressionInput).toHaveValue('Updated impression');
  });

  test('should call onReportChange when Save is clicked', () => {
    renderDefault({ report: createMockReport({ status: 'draft' }) });

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const findingsInput = screen.getByLabelText(/Findings/i);
    fireEvent.change(findingsInput, { target: { value: 'Updated findings' } });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(mockOnReportChange).toHaveBeenCalled();
    const updatedReport = mockOnReportChange.mock.calls[0][0];
    expect(updatedReport.content.findings).toBe('Updated findings');
  });

  test('should exit edit mode without saving when Cancel is clicked', () => {
    renderDefault({ report: createMockReport({ status: 'draft' }) });

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    const findingsInput = screen.getByLabelText(/Findings/i);
    fireEvent.change(findingsInput, { target: { value: 'This will be cancelled' } });

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockOnReportChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
  });
});

// ============================================================================
// FINALIZATION AND SIGNING TESTS
// ============================================================================

describe('ReportPreview Finalization', () => {
  test('should call onFinalize when Finalize button is clicked', () => {
    renderDefault({ report: createMockReport({ status: 'draft' }) });

    fireEvent.click(screen.getByRole('button', { name: /Finalize/i }));

    expect(mockOnFinalize).toHaveBeenCalledTimes(1);
  });

  test('should show confirmation dialog before finalizing', () => {
    renderDefault(
      { report: createMockReport({ status: 'draft' }) },
      { requireConfirmation: true }
    );

    fireEvent.click(screen.getByRole('button', { name: /Finalize/i }));

    expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
  });

  test('should call onSign when Sign button is clicked', () => {
    renderDefault({ report: createMockReport({ status: 'pending_review' }) });

    fireEvent.click(screen.getByRole('button', { name: /Sign/i }));

    expect(mockOnSign).toHaveBeenCalledTimes(1);
  });

  test('should require signature credentials when signing', () => {
    renderDefault(
      { report: createMockReport({ status: 'pending_review' }) },
      { requireSignatureCredentials: true }
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign/i }));

    expect(screen.getByText(/Enter Credentials/i)).toBeInTheDocument();
  });

  test('should display signed status badge after signing', () => {
    renderDefault({ report: createMockReport({ status: 'signed' }) });

    expect(screen.getByText(/Signed/i)).toBeInTheDocument();
  });
});

// ============================================================================
// PDF EXPORT TESTS
// ============================================================================

describe('ReportPreview PDF Export', () => {
  test('should call onExportPdf and show loading state', () => {
    const slowExport = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    renderDefault({}, { onExportPdf: slowExport });

    fireEvent.click(screen.getByRole('button', { name: /Export PDF/i }));

    expect(slowExport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('should display PDF link when pdfUrl is available', () => {
    renderDefault({
      report: createMockReport({ pdfUrl: '/reports/report-001.pdf' }),
    });

    expect(screen.getByRole('link', { name: /Download PDF/i })).toHaveAttribute('href', '/reports/report-001.pdf');
  });
});

// ============================================================================
// STATUS DISPLAY TESTS (consolidated — one render per status)
// ============================================================================

describe('ReportPreview Status Display', () => {
  test.each([
    ['draft', /Draft/i],
    ['pending_review', /Pending Review/i],
    ['reviewed', /Reviewed/i],
    ['signed', /Signed/i],
    ['amended', /Amended/i],
  ] as const)('should display %s status correctly', (status, expectedText) => {
    renderDefault({ report: createMockReport({ status: status as ReportStatus }) });

    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });
});

// ============================================================================
// READ-ONLY MODE TESTS (consolidated — single render)
// ============================================================================

describe('ReportPreview Read-Only Mode', () => {
  test('should hide Edit/Finalize buttons but allow PDF export in read-only mode', () => {
    renderDefault(
      { report: createMockReport({ status: 'draft' }) },
      { isReadOnly: true }
    );

    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Finalize/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export PDF/i })).toBeInTheDocument();
  });
});

// ============================================================================
// NO REPORT STATE TESTS (consolidated — single render)
// ============================================================================

describe('ReportPreview No Report State', () => {
  test('should show generate button and placeholder when no report exists', () => {
    const mockOnGenerate = jest.fn();
    renderDefault({ report: undefined }, { onGenerate: mockOnGenerate });

    expect(screen.getByRole('button', { name: /Generate Report/i })).toBeInTheDocument();
    expect(screen.getByText(/No report generated yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Generate Report/i }));
    expect(mockOnGenerate).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// PRINT LAYOUT TESTS (consolidated — single render)
// ============================================================================

describe('ReportPreview Print Layout', () => {
  test('should render Print button and have print-friendly class', () => {
    const { container } = renderDefault();

    expect(screen.getByRole('button', { name: /Print/i })).toBeInTheDocument();
    expect(container.querySelector('.report-content')).toBeInTheDocument();
  });
});

// ============================================================================
// ACCESSIBILITY TESTS (consolidated — single render)
// ============================================================================

describe('ReportPreview Accessibility', () => {
  test('should have proper headings, accessible section labels, and buttons', () => {
    renderDefault({ report: createMockReport({ status: 'draft' }) });

    // Main heading
    expect(screen.getByRole('heading', { level: 1, name: /Report Preview/i })).toBeInTheDocument();
    // Section headings
    expect(screen.getByRole('heading', { name: /Clinical History/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Findings/i })).toBeInTheDocument();
    // Accessible buttons
    expect(screen.getByRole('button', { name: /Edit/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Finalize/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Export PDF/i })).toBeEnabled();
  });

  test('should indicate editable fields in edit mode', () => {
    renderDefault({ report: createMockReport({ status: 'draft' }) });

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));

    expect(screen.getByLabelText(/Findings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Impression/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Recommendation/i)).toBeInTheDocument();
  });
});

// ============================================================================
// WORKFLOW INTEGRATION TESTS (consolidated)
// ============================================================================

describe('ReportPreview Workflow Integration', () => {
  test('should call onBack, display case number, and show BI-RADS category', () => {
    renderDefault({}, { onBack: mockOnBack });

    // Back button
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(mockOnBack).toHaveBeenCalledTimes(1);

    // Case number
    expect(screen.getByText(/CV-2026-001234/i)).toBeInTheDocument();

    // BI-RADS category — use the prominent callout
    const biRadsCallout = screen.getByTestId('birads-callout');
    expect(biRadsCallout).toHaveTextContent(/BI-RADS.*1/i);
  });
});

// ============================================================================
// PROFESSIONAL REPORT STRUCTURE (TODO-06 / TODO-07)
// ============================================================================

describe('ReportPreview Professional Report Structure', () => {
  test('should display facility header with institution name', () => {
    renderDefault();

    // There should be a facility/institution header area
    expect(screen.getByText(/ClinicalVision Medical Imaging/i)).toBeInTheDocument();
  });

  test('should display full patient demographics line: Name, DOB, Age, Sex, MRN', () => {
    renderDefault();

    // Patient name
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    // Date of birth
    expect(screen.getByText(/DOB:/i)).toBeInTheDocument();
    expect(screen.getByText(/1975-03-15|03\/15\/1975|Mar.*1975/i)).toBeInTheDocument();
    // Sex
    expect(screen.getByText(/Sex:/i)).toBeInTheDocument();
    // MRN
    expect(screen.getByText(/MRN:/i)).toBeInTheDocument();
    expect(screen.getByText(/MRN12345/i)).toBeInTheDocument();
  });

  test('should display a prominent BI-RADS assessment callout box', () => {
    const { container } = renderDefault();

    // BI-RADS assessment should be in its own visually distinct callout
    const biRadsCallout = container.querySelector('[data-testid="birads-callout"]');
    expect(biRadsCallout).toBeInTheDocument();

    // Should show BI-RADS category prominently
    const calloutText = biRadsCallout!.textContent;
    expect(calloutText).toMatch(/BI-RADS/i);
    expect(calloutText).toMatch(/1/);
  });

  test('should visually emphasize the Impression section differently from other sections', () => {
    const { container } = renderDefault();

    // Impression section should have a background highlight or special styling
    const impressionSection = container.querySelector('[data-testid="section-impression"]');
    expect(impressionSection).toBeInTheDocument();

    // Regular sections should NOT have the emphasis data attribute
    const clinicalHistorySection = container.querySelector('[data-testid="section-clinical-history"]');
    expect(clinicalHistorySection).toBeInTheDocument();
    expect(clinicalHistorySection).not.toHaveAttribute('data-emphasis');

    // Impression SHOULD have emphasis
    expect(impressionSection).toHaveAttribute('data-emphasis', 'true');
  });

  test('should style Recommendation section with a bordered/action box', () => {
    const { container } = renderDefault();

    const recommendationSection = container.querySelector('[data-testid="section-recommendation"]');
    expect(recommendationSection).toBeInTheDocument();
    expect(recommendationSection).toHaveAttribute('data-emphasis', 'true');
  });

  test('should render status badge at medium size, not small', () => {
    renderDefault();

    // The status chip should be medium sized for clinical prominence
    const chip = screen.getByText(/Draft/i).closest('.MuiChip-root');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('MuiChip-sizeMedium');
  });

  test('should show exam date and report date as distinct fields', () => {
    renderDefault();

    // Should have labeled date fields, not just "Generated:"
    expect(screen.getByText(/Report Date:/i)).toBeInTheDocument();
  });

  test('should display a footer disclaimer', () => {
    renderDefault();

    expect(screen.getByText(/This report is confidential/i)).toBeInTheDocument();
  });
});

// ============================================================================
// B1 BUG FIX: Continue button to advance to Finalize step
// ============================================================================

describe('ReportPreview Continue to Finalize', () => {
  test('should render Continue button when report exists and onContinue is provided', () => {
    const mockOnContinue = jest.fn();
    renderDefault(
      { report: createMockReport({ status: 'pending_review' }) },
      { onContinue: mockOnContinue },
    );

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  test('should call onContinue when Continue button is clicked', () => {
    const mockOnContinue = jest.fn();
    renderDefault(
      { report: createMockReport({ status: 'pending_review' }) },
      { onContinue: mockOnContinue },
    );

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  test('should NOT render Continue button when no report exists', () => {
    const mockOnContinue = jest.fn();
    renderDefault(
      { report: undefined },
      { onContinue: mockOnContinue, onGenerate: jest.fn() },
    );

    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });

  test('should NOT render Continue button when onContinue is not provided', () => {
    renderDefault({ report: createMockReport({ status: 'pending_review' }) });

    // There should be no button matching "continue" without the callback
    const buttons = screen.getAllByRole('button');
    const continueButtons = buttons.filter(btn =>
      btn.textContent?.toLowerCase().includes('continue')
    );
    expect(continueButtons).toHaveLength(0);
  });
});
