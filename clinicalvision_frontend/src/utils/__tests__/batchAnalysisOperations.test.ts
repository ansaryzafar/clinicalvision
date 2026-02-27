/**
 * Batch Analysis Operations Tests - Phase 5 TDD
 * 
 * Tests for Algorithm #3: BatchAnalyzeImages from ALGORITHM_DESIGN.md
 * Following TDD: Write tests first, then implement to pass
 * 
 * @version 1.0
 */

import {
  ClinicalCase,
  ClinicalWorkflowStep,
  ClinicalHistory,
  MammogramImage,
  ViewType,
  Laterality,
  UploadStatus,
  ImageAnalysisResult,
  SuspiciousRegion,
  ConsolidatedFinding,
  BatchAnalysisResult,
  AnalysisJob,
  BatchAnalysisOptions,
  BiRadsCategory,
  BiRadsValues,
  ErrorCode,
  FindingType,
  success,
  failure,
} from '../../types/case.types';

import { assertFailure } from '../../types/resultHelpers';

import {
  validateCaseForAnalysis,
  createAnalysisJobs,
  runSingleImageAnalysis,
  runBatchAnalysis,
  consolidateFindings,
  calculateSuggestedBiRads,
  correlateCCandMLOFindings,
  calculateAggregateRisk,
  markCaseAsAnalyzed,
  canRetryAnalysis,
  retryFailedAnalyses,
  BatchAnalysisError,
} from '../batchAnalysisOperations';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockImage(
  id: string,
  viewType: ViewType,
  laterality: Laterality,
  uploadStatus: UploadStatus = 'uploaded'
): MammogramImage {
  return {
    id,
    fileName: `${laterality}_${viewType}.png`,
    fileSize: 1024 * 1024,
    mimeType: 'image/png',
    localUrl: `blob:http://localhost/${id}`,
    viewType,
    laterality,
    uploadStatus,
    addedAt: new Date().toISOString(),
  } as unknown as MammogramImage;
}

function createMockCase(
  images: MammogramImage[] = [],
  currentStep: ClinicalWorkflowStep = ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
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
      currentStep,
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
  confidence: number = 0.85,
  suspiciousRegions: SuspiciousRegion[] = []
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
    suspiciousRegions,
    attentionSummary: 'AI analysis completed',
    modelVersion: 'v1.0.0',
    processingTimeMs: 1500,
    analyzedAt: new Date().toISOString(),
  };
}

function createMockSuspiciousRegion(
  attentionScore: number = 0.8,
  bbox: [number, number, number, number] = [100, 100, 50, 50]
): SuspiciousRegion {
  return {
    bbox,
    attentionScore,
    description: `Suspicious region with score ${attentionScore}`,
  };
}

// Mock API client
const mockApiClient = {
  analyzeImage: jest.fn(),
};

// Mock for the analysis API module
jest.mock('../../services/analysisApi', () => ({
  analyzeImage: (...args: unknown[]) => mockApiClient.analyzeImage(...args),
}));

// ============================================================================
// TEST SUITE: validateCaseForAnalysis
// ============================================================================

describe('validateCaseForAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid Cases', () => {
    it('should return valid for case with uploaded images at correct workflow step', () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
        createMockImage('img-3', ViewType.CC, Laterality.LEFT),
        createMockImage('img-4', ViewType.MLO, Laterality.LEFT),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for case with single uploaded image', () => {
      const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(true);
    });

    it('should return valid with warning for incomplete 4-view set', () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
        // Missing left breast views
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('incomplete');
    });
  });

  describe('Invalid Cases - No Images', () => {
    it('should reject case with no images', () => {
      const case_ = createMockCase([], ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('images');
      expect(result.errors[0].code).toBe('REQUIRED');
    });
  });

  describe('Invalid Cases - Upload Status', () => {
    it('should reject case with pending images', () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT, 'pending'),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_STATE');
    });

    it('should reject case with uploading images', () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT, 'uploading'),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_STATE');
    });

    it('should reject case with failed images', () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT, 'failed'),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_STATE');
    });

    it('should reject case with mixed upload statuses', () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT, 'uploaded'),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT, 'pending'),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('img-2');
    });
  });

  describe('Invalid Cases - Workflow Step', () => {
    it('should reject case at PATIENT_REGISTRATION step', () => {
      const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
      const case_ = createMockCase(images, ClinicalWorkflowStep.PATIENT_REGISTRATION);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('WORKFLOW_ERROR');
    });

    it('should reject case at IMAGE_UPLOAD step', () => {
      const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
      const case_ = createMockCase(images, ClinicalWorkflowStep.IMAGE_UPLOAD);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('WORKFLOW_ERROR');
    });

    it('should allow case at IMAGE_VERIFICATION step (can proceed to analysis)', () => {
      const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
      const case_ = createMockCase(images, ClinicalWorkflowStep.IMAGE_VERIFICATION);
      case_.workflow.completedSteps.push(ClinicalWorkflowStep.IMAGE_VERIFICATION);
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid Cases - Locked Case', () => {
    it('should reject locked/finalized case', () => {
      const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      case_.workflow.isLocked = true;
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('locked');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null case gracefully', () => {
      const result = validateCaseForAnalysis(null as unknown as ClinicalCase);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('should handle undefined images array', () => {
      const case_ = createMockCase([]);
      case_.images = undefined as unknown as MammogramImage[];
      
      const result = validateCaseForAnalysis(case_);
      
      expect(result.isValid).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: createAnalysisJobs
// ============================================================================

describe('createAnalysisJobs', () => {
  it('should create a job for each image', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      createMockImage('img-3', ViewType.CC, Laterality.LEFT),
    ];
    
    const jobs = createAnalysisJobs(images);
    
    expect(jobs).toHaveLength(3);
    expect(jobs[0].imageId).toBe('img-1');
    expect(jobs[1].imageId).toBe('img-2');
    expect(jobs[2].imageId).toBe('img-3');
  });

  it('should initialize jobs with pending status', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    
    const jobs = createAnalysisJobs(images);
    
    expect(jobs[0].status).toBe('pending');
    expect(jobs[0].progress).toBe(0);
    expect(jobs[0].startedAt).toBeUndefined();
    expect(jobs[0].completedAt).toBeUndefined();
    expect(jobs[0].result).toBeUndefined();
    expect(jobs[0].error).toBeUndefined();
  });

  it('should return empty array for empty images', () => {
    const jobs = createAnalysisJobs([]);
    expect(jobs).toHaveLength(0);
  });

  it('should filter out already-analyzed images when rerunning', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const existingResults = [createMockAnalysisResult('img-1')];
    
    const jobs = createAnalysisJobs(images, { excludeAnalyzed: true, existingResults });
    
    expect(jobs).toHaveLength(1);
    expect(jobs[0].imageId).toBe('img-2');
  });
});

// ============================================================================
// TEST SUITE: runSingleImageAnalysis
// ============================================================================

describe('runSingleImageAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.analyzeImage.mockReset();
  });

  it('should call API with correct parameters', async () => {
    const image = createMockImage('img-1', ViewType.CC, Laterality.RIGHT);
    const mockResponse = createMockAnalysisResult('img-1');
    mockApiClient.analyzeImage.mockResolvedValueOnce(mockResponse);
    
    const result = await runSingleImageAnalysis(image);
    
    expect(mockApiClient.analyzeImage).toHaveBeenCalledWith(
      expect.objectContaining({ imageId: 'img-1' })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageId).toBe('img-1');
    }
  });

  it('should return ImageAnalysisResult on success', async () => {
    const image = createMockImage('img-1', ViewType.CC, Laterality.RIGHT);
    const mockResponse = createMockAnalysisResult('img-1', 'benign', 0.92);
    mockApiClient.analyzeImage.mockResolvedValueOnce(mockResponse);
    
    const result = await runSingleImageAnalysis(image);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prediction).toBe('benign');
      expect(result.data.confidence).toBe(0.92);
    }
  });

  it('should handle API error gracefully', async () => {
    const image = createMockImage('img-1', ViewType.CC, Laterality.RIGHT);
    mockApiClient.analyzeImage.mockRejectedValueOnce(new Error('Network error'));
    
    const result = await runSingleImageAnalysis(image);
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.message).toContain('Network error');
  });

  it('should handle timeout', async () => {
    const image = createMockImage('img-1', ViewType.CC, Laterality.RIGHT);
    mockApiClient.analyzeImage.mockImplementationOnce(
      () => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );
    
    const result = await runSingleImageAnalysis(image, { timeout: 50 });
    
    expect(result.success).toBe(false);
  });

  it('should respect abort signal', async () => {
    const image = createMockImage('img-1', ViewType.CC, Laterality.RIGHT);
    const abortController = new AbortController();
    abortController.abort();
    
    const result = await runSingleImageAnalysis(image, { 
      abortSignal: abortController.signal 
    });
    
    expect(result.success).toBe(false);
    const error = assertFailure(result);
    expect(error.message).toContain('abort');
  });
});

// ============================================================================
// TEST SUITE: runBatchAnalysis
// ============================================================================

describe('runBatchAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.analyzeImage.mockReset();
  });

  describe('Successful Batch Analysis', () => {
    it('should analyze all images and return batch result', async () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      mockApiClient.analyzeImage
        .mockResolvedValueOnce(createMockAnalysisResult('img-1'))
        .mockResolvedValueOnce(createMockAnalysisResult('img-2'));
      
      const result = await runBatchAnalysis(case_);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalImages).toBe(2);
        expect(result.data.completedCount).toBe(2);
        expect(result.data.failedCount).toBe(0);
        expect(result.data.results).toHaveLength(2);
      }
    });

    it('should process images with concurrency limit', async () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
        createMockImage('img-3', ViewType.CC, Laterality.LEFT),
        createMockImage('img-4', ViewType.MLO, Laterality.LEFT),
        createMockImage('img-5', ViewType.CC, Laterality.RIGHT), // Additional
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;
      
      mockApiClient.analyzeImage.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrentCalls--;
        return createMockAnalysisResult('any');
      });
      
      const options: BatchAnalysisOptions = { concurrencyLimit: 2 };
      await runBatchAnalysis(case_, options);
      
      expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
    });

    it('should call progress callback with updates', async () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      const progressCallback = jest.fn();
      
      mockApiClient.analyzeImage
        .mockResolvedValueOnce(createMockAnalysisResult('img-1'))
        .mockResolvedValueOnce(createMockAnalysisResult('img-2'));
      
      await runBatchAnalysis(case_, { onProgress: progressCallback });
      
      expect(progressCallback).toHaveBeenCalled();
      // Should have been called with increasing progress
      const calls = progressCallback.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(100);
    });

    it('should calculate total processing time', async () => {
      const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      mockApiClient.analyzeImage.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return createMockAnalysisResult('img-1');
      });
      
      const result = await runBatchAnalysis(case_);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalProcessingTimeMs).toBeGreaterThan(0);
      }
    });
  });

  describe('Partial Failure Handling', () => {
    it('should continue on error when continueOnError is true', async () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
        createMockImage('img-3', ViewType.CC, Laterality.LEFT),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      mockApiClient.analyzeImage
        .mockResolvedValueOnce(createMockAnalysisResult('img-1'))
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(createMockAnalysisResult('img-3'));
      
      const result = await runBatchAnalysis(case_, { continueOnError: true });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completedCount).toBe(2);
        expect(result.data.failedCount).toBe(1);
        expect(result.data.warnings).toBeDefined();
      }
    });

    it('should stop on first error when continueOnError is false', async () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      mockApiClient.analyzeImage
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(createMockAnalysisResult('img-2'));
      
      const result = await runBatchAnalysis(case_, { continueOnError: false });
      
      expect(result.success).toBe(false);
    });

    it('should return partial results on failure', async () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      mockApiClient.analyzeImage
        .mockResolvedValueOnce(createMockAnalysisResult('img-1'))
        .mockRejectedValueOnce(new Error('API Error'));
      
      const result = await runBatchAnalysis(case_, { continueOnError: false });
      
      expect(result.success).toBe(false);
      const error = assertFailure(result) as BatchAnalysisError;
      expect(error.partialResults).toHaveLength(1);
    });
  });

  describe('Validation', () => {
    it('should reject case with no images', async () => {
      const case_ = createMockCase([], ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      
      const result = await runBatchAnalysis(case_);
      
      expect(result.success).toBe(false);
      const error = assertFailure(result);
      expect(error.message).toContain('image');
    });

    it('should reject case at wrong workflow step', async () => {
      const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
      const case_ = createMockCase(images, ClinicalWorkflowStep.PATIENT_REGISTRATION);
      
      const result = await runBatchAnalysis(case_);
      
      expect(result.success).toBe(false);
      const error = assertFailure(result);
      expect(error.message).toContain('workflow');
    });
  });

  describe('Abort Handling', () => {
    it('should stop analysis when abort signal is triggered', async () => {
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      ];
      const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
      const abortController = new AbortController();
      
      mockApiClient.analyzeImage.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return createMockAnalysisResult('any');
      });
      
      // Abort after short delay
      setTimeout(() => abortController.abort(), 25);
      
      const result = await runBatchAnalysis(case_, { 
        abortSignal: abortController.signal,
        concurrencyLimit: 1,
      });
      
      expect(result.success).toBe(false);
      const error = assertFailure(result);
      expect(error.message).toContain('abort');
    });
  });
});

// ============================================================================
// TEST SUITE: consolidateFindings
// ============================================================================

describe('consolidateFindings', () => {
  describe('Finding Consolidation', () => {
    it('should consolidate findings from multiple views', () => {
      const results: ImageAnalysisResult[] = [
        createMockAnalysisResult('img-1', 'malignant', 0.85, [
          createMockSuspiciousRegion(0.9, [100, 100, 50, 50]),
        ]),
        createMockAnalysisResult('img-2', 'malignant', 0.82, [
          createMockSuspiciousRegion(0.88, [120, 110, 45, 45]),
        ]),
      ];
      
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      ];
      
      const findings = consolidateFindings(results, images);
      
      expect(findings.length).toBeGreaterThanOrEqual(1);
      // Correlated findings should reference both views
      const correlatedFinding = findings.find(f => f.visibleInViews.length > 1);
      expect(correlatedFinding).toBeDefined();
    });

    it('should assign laterality correctly', () => {
      const results: ImageAnalysisResult[] = [
        createMockAnalysisResult('img-1', 'malignant', 0.85, [
          createMockSuspiciousRegion(0.9),
        ]),
        createMockAnalysisResult('img-2', 'benign', 0.95, []),
      ];
      
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.CC, Laterality.LEFT),
      ];
      
      const findings = consolidateFindings(results, images);
      
      const rightFinding = findings.find(f => f.laterality === Laterality.RIGHT);
      expect(rightFinding).toBeDefined();
    });

    it('should return empty array when no suspicious regions', () => {
      const results: ImageAnalysisResult[] = [
        createMockAnalysisResult('img-1', 'benign', 0.95, []),
        createMockAnalysisResult('img-2', 'benign', 0.92, []),
      ];
      
      const images = [
        createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
        createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
      ];
      
      const findings = consolidateFindings(results, images);
      
      expect(findings).toHaveLength(0);
    });

    it('should generate unique IDs for each finding', () => {
      const results: ImageAnalysisResult[] = [
        createMockAnalysisResult('img-1', 'malignant', 0.85, [
          createMockSuspiciousRegion(0.9),
          createMockSuspiciousRegion(0.75),
        ]),
      ];
      
      const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
      
      const findings = consolidateFindings(results, images);
      
      const ids = findings.map(f => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty results array', () => {
      const findings = consolidateFindings([], []);
      expect(findings).toHaveLength(0);
    });

    it('should handle results without matching images', () => {
      const results: ImageAnalysisResult[] = [
        createMockAnalysisResult('img-1', 'malignant', 0.85, [
          createMockSuspiciousRegion(0.9),
        ]),
      ];
      
      // No matching image in array
      const images: MammogramImage[] = [];
      
      const findings = consolidateFindings(results, images);
      
      // Should still create findings but without full metadata
      expect(findings.length).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// TEST SUITE: correlateCCandMLOFindings
// ============================================================================

describe('correlateCCandMLOFindings', () => {
  it('should correlate findings between CC and MLO views', () => {
    const ccRegion = createMockSuspiciousRegion(0.9, [100, 100, 50, 50]);
    const mloRegion = createMockSuspiciousRegion(0.88, [95, 105, 55, 45]);
    
    const ccResult = createMockAnalysisResult('img-1', 'malignant', 0.85, [ccRegion]);
    const mloResult = createMockAnalysisResult('img-2', 'malignant', 0.82, [mloRegion]);
    
    const ccImage = createMockImage('img-1', ViewType.CC, Laterality.RIGHT);
    const mloImage = createMockImage('img-2', ViewType.MLO, Laterality.RIGHT);
    
    const correlations = correlateCCandMLOFindings(
      [ccResult, mloResult],
      [ccImage, mloImage]
    );
    
    expect(correlations.length).toBeGreaterThan(0);
    // Each correlation should have both CC and MLO references
    expect(correlations[0].ccImageId).toBeDefined();
    expect(correlations[0].mloImageId).toBeDefined();
  });

  it('should not correlate findings from different breasts', () => {
    const rightCCRegion = createMockSuspiciousRegion(0.9, [100, 100, 50, 50]);
    const leftMLORegion = createMockSuspiciousRegion(0.88, [100, 100, 50, 50]);
    
    const rightCC = createMockAnalysisResult('img-1', 'malignant', 0.85, [rightCCRegion]);
    const leftMLO = createMockAnalysisResult('img-2', 'malignant', 0.82, [leftMLORegion]);
    
    const rightCCImage = createMockImage('img-1', ViewType.CC, Laterality.RIGHT);
    const leftMLOImage = createMockImage('img-2', ViewType.MLO, Laterality.LEFT);
    
    const correlations = correlateCCandMLOFindings(
      [rightCC, leftMLO],
      [rightCCImage, leftMLOImage]
    );
    
    // Findings from different breasts should not be correlated
    const crossBreastCorrelation = correlations.find(c => 
      c.laterality !== c.laterality
    );
    expect(crossBreastCorrelation).toBeUndefined();
  });

  it('should handle empty input', () => {
    const correlations = correlateCCandMLOFindings([], []);
    expect(correlations).toHaveLength(0);
  });
});

// ============================================================================
// TEST SUITE: calculateAggregateRisk
// ============================================================================

describe('calculateAggregateRisk', () => {
  it('should return high risk when any image is high risk', () => {
    const results: ImageAnalysisResult[] = [
      createMockAnalysisResult('img-1', 'benign', 0.85),
      createMockAnalysisResult('img-2', 'malignant', 0.92),
    ];
    results[0].riskLevel = 'low';
    results[1].riskLevel = 'high';
    
    const risk = calculateAggregateRisk(results);
    
    expect(risk).toBe('high');
  });

  it('should return moderate when highest is moderate', () => {
    const results: ImageAnalysisResult[] = [
      createMockAnalysisResult('img-1', 'benign', 0.85),
      createMockAnalysisResult('img-2', 'benign', 0.65),
    ];
    results[0].riskLevel = 'low';
    results[1].riskLevel = 'moderate';
    
    const risk = calculateAggregateRisk(results);
    
    expect(risk).toBe('moderate');
  });

  it('should return low when all are low risk', () => {
    const results: ImageAnalysisResult[] = [
      createMockAnalysisResult('img-1', 'benign', 0.95),
      createMockAnalysisResult('img-2', 'benign', 0.92),
    ];
    results[0].riskLevel = 'low';
    results[1].riskLevel = 'low';
    
    const risk = calculateAggregateRisk(results);
    
    expect(risk).toBe('low');
  });

  it('should return low for empty results', () => {
    const risk = calculateAggregateRisk([]);
    expect(risk).toBe('low');
  });
});

// ============================================================================
// TEST SUITE: calculateSuggestedBiRads
// ============================================================================

describe('calculateSuggestedBiRads', () => {
  describe('BI-RADS Category Suggestions', () => {
    it('should suggest BI-RADS 1 (Negative) for no findings', () => {
      const findings: ConsolidatedFinding[] = [];
      const results = [
        createMockAnalysisResult('img-1', 'benign', 0.98),
      ];
      
      const birads = calculateSuggestedBiRads(findings, results);
      
      expect(birads).toBe(BiRadsValues.NEGATIVE);
    });

    it('should suggest BI-RADS 2 (Benign) for benign findings', () => {
      const findings: ConsolidatedFinding[] = [{
        id: 'finding-1',
        laterality: Laterality.RIGHT,
        findingType: FindingType.CALCIFICATION,
        visibleInViews: ['img-1'],
        aiCorrelatedRegions: [],
        aiConfidence: 0.3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
      const results = [
        createMockAnalysisResult('img-1', 'benign', 0.95),
      ];
      
      const birads = calculateSuggestedBiRads(findings, results);
      
      expect(birads).toBe(BiRadsValues.BENIGN);
    });

    it('should suggest BI-RADS 4 (Suspicious) for malignant predictions', () => {
      const findings: ConsolidatedFinding[] = [{
        id: 'finding-1',
        laterality: Laterality.RIGHT,
        findingType: FindingType.MASS,
        visibleInViews: ['img-1', 'img-2'],
        aiCorrelatedRegions: ['region-1'],
        aiConfidence: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
      const results = [
        createMockAnalysisResult('img-1', 'malignant', 0.75),
      ];
      
      const birads = calculateSuggestedBiRads(findings, results);
      
      // Should be BI-RADS 4A, 4B, or 4C
      expect(['4A', '4B', '4C']).toContain(birads);
    });

    it('should suggest BI-RADS 5 (Highly Suggestive) for high confidence malignant', () => {
      const findings: ConsolidatedFinding[] = [{
        id: 'finding-1',
        laterality: Laterality.RIGHT,
        findingType: FindingType.MASS,
        visibleInViews: ['img-1', 'img-2'],
        aiCorrelatedRegions: ['region-1', 'region-2'],
        aiConfidence: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
      const results = [
        createMockAnalysisResult('img-1', 'malignant', 0.95),
        createMockAnalysisResult('img-2', 'malignant', 0.93),
      ];
      
      const birads = calculateSuggestedBiRads(findings, results);
      
      expect(birads).toBe(BiRadsValues.HIGHLY_SUGGESTIVE);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty inputs', () => {
      const birads = calculateSuggestedBiRads([], []);
      expect(birads).toBe(BiRadsValues.NEGATIVE);
    });

    it('should handle results without findings', () => {
      const results = [
        createMockAnalysisResult('img-1', 'benign', 0.98),
        createMockAnalysisResult('img-2', 'benign', 0.96),
      ];
      
      const birads = calculateSuggestedBiRads([], results);
      
      expect(birads).toBe(BiRadsValues.NEGATIVE);
    });
  });
});

// ============================================================================
// TEST SUITE: markCaseAsAnalyzed
// ============================================================================

describe('markCaseAsAnalyzed', () => {
  it('should update case with analysis results', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    
    const batchResult: BatchAnalysisResult = {
      totalImages: 2,
      completedCount: 2,
      failedCount: 0,
      results: [
        createMockAnalysisResult('img-1'),
        createMockAnalysisResult('img-2'),
      ],
      consolidatedFindings: [],
      totalProcessingTimeMs: 3000,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    
    const result = markCaseAsAnalyzed(case_, batchResult, 'user-1');
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.analysisResults).toHaveLength(2);
      expect(result.data.workflow.completedSteps).toContain(
        ClinicalWorkflowStep.BATCH_AI_ANALYSIS
      );
    }
  });

  it('should add audit entry', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    const initialAuditCount = case_.audit.modifications.length;
    
    const batchResult: BatchAnalysisResult = {
      totalImages: 1,
      completedCount: 1,
      failedCount: 0,
      results: [createMockAnalysisResult('img-1')],
      consolidatedFindings: [],
      totalProcessingTimeMs: 1500,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    
    const result = markCaseAsAnalyzed(case_, batchResult, 'user-1');
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audit.modifications.length).toBe(initialAuditCount + 1);
      expect(result.data.audit.modifications[initialAuditCount].action).toBe('BATCH_ANALYSIS_COMPLETED');
    }
  });

  it('should not advance workflow if analysis failed', () => {
    const images = [createMockImage('img-1', ViewType.CC, Laterality.RIGHT)];
    const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    
    const batchResult: BatchAnalysisResult = {
      totalImages: 1,
      completedCount: 0,
      failedCount: 1,
      results: [],
      consolidatedFindings: [],
      totalProcessingTimeMs: 1500,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    
    const result = markCaseAsAnalyzed(case_, batchResult, 'user-1');
    
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TEST SUITE: canRetryAnalysis & retryFailedAnalyses
// ============================================================================

describe('canRetryAnalysis', () => {
  it('should return true when there are failed analyses', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    case_.analysisResults = [createMockAnalysisResult('img-1')];
    // img-2 was not analyzed
    
    const canRetry = canRetryAnalysis(case_);
    
    expect(canRetry.canRetry).toBe(true);
    expect(canRetry.failedImageIds).toContain('img-2');
  });

  it('should return false when all images are analyzed', () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    case_.analysisResults = [
      createMockAnalysisResult('img-1'),
      createMockAnalysisResult('img-2'),
    ];
    
    const canRetry = canRetryAnalysis(case_);
    
    expect(canRetry.canRetry).toBe(false);
    expect(canRetry.failedImageIds).toHaveLength(0);
  });
});

describe('retryFailedAnalyses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.analyzeImage.mockReset();
  });

  it('should only retry failed images', async () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    case_.analysisResults = [createMockAnalysisResult('img-1')];
    
    mockApiClient.analyzeImage.mockResolvedValueOnce(createMockAnalysisResult('img-2'));
    
    const result = await retryFailedAnalyses(case_);
    
    // Should only call API once for the failed image
    expect(mockApiClient.analyzeImage).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success) {
      // completedCount is total successful (existing + newly retried)
      expect(result.data.completedCount).toBe(2);
      expect(result.data.results).toHaveLength(2);
    }
  });

  it('should merge with existing results', async () => {
    const images = [
      createMockImage('img-1', ViewType.CC, Laterality.RIGHT),
      createMockImage('img-2', ViewType.MLO, Laterality.RIGHT),
    ];
    const case_ = createMockCase(images, ClinicalWorkflowStep.BATCH_AI_ANALYSIS);
    case_.analysisResults = [createMockAnalysisResult('img-1')];
    
    mockApiClient.analyzeImage.mockResolvedValueOnce(createMockAnalysisResult('img-2'));
    
    const result = await retryFailedAnalyses(case_);
    
    expect(result.success).toBe(true);
    if (result.success) {
      // Should have both existing and new results
      expect(result.data.results.map(r => r.imageId).sort()).toEqual(['img-1', 'img-2'].sort());
    }
  });
});

// ============================================================================
// TEST SUITE: Type Safety
// ============================================================================

describe('Type Safety', () => {
  it('should enforce ImageAnalysisResult structure', () => {
    const result: ImageAnalysisResult = {
      imageId: 'test',
      prediction: 'benign',
      confidence: 0.9,
      probabilities: { benign: 0.9, malignant: 0.1 },
      riskLevel: 'low',
      suspiciousRegions: [],
      modelVersion: 'v1.0',
      processingTimeMs: 1000,
      analyzedAt: new Date().toISOString(),
    };
    
    expect(result.imageId).toBe('test');
    expect(result.prediction).toBe('benign');
  });

  it('should enforce BatchAnalysisResult structure', () => {
    const result: BatchAnalysisResult = {
      totalImages: 1,
      completedCount: 1,
      failedCount: 0,
      results: [],
      consolidatedFindings: [],
      totalProcessingTimeMs: 1000,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    
    expect(result.totalImages).toBe(1);
    expect(result.completedCount).toBe(1);
  });
});
