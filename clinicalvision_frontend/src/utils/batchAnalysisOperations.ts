/**
 * Batch Analysis Operations - Phase 5 Implementation
 * 
 * Implements Algorithm #3: BatchAnalyzeImages from ALGORITHM_DESIGN.md
 * Provides batch AI analysis for mammogram images with:
 * - Concurrent processing with configurable limits
 * - Progress tracking with callbacks
 * - Partial failure handling
 * - CC↔MLO finding correlation
 * - BI-RADS suggestion calculation
 * 
 * @version 1.0
 */

import {
  ClinicalCase,
  ClinicalWorkflowStep,
  MammogramImage,
  ViewType,
  Laterality,
  UploadStatus,
  ImageAnalysisResult,
  SuspiciousRegion,
  ConsolidatedFinding,
  BatchAnalysisResult,
  AnalysisJob,
  AnalysisJobStatus,
  BatchAnalysisOptions,
  DEFAULT_BATCH_ANALYSIS_OPTIONS,
  BiRadsCategory,
  BiRadsValues,
  ErrorCode,
  FindingType,
  RiskLevel,
  Result,
  success,
  failure,
  ValidationResult,
  STEP_INDEX,
} from '../types/case.types';
import { isFailure } from '../types/resultHelpers';

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Custom error for batch analysis failures with partial results support
 */
export class BatchAnalysisError extends Error {
  code: ErrorCode;
  failedImages: string[];
  partialResults: ImageAnalysisResult[];

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.ANALYSIS_FAILED,
    failedImages: string[] = [],
    partialResults: ImageAnalysisResult[] = []
  ) {
    super(message);
    this.name = 'BatchAnalysisError';
    this.code = code;
    this.failedImages = failedImages;
    this.partialResults = partialResults;
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a case is ready for batch AI analysis
 * 
 * Algorithm: Pre-Analysis Validation (from ALGORITHM_DESIGN.md)
 * 1. Check case exists
 * 2. Check images array exists and has items
 * 3. Check all images are uploaded (not pending/uploading/failed)
 * 4. Check workflow step allows analysis
 * 5. Check case is not locked
 * 
 * @param case_ - The clinical case to validate
 * @returns ValidationResult with isValid, errors, and warnings
 */
export function validateCaseForAnalysis(case_: ClinicalCase): ValidationResult {
  const errors: Array<{
    field: string;
    message: string;
    code: string;
  }> = [];
  const warnings: string[] = [];

  // 1. Check case exists
  if (!case_) {
    errors.push({
      field: 'case',
      message: 'Case is required',
      code: 'REQUIRED',
    });
    return { isValid: false, errors, warnings };
  }

  // 2. Check images array exists and has items
  if (!case_.images || !Array.isArray(case_.images) || case_.images.length === 0) {
    errors.push({
      field: 'images',
      message: 'At least one image is required for analysis',
      code: 'REQUIRED',
    });
    return { isValid: false, errors, warnings };
  }

  // 3. Check all images are uploaded (not pending/uploading/failed)
  const invalidImages = case_.images.filter(
    (img) => img.uploadStatus !== 'uploaded'
  );
  if (invalidImages.length > 0) {
    const imageIds = invalidImages.map((img) => img.id).join(', ');
    errors.push({
      field: 'images',
      message: `Images not ready for analysis: ${imageIds}. All images must be uploaded.`,
      code: 'INVALID_STATE',
    });
  }

  // 4. Check workflow step allows analysis
  const currentStepIndex = STEP_INDEX[case_.workflow.currentStep];
  const analysisStepIndex = STEP_INDEX[ClinicalWorkflowStep.BATCH_AI_ANALYSIS];
  const verificationStepIndex = STEP_INDEX[ClinicalWorkflowStep.IMAGE_VERIFICATION];

  // Must be at least at IMAGE_VERIFICATION step (with it completed) or at BATCH_AI_ANALYSIS
  const isAtAnalysisStep = case_.workflow.currentStep === ClinicalWorkflowStep.BATCH_AI_ANALYSIS;
  const isVerificationComplete = 
    case_.workflow.completedSteps.includes(ClinicalWorkflowStep.IMAGE_VERIFICATION) &&
    currentStepIndex >= verificationStepIndex;

  if (!isAtAnalysisStep && !isVerificationComplete) {
    errors.push({
      field: 'workflow',
      message: `Cannot perform analysis at workflow step "${case_.workflow.currentStep}". Complete IMAGE_VERIFICATION first.`,
      code: 'WORKFLOW_ERROR',
    });
  }

  // 5. Check case is not locked
  if (case_.workflow.isLocked) {
    errors.push({
      field: 'workflow',
      message: 'Case is locked and cannot be modified',
      code: 'INVALID_STATE',
    });
  }

  // Generate warnings for incomplete image sets
  const hasCC = case_.images.some((img) => img.viewType === ViewType.CC);
  const hasMLO = case_.images.some((img) => img.viewType === ViewType.MLO);
  const hasRight = case_.images.some((img) => img.laterality === Laterality.RIGHT);
  const hasLeft = case_.images.some((img) => img.laterality === Laterality.LEFT);

  const expectedViews = 4; // Complete set: R-CC, R-MLO, L-CC, L-MLO
  if (case_.images.length < expectedViews) {
    warnings.push(
      `Image set is incomplete (${case_.images.length}/${expectedViews} views). ` +
        `AI correlation between views may be limited.`
    );
  }

  if (!hasCC || !hasMLO) {
    warnings.push(
      'Missing CC or MLO view. Cross-view correlation will be limited.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// JOB CREATION
// ============================================================================

interface CreateJobsOptions {
  excludeAnalyzed?: boolean;
  existingResults?: ImageAnalysisResult[];
}

/**
 * Creates analysis jobs for images
 * 
 * @param images - Images to create jobs for
 * @param options - Options for job creation
 * @returns Array of pending analysis jobs
 */
export function createAnalysisJobs(
  images: MammogramImage[],
  options: CreateJobsOptions = {}
): AnalysisJob[] {
  const { excludeAnalyzed = false, existingResults = [] } = options;

  let imagesToProcess = images;

  if (excludeAnalyzed && existingResults.length > 0) {
    const analyzedIds = new Set(existingResults.map((r) => r.imageId));
    imagesToProcess = images.filter((img) => !analyzedIds.has(img.id));
  }

  return imagesToProcess.map((image) => ({
    imageId: image.id,
    status: 'pending' as AnalysisJobStatus,
    progress: 0,
    startedAt: undefined,
    completedAt: undefined,
    result: undefined,
    error: undefined,
  }));
}

// ============================================================================
// SINGLE IMAGE ANALYSIS
// ============================================================================

interface SingleImageOptions {
  timeout?: number;
  abortSignal?: AbortSignal;
}

/**
 * Runs AI analysis on a single image
 * 
 * Wraps the API call with timeout and abort support
 * 
 * @param image - The image to analyze
 * @param options - Options including timeout and abort signal
 * @returns Result with ImageAnalysisResult or error
 */
export async function runSingleImageAnalysis(
  image: MammogramImage,
  options: SingleImageOptions = {}
): Promise<Result<ImageAnalysisResult, Error>> {
  const { timeout = DEFAULT_BATCH_ANALYSIS_OPTIONS.timeoutPerImage, abortSignal } = options;

  // Check if already aborted
  if (abortSignal?.aborted) {
    return failure(new Error('Analysis aborted before start'));
  }

  // Track cleanup functions for proper resource management
  const cleanupFns: Array<() => void> = [];

  try {
    // Dynamic import to allow mocking in tests
    const apiModule = await import('../services/analysisApi');
    const analyzeImage = apiModule.analyzeImage;

    // Create timeout promise with cleanup
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Analysis timed out')), timeout);
    });
    cleanupFns.push(() => clearTimeout(timeoutId));

    // Create abort promise with cleanup (prevents memory leak)
    let abortHandler: (() => void) | undefined;
    const abortPromise = new Promise<never>((_, reject) => {
      if (abortSignal) {
        abortHandler = () => reject(new Error('Analysis aborted by user'));
        abortSignal.addEventListener('abort', abortHandler);
        cleanupFns.push(() => abortSignal.removeEventListener('abort', abortHandler!));
      }
    });

    // Race between analysis, timeout, and abort
    const result = await Promise.race([
      analyzeImage({ imageId: image.id, imageUrl: image.localUrl }),
      timeoutPromise,
      // Only include abort promise if signal is provided
      ...(abortSignal ? [abortPromise] : []),
    ]);

    // Cleanup event listeners and timers to prevent memory leaks
    cleanupFns.forEach((fn) => fn());

    return success(result as ImageAnalysisResult);
  } catch (error) {
    // Cleanup event listeners and timers on error too
    cleanupFns.forEach((fn) => fn());
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

// ============================================================================
// BATCH ANALYSIS
// ============================================================================

/**
 * Runs batch AI analysis on all images in a case
 * 
 * Algorithm: BatchAnalyzeImages (from ALGORITHM_DESIGN.md)
 * 1. Validate case is ready for analysis
 * 2. Create analysis jobs for each image
 * 3. Process images in parallel with concurrency limit
 * 4. Track progress and call onProgress callback
 * 5. Handle failures based on continueOnError option
 * 6. Consolidate findings across views
 * 7. Calculate suggested BI-RADS
 * 
 * @param case_ - The clinical case with images to analyze
 * @param options - Batch analysis options
 * @returns Result with BatchAnalysisResult or error
 */
export async function runBatchAnalysis(
  case_: ClinicalCase,
  options: BatchAnalysisOptions = {}
): Promise<Result<BatchAnalysisResult, BatchAnalysisError>> {
  const mergedOptions = { ...DEFAULT_BATCH_ANALYSIS_OPTIONS, ...options };
  const { 
    concurrencyLimit, 
    timeoutPerImage, 
    onProgress, 
    continueOnError, 
    abortSignal 
  } = mergedOptions;

  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  // 1. Validate case
  const validation = validateCaseForAnalysis(case_);
  if (!validation.isValid) {
    const errorMsg = validation.errors.map((e) => e.message).join('; ');
    return failure(
      new BatchAnalysisError(
        `Case validation failed: ${errorMsg}`,
        validation.errors[0]?.code === 'WORKFLOW_ERROR'
          ? ErrorCode.INVALID_WORKFLOW_STATE
          : ErrorCode.VALIDATION_ERROR,
        [],
        []
      )
    );
  }

  // 2. Create analysis jobs
  const jobs = createAnalysisJobs(case_.images);
  const totalImages = jobs.length;
  
  const results: ImageAnalysisResult[] = [];
  const failedImageIds: string[] = [];
  const warnings: string[] = [...validation.warnings];

  // 3. Process images with concurrency limit
  let completedCount = 0;
  let aborted = false;

  // Process in chunks based on concurrency limit
  for (let i = 0; i < jobs.length; i += concurrencyLimit) {
    // Check for abort
    if (abortSignal?.aborted || aborted) {
      const partialResults = results.slice();
      return failure(
        new BatchAnalysisError(
          'Batch analysis aborted by user',
          ErrorCode.ANALYSIS_FAILED,
          jobs.slice(i).map((j) => j.imageId),
          partialResults
        )
      );
    }

    const chunk = jobs.slice(i, i + concurrencyLimit);
    
    // Process chunk in parallel
    const chunkPromises = chunk.map(async (job) => {
      const image = case_.images.find((img) => img.id === job.imageId);
      if (!image) {
        return {
          jobId: job.imageId,
          success: false,
          error: new Error(`Image ${job.imageId} not found`),
        };
      }

      const result = await runSingleImageAnalysis(image, {
        timeout: timeoutPerImage,
        abortSignal,
      });

      if (result.success) {
        return {
          jobId: job.imageId,
          success: true as const,
          result: result.data,
        };
      } else {
        return {
          jobId: job.imageId,
          success: false as const,
          error: isFailure(result) ? result.error : new Error('Unknown error'),
        };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);

    // Process chunk results
    for (const chunkResult of chunkResults) {
      if (chunkResult.success && chunkResult.result) {
        results.push(chunkResult.result);
        completedCount++;
      } else {
        failedImageIds.push(chunkResult.jobId);
        
        if (!continueOnError) {
          return failure(
            new BatchAnalysisError(
              `Analysis failed for image ${chunkResult.jobId}: ${chunkResult.error?.message}`,
              ErrorCode.ANALYSIS_FAILED,
              [chunkResult.jobId],
              results.slice()
            )
          );
        }

        warnings.push(
          `Analysis failed for image ${chunkResult.jobId}: ${chunkResult.error?.message}`
        );
      }

      // 4. Report progress
      if (onProgress) {
        const progress = Math.round(
          ((completedCount + failedImageIds.length) / totalImages) * 100
        );
        onProgress(progress);
      }
    }
  }

  const completedAt = new Date().toISOString();
  const totalProcessingTimeMs = Date.now() - startTime;

  // 6. Consolidate findings across views
  const consolidatedFindings = consolidateFindings(results, case_.images);

  // 7. Calculate suggested BI-RADS
  const suggestedBiRads = calculateSuggestedBiRads(consolidatedFindings, results);

  const batchResult: BatchAnalysisResult = {
    totalImages,
    completedCount: results.length,
    failedCount: failedImageIds.length,
    results,
    consolidatedFindings,
    suggestedBiRads,
    totalProcessingTimeMs,
    startedAt,
    completedAt,
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  return success(batchResult);
}

// ============================================================================
// FINDING CONSOLIDATION
// ============================================================================

interface CCMLOCorrelation {
  id: string;
  laterality: Laterality;
  ccImageId?: string;
  mloImageId?: string;
  ccRegionIndex?: number;
  mloRegionIndex?: number;
  correlationScore: number;
}

/**
 * Correlates findings between CC and MLO views of the same breast
 * 
 * Uses spatial proximity heuristics to match suspicious regions
 * between the two standard mammography views.
 * 
 * @param results - Analysis results with suspicious regions
 * @param images - Images with view type and laterality metadata
 * @returns Array of correlations between CC and MLO regions
 */
export function correlateCCandMLOFindings(
  results: ImageAnalysisResult[],
  images: MammogramImage[]
): CCMLOCorrelation[] {
  const correlations: CCMLOCorrelation[] = [];

  // Group images by laterality
  const imagesByLaterality = new Map<Laterality, { cc?: MammogramImage; mlo?: MammogramImage }>();
  
  for (const image of images) {
    if (!imagesByLaterality.has(image.laterality)) {
      imagesByLaterality.set(image.laterality, {});
    }
    const entry = imagesByLaterality.get(image.laterality)!;
    if (image.viewType === ViewType.CC) {
      entry.cc = image;
    } else if (image.viewType === ViewType.MLO) {
      entry.mlo = image;
    }
  }

  // Process each breast
  for (const [laterality, views] of imagesByLaterality) {
    if (!views.cc || !views.mlo) continue;

    const ccResult = results.find((r) => r.imageId === views.cc!.id);
    const mloResult = results.find((r) => r.imageId === views.mlo!.id);

    if (!ccResult || !mloResult) continue;

    // Correlate regions between views
    for (let ccIdx = 0; ccIdx < (ccResult.suspiciousRegions?.length || 0); ccIdx++) {
      const ccRegion = ccResult.suspiciousRegions![ccIdx];
      
      for (let mloIdx = 0; mloIdx < (mloResult.suspiciousRegions?.length || 0); mloIdx++) {
        const mloRegion = mloResult.suspiciousRegions![mloIdx];
        
        // Calculate correlation score based on:
        // - Horizontal position similarity (X axis roughly corresponds in both views)
        // - Attention score similarity
        const [ccX, ccY, ccW, ccH] = ccRegion.bbox;
        const [mloX, mloY, mloW, mloH] = mloRegion.bbox;
        
        // Normalize X positions and compare
        const ccCenterX = ccX + ccW / 2;
        const mloCenterX = mloX + mloW / 2;
        
        // Simple heuristic: if X positions are within 30% of image width, consider correlated
        // In real implementation, would use more sophisticated spatial mapping
        const xDiff = Math.abs(ccCenterX - mloCenterX);
        const xSimilarity = Math.max(0, 1 - xDiff / 200); // Normalized by assumed image width
        
        const scoreSimilarity = 1 - Math.abs(ccRegion.attentionScore - mloRegion.attentionScore);
        
        const correlationScore = (xSimilarity * 0.6 + scoreSimilarity * 0.4);
        
        // Only include if correlation is strong enough
        if (correlationScore > 0.5) {
          correlations.push({
            id: `corr-${laterality}-${ccIdx}-${mloIdx}`,
            laterality,
            ccImageId: views.cc!.id,
            mloImageId: views.mlo!.id,
            ccRegionIndex: ccIdx,
            mloRegionIndex: mloIdx,
            correlationScore,
          });
        }
      }
    }
  }

  return correlations;
}

/**
 * Consolidates findings from analysis results across multiple views
 * 
 * Creates ConsolidatedFinding objects that represent findings
 * visible across multiple mammography views (CC, MLO) for the same breast.
 * 
 * @param results - Analysis results for all images
 * @param images - Images with metadata
 * @returns Array of consolidated findings
 */
export function consolidateFindings(
  results: ImageAnalysisResult[],
  images: MammogramImage[]
): ConsolidatedFinding[] {
  if (!results || results.length === 0) {
    return [];
  }

  const findings: ConsolidatedFinding[] = [];
  const now = new Date().toISOString();

  // First, get CC↔MLO correlations
  const correlations = correlateCCandMLOFindings(results, images);
  const usedRegions = new Set<string>(); // Track "imageId-regionIndex"

  // Create findings from correlations (multi-view findings)
  for (const corr of correlations) {
    const ccResult = results.find((r) => r.imageId === corr.ccImageId);
    const mloResult = results.find((r) => r.imageId === corr.mloImageId);
    
    if (!ccResult || !mloResult) continue;

    const ccRegion = ccResult.suspiciousRegions?.[corr.ccRegionIndex!];
    const mloRegion = mloResult.suspiciousRegions?.[corr.mloRegionIndex!];
    
    if (!ccRegion || !mloRegion) continue;

    // Mark regions as used
    usedRegions.add(`${corr.ccImageId}-${corr.ccRegionIndex}`);
    usedRegions.add(`${corr.mloImageId}-${corr.mloRegionIndex}`);

    // Average the confidence scores
    const avgConfidence = (ccRegion.attentionScore + mloRegion.attentionScore) / 2;

    findings.push({
      id: `finding-${corr.laterality}-${findings.length + 1}`,
      laterality: corr.laterality,
      findingType: determineFindingType(ccRegion, mloRegion),
      visibleInViews: [corr.ccImageId!, corr.mloImageId!],
      aiCorrelatedRegions: [
        `${corr.ccImageId}:${corr.ccRegionIndex}`,
        `${corr.mloImageId}:${corr.mloRegionIndex}`,
      ],
      aiConfidence: avgConfidence,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Create findings from uncorrelated regions (single-view findings)
  for (const result of results) {
    const image = images.find((img) => img.id === result.imageId);
    
    for (let idx = 0; idx < (result.suspiciousRegions?.length || 0); idx++) {
      const regionKey = `${result.imageId}-${idx}`;
      if (usedRegions.has(regionKey)) continue;

      const region = result.suspiciousRegions![idx];
      
      findings.push({
        id: `finding-${image?.laterality || 'unknown'}-${findings.length + 1}`,
        laterality: image?.laterality || Laterality.RIGHT,
        findingType: determineFindingType(region),
        visibleInViews: [result.imageId],
        aiCorrelatedRegions: [`${result.imageId}:${idx}`],
        aiConfidence: region.attentionScore,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return findings;
}

/**
 * Determines the finding type based on region characteristics
 * (Simplified heuristic - real implementation would use more sophisticated classification)
 */
function determineFindingType(region: SuspiciousRegion, secondRegion?: SuspiciousRegion): FindingType {
  // This is a placeholder heuristic
  // Real implementation would use shape, size, and other features
  const [, , width, height] = region.bbox;
  const aspectRatio = width / height;
  
  if (aspectRatio > 0.8 && aspectRatio < 1.2) {
    // Roughly circular - likely a mass
    return FindingType.MASS;
  } else if (width < 20 && height < 20) {
    // Small - likely calcification
    return FindingType.CALCIFICATION;
  } else {
    // Default to mass
    return FindingType.MASS;
  }
}

// ============================================================================
// RISK CALCULATION
// ============================================================================

/**
 * Calculates aggregate risk level from multiple analysis results
 * 
 * Uses a "worst case" approach - returns the highest risk level found
 * 
 * @param results - Analysis results with risk levels
 * @returns Aggregate risk level
 */
export function calculateAggregateRisk(results: ImageAnalysisResult[]): RiskLevel {
  if (!results || results.length === 0) {
    return 'low';
  }

  const riskPriority: Record<RiskLevel, number> = {
    low: 0,
    moderate: 1,
    high: 2,
  };

  let maxRisk: RiskLevel = 'low';
  let maxPriority = 0;

  for (const result of results) {
    const priority = riskPriority[result.riskLevel];
    if (priority > maxPriority) {
      maxPriority = priority;
      maxRisk = result.riskLevel;
    }
  }

  return maxRisk;
}

/**
 * Calculates suggested BI-RADS category based on findings and results
 * 
 * Algorithm:
 * - No findings + low confidence benign = BI-RADS 1 (Negative)
 * - Findings with low malignancy = BI-RADS 2 (Benign)
 * - Findings with moderate concern = BI-RADS 3 (Probably Benign)
 * - Findings with suspicious features = BI-RADS 4 (Suspicious)
 * - High confidence malignant = BI-RADS 5 (Highly Suggestive)
 * 
 * @param findings - Consolidated findings from analysis
 * @param results - Individual image analysis results
 * @returns Suggested BI-RADS category
 */
export function calculateSuggestedBiRads(
  findings: ConsolidatedFinding[],
  results: ImageAnalysisResult[]
): BiRadsCategory {
  // Defensive null checks
  const safeFindings = findings || [];
  const safeResults = results || [];

  // No findings and all benign predictions = Negative
  if (safeFindings.length === 0) {
    const allBenign = safeResults.every(
      (r) => r.prediction === 'benign' && r.confidence > 0.7
    );
    if (allBenign || safeResults.length === 0) {
      return BiRadsValues.NEGATIVE;
    }
  }

  // Calculate max malignancy probability (with safe access)
  const maxMalignantProb = Math.max(
    0,
    ...safeResults.map((r) => r?.probabilities?.malignant || 0)
  );

  // Calculate max finding confidence (with safe access)
  const maxFindingConfidence = Math.max(
    0,
    ...safeFindings.map((f) => f?.aiConfidence || 0)
  );

  // High confidence malignant = BI-RADS 5
  if (maxMalignantProb >= 0.9 && maxFindingConfidence >= 0.9) {
    return BiRadsValues.HIGHLY_SUGGESTIVE;
  }

  // Moderate-high malignant probability = BI-RADS 4 (using 4B as default suspicious)
  if (maxMalignantProb >= 0.5 || maxFindingConfidence >= 0.7) {
    return BiRadsValues.SUSPICIOUS_MODERATE;
  }

  // Low malignant probability with findings = BI-RADS 3
  if (safeFindings.length > 0 && maxMalignantProb >= 0.2) {
    return BiRadsValues.PROBABLY_BENIGN;
  }

  // Findings with low concern = BI-RADS 2
  if (safeFindings.length > 0) {
    return BiRadsValues.BENIGN;
  }

  return BiRadsValues.NEGATIVE;
}

// ============================================================================
// CASE UPDATE FUNCTIONS
// ============================================================================

/**
 * Marks a case as analyzed by updating with batch results
 * 
 * @param case_ - The case to update
 * @param batchResult - The batch analysis result
 * @param userId - ID of the user performing the action
 * @returns Result with updated case or error
 */
export function markCaseAsAnalyzed(
  case_: ClinicalCase,
  batchResult: BatchAnalysisResult,
  userId: string
): Result<ClinicalCase, Error> {
  // Require at least some successful analyses
  if (batchResult.completedCount === 0) {
    return failure(new Error('Cannot mark case as analyzed with no successful analyses'));
  }

  const now = new Date().toISOString();

  // Create updated case
  const updatedCase: ClinicalCase = {
    ...case_,
    analysisResults: batchResult.results,
    consolidatedFindings: batchResult.consolidatedFindings,
    workflow: {
      ...case_.workflow,
      completedSteps: [
        ...case_.workflow.completedSteps.filter(
          (step) => step !== ClinicalWorkflowStep.BATCH_AI_ANALYSIS
        ),
        ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
      ],
      currentStep: ClinicalWorkflowStep.FINDINGS_REVIEW,
      lastModifiedAt: now,
    },
    audit: {
      ...case_.audit,
      lastModifiedBy: userId,
      lastModifiedAt: now,
      modifications: [
        ...case_.audit.modifications,
        {
          userId,
          timestamp: now,
          action: 'BATCH_ANALYSIS_COMPLETED',
          field: 'analysisResults',
          newValue: {
            totalImages: batchResult.totalImages,
            completedCount: batchResult.completedCount,
            failedCount: batchResult.failedCount,
            processingTimeMs: batchResult.totalProcessingTimeMs,
            suggestedBiRads: batchResult.suggestedBiRads,
          },
        },
      ],
    },
  };

  return success(updatedCase);
}

// ============================================================================
// RETRY FUNCTIONS
// ============================================================================

interface CanRetryResult {
  canRetry: boolean;
  failedImageIds: string[];
}

/**
 * Checks if a case has failed analyses that can be retried
 * 
 * @param case_ - The case to check
 * @returns Object indicating if retry is possible and which images failed
 */
export function canRetryAnalysis(case_: ClinicalCase): CanRetryResult {
  const analyzedIds = new Set(case_.analysisResults?.map((r) => r.imageId) || []);
  const failedImageIds = case_.images
    .filter((img) => !analyzedIds.has(img.id))
    .map((img) => img.id);

  return {
    canRetry: failedImageIds.length > 0,
    failedImageIds,
  };
}

/**
 * Retries analysis for failed images only
 * 
 * @param case_ - The case with failed analyses
 * @param options - Batch analysis options
 * @returns Result with updated batch result including retried images
 */
export async function retryFailedAnalyses(
  case_: ClinicalCase,
  options: BatchAnalysisOptions = {}
): Promise<Result<BatchAnalysisResult, BatchAnalysisError>> {
  const { failedImageIds } = canRetryAnalysis(case_);
  
  if (failedImageIds.length === 0) {
    // No failed images - return existing results
    return success({
      totalImages: case_.images.length,
      completedCount: case_.analysisResults?.length || 0,
      failedCount: 0,
      results: case_.analysisResults || [],
      consolidatedFindings: case_.consolidatedFindings || [],
      totalProcessingTimeMs: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
  }

  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  const mergedOptions = { ...DEFAULT_BATCH_ANALYSIS_OPTIONS, ...options };
  const { concurrencyLimit, timeoutPerImage, onProgress, continueOnError, abortSignal } = mergedOptions;

  const imagesToRetry = case_.images.filter((img) => failedImageIds.includes(img.id));
  const results: ImageAnalysisResult[] = [...(case_.analysisResults || [])];
  const newFailedIds: string[] = [];

  // Process in chunks
  for (let i = 0; i < imagesToRetry.length; i += concurrencyLimit) {
    if (abortSignal?.aborted) {
      return failure(
        new BatchAnalysisError(
          'Retry aborted by user',
          ErrorCode.ANALYSIS_FAILED,
          imagesToRetry.slice(i).map((img) => img.id),
          results
        )
      );
    }

    const chunk = imagesToRetry.slice(i, i + concurrencyLimit);
    
    const chunkPromises = chunk.map(async (image) => {
      const result = await runSingleImageAnalysis(image, {
        timeout: timeoutPerImage,
        abortSignal,
      });
      return { imageId: image.id, result };
    });

    const chunkResults = await Promise.all(chunkPromises);

    for (const { imageId, result } of chunkResults) {
      if (result.success) {
        results.push(result.data);
      } else if (isFailure(result)) {
        newFailedIds.push(imageId);
        if (!continueOnError) {
          return failure(
            new BatchAnalysisError(
              `Retry failed for image ${imageId}: ${result.error.message}`,
              ErrorCode.ANALYSIS_FAILED,
              [imageId],
              results
            )
          );
        }
      }
    }

    if (onProgress) {
      const processed = Math.min(i + concurrencyLimit, imagesToRetry.length);
      onProgress(Math.round((processed / imagesToRetry.length) * 100));
    }
  }

  const completedAt = new Date().toISOString();
  const consolidatedFindings = consolidateFindings(results, case_.images);

  return success({
    totalImages: case_.images.length,
    completedCount: results.length,
    failedCount: newFailedIds.length,
    results,
    consolidatedFindings,
    suggestedBiRads: calculateSuggestedBiRads(consolidatedFindings, results),
    totalProcessingTimeMs: Date.now() - startTime,
    startedAt,
    completedAt,
    warnings: newFailedIds.length > 0 
      ? [`${newFailedIds.length} images still failed after retry`]
      : undefined,
  });
}
