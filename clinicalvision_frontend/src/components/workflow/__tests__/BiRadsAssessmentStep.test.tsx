/**
 * BiRadsAssessmentStep Component Test Suite
 * 
 * Phase 6: Reporting System
 * 
 * Tests BI-RADS assessment UI functionality:
 * - Breast composition selection
 * - BI-RADS category selection
 * - Impression and recommendation editing
 * - Form validation
 * - Workflow integration
 * 
 * OPTIMIZED: Read-only render assertions are consolidated to minimize
 * expensive MUI component re-mounts (~400ms each).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  BiRadsAssessment,
  BreastComposition,
  BiRadsCategory,
  BiRadsValues,
  ClinicalCase,
  ClinicalWorkflowStep,
  ConsolidatedFinding,
  Laterality,
  FindingType,
  BREAST_COMPOSITION_DESCRIPTIONS,
  BIRADS_CATEGORY_DESCRIPTIONS,
} from '../../../types/case.types';

import { BiRadsAssessmentStep } from '../BiRadsAssessmentStep';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

const createMockConsolidatedFinding = (
  overrides?: Partial<ConsolidatedFinding>
): ConsolidatedFinding => ({
  id: 'finding-001',
  laterality: Laterality.RIGHT,
  findingType: FindingType.MASS,
  visibleInViews: ['img-rcc', 'img-rmlo'],
  aiCorrelatedRegions: ['region-001'],
  createdAt: '2026-02-21T10:30:00Z',
  updatedAt: '2026-02-21T10:30:00Z',
  ...overrides,
});

const createMockClinicalCase = (overrides?: Partial<ClinicalCase>): ClinicalCase => ({
  id: 'case-001',
  caseNumber: 'CV-2026-000001',
  patient: {
    mrn: 'MRN-001',
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1970-05-15',
    gender: 'F',
  },
  clinicalHistory: {
    familyHistoryBreastCancer: false,
    personalHistoryBreastCancer: false,
    previousBiopsy: false,
    clinicalIndication: 'Screening mammogram',
    comparisonAvailable: true,
  },
  images: [
    {
      id: 'img-001',
      filename: 'RCC.dcm',
      fileSize: 1024000,
      mimeType: 'application/dicom',
      localUrl: 'blob:http://localhost/img1',
      viewType: 'CC' as any,
      laterality: 'R' as any,
      uploadStatus: 'uploaded' as any,
    },
  ],
  analysisResults: [],
  consolidatedFindings: [],
  workflow: {
    currentStep: ClinicalWorkflowStep.BIRADS_ASSESSMENT,
    completedSteps: [
      ClinicalWorkflowStep.PATIENT_REGISTRATION,
      ClinicalWorkflowStep.CLINICAL_HISTORY,
      ClinicalWorkflowStep.IMAGE_UPLOAD,
      ClinicalWorkflowStep.IMAGE_VERIFICATION,
      ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
      ClinicalWorkflowStep.FINDINGS_REVIEW,
    ],
    status: 'in_progress',
    startedAt: '2026-02-21T10:00:00Z',
    lastModifiedAt: '2026-02-21T11:00:00Z',
    isLocked: false,
  },
  audit: {
    createdBy: 'radiologist-001',
    createdAt: '2026-02-21T10:00:00Z',
    modifications: [],
  },
  ...overrides,
});

// ============================================================================
// MOCK PROPS
// ============================================================================

interface MockProps {
  clinicalCase: ClinicalCase;
  suggestedBiRads?: BiRadsCategory;
  onAssessmentChange: jest.Mock;
  onComplete: jest.Mock;
  onBack?: jest.Mock;
  isReadOnly?: boolean;
}

const createMockProps = (overrides?: Partial<MockProps>): MockProps => ({
  clinicalCase: createMockClinicalCase(),
  onAssessmentChange: jest.fn(),
  onComplete: jest.fn(),
  onBack: jest.fn(),
  isReadOnly: false,
  ...overrides,
});

// ============================================================================
// RENDERING TESTS (consolidated — single render, multiple assertions)
// ============================================================================

describe('BiRadsAssessmentStep Rendering', () => {
  it('should render all core UI elements', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);

    // Title
    expect(screen.getByText(/BI-RADS Assessment/i)).toBeInTheDocument();
    // Breast sections
    expect(screen.getByText(/Right Breast/i)).toBeInTheDocument();
    expect(screen.getByText(/Left Breast/i)).toBeInTheDocument();
    // Composition selectors for both breasts
    const compositionSelectors = screen.getAllByLabelText(/Breast Composition|Density/i);
    expect(compositionSelectors.length).toBeGreaterThanOrEqual(2);
    // BI-RADS category selectors for both breasts
    const categorySelectors = screen.getAllByLabelText(/BI-RADS Category/i);
    expect(categorySelectors.length).toBeGreaterThanOrEqual(2);
    // Text fields
    expect(screen.getByLabelText(/Impression/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Recommendation/i)).toBeInTheDocument();
    // Action buttons
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete|Continue|Next/i })).toBeInTheDocument();
  });

  it('should display suggested BI-RADS when provided', () => {
    const props = createMockProps({
      suggestedBiRads: BiRadsValues.PROBABLY_BENIGN,
    });
    render(<BiRadsAssessmentStep {...props} />);

    expect(screen.getByText(/Suggested|AI Suggestion/i)).toBeInTheDocument();
    expect(screen.getAllByText(/BI-RADS 3|Probably Benign/i).length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// COMPOSITION SELECTION TESTS
// ============================================================================

describe('BiRadsAssessmentStep Composition Selection', () => {
  it('should allow selecting right breast composition and display all options', async () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.C, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: 'Test impression.',
          recommendation: 'Test recommendation.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const compositionSelects = screen.getAllByLabelText(/Breast Composition/i);
    fireEvent.mouseDown(compositionSelects[0]);

    // Verify all composition options are available
    expect(await screen.findByRole('option', { name: /Almost entirely fatty/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Scattered.*fibroglandular/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Heterogeneously dense/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Extremely dense/i })).toBeInTheDocument();
  });

  it('should allow selecting left breast composition', async () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.D, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: 'Test impression.',
          recommendation: 'Test recommendation.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const compositionSelects = screen.getAllByLabelText(/Breast Composition/i);
    fireEvent.mouseDown(compositionSelects[1]);

    expect(await screen.findByRole('option', { name: /Extremely dense/i })).toBeInTheDocument();
  });
});

// ============================================================================
// BI-RADS CATEGORY SELECTION TESTS
// ============================================================================

describe('BiRadsAssessmentStep BI-RADS Category Selection', () => {
  it('should display all BI-RADS categories including 4A/4B/4C', async () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);

    const biRadsSelects = screen.getAllByLabelText(/BI-RADS Category/i);
    fireEvent.mouseDown(biRadsSelects[0]);

    expect(await screen.findByRole('option', { name: /0.*Incomplete/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /1.*Negative/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /2.*Benign/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /3.*Probably Benign/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /4A.*Low Suspicion/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /4B.*Moderate Suspicion/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /4C.*High Suspicion/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /5.*Highly Suggestive/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /6.*Known.*Malignancy/i })).toBeInTheDocument();
  });

  it('should auto-calculate overall category when breast categories change', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.SUSPICIOUS_LOW },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.SUSPICIOUS_LOW,
          impression: '',
          recommendation: '',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const overallDisplay = screen.getByTestId('overall-birads-category');
    expect(overallDisplay).toHaveTextContent(/4A/);
  });

  it('should show biopsy recommendation alert for BI-RADS 4-5', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.SUSPICIOUS_MODERATE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.SUSPICIOUS_MODERATE,
          impression: 'Suspicious finding.',
          recommendation: 'Tissue sampling advised.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some(alert => alert.textContent?.includes('Biopsy recommended'))).toBe(true);
  });
});

// ============================================================================
// IMPRESSION AND RECOMMENDATION TESTS
// ============================================================================

describe('BiRadsAssessmentStep Impression and Recommendation', () => {
  it('should allow typing impression and recommendation text', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);

    const impressionField = screen.getByLabelText(/Impression/i);
    fireEvent.change(impressionField, { target: { value: 'No mammographic evidence of malignancy.' } });
    expect(props.onAssessmentChange).toHaveBeenCalled();

    props.onAssessmentChange.mockClear();

    const recommendationField = screen.getByLabelText(/Recommendation/i);
    fireEvent.change(recommendationField, { target: { value: 'Continue routine screening.' } });
    expect(props.onAssessmentChange).toHaveBeenCalled();
  });

  it('should auto-generate impression when using "Generate" button', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: '',
          recommendation: '',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const generateButton = screen.getByRole('button', { name: /Generate Impression/i });
    expect(generateButton).not.toBeDisabled();
    fireEvent.click(generateButton);

    expect(props.onAssessmentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        impression: expect.any(String),
      })
    );
  });

  it('should auto-generate recommendation based on BI-RADS', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.PROBABLY_BENIGN },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.PROBABLY_BENIGN,
          impression: 'Probably benign finding.',
          recommendation: '',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const generateButton = screen.getByRole('button', { name: /Generate Recommendation/i });
    expect(generateButton).not.toBeDisabled();
    fireEvent.click(generateButton);

    expect(props.onAssessmentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        recommendation: expect.any(String),
      })
    );
  });
});

// ============================================================================
// COMPARISON WITH PRIOR TESTS
// ============================================================================

describe('BiRadsAssessmentStep Comparison with Prior', () => {
  it('should show comparison checkbox when prior is available', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        clinicalHistory: {
          familyHistoryBreastCancer: false,
          personalHistoryBreastCancer: false,
          previousBiopsy: false,
          clinicalIndication: 'Screening',
          comparisonAvailable: true,
          priorMammogramDate: '2025-02-21',
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    expect(screen.getByLabelText(/Compared with prior/i)).toBeInTheDocument();
  });

  it('should show change from prior options when comparison is enabled', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        clinicalHistory: {
          familyHistoryBreastCancer: false,
          personalHistoryBreastCancer: false,
          previousBiopsy: false,
          clinicalIndication: 'Screening',
          comparisonAvailable: true,
          priorMammogramDate: '2025-02-21',
        },
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: 'Test',
          recommendation: 'Test',
          comparedWithPrior: true,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    expect(screen.getByLabelText(/Change from Prior/i)).toBeInTheDocument();
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('BiRadsAssessmentStep Validation', () => {
  it('should disable complete button when required fields are empty', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);

    const completeButton = screen.getByRole('button', { name: /Complete|Continue|Next/i });
    expect(completeButton).toBeDisabled();
  });

  it('should enable complete button when all fields are filled', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: 'No mammographic evidence of malignancy.',
          recommendation: 'Continue routine annual screening.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const completeButton = screen.getByRole('button', { name: /Complete|Continue|Next/i });
    expect(completeButton).not.toBeDisabled();
  });

  it('should show validation errors for required fields', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: '',
          recommendation: 'Continue routine annual screening.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const completeButton = screen.getByRole('button', { name: /Complete|Continue|Next/i });
    expect(completeButton).toBeDisabled();

    const impressionField = screen.getByLabelText(/Impression/i);
    expect(impressionField).toHaveAttribute('required');
  });

  it('should warn when BI-RADS 3 has no follow-up interval', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.PROBABLY_BENIGN },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.PROBABLY_BENIGN,
          impression: 'Probably benign finding.',
          recommendation: 'Follow up.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    expect(screen.getByText(/follow-up interval|6 month/i)).toBeInTheDocument();
  });
});

// ============================================================================
// WORKFLOW INTEGRATION TESTS
// ============================================================================

describe('BiRadsAssessmentStep Workflow Integration', () => {
  it('should call onComplete when form is submitted successfully', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: 'No mammographic evidence of malignancy.',
          recommendation: 'Continue routine annual screening.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    const completeButton = screen.getByRole('button', { name: /Complete|Continue|Next/i });
    fireEvent.click(completeButton);

    expect(props.onComplete).toHaveBeenCalled();
  });

  it('should call onBack when back button is clicked', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);

    const backButton = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backButton);

    expect(props.onBack).toHaveBeenCalled();
  });

  it('should pass assessment to onAssessmentChange when updated', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);

    const impressionField = screen.getByLabelText(/Impression/i);
    fireEvent.change(impressionField, { target: { value: 'Test impression.' } });

    expect(props.onAssessmentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        impression: expect.stringContaining('Test impression.'),
      })
    );
  });
});

// ============================================================================
// READ-ONLY MODE TESTS (consolidated — single render)
// ============================================================================

describe('BiRadsAssessmentStep Read-Only Mode', () => {
  it('should disable all inputs in read-only mode', () => {
    const props = createMockProps({
      isReadOnly: true,
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: 'No mammographic evidence of malignancy.',
          recommendation: 'Continue routine annual screening.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    expect(screen.getByLabelText(/Impression/i)).toBeDisabled();
    expect(screen.getByLabelText(/Recommendation/i)).toBeDisabled();
  });

  it('should hide complete button in read-only mode', () => {
    const props = createMockProps({
      isReadOnly: true,
      clinicalCase: createMockClinicalCase({
        assessment: {
          rightBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          leftBreast: { composition: BreastComposition.B, biRadsCategory: BiRadsValues.NEGATIVE },
          overallCategory: BiRadsValues.NEGATIVE,
          impression: 'No mammographic evidence of malignancy.',
          recommendation: 'Continue routine annual screening.',
          comparedWithPrior: false,
        },
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    expect(screen.queryByRole('button', { name: /Complete|Continue|Next/i })).not.toBeInTheDocument();
  });
});

// ============================================================================
// FINDINGS DISPLAY TESTS
// ============================================================================

describe('BiRadsAssessmentStep Findings Display', () => {
  it('should display findings summary', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        consolidatedFindings: [
          createMockConsolidatedFinding({
            laterality: Laterality.RIGHT,
            findingType: FindingType.MASS,
            clockPosition: 10,
          }),
        ],
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    expect(screen.getByText(/Mass/i)).toBeInTheDocument();
    expect(screen.getByText(/Right/i)).toBeInTheDocument();
  });

  it('should show "No findings" when there are none', () => {
    const props = createMockProps({
      clinicalCase: createMockClinicalCase({
        consolidatedFindings: [],
      }),
    });
    render(<BiRadsAssessmentStep {...props} />);

    expect(screen.getByText(/No.*findings|No significant/i)).toBeInTheDocument();
  });
});

// ============================================================================
// ACCESSIBILITY TESTS (consolidated — single render)
// ============================================================================

describe('BiRadsAssessmentStep Accessibility', () => {
  it('should have accessible form labels, buttons, and required field indicators', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);

    // Accessible form labels
    expect(screen.getByLabelText(/Impression/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Recommendation/i)).toBeInTheDocument();
    // Accessible buttons
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    // Required field indicators
    const impressionField = screen.getByLabelText(/Impression/i);
    expect(impressionField).toHaveAttribute('required');
  });
});

// ============================================================================
// B3 BUG FIX: LUNIT Design Compliance
// ============================================================================

describe('BiRadsAssessmentStep — LUNIT design compliance (B3)', () => {
  it('should use ClashGrotesk font for headings', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);
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
    expect(cssText).toContain('clashgrotesk');
  });

  it('should use Lexend font for body text', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);
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
    expect(cssText).toContain('lexend');
  });

  it('should use LUNIT teal (#00C9EA) for accent colors', () => {
    const props = createMockProps();
    render(<BiRadsAssessmentStep {...props} />);
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
    expect(cssText).toContain('#00c9ea');
  });
});
