/**
 * FindingsReviewStep Component Tests — TDD
 *
 * Tests for the integrated findings review step that replaces
 * the 3 redundant placeholder steps (Review Findings, Measurements, Annotations).
 *
 * Verifies:
 * - Per-image analysis result cards are rendered
 * - Consolidated findings table is displayed
 * - Navigation (Back / Continue) works correctly
 * - Empty states handled gracefully
 * - LUNIT design tokens applied
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { FindingsReviewStep } from '../FindingsReviewStep';
import {
  ClinicalCase,
  ClinicalWorkflowStep,
  ImageAnalysisResult,
  ConsolidatedFinding,
  FindingType,
  Laterality,
  ViewType,
  MammogramImage,
  EMPTY_CLINICAL_HISTORY,
  BiRadsValues,
} from '../../../types/case.types';

// ============================================================================
// TEST HELPERS
// ============================================================================

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function createMockImage(id: string, viewType: ViewType, laterality: Laterality): MammogramImage {
  return {
    id,
    filename: `${laterality}_${viewType}.png`,
    fileSize: 1024 * 1024,
    mimeType: 'image/png',
    localUrl: `blob:http://localhost/${id}`,
    viewType,
    laterality,
    uploadStatus: 'uploaded',
    addedAt: new Date().toISOString(),
  } as unknown as MammogramImage;
}

function createMockAnalysisResult(
  imageId: string,
  prediction: 'benign' | 'malignant' = 'benign',
  confidence: number = 0.85
): ImageAnalysisResult {
  return {
    imageId,
    prediction,
    confidence,
    probabilities: {
      benign: prediction === 'benign' ? confidence : 1 - confidence,
      malignant: prediction === 'malignant' ? confidence : 1 - confidence,
    },
    riskLevel: confidence > 0.7 ? (prediction === 'malignant' ? 'high' : 'low') : 'moderate',
    suspiciousRegions: [],
    modelVersion: 'v1.0.0',
    processingTimeMs: 1500,
    analyzedAt: new Date().toISOString(),
  };
}

function createMockFinding(
  overrides: Partial<ConsolidatedFinding> = {}
): ConsolidatedFinding {
  return {
    id: 'finding-1',
    laterality: Laterality.RIGHT,
    findingType: FindingType.MASS,
    shape: 'irregular',
    margin: 'spiculated',
    size: { length: 12, width: 8 },
    visibleInViews: ['img-1', 'img-2'],
    aiCorrelatedRegions: ['region-1'],
    aiConfidence: 0.89,
    individualBiRads: '4B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createCaseWithResults(
  images: MammogramImage[] = [],
  analysisResults: ImageAnalysisResult[] = [],
  consolidatedFindings: ConsolidatedFinding[] = []
): ClinicalCase {
  return {
    id: 'case-123',
    caseNumber: 'CV-2026-000001',
    patient: {
      mrn: 'MRN12345',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1980-01-15',
      gender: 'F',
    },
    clinicalHistory: { ...EMPTY_CLINICAL_HISTORY, clinicalIndication: 'Screening' },
    images,
    analysisResults,
    consolidatedFindings,
    workflow: {
      currentStep: ClinicalWorkflowStep.FINDINGS_REVIEW,
      completedSteps: [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
        ClinicalWorkflowStep.IMAGE_UPLOAD,
        ClinicalWorkflowStep.IMAGE_VERIFICATION,
        ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
      ],
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      isLocked: false,
    },
    audit: {
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      lastModifiedBy: 'user-1',
      lastModifiedAt: new Date().toISOString(),
      modifications: [],
    },
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('FindingsReviewStep — Per-Image Analysis Results', () => {
  it('should render a result card for each analyzed image', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const results = [
      createMockAnalysisResult('img-1', 'benign', 0.92),
      createMockAnalysisResult('img-2', 'malignant', 0.78),
    ];
    const clinicalCase = createCaseWithResults(images, results, []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    // Should show both image results
    expect(screen.getByText(/RCC/i)).toBeInTheDocument();
    expect(screen.getByText(/RMLO/i)).toBeInTheDocument();
  });

  it('should show prediction labels for each result', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.LEFT),
    ];
    const results = [
      createMockAnalysisResult('img-1', 'benign', 0.92),
      createMockAnalysisResult('img-2', 'malignant', 0.78),
    ];
    const clinicalCase = createCaseWithResults(images, results, []);

    const { container } = renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    // Prediction labels appear as Chip labels
    const chips = container.querySelectorAll('.MuiChip-label');
    const chipTexts = Array.from(chips).map((c) => c.textContent);
    expect(chipTexts).toContain('Benign');
    expect(chipTexts).toContain('Malignant');
  });

  it('should display confidence percentages', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1', 'benign', 0.92)];
    const clinicalCase = createCaseWithResults(images, results, []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    // "92%" appears in the confidence display
    expect(screen.getByText('92%')).toBeInTheDocument();
  });
});

describe('FindingsReviewStep — Consolidated Findings', () => {
  it('should render a findings summary section', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const findings = [
      createMockFinding({ id: 'f-1', laterality: Laterality.RIGHT, findingType: FindingType.MASS }),
    ];
    const clinicalCase = createCaseWithResults(images, results, findings);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    // Section heading for consolidated findings
    expect(screen.getByText('Consolidated Findings')).toBeInTheDocument();
  });

  it('should display finding type and laterality', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const findings = [
      createMockFinding({
        id: 'f-1',
        laterality: Laterality.RIGHT,
        findingType: FindingType.MASS,
        shape: 'irregular',
        margin: 'spiculated',
      }),
    ];
    const clinicalCase = createCaseWithResults(images, results, findings);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText(/mass/i)).toBeInTheDocument();
    expect(screen.getByText(/right/i)).toBeInTheDocument();
  });

  it('should display finding size when available', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const findings = [
      createMockFinding({ size: { length: 12, width: 8 } }),
    ];
    const clinicalCase = createCaseWithResults(images, results, findings);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('should show AI confidence for each finding', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const findings = [
      createMockFinding({ aiConfidence: 0.89 }),
    ];
    const clinicalCase = createCaseWithResults(images, results, findings);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText(/89/)).toBeInTheDocument();
  });

  it('should show BI-RADS assessment per finding', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const findings = [
      createMockFinding({ individualBiRads: '4B' }),
    ];
    const clinicalCase = createCaseWithResults(images, results, findings);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText(/4B/)).toBeInTheDocument();
  });
});

describe('FindingsReviewStep — Empty & Edge States', () => {
  it('should display empty state when no analysis results exist', () => {
    const clinicalCase = createCaseWithResults([], [], []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText(/no analysis results/i)).toBeInTheDocument();
  });

  it('should display "no findings" message when results exist but no consolidated findings', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1', 'benign', 0.95)];
    const clinicalCase = createCaseWithResults(images, results, []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText(/no suspicious findings/i)).toBeInTheDocument();
  });
});

describe('FindingsReviewStep — Navigation', () => {
  it('should render Back and Continue buttons', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const clinicalCase = createCaseWithResults(images, results, []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proceed to bi-rads assessment/i })).toBeInTheDocument();
  });

  it('should call onContinue when Continue button is clicked', async () => {
    const onContinue = jest.fn();
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const clinicalCase = createCaseWithResults(images, results, []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={onContinue}
        onBack={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /proceed to bi-rads assessment/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should call onBack when Back button is clicked', async () => {
    const onBack = jest.fn();
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const clinicalCase = createCaseWithResults(images, results, []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={onBack}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should NOT render Back button when onBack is not provided', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const clinicalCase = createCaseWithResults(images, results, []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });
});

describe('FindingsReviewStep — LUNIT Design Compliance', () => {
  it('should render heading with ClashGrotesk font', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const clinicalCase = createCaseWithResults(images, results, []);

    const { container } = renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    const heading = screen.getByText(/review findings/i);
    const style = window.getComputedStyle(heading);
    expect(style.fontFamily).toContain('ClashGrotesk');
  });

  it('should use MUI Paper as root container', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const clinicalCase = createCaseWithResults(images, results, []);

    const { container } = renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(container.querySelector('.MuiPaper-root')).toBeInTheDocument();
  });

  it('should render the step title "Review Findings"', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1')];
    const clinicalCase = createCaseWithResults(images, results, []);

    renderWithTheme(
      <FindingsReviewStep
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText(/review findings/i)).toBeInTheDocument();
  });
});
