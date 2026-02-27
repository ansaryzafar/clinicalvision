/**
 * Analysis API Tests — DICOM Acceptance Fix (Phase D, Step D.5)
 *
 * TDD RED → GREEN tests verifying that the analyzeImage function
 * correctly accepts DICOM files (application/dicom) and generic
 * binary files (application/octet-stream) in addition to standard
 * image/* types, while still rejecting truly invalid types.
 *
 * @jest-environment jsdom
 */

// We need to test the internal validation logic of analyzeImage
// by mocking fetch to return blobs of different types.

import { analyzeImage } from '../analysisApi';

// Mock the api module's predict method
jest.mock('../api', () => {
  const mockPredict = jest.fn().mockResolvedValue({
    prediction: 'benign',
    confidence: 0.95,
    probabilities: { benign: 0.95, malignant: 0.05 },
    risk_level: 'low',
    inference_time_ms: 150,
    explanation: {
      suspicious_regions: [],
      narrative: 'No suspicious findings',
      confidence_explanation: 'High confidence benign prediction',
    },
  });
  return {
    __esModule: true,
    default: { predict: mockPredict },
    InferenceResponse: {},
    SuspiciousRegion: {},
  };
});

import api from '../api';
const mockPredict = (api as any).predict as jest.Mock;

// ============================================================================
// TESTS
// ============================================================================

describe('analysisApi DICOM acceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPredict.mockResolvedValue({
      prediction: 'benign',
      confidence: 0.95,
      probabilities: { benign: 0.95, malignant: 0.05 },
      risk_level: 'low',
      inference_time_ms: 150,
      explanation: {
        suspicious_regions: [],
        narrative: 'No suspicious findings',
        confidence_explanation: 'High confidence benign prediction',
      },
    });
  });

  // ── Standard image types (should always work) ──────────────────────────

  it('accepts image/png blobs', async () => {
    const blob = new Blob(['fake-png-data'], { type: 'image/png' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    const result = await analyzeImage({
      imageId: 'img-001',
      imageUrl: 'https://example.com/image.png',
    });

    expect(result.imageId).toBe('img-001');
    expect(mockPredict).toHaveBeenCalledTimes(1);
  });

  it('accepts image/jpeg blobs', async () => {
    const blob = new Blob(['fake-jpg-data'], { type: 'image/jpeg' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    const result = await analyzeImage({
      imageId: 'img-002',
      imageUrl: 'https://example.com/image.jpg',
    });

    expect(result.imageId).toBe('img-002');
    expect(mockPredict).toHaveBeenCalledTimes(1);
  });

  // ── DICOM types (the fix) ──────────────────────────────────────────────

  it('accepts application/dicom blobs', async () => {
    const blob = new Blob(['fake-dicom-data'], { type: 'application/dicom' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    const result = await analyzeImage({
      imageId: 'img-003',
      imageUrl: 'https://example.com/mammogram.dcm',
    });

    expect(result.imageId).toBe('img-003');
    expect(mockPredict).toHaveBeenCalledTimes(1);
  });

  it('accepts application/octet-stream blobs (common for DICOM)', async () => {
    const blob = new Blob(['fake-binary-data'], { type: 'application/octet-stream' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    const result = await analyzeImage({
      imageId: 'img-004',
      imageUrl: 'https://example.com/mammogram.dcm',
    });

    expect(result.imageId).toBe('img-004');
    expect(mockPredict).toHaveBeenCalledTimes(1);
  });

  // ── Invalid types (should still be rejected) ──────────────────────────

  it('rejects text/plain blobs', async () => {
    const blob = new Blob(['not an image'], { type: 'text/plain' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    await expect(
      analyzeImage({
        imageId: 'img-005',
        imageUrl: 'https://example.com/readme.txt',
      }),
    ).rejects.toThrow(/invalid content type|expected image/i);
    expect(mockPredict).not.toHaveBeenCalled();
  });

  it('rejects text/html blobs', async () => {
    const blob = new Blob(['<html></html>'], { type: 'text/html' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    await expect(
      analyzeImage({
        imageId: 'img-006',
        imageUrl: 'https://example.com/page.html',
      }),
    ).rejects.toThrow(/invalid content type|expected image/i);
    expect(mockPredict).not.toHaveBeenCalled();
  });

  it('rejects application/json blobs', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    await expect(
      analyzeImage({
        imageId: 'img-007',
        imageUrl: 'https://example.com/data.json',
      }),
    ).rejects.toThrow(/invalid content type|expected image/i);
    expect(mockPredict).not.toHaveBeenCalled();
  });

  // ── File-based input (should still work regardless of type check) ──────

  it('accepts File objects directly without content-type check', async () => {
    const file = new File(['fake-data'], 'mammogram.dcm', { type: 'application/dicom' });

    const result = await analyzeImage({
      imageId: 'img-008',
      file,
    });

    expect(result.imageId).toBe('img-008');
    expect(mockPredict).toHaveBeenCalledTimes(1);
  });
});
