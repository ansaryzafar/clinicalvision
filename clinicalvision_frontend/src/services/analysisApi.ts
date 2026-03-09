/**
 * Analysis API - Adapter for Batch AI Analysis
 * 
 * Bridges between the existing api.predict() function and the 
 * batch analysis operations module.
 * 
 * @version 1.0
 */

import api, { InferenceResponse, SuspiciousRegion as APISuspiciousRegion, UncertaintyMetrics, ImageMetadata } from './api';
import {
  MammogramImage,
  ImageAnalysisResult,
  SuspiciousRegion,
  RiskLevel,
  UncertaintyInfo,
  ImageDimensionMetadata,
} from '../types/case.types';

// ============================================================================
// TYPES
// ============================================================================

interface AnalyzeImageParams {
  imageId: string;
  imageUrl?: string;
  file?: File;
}

// ============================================================================
// TRANSFORMATIONS
// ============================================================================

/**
 * Transforms API SuspiciousRegion to domain SuspiciousRegion
 */
function transformSuspiciousRegion(apiRegion: APISuspiciousRegion): SuspiciousRegion {
  return {
    bbox: (apiRegion.bbox_original || apiRegion.bbox) as [number, number, number, number],
    attentionScore: apiRegion.attention_score,
    description: apiRegion.location || `Region ${apiRegion.region_id}`,
  };
}

/**
 * Transforms API UncertaintyMetrics (snake_case) to domain UncertaintyInfo (camelCase)
 */
function transformUncertainty(apiUncertainty: UncertaintyMetrics): UncertaintyInfo {
  return {
    epistemicUncertainty: apiUncertainty.epistemic_uncertainty,
    aleatoricUncertainty: apiUncertainty.aleatoric_uncertainty,
    predictiveEntropy: apiUncertainty.predictive_entropy,
    mutualInformation: apiUncertainty.mutual_information,
    mcSamples: apiUncertainty.mc_samples,
    mcStd: apiUncertainty.mc_std,
    requiresHumanReview: apiUncertainty.requires_human_review,
  };
}

/**
 * Transforms API ImageMetadata (snake_case) to domain ImageDimensionMetadata (camelCase)
 */
function transformImageMetadata(apiMeta: ImageMetadata): ImageDimensionMetadata {
  return {
    originalWidth: apiMeta.original_width,
    originalHeight: apiMeta.original_height,
    modelWidth: apiMeta.model_width,
    modelHeight: apiMeta.model_height,
    scaleX: apiMeta.scale_x,
    scaleY: apiMeta.scale_y,
    aspectRatio: apiMeta.aspect_ratio,
    coordinateSystem: apiMeta.coordinate_system,
  };
}

/**
 * Transforms InferenceResponse to ImageAnalysisResult
 * 
 * CRITICAL: Preserves ALL data from the API response including:
 * - attention_map (for GradCAM++ heatmap overlay in MedicalViewer)
 * - uncertainty (for model confidence display)
 * - image_metadata (for coordinate transformation)
 * - model_version (from API, not hardcoded)
 * - confidence_explanation (for clinical reporting)
 */
function transformInferenceResponse(
  imageId: string,
  response: InferenceResponse
): ImageAnalysisResult {
  // Map API risk_level to domain RiskLevel
  const riskLevelMap: Record<string, RiskLevel> = {
    low: 'low',
    moderate: 'moderate',
    high: 'high',
  };

  return {
    imageId,
    prediction: response.prediction,
    confidence: response.confidence,
    probabilities: {
      benign: response.probabilities.benign,
      malignant: response.probabilities.malignant,
    },
    riskLevel: riskLevelMap[response.risk_level] || 'moderate',
    suspiciousRegions: (response.explanation?.suspicious_regions || []).map(
      transformSuspiciousRegion
    ),
    attentionSummary: response.explanation?.narrative,
    // ── Previously dropped fields — now preserved ─────────────────────
    attentionMap: response.explanation?.attention_map,
    uncertainty: response.uncertainty ? transformUncertainty(response.uncertainty) : undefined,
    imageMetadata: response.image_metadata ? transformImageMetadata(response.image_metadata) : undefined,
    confidenceExplanation: response.explanation?.confidence_explanation,
    modelVersion: response.model_version || 'unknown',
    processingTimeMs: response.inference_time_ms || 0,
    analyzedAt: new Date().toISOString(),
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Validates that a URL is safe to fetch (no javascript: or data: protocols for XSS)
 */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Only allow http, https, blob, and object URLs
  const validProtocols = ['http:', 'https:', 'blob:'];
  try {
    const urlObj = new URL(url);
    return validProtocols.includes(urlObj.protocol);
  } catch {
    // If URL parsing fails, it might be a relative path - that's okay
    return !url.startsWith('javascript:') && !url.startsWith('data:');
  }
}

/**
 * Analyzes a mammogram image using the AI inference API
 * 
 * This function bridges between MammogramImage and the api.predict() function.
 * It handles:
 * - Input validation for security
 * - Fetching the image blob from localUrl
 * - Converting to File for API upload
 * - Transforming response to ImageAnalysisResult
 * 
 * @param params - Analysis parameters including imageId and imageUrl or file
 * @returns Promise<ImageAnalysisResult> - Analysis result
 * @throws Error if analysis fails or input validation fails
 */
export async function analyzeImage(params: AnalyzeImageParams): Promise<ImageAnalysisResult> {
  const { imageId, imageUrl, file } = params;

  // Input validation for security
  if (!imageId || typeof imageId !== 'string') {
    throw new Error('Invalid imageId: must be a non-empty string');
  }

  let imageFile: File;

  if (file) {
    // Validate file is actually a File object
    if (!(file instanceof File)) {
      throw new Error('Invalid file: must be a File object');
    }
    // Use provided file directly
    imageFile = file;
  } else if (imageUrl) {
    // Validate URL is safe before fetching
    if (!isValidImageUrl(imageUrl)) {
      throw new Error('Invalid imageUrl: potentially unsafe URL protocol');
    }
    // Fetch blob from URL and convert to File
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      
      // Validate blob is an image or DICOM type
      // DICOM files often arrive as application/dicom or application/octet-stream
      const ACCEPTED_TYPES = ['image/', 'application/dicom', 'application/octet-stream'];
      if (!ACCEPTED_TYPES.some((t) => blob.type.startsWith(t))) {
        throw new Error(`Invalid content type: expected image, got ${blob.type}`);
      }
      
      imageFile = new File([blob], `${imageId}.png`, { type: blob.type });
    } catch (fetchError) {
      throw new Error(`Failed to load image for analysis: ${fetchError}`);
    }
  } else {
    throw new Error('Either imageUrl or file must be provided');
  }

  // Call the existing predict API
  const inferenceResponse = await api.predict(imageFile, {
    return_visualization: false,
    return_attention_maps: true,
    save_result: true,
  });

  // Transform to domain type
  return transformInferenceResponse(imageId, inferenceResponse);
}

/**
 * Analyzes a MammogramImage using the AI inference API
 * 
 * Convenience wrapper that extracts the necessary parameters from MammogramImage
 * 
 * @param image - The MammogramImage to analyze
 * @returns Promise<ImageAnalysisResult> - Analysis result
 */
export async function analyzeMammogramImage(image: MammogramImage): Promise<ImageAnalysisResult> {
  return analyzeImage({
    imageId: image.id,
    imageUrl: image.localUrl,
  });
}

/**
 * Analyzes multiple mammogram images in a single batch request.
 *
 * Instead of N individual HTTP calls, sends all files to `/predict-batch`
 * for server-side concurrent processing. Falls back to sequential calls
 * if the batch endpoint is unavailable.
 *
 * @param images - Array of { imageId, imageUrl } pairs
 * @returns Promise<ImageAnalysisResult[]> in the same order as input
 */
export async function analyzeImageBatch(
  images: Array<{ imageId: string; imageUrl: string }>
): Promise<ImageAnalysisResult[]> {
  // 1. Fetch all blobs in parallel
  const fileFetches = images.map(async ({ imageId, imageUrl }) => {
    if (!isValidImageUrl(imageUrl)) {
      throw new Error(`Invalid imageUrl for ${imageId}`);
    }
    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error(`Failed to fetch image ${imageId}`);
    const blob = await resp.blob();
    return new File([blob], `${imageId}.png`, { type: blob.type });
  });
  const files = await Promise.all(fileFetches);

  // 2. Call batch endpoint
  try {
    const batchResp = await api.predictBatch(files, { save_result: true });
    return batchResp.results.map((r, i) =>
      transformInferenceResponse(images[i].imageId, r as InferenceResponse)
    );
  } catch {
    // Fallback: sequential single calls if batch endpoint unavailable
    const results: ImageAnalysisResult[] = [];
    for (let i = 0; i < images.length; i++) {
      results.push(await analyzeImage(images[i]));
    }
    return results;
  }
}

export default {
  analyzeImage,
  analyzeMammogramImage,
  analyzeImageBatch,
};
