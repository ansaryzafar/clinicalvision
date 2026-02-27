/**
 * WorkflowAnalysisSuite Component Tests — TDD RED Phase
 *
 * Tests for the inline image analysis suite that replaces FindingsReviewStep
 * as the FINDINGS_REVIEW step component. This component provides:
 *
 * 1. Multi-image tab navigator with view labels and status indicators
 * 2. Inline MedicalViewer with AI overlay (attention map, suspicious regions)
 * 3. Collapsed findings sidebar (per-image BI-RADS, regions, confidence)
 * 4. "Open Fullscreen Suite" button → AnalysisSuite overlay (z-index 1300)
 * 5. Data mapping: ImageAnalysisResult → MedicalViewer props & InferenceResponse
 * 6. Navigation (Back / Continue) buttons
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import {
  WorkflowAnalysisSuite,
  mapToViewerRegions,
  buildInferenceResponse,
} from '../WorkflowAnalysisSuite';
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
  SuspiciousRegion as DomainSuspiciousRegion,
  UncertaintyInfo,
  ImageDimensionMetadata,
} from '../../../types/case.types';
import { SuspiciousRegion as ApiSuspiciousRegion } from '../../../services/api';

// ============================================================================
// MOCKS
// ============================================================================

// Mock MedicalViewer — we don't need full canvas rendering
jest.mock('../../viewer/MedicalViewer', () => ({
  MedicalViewer: (props: Record<string, unknown>) => (
    <div
      data-testid="medical-viewer"
      data-image-url={props.imageUrl as string}
      data-has-attention-map={String(Boolean(props.attentionMap))}
      data-regions-count={String(
        Array.isArray(props.suspiciousRegions)
          ? (props.suspiciousRegions as unknown[]).length
          : 0
      )}
    >
      MedicalViewer
    </div>
  ),
}));

// Mock AnalysisSuite — fullscreen overlay (captures props for assertion)
let capturedAnalysisSuiteProps: Record<string, unknown> = {};
jest.mock('../../viewer/AnalysisSuite', () => ({
  AnalysisSuite: (props: Record<string, unknown>) => {
    capturedAnalysisSuiteProps = props;
    return (
      <div data-testid="analysis-suite-overlay">
        AnalysisSuite Fullscreen
        {props.imageUrl && <span data-testid="suite-image-url">{String(props.imageUrl)}</span>}
        <button onClick={props.onClose as () => void}>Close Suite</button>
      </div>
    );
  },
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

const theme = createTheme();

beforeEach(() => {
  capturedAnalysisSuiteProps = {};
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </MemoryRouter>
  );
}

function createMockImage(
  id: string,
  viewType: ViewType,
  laterality: Laterality
): MammogramImage {
  return {
    id,
    filename: `${laterality}_${viewType}.png`,
    fileSize: 1024 * 1024,
    mimeType: 'image/png',
    localUrl: `blob:http://localhost/${id}`,
    viewType,
    laterality,
    uploadStatus: 'uploaded',
  } as unknown as MammogramImage;
}

function createMockAnalysisResult(
  imageId: string,
  prediction: 'benign' | 'malignant' = 'benign',
  confidence: number = 0.85,
  options: {
    attentionMap?: number[][];
    suspiciousRegions?: DomainSuspiciousRegion[];
    uncertainty?: UncertaintyInfo;
    imageMetadata?: ImageDimensionMetadata;
    confidenceExplanation?: string;
  } = {}
): ImageAnalysisResult {
  return {
    imageId,
    prediction,
    confidence,
    probabilities: {
      benign: prediction === 'benign' ? confidence : 1 - confidence,
      malignant: prediction === 'malignant' ? confidence : 1 - confidence,
    },
    riskLevel:
      confidence > 0.7
        ? prediction === 'malignant'
          ? 'high'
          : 'low'
        : 'moderate',
    suspiciousRegions: options.suspiciousRegions ?? [],
    attentionMap: options.attentionMap,
    uncertainty: options.uncertainty,
    imageMetadata: options.imageMetadata,
    confidenceExplanation: options.confidenceExplanation,
    modelVersion: 'v2.1.0',
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
    visibleInViews: ['img-1'],
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
    clinicalHistory: {
      ...EMPTY_CLINICAL_HISTORY,
      clinicalIndication: 'Screening',
    },
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

// Standard 4-view test data
function createStandard4ViewCase() {
  const images = [
    createMockImage('img-rcc', ViewType.CC, Laterality.RIGHT),
    createMockImage('img-lcc', ViewType.CC, Laterality.LEFT),
    createMockImage('img-rmlo', ViewType.MLO, Laterality.RIGHT),
    createMockImage('img-lmlo', ViewType.MLO, Laterality.LEFT),
  ];

  const mockAttentionMap = [
    [0.1, 0.2],
    [0.8, 0.9],
  ];

  const results = [
    createMockAnalysisResult('img-rcc', 'benign', 0.92, {
      attentionMap: mockAttentionMap,
      suspiciousRegions: [
        {
          bbox: [10, 20, 50, 60],
          attentionScore: 0.3,
          description: 'Low-concern area',
        },
      ],
    }),
    createMockAnalysisResult('img-lcc', 'malignant', 0.78, {
      attentionMap: mockAttentionMap,
      suspiciousRegions: [
        {
          bbox: [30, 40, 70, 80],
          attentionScore: 0.85,
          description: 'High-concern mass',
        },
      ],
    }),
    createMockAnalysisResult('img-rmlo', 'benign', 0.95),
    createMockAnalysisResult('img-lmlo', 'benign', 0.88),
  ];

  const findings = [
    createMockFinding({
      id: 'f-1',
      laterality: Laterality.LEFT,
      findingType: FindingType.MASS,
      aiConfidence: 0.85,
      individualBiRads: '4A',
      visibleInViews: ['img-lcc', 'img-lmlo'],
    }),
  ];

  return createCaseWithResults(images, results, findings);
}

// ============================================================================
// UNIT TESTS: Data Mapping Functions
// ============================================================================

describe('mapToViewerRegions — domain→API region mapping', () => {
  it('should map camelCase domain SuspiciousRegion to snake_case API format', () => {
    const domainRegions: DomainSuspiciousRegion[] = [
      {
        bbox: [10, 20, 50, 60],
        attentionScore: 0.85,
        description: 'Suspicious mass',
      },
    ];

    const apiRegions = mapToViewerRegions(domainRegions);

    expect(apiRegions).toHaveLength(1);
    expect(apiRegions[0].bbox).toEqual([10, 20, 50, 60]);
    expect(apiRegions[0].attention_score).toBe(0.85);
    expect(apiRegions[0].location).toBe('Suspicious mass');
  });

  it('should handle empty regions array', () => {
    expect(mapToViewerRegions([])).toEqual([]);
  });

  it('should handle undefined regions', () => {
    expect(mapToViewerRegions(undefined)).toEqual([]);
  });

  it('should map missing description to empty string location', () => {
    const regions: DomainSuspiciousRegion[] = [
      { bbox: [0, 0, 10, 10], attentionScore: 0.5 },
    ];
    const mapped = mapToViewerRegions(regions);
    expect(mapped[0].location).toBe('');
  });

  it('should preserve bbox tuple values exactly', () => {
    const regions: DomainSuspiciousRegion[] = [
      { bbox: [100, 200, 300, 400], attentionScore: 0.99 },
    ];
    const mapped = mapToViewerRegions(regions);
    expect(mapped[0].bbox).toEqual([100, 200, 300, 400]);
    expect(mapped[0].bbox).toHaveLength(4);
  });
});

describe('buildInferenceResponse — ImageAnalysisResult→InferenceResponse', () => {
  it('should reconstruct a valid InferenceResponse from domain data', () => {
    const result = createMockAnalysisResult('img-1', 'malignant', 0.87, {
      attentionMap: [[0.5, 0.6]],
      suspiciousRegions: [
        {
          bbox: [10, 20, 30, 40],
          attentionScore: 0.9,
          description: 'Mass',
        },
      ],
      confidenceExplanation: 'High model certainty',
      uncertainty: {
        epistemicUncertainty: 0.02,
        predictiveEntropy: 0.1,
        requiresHumanReview: false,
      },
      imageMetadata: {
        originalWidth: 3000,
        originalHeight: 4000,
        modelWidth: 224,
        modelHeight: 224,
        scaleX: 13.39,
        scaleY: 17.86,
        aspectRatio: 0.75,
        coordinateSystem: 'model',
      },
    });

    const response = buildInferenceResponse(result);

    // Core fields
    expect(response.prediction).toBe('malignant');
    expect(response.confidence).toBe(0.87);
    expect(response.probabilities.malignant).toBeCloseTo(0.87);
    expect(response.risk_level).toBe('high');

    // Explanation
    expect(response.explanation.attention_map).toEqual([[0.5, 0.6]]);
    expect(response.explanation.suspicious_regions).toHaveLength(1);
    expect(response.explanation.suspicious_regions[0].attention_score).toBe(0.9);
    expect(response.explanation.confidence_explanation).toBe('High model certainty');

    // Uncertainty
    expect(response.uncertainty.epistemic_uncertainty).toBe(0.02);
    expect(response.uncertainty.predictive_entropy).toBe(0.1);
    expect(response.uncertainty.requires_human_review).toBe(false);

    // Image metadata
    expect(response.image_metadata?.original_width).toBe(3000);
    expect(response.image_metadata?.scale_x).toBeCloseTo(13.39);

    // Model version
    expect(response.model_version).toBe('v2.1.0');
  });

  it('should handle minimal result without optional fields', () => {
    const result = createMockAnalysisResult('img-1', 'benign', 0.95);
    const response = buildInferenceResponse(result);

    expect(response.prediction).toBe('benign');
    expect(response.confidence).toBe(0.95);
    expect(response.explanation.attention_map).toBeUndefined();
    expect(response.explanation.suspicious_regions).toEqual([]);
    expect(response.image_metadata).toBeUndefined();
  });

  it('should map domain SuspiciousRegion to API format in explanation', () => {
    const result = createMockAnalysisResult('img-1', 'benign', 0.9, {
      suspiciousRegions: [
        {
          bbox: [5, 10, 15, 20],
          attentionScore: 0.7,
          description: 'Calcification cluster',
        },
      ],
    });
    const response = buildInferenceResponse(result);
    const apiRegion = response.explanation.suspicious_regions[0];

    expect(apiRegion.bbox).toEqual([5, 10, 15, 20]);
    expect(apiRegion.attention_score).toBe(0.7);
    expect(apiRegion.location).toBe('Calcification cluster');
  });
});

// ============================================================================
// COMPONENT TESTS: Multi-Image Tab Navigator
// ============================================================================

describe('WorkflowAnalysisSuite — Tab Navigator', () => {
  it('should render a tab for each image with view label (e.g. RCC, LCC)', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    expect(screen.getByRole('tab', { name: /RCC/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /LCC/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /RMLO/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /LMLO/i })).toBeInTheDocument();
  });

  it('should select the first image tab by default', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    const firstTab = screen.getByRole('tab', { name: /RCC/i });
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should switch the viewer image when a different tab is clicked', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Initially should show first image
    const viewer = screen.getByTestId('medical-viewer');
    expect(viewer).toHaveAttribute(
      'data-image-url',
      'blob:http://localhost/img-rcc'
    );

    // Click LCC tab
    await userEvent.click(screen.getByRole('tab', { name: /LCC/i }));

    const updatedViewer = screen.getByTestId('medical-viewer');
    expect(updatedViewer).toHaveAttribute(
      'data-image-url',
      'blob:http://localhost/img-lcc'
    );
  });

  it('should show status indicator on tabs with malignant findings', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // LCC has malignant prediction — should have a warning indicator
    const lccTab = screen.getByRole('tab', { name: /LCC/i });
    // The tab should contain a warning-colored dot or icon
    const warningIndicator = within(lccTab).getByTestId('status-malignant');
    expect(warningIndicator).toBeInTheDocument();
  });

  it('should show benign indicator on tabs with benign findings', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    const rccTab = screen.getByRole('tab', { name: /RCC/i });
    const benignIndicator = within(rccTab).getByTestId('status-benign');
    expect(benignIndicator).toBeInTheDocument();
  });
});

// ============================================================================
// COMPONENT TESTS: MedicalViewer Integration
// ============================================================================

describe('WorkflowAnalysisSuite — MedicalViewer Integration', () => {
  it('should pass the selected image URL to MedicalViewer', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    const viewer = screen.getByTestId('medical-viewer');
    expect(viewer).toHaveAttribute(
      'data-image-url',
      'blob:http://localhost/img-rcc'
    );
  });

  it('should pass attention map to MedicalViewer when available', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    const viewer = screen.getByTestId('medical-viewer');
    expect(viewer).toHaveAttribute('data-has-attention-map', 'true');
  });

  it('should pass mapped suspicious regions to MedicalViewer', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    const viewer = screen.getByTestId('medical-viewer');
    // First image (RCC) has 1 suspicious region
    expect(viewer).toHaveAttribute('data-regions-count', '1');
  });

  it('should show no attention map for image without one', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Switch to RMLO (no attentionMap)
    await userEvent.click(screen.getByRole('tab', { name: /RMLO/i }));

    const viewer = screen.getByTestId('medical-viewer');
    expect(viewer).toHaveAttribute('data-has-attention-map', 'false');
    expect(viewer).toHaveAttribute('data-regions-count', '0');
  });
});

// ============================================================================
// COMPONENT TESTS: Findings Sidebar
// ============================================================================

describe('WorkflowAnalysisSuite — Findings Sidebar', () => {
  it('should display prediction and confidence for the selected image', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // RCC is selected by default — prediction=benign, confidence=92%
    // Use getAllByText since "Benign" appears in both chip and probabilities
    const benignTexts = screen.getAllByText(/benign/i);
    expect(benignTexts.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/92%/).length).toBeGreaterThan(0);
  });

  it('should display risk level for the selected image', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // RCC has 'low' risk — displayed as a chip "Low"
    // Use getAllByText since 'Low' may appear in other contexts
    const lowTexts = screen.getAllByText(/^Low$/i);
    expect(lowTexts.length).toBeGreaterThan(0);
  });

  it('should list suspicious regions for the selected image', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // RCC has 1 suspicious region with description "Low-concern area"
    expect(screen.getByText(/Low-concern area/i)).toBeInTheDocument();
  });

  it('should update sidebar content when switching tabs', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Switch to LCC (malignant, 78%)
    await userEvent.click(screen.getByRole('tab', { name: /LCC/i }));

    const malignantTexts = screen.getAllByText(/malignant/i);
    expect(malignantTexts.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/78%/).length).toBeGreaterThan(0);
    expect(screen.getByText(/High-concern mass/i)).toBeInTheDocument();
  });

  it('should show "No suspicious regions" when none exist', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Switch to RMLO (no regions)
    await userEvent.click(screen.getByRole('tab', { name: /RMLO/i }));

    expect(screen.getByText(/no suspicious regions/i)).toBeInTheDocument();
  });
});

// ============================================================================
// COMPONENT TESTS: Fullscreen AnalysisSuite Overlay
// ============================================================================

describe('WorkflowAnalysisSuite — Fullscreen Overlay', () => {
  it('should not render AnalysisSuite overlay initially', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    expect(
      screen.queryByTestId('analysis-suite-overlay')
    ).not.toBeInTheDocument();
  });

  it('should have an "Open Fullscreen Suite" button', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /fullscreen|open.*suite/i })
    ).toBeInTheDocument();
  });

  it('should render AnalysisSuite overlay when fullscreen button is clicked', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: /fullscreen|open.*suite/i })
    );

    expect(
      screen.getByTestId('analysis-suite-overlay')
    ).toBeInTheDocument();
  });

  it('should close AnalysisSuite overlay when Close Suite button is clicked', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Open fullscreen
    await userEvent.click(
      screen.getByRole('button', { name: /fullscreen|open.*suite/i })
    );
    expect(
      screen.getByTestId('analysis-suite-overlay')
    ).toBeInTheDocument();

    // Close it
    await userEvent.click(screen.getByText('Close Suite'));
    expect(
      screen.queryByTestId('analysis-suite-overlay')
    ).not.toBeInTheDocument();
  });
});

// ============================================================================
// COMPONENT TESTS: Navigation Buttons
// ============================================================================

describe('WorkflowAnalysisSuite — Navigation', () => {
  it('should render a "Proceed to BI-RADS Assessment" button', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /proceed.*bi-rads|bi-rads.*assessment/i })
    ).toBeInTheDocument();
  });

  it('should call onContinue when the proceed button is clicked', async () => {
    const onContinue = jest.fn();
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={onContinue}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: /proceed.*bi-rads|bi-rads.*assessment/i })
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should render a Back button when onBack is provided', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /back/i })
    ).toBeInTheDocument();
  });

  it('should call onBack when Back button is clicked', async () => {
    const onBack = jest.fn();
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
        onBack={onBack}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should NOT render a Back button when onBack is not provided', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: /^back$/i })
    ).not.toBeInTheDocument();
  });
});

// ============================================================================
// COMPONENT TESTS: Edge Cases
// ============================================================================

describe('WorkflowAnalysisSuite — Edge Cases', () => {
  it('should render gracefully with zero images', () => {
    const clinicalCase = createCaseWithResults([], [], []);
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Should show empty state message
    expect(
      screen.getByText(/no images|no analysis|upload images/i)
    ).toBeInTheDocument();
  });

  it('should render gracefully when image has no matching analysis result', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    // No analysis results at all
    const clinicalCase = createCaseWithResults(images, [], []);
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Should show a tab but with "not analyzed" state
    expect(screen.getByRole('tab', { name: /RCC/i })).toBeInTheDocument();
    expect(screen.getByText(/not analyzed|no results/i)).toBeInTheDocument();
  });

  it('should handle a single image case', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const results = [createMockAnalysisResult('img-1', 'benign', 0.95)];
    const clinicalCase = createCaseWithResults(images, results, []);
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    expect(screen.getByRole('tab', { name: /RCC/i })).toBeInTheDocument();
    expect(screen.getByTestId('medical-viewer')).toBeInTheDocument();
    // 95% appears in both confidence chip and probabilities
    expect(screen.getAllByText(/95%/).length).toBeGreaterThan(0);
  });

  it('should render the component title "Image Analysis"', () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    expect(screen.getByText('Image Analysis')).toBeInTheDocument();
  });
});

// ============================================================================
// P0 FIX: Fullscreen AnalysisSuite must receive imageUrl
// ============================================================================

describe('WorkflowAnalysisSuite — P0: Fullscreen imageUrl', () => {
  it('should pass imageUrl (selectedImage.localUrl) to AnalysisSuite when fullscreen opens', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Open fullscreen
    await userEvent.click(
      screen.getByRole('button', { name: /fullscreen|open.*suite/i })
    );

    // The first image (RCC) should have its localUrl passed
    expect(capturedAnalysisSuiteProps.imageUrl).toBe('blob:http://localhost/img-rcc');
  });

  it('should update imageUrl when user switches tabs then opens fullscreen', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    // Switch to second tab (LCC)
    await userEvent.click(screen.getByRole('tab', { name: /LCC/i }));

    // Open fullscreen
    await userEvent.click(
      screen.getByRole('button', { name: /fullscreen|open.*suite/i })
    );

    // LCC image's localUrl should be passed
    expect(capturedAnalysisSuiteProps.imageUrl).toBe('blob:http://localhost/img-lcc');
  });

  it('should still pass analysisResults to AnalysisSuite in fullscreen mode', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: /fullscreen|open.*suite/i })
    );

    // analysisResults should be a non-null InferenceResponse
    expect(capturedAnalysisSuiteProps.analysisResults).toBeTruthy();
    const results = capturedAnalysisSuiteProps.analysisResults as Record<string, unknown>;
    expect(results.prediction).toBe('benign');
    expect(results.confidence).toBe(0.92);
  });

  it('should render the fullscreen imageUrl in the suite mock', async () => {
    const clinicalCase = createStandard4ViewCase();
    renderWithProviders(
      <WorkflowAnalysisSuite
        clinicalCase={clinicalCase}
        onContinue={jest.fn()}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: /fullscreen|open.*suite/i })
    );

    // Our mock renders imageUrl as a visible span
    const urlElement = screen.getByTestId('suite-image-url');
    expect(urlElement).toHaveTextContent('blob:http://localhost/img-rcc');
  });
});
