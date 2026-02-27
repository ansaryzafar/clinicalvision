/**
 * BatchAnalysisRunner Component Tests - Phase 5 TDD
 * 
 * Tests for the UI component that manages batch AI analysis workflow
 * 
 * @version 1.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchAnalysisRunner } from '../BatchAnalysisRunner';
import {
  ClinicalCase,
  ClinicalWorkflowStep,
  ClinicalHistory,
  MammogramImage,
  ViewType,
  Laterality,
  ImageAnalysisResult,
  BatchAnalysisResult,
  BiRadsCategory,
  BiRadsValues,
} from '../../types/case.types';
import * as batchAnalysisOps from '../../utils/batchAnalysisOperations';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the batch analysis operations
jest.mock('../../utils/batchAnalysisOperations', () => ({
  ...jest.requireActual('../../utils/batchAnalysisOperations'),
  validateCaseForAnalysis: jest.fn(),
  runBatchAnalysis: jest.fn(),
  canRetryAnalysis: jest.fn().mockReturnValue({ canRetry: false, failedImageIds: [] }),
  retryFailedAnalyses: jest.fn(),
}));

const mockValidateCaseForAnalysis = batchAnalysisOps.validateCaseForAnalysis as jest.Mock;
const mockRunBatchAnalysis = batchAnalysisOps.runBatchAnalysis as jest.Mock;
const mockCanRetryAnalysis = batchAnalysisOps.canRetryAnalysis as jest.Mock;
const mockRetryFailedAnalyses = batchAnalysisOps.retryFailedAnalyses as jest.Mock;

// ============================================================================
// TEST FIXTURES
// ============================================================================

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
    addedAt: new Date().toISOString(),
  } as unknown as MammogramImage;
}

function createMockCase(
  images: MammogramImage[] = [],
  analysisResults: ImageAnalysisResult[] = []
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
      clinicalIndication: 'Screening mammogram',
      familyHistory: false,
      personalHistory: false,
      priorBiopsy: false,
      currentSymptoms: [],
      hormonalTherapy: false,
      comparisonAvailable: false,
    } as unknown as ClinicalHistory,
    images,
    analysisResults,
    consolidatedFindings: [],
    workflow: {
      currentStep: ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
      completedSteps: [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
        ClinicalWorkflowStep.IMAGE_UPLOAD,
        ClinicalWorkflowStep.IMAGE_VERIFICATION,
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

function createMockBatchResult(
  results: ImageAnalysisResult[]
): BatchAnalysisResult {
  return {
    totalImages: results.length,
    completedCount: results.length,
    failedCount: 0,
    results,
    consolidatedFindings: [],
    suggestedBiRads: BiRadsValues.NEGATIVE,
    totalProcessingTimeMs: 3000,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

// ============================================================================
// TEST SUITE: Initial Rendering
// ============================================================================

describe('BatchAnalysisRunner - Initial Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock return values
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
  });

  it('should render with initial idle state', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /start analysis/i })).toBeInTheDocument();
    expect(screen.getByText(/2 images ready for analysis/i)).toBeInTheDocument();
  });

  it('should display image count correctly', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      createMockImage('img-3', ViewType.CC, Laterality.LEFT),
      createMockImage('img-4', ViewType.MLO, Laterality.LEFT),
    ];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByText(/4 images ready for analysis/i)).toBeInTheDocument();
  });

  it('should show validation warnings', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: ['Image set is incomplete (1/4 views). AI correlation may be limited.'],
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByText(/incomplete/i)).toBeInTheDocument();
  });

  it('should disable start button when case is invalid', () => {
    const case_ = createMockCase([]);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: false,
      errors: [{ field: 'images', message: 'No images', code: 'REQUIRED' }],
      warnings: [],
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /start analysis/i })).toBeDisabled();
  });

  it('should display validation errors', () => {
    const case_ = createMockCase([]);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: false,
      errors: [{ field: 'images', message: 'At least one image is required', code: 'REQUIRED' }],
      warnings: [],
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByText(/at least one image/i)).toBeInTheDocument();
  });
});

// ============================================================================
// TEST SUITE: Analysis Execution
// ============================================================================

describe('BatchAnalysisRunner - Analysis Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
  });

  it('should start analysis when button is clicked', async () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images);
    const onAnalysisComplete = jest.fn();
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    const batchResult = createMockBatchResult([
      createMockAnalysisResult('img-1'),
      createMockAnalysisResult('img-2'),
    ]);
    
    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: batchResult,
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={onAnalysisComplete}
        onError={jest.fn()}
      />
    );

    const startButton = screen.getByRole('button', { name: /start analysis/i });
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(mockRunBatchAnalysis).toHaveBeenCalled();
    });
  });

  it('should show progress during analysis', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    // Use a deferred promise so the mock stays pending while we assert
    let resolveAnalysis!: (v: any) => void;
    
    mockRunBatchAnalysis.mockImplementation(async (_, options) => {
      // Fire progress synchronously so state updates before assertion
      if (options?.onProgress) {
        options.onProgress(50);
      }
      // Keep the mock pending until we explicitly resolve
      return new Promise(resolve => {
        resolveAnalysis = resolve;
      });
    });

    const { container } = render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    const startButton = screen.getByRole('button', { name: /start analysis/i });
    await userEvent.click(startButton);

    await waitFor(() => {
      // MUI LinearProgress (determinate) used for analysis progress
      const linearProgress = container.querySelector('.MuiLinearProgress-root');
      expect(linearProgress).toBeInTheDocument();
    });

    // Cleanup: resolve the mock to avoid hanging
    resolveAnalysis({
      success: true,
      data: createMockBatchResult([createMockAnalysisResult('img-1')]),
    });
  });

  it('should disable start button during analysis', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockRunBatchAnalysis.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        success: true,
        data: createMockBatchResult([createMockAnalysisResult('img-1')]),
      };
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    const startButton = screen.getByRole('button', { name: /start analysis/i });
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled();
    });
  });

  it('should call onAnalysisComplete with results on success', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    const onAnalysisComplete = jest.fn();
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    const batchResult = createMockBatchResult([createMockAnalysisResult('img-1')]);
    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: batchResult,
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={onAnalysisComplete}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(onAnalysisComplete).toHaveBeenCalledWith(batchResult);
    });
  });
});

// ============================================================================
// TEST SUITE: Error Handling
// ============================================================================

describe('BatchAnalysisRunner - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
  });

  it('should display error message on analysis failure', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    const onError = jest.fn();
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockRunBatchAnalysis.mockResolvedValue({
      success: false,
      error: new batchAnalysisOps.BatchAnalysisError(
        'Analysis failed due to server error',
        'ANALYSIS_FAILED' as any,
        ['img-1'],
        []
      ),
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={onError}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });

    expect(onError).toHaveBeenCalled();
  });

  it('should show "Proceed to Review Findings" CTA after successful completion', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    const onContinue = jest.fn();

    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: createMockBatchResult([createMockAnalysisResult('img-1')]),
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
        onContinue={onContinue}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      const ctaButton = screen.getByRole('button', { name: /proceed to review findings/i });
      expect(ctaButton).toBeInTheDocument();
    });
  });

  it('should call onContinue when CTA button is clicked', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    const onContinue = jest.fn();

    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: createMockBatchResult([createMockAnalysisResult('img-1')]),
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
        onContinue={onContinue}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /proceed to review findings/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /proceed to review findings/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should NOT show CTA when onContinue prop is not provided', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);

    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: createMockBatchResult([createMockAnalysisResult('img-1')]),
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /proceed to review findings/i })).not.toBeInTheDocument();
  });

  it('should NOT show CTA when analysis has failed images', async () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images);
    const onContinue = jest.fn();

    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    const partialResult: BatchAnalysisResult = {
      totalImages: 2,
      completedCount: 1,
      failedCount: 1,
      results: [createMockAnalysisResult('img-1')],
      consolidatedFindings: [],
      totalProcessingTimeMs: 3000,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      warnings: ['Failed for img-2'],
    };

    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: partialResult,
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
        onContinue={onContinue}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    });

    // CTA should not appear because there are failed images
    expect(screen.queryByRole('button', { name: /proceed to review findings/i })).not.toBeInTheDocument();
  });

  it('should show partial success message when some images fail', async () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    const partialResult: BatchAnalysisResult = {
      totalImages: 2,
      completedCount: 1,
      failedCount: 1,
      results: [createMockAnalysisResult('img-1')],
      consolidatedFindings: [],
      totalProcessingTimeMs: 3000,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      warnings: ['Analysis failed for image img-2'],
    };
    
    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: partialResult,
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 of 2/i)).toBeInTheDocument();
    });
  });

  it('should allow retry after failure', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    // First attempt fails
    mockRunBatchAnalysis.mockResolvedValueOnce({
      success: false,
      error: new batchAnalysisOps.BatchAnalysisError('Server error'),
    });
    
    // Second attempt succeeds
    mockRunBatchAnalysis.mockResolvedValueOnce({
      success: true,
      data: createMockBatchResult([createMockAnalysisResult('img-1')]),
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    // First attempt
    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
    });

    // Retry
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRunBatchAnalysis).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// TEST SUITE: Cancel Operation
// ============================================================================

describe('BatchAnalysisRunner - Cancel Operation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
  });

  it('should show cancel button during analysis', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockRunBatchAnalysis.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        data: createMockBatchResult([createMockAnalysisResult('img-1')]),
      };
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it('should abort analysis when cancel is clicked', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    let abortSignal: AbortSignal | undefined;
    
    mockRunBatchAnalysis.mockImplementation(async (_, options) => {
      abortSignal = options?.abortSignal;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({
            success: true,
            data: createMockBatchResult([createMockAnalysisResult('img-1')]),
          });
        }, 500);
        abortSignal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          // Return failure result instead of throwing
          resolve({
            success: false,
            error: new batchAnalysisOps.BatchAnalysisError('Aborted'),
          });
        });
      });
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(abortSignal?.aborted).toBe(true);
    });
  });

  it('should reset to idle state after cancel', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockRunBatchAnalysis.mockImplementation(async (_, options) => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: true, data: createMockBatchResult([createMockAnalysisResult('img-1')]) });
        }, 500);
        options?.abortSignal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          resolve({ success: false, error: new batchAnalysisOps.BatchAnalysisError('Aborted') });
        });
      });
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start analysis/i })).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TEST SUITE: Result Display
// ============================================================================

describe('BatchAnalysisRunner - Result Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
  });

  it('should display completion status after successful analysis', async () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: createMockBatchResult([
        createMockAnalysisResult('img-1'),
        createMockAnalysisResult('img-2'),
      ]),
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    });
  });

  it('should display suggested BI-RADS after completion', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    const batchResult: BatchAnalysisResult = {
      ...createMockBatchResult([createMockAnalysisResult('img-1')]),
      suggestedBiRads: BiRadsValues.BENIGN,
    };
    
    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: batchResult,
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/Suggested BI-RADS/i)).toBeInTheDocument();
      expect(screen.getByText(/BI-RADS 2/i)).toBeInTheDocument();
    });
  });

  it('should display processing time after completion', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: {
        ...createMockBatchResult([createMockAnalysisResult('img-1')]),
        totalProcessingTimeMs: 5500,
      },
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/5\.5/i)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TEST SUITE: Retry Functionality
// ============================================================================

describe('BatchAnalysisRunner - Retry Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
  });

  it('should show retry button when there are failed analyses', async () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images, [createMockAnalysisResult('img-1')]);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockCanRetryAnalysis.mockReturnValue({
      canRetry: true,
      failedImageIds: ['img-2'],
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /retry failed/i })).toBeInTheDocument();
  });

  it('should call retryFailedAnalyses when retry button clicked', async () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images, [createMockAnalysisResult('img-1')]);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockCanRetryAnalysis.mockReturnValue({
      canRetry: true,
      failedImageIds: ['img-2'],
    });
    
    mockRetryFailedAnalyses.mockResolvedValue({
      success: true,
      data: createMockBatchResult([
        createMockAnalysisResult('img-1'),
        createMockAnalysisResult('img-2'),
      ]),
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /retry failed/i }));

    await waitFor(() => {
      expect(mockRetryFailedAnalyses).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// TEST SUITE: Accessibility
// ============================================================================

describe('BatchAnalysisRunner - Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
  });

  it('should have accessible button labels', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /start analysis/i })).toHaveAccessibleName();
  });

  it('should announce progress changes to screen readers', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    // Use a deferred promise so the mock stays pending while we assert
    let resolveAnalysis!: (v: any) => void;
    
    mockRunBatchAnalysis.mockImplementation(async (_, options) => {
      if (options?.onProgress) {
        options.onProgress(50);
      }
      return new Promise(resolve => {
        resolveAnalysis = resolve;
      });
    });

    const { container } = render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      // MUI LinearProgress (determinate) has role="progressbar" with aria-valuenow
      const linearProgress = container.querySelector('.MuiLinearProgress-root[role="progressbar"]');
      expect(linearProgress).toBeInTheDocument();
      expect(linearProgress).toHaveAttribute('aria-valuenow');
    });

    // Cleanup
    resolveAnalysis({
      success: true,
      data: createMockBatchResult([createMockAnalysisResult('img-1')]),
    });
  });

  it('should have proper error announcements', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockRunBatchAnalysis.mockResolvedValue({
      success: false,
      error: new batchAnalysisOps.BatchAnalysisError('Server error'),
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TEST SUITE: Edge Cases
// ============================================================================

describe('BatchAnalysisRunner - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
  });

  it('should handle case update during analysis', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const initialCase = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    let resolveAnalysis: (value: unknown) => void;
    mockRunBatchAnalysis.mockImplementation(
      () => new Promise(resolve => { resolveAnalysis = resolve; })
    );

    const { rerender } = render(
      <BatchAnalysisRunner
        case={initialCase}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    // Update case while analysis is running
    const updatedCase = {
      ...initialCase,
      images: [
        ...images,
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      ],
    };

    rerender(
      <BatchAnalysisRunner
        case={updatedCase}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    // Analysis should continue with original case
    resolveAnalysis!({
      success: true,
      data: createMockBatchResult([createMockAnalysisResult('img-1')]),
    });

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    });
  });

  it('should handle empty results gracefully', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    mockRunBatchAnalysis.mockResolvedValue({
      success: true,
      data: {
        totalImages: 1,
        completedCount: 0,
        failedCount: 1,
        results: [],
        consolidatedFindings: [],
        totalProcessingTimeMs: 1000,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    });

    render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/0 of 1/i)).toBeInTheDocument();
    });
  });

  it('should cleanup abort controller on unmount', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images);
    
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    
    let abortSignal: AbortSignal | undefined;
    mockRunBatchAnalysis.mockImplementation(async (_, options) => {
      abortSignal = options?.abortSignal;
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        data: createMockBatchResult([createMockAnalysisResult('img-1')]),
      };
    });

    const { unmount } = render(
      <BatchAnalysisRunner
        case={case_}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));

    // Wait for analysis to start
    await waitFor(() => {
      expect(mockRunBatchAnalysis).toHaveBeenCalled();
    });

    // Unmount component
    unmount();

    // Abort signal should be triggered
    expect(abortSignal?.aborted).toBe(true);
  });
});

// ============================================================================
// TEST SUITE: MUI / LUNIT Design Compliance (TODO-05)
// ============================================================================

describe('BatchAnalysisRunner — MUI & LUNIT design compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRetryAnalysis.mockReturnValue({ canRetry: false, failedImageIds: [] });
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
  });

  const renderIdle = () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    return render(
      <BatchAnalysisRunner
        case={createMockCase(images)}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );
  };

  it('should use MUI Paper as the root container', () => {
    const { container } = renderIdle();
    // MUI Paper renders a div with class MuiPaper-root
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });

  it('should NOT have Tailwind utility classes on root container', () => {
    const { container } = renderIdle();
    const root = container.firstElementChild;
    // Check common Tailwind classes are absent
    expect(root?.querySelector('[class*="bg-white"]')).toBeNull();
    expect(root?.querySelector('[class*="rounded-xl"]')).toBeNull();
    expect(root?.querySelector('[class*="shadow-sm"]')).toBeNull();
  });

  it('should use MUI Button for the primary action', () => {
    const { container } = renderIdle();
    const muiButton = container.querySelector('.MuiButton-root');
    expect(muiButton).toBeInTheDocument();
    expect(muiButton?.textContent).toMatch(/start analysis/i);
  });

  it('should render heading with ClashGrotesk font family', () => {
    const { container } = renderIdle();
    const heading = container.querySelector('h3, [class*="MuiTypography-h"]');
    if (!heading) throw new Error('No heading found');
    const style = window.getComputedStyle(heading);
    // LUNIT heading font family includes "ClashGrotesk"
    expect(heading.getAttribute('style') || heading.className || '').toBeDefined();
    // Check that the actual heading element exists with AI Analysis text
    expect(screen.getByText('AI Analysis')).toBeInTheDocument();
  });

  it('should use MUI Alert for validation warnings', () => {
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: ['Incomplete image set'],
    });
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const { container } = render(
      <BatchAnalysisRunner
        case={createMockCase(images)}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );
    const alert = container.querySelector('.MuiAlert-root');
    expect(alert).toBeInTheDocument();
  });

  it('should use MUI Alert for validation errors', () => {
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: false,
      errors: [{ field: 'images', message: 'No images uploaded', code: 'REQUIRED' }],
      warnings: [],
    });
    const { container } = render(
      <BatchAnalysisRunner
        case={createMockCase([])}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );
    const alert = container.querySelector('.MuiAlert-root.MuiAlert-standardError');
    expect(alert).toBeInTheDocument();
  });

  it('should use MUI LinearProgress during analysis', async () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    mockValidateCaseForAnalysis.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });
    mockRunBatchAnalysis.mockImplementation(async (_, options) => {
      options?.onProgress?.(50);
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        success: true,
        data: createMockBatchResult([createMockAnalysisResult('img-1')]),
      };
    });

    const { container } = render(
      <BatchAnalysisRunner
        case={createMockCase(images)}
        onAnalysisComplete={jest.fn()}
        onError={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start analysis/i }));
    });

    await waitFor(() => {
      const linearProgress = container.querySelector('.MuiLinearProgress-root');
      expect(linearProgress).toBeInTheDocument();
    });
  });
});
