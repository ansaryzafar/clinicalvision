/**
 * Analysis API — Data Pipeline Transform Tests (Phase 1)
 *
 * TDD RED → GREEN tests verifying that transformInferenceResponse
 * preserves ALL critical data from the API response, including:
 *   - attention_map (for GradCAM++ heatmap overlay in MedicalViewer)
 *   - uncertainty metrics (for model confidence display)
 *   - image_metadata (for coordinate transformation)
 *   - model_version (from API, not hardcoded)
 *
 * These fields were previously DROPPED during the transform,
 * causing the Image Analysis Suite to show raw images with no AI overlay.
 *
 * @jest-environment jsdom
 */

// ── Mock the API module ────────────────────────────────────────────────
jest.mock('../api', () => {
  const mockPredict = jest.fn();
  return {
    __esModule: true,
    default: { predict: mockPredict },
    InferenceResponse: {},
    SuspiciousRegion: {},
  };
});

import { analyzeImage } from '../analysisApi';
import api from '../api';
const mockPredict = (api as any).predict as jest.Mock;

// ============================================================================
// TEST DATA
// ============================================================================

const FULL_INFERENCE_RESPONSE = {
  prediction: 'malignant' as const,
  confidence: 0.838,
  probabilities: { benign: 0.162, malignant: 0.838 },
  risk_level: 'high',
  inference_time_ms: 2450,
  model_version: 'densenet121-mc-v2.3',
  case_id: 'case-001',
  timestamp: '2026-02-25T10:00:00Z',
  uncertainty: {
    epistemic_uncertainty: 0.023,
    aleatoric_uncertainty: 0.015,
    predictive_entropy: 0.42,
    mutual_information: 0.18,
    mc_samples: 20,
    mc_std: 0.031,
    requires_human_review: false,
  },
  explanation: {
    attention_map: [
      [0.0, 0.1, 0.2],
      [0.3, 0.9, 0.4],
      [0.1, 0.2, 0.0],
    ],
    suspicious_regions: [
      {
        region_id: 1,
        bbox: [50, 60, 100, 80],
        bbox_original: [200, 240, 400, 320],
        attention_score: 0.92,
        location: 'Upper outer quadrant',
        area_pixels: 8000,
        area_pixels_original: 128000,
      },
    ],
    narrative: 'High attention in upper outer quadrant with irregular margin.',
    confidence_explanation: 'MC Dropout with 20 forward passes yielded consistent prediction.',
  },
  image_metadata: {
    original_width: 3328,
    original_height: 4096,
    model_width: 224,
    model_height: 224,
    scale_x: 14.857,
    scale_y: 18.286,
    aspect_ratio: 0.8125,
    coordinate_system: 'model' as const,
  },
};

// ============================================================================
// TESTS
// ============================================================================

describe('transformInferenceResponse — data pipeline completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPredict.mockResolvedValue(FULL_INFERENCE_RESPONSE);
  });

  // ── Core fields (already working) ──────────────────────────────────────

  it('preserves prediction, confidence, and probabilities', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.prediction).toBe('malignant');
    expect(result.confidence).toBe(0.838);
    expect(result.probabilities).toEqual({ benign: 0.162, malignant: 0.838 });
  });

  it('preserves riskLevel and suspiciousRegions', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.riskLevel).toBe('high');
    expect(result.suspiciousRegions).toHaveLength(1);
    expect(result.suspiciousRegions[0].attentionScore).toBe(0.92);
  });

  // ── Attention map (CRITICAL — was being DROPPED) ────────────────────

  it('preserves attention_map as attentionMap', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.attentionMap).toBeDefined();
    expect(result.attentionMap).toEqual([
      [0.0, 0.1, 0.2],
      [0.3, 0.9, 0.4],
      [0.1, 0.2, 0.0],
    ]);
  });

  it('handles missing attention_map gracefully', async () => {
    mockPredict.mockResolvedValue({
      ...FULL_INFERENCE_RESPONSE,
      explanation: {
        ...FULL_INFERENCE_RESPONSE.explanation,
        attention_map: undefined,
      },
    });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.attentionMap).toBeUndefined();
  });

  // ── Uncertainty metrics (was being DROPPED) ────────────────────────

  it('preserves uncertainty metrics', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.uncertainty).toBeDefined();
    expect(result.uncertainty!.epistemicUncertainty).toBe(0.023);
    expect(result.uncertainty!.predictiveEntropy).toBe(0.42);
    expect(result.uncertainty!.mcSamples).toBe(20);
    expect(result.uncertainty!.requiresHumanReview).toBe(false);
  });

  it('handles missing uncertainty gracefully', async () => {
    mockPredict.mockResolvedValue({
      ...FULL_INFERENCE_RESPONSE,
      uncertainty: undefined,
    });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.uncertainty).toBeUndefined();
  });

  // ── Image metadata (was being DROPPED) ────────────────────────────

  it('preserves image_metadata as imageMetadata', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.imageMetadata).toBeDefined();
    expect(result.imageMetadata!.originalWidth).toBe(3328);
    expect(result.imageMetadata!.originalHeight).toBe(4096);
    expect(result.imageMetadata!.scaleX).toBe(14.857);
    expect(result.imageMetadata!.scaleY).toBe(18.286);
  });

  it('handles missing image_metadata gracefully', async () => {
    mockPredict.mockResolvedValue({
      ...FULL_INFERENCE_RESPONSE,
      image_metadata: undefined,
    });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.imageMetadata).toBeUndefined();
  });

  // ── Model version (was hardcoded to 'v1.0.0') ─────────────────────

  it('uses model_version from API response instead of hardcoded value', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.modelVersion).toBe('densenet121-mc-v2.3');
    expect(result.modelVersion).not.toBe('v1.0.0'); // No longer hardcoded
  });

  it('falls back to "unknown" when model_version is missing', async () => {
    mockPredict.mockResolvedValue({
      ...FULL_INFERENCE_RESPONSE,
      model_version: undefined,
    });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.modelVersion).toBe('unknown');
  });

  // ── Suspicious region coordinate mapping ───────────────────────────

  it('uses bbox_original when available for suspicious regions', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.suspiciousRegions[0].bbox).toEqual([200, 240, 400, 320]);
  });

  it('falls back to bbox when bbox_original is not available', async () => {
    mockPredict.mockResolvedValue({
      ...FULL_INFERENCE_RESPONSE,
      explanation: {
        ...FULL_INFERENCE_RESPONSE.explanation,
        suspicious_regions: [
          {
            region_id: 1,
            bbox: [50, 60, 100, 80],
            attention_score: 0.85,
            location: 'Central',
          },
        ],
      },
    });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.suspiciousRegions[0].bbox).toEqual([50, 60, 100, 80]);
  });

  // ── Confidence explanation (narrative already preserved) ───────────

  it('preserves confidence_explanation alongside narrative', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await analyzeImage({ imageId: 'img-001', file });

    expect(result.attentionSummary).toBe(
      'High attention in upper outer quadrant with irregular margin.'
    );
    expect(result.confidenceExplanation).toBe(
      'MC Dropout with 20 forward passes yielded consistent prediction.'
    );
  });
});
