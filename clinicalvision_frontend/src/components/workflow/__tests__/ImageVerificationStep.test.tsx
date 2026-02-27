/**
 * ImageVerificationStep Component Tests - P2 TDD
 *
 * Replaces the PlaceholderStep for IMAGE_VERIFICATION with a real component
 * that shows uploaded image thumbnails, displays view type + laterality labels,
 * allows reassignment via dropdowns, checks completeness (standard 4-view set),
 * and has Back / Continue buttons.
 *
 * Test Categories:
 * 1. Rendering — thumbnails, labels, layout
 * 2. Completeness warnings
 * 3. View type & laterality reassignment
 * 4. Navigation (Back / Continue)
 * 5. Edge cases (0 images, duplicates)
 *
 * @module ImageVerificationStep.test
 */

import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import {
  ClinicalCase,
  MammogramImage,
  ViewType,
  Laterality,
  ClinicalWorkflowStep,
  STANDARD_VIEWS,
} from '../../../types/case.types';

// ============================================================================
// MOCK CONTEXT
// ============================================================================

const mockUpdateImage = jest.fn();
const mockRemoveImage = jest.fn();
let mockCurrentCase: ClinicalCase | null = null;

jest.mock('../../../contexts/ClinicalCaseContext', () => ({
  useClinicalCase: () => ({
    currentCase: mockCurrentCase,
    updateImage: mockUpdateImage,
    removeImage: mockRemoveImage,
    // stubs so component doesn't blow up if it destructures more
    addImage: jest.fn(),
    advanceWorkflow: jest.fn(),
    goBackToStep: jest.fn(),
    createCase: jest.fn(),
    loadCase: jest.fn(),
    clearCurrentCase: jest.fn(),
    finalizeCase: jest.fn(),
    updatePatientInfo: jest.fn(),
    updateClinicalHistory: jest.fn(),
    getWorkflowProgress: jest.fn().mockReturnValue(30),
    isStepCompleted: jest.fn().mockReturnValue(false),
    isAtFinalStep: jest.fn().mockReturnValue(false),
    isFinalized: jest.fn().mockReturnValue(false),
    clearError: jest.fn(),
    userId: 'test-user',
    isLoading: false,
    error: null,
  }),
}));

// Import component (will be created)
import { ImageVerificationStep } from '../ImageVerificationStep';

// ============================================================================
// HELPERS
// ============================================================================

function createMockImage(
  id: string,
  viewType: ViewType,
  laterality: Laterality,
  filename?: string,
): MammogramImage {
  return {
    id,
    filename: filename ?? `${laterality}${viewType}.dcm`,
    fileSize: 1024000,
    mimeType: 'application/dicom',
    localUrl: `blob:http://localhost/${id}`,
    viewType,
    laterality,
    uploadStatus: 'uploaded',
  };
}

function makeCase(images: MammogramImage[]): ClinicalCase {
  return {
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
      clinicalIndication: 'Screening mammogram',
      familyHistoryBreastCancer: false,
      personalHistoryBreastCancer: false,
      previousBiopsy: false,
      comparisonAvailable: false,
    },
    images,
    analysisResults: [],
    consolidatedFindings: [],
    workflow: {
      currentStep: ClinicalWorkflowStep.IMAGE_VERIFICATION,
      completedSteps: [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
        ClinicalWorkflowStep.IMAGE_UPLOAD,
      ],
      status: 'in_progress',
      startedAt: '2026-01-01T00:00:00Z',
      lastModifiedAt: '2026-01-01T01:00:00Z',
      isLocked: false,
    },
    audit: {
      createdBy: 'test-user',
      createdAt: '2026-01-01T00:00:00Z',
      modifications: [],
    },
  };
}

const full4ViewImages: MammogramImage[] = [
  createMockImage('img-rcc',  ViewType.CC,  Laterality.RIGHT, 'RCC.dcm'),
  createMockImage('img-lcc',  ViewType.CC,  Laterality.LEFT,  'LCC.dcm'),
  createMockImage('img-rmlo', ViewType.MLO, Laterality.RIGHT, 'RMLO.dcm'),
  createMockImage('img-lmlo', ViewType.MLO, Laterality.LEFT,  'LMLO.dcm'),
];

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

const mockOnBack = jest.fn();
const mockOnContinue = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentCase = makeCase(full4ViewImages);
  // Make updateImage return success by default
  mockUpdateImage.mockReturnValue({ ok: true, value: mockCurrentCase });
  mockRemoveImage.mockReturnValue({ ok: true, value: mockCurrentCase });
});

function renderStep(overrides?: { onBack?: jest.Mock; onContinue?: jest.Mock }) {
  return render(
    <ImageVerificationStep
      onBack={overrides?.onBack ?? mockOnBack}
      onContinue={overrides?.onContinue ?? mockOnContinue}
    />,
  );
}

// ============================================================================
// 1. RENDERING
// ============================================================================

describe('ImageVerificationStep — Rendering', () => {
  it('should render a heading / title containing "Verify"', () => {
    renderStep();
    expect(screen.getByText(/verify/i)).toBeInTheDocument();
  });

  it('should render a thumbnail for each uploaded image', () => {
    renderStep();
    const thumbnails = screen.getAllByRole('img');
    expect(thumbnails.length).toBe(4);
  });

  it('should show the composite label (e.g. "R-CC") for every image', () => {
    renderStep();
    expect(screen.getByText(/R-CC/i)).toBeInTheDocument();
    expect(screen.getByText(/L-CC/i)).toBeInTheDocument();
    expect(screen.getByText(/R-MLO/i)).toBeInTheDocument();
    expect(screen.getByText(/L-MLO/i)).toBeInTheDocument();
  });

  it('should render filename text for each image', () => {
    renderStep();
    expect(screen.getByText(/RCC\.dcm/i)).toBeInTheDocument();
    expect(screen.getByText(/LCC\.dcm/i)).toBeInTheDocument();
    expect(screen.getByText(/RMLO\.dcm/i)).toBeInTheDocument();
    expect(screen.getByText(/LMLO\.dcm/i)).toBeInTheDocument();
  });

  it('should render Back and Continue buttons', () => {
    renderStep();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });
});

// ============================================================================
// 2. COMPLETENESS WARNINGS
// ============================================================================

describe('ImageVerificationStep — Completeness', () => {
  it('should show a success indicator when all 4 standard views are present', () => {
    renderStep();
    expect(screen.getByText(/complete/i)).toBeInTheDocument();
  });

  it('should show a warning when a standard view is missing', () => {
    // Only R-CC and L-CC  ⇒ missing R-MLO and L-MLO
    mockCurrentCase = makeCase([
      createMockImage('img-rcc', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-lcc', ViewType.CC, Laterality.LEFT),
    ]);
    renderStep();
    expect(screen.getByText(/missing/i)).toBeInTheDocument();
    expect(screen.getByText(/R-MLO/i)).toBeInTheDocument();
    expect(screen.getByText(/L-MLO/i)).toBeInTheDocument();
  });

  it('should list all missing views when only 1 image uploaded', () => {
    mockCurrentCase = makeCase([
      createMockImage('img-rcc', ViewType.CC, Laterality.RIGHT),
    ]);
    renderStep();
    // 3 of 4 standard views should be listed as missing
    const missingSection = screen.getByText(/missing/i).closest('div')!;
    expect(missingSection).toBeInTheDocument();
  });

  it('should NOT block Continue when views are missing (only warns)', () => {
    mockCurrentCase = makeCase([
      createMockImage('img-rcc', ViewType.CC, Laterality.RIGHT),
    ]);
    renderStep();
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });
});

// ============================================================================
// 3. VIEW TYPE & LATERALITY REASSIGNMENT
// ============================================================================

describe('ImageVerificationStep — Reassignment', () => {
  it('should provide a ViewType select for each image', () => {
    renderStep();
    // Each image card should have a view type selector
    const viewSelectors = screen.getAllByLabelText(/view type/i);
    expect(viewSelectors.length).toBe(4);
  });

  it('should provide a Laterality select for each image', () => {
    renderStep();
    const lateralitySelectors = screen.getAllByLabelText(/laterality/i);
    expect(lateralitySelectors.length).toBe(4);
  });

  it('should call updateImage when user changes a view type', () => {
    renderStep();
    const viewSelectors = screen.getAllByLabelText(/view type/i);
    // Native <select> — use fireEvent.change
    fireEvent.change(viewSelectors[0], { target: { value: ViewType.MLO } });
    expect(mockUpdateImage).toHaveBeenCalledWith(
      'img-rcc',
      expect.objectContaining({ viewType: ViewType.MLO }),
    );
  });

  it('should call updateImage when user changes laterality', () => {
    renderStep();
    const lateralitySelectors = screen.getAllByLabelText(/laterality/i);
    fireEvent.change(lateralitySelectors[0], { target: { value: Laterality.LEFT } });
    expect(mockUpdateImage).toHaveBeenCalledWith(
      'img-rcc',
      expect.objectContaining({ laterality: Laterality.LEFT }),
    );
  });
});

// ============================================================================
// 4. NAVIGATION
// ============================================================================

describe('ImageVerificationStep — Navigation', () => {
  it('should call onBack when Back button is clicked', async () => {
    renderStep();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('should call onContinue when Continue button is clicked', async () => {
    renderStep();
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('should disable Continue when no images are present', () => {
    mockCurrentCase = makeCase([]);
    renderStep();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });
});

// ============================================================================
// 5. EDGE CASES
// ============================================================================

describe('ImageVerificationStep — Edge Cases', () => {
  it('should render empty state when no images exist', () => {
    mockCurrentCase = makeCase([]);
    renderStep();
    expect(screen.getByText(/no images/i)).toBeInTheDocument();
  });

  it('should handle extra (non-standard) view types gracefully', () => {
    mockCurrentCase = makeCase([
      ...full4ViewImages,
      createMockImage('img-spot', ViewType.SPOT, Laterality.RIGHT, 'SPOT_R.dcm'),
    ]);
    renderStep();
    const thumbnails = screen.getAllByRole('img');
    expect(thumbnails.length).toBe(5);
  });

  it('should render when currentCase is null', () => {
    mockCurrentCase = null;
    renderStep();
    // Should not crash, shows empty state or message
    expect(screen.getByText(/no case|no images/i)).toBeInTheDocument();
  });
});
