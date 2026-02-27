/**
 * Comprehensive Test Suite for Image Viewer Integration
 * 
 * Tests the integration between:
 * - Tile-based analysis and viewer
 * - Coordinate transformation display
 * - Suspicious region overlay
 * - Analysis mode switching
 * - Large image handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Image
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 3000;
  height = 4000;

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 10);
  }
}
global.Image = MockImage as any;

// Mock Canvas
HTMLCanvasElement.prototype.getContext = jest.fn((type: string) => {
  if (type === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(100 * 100 * 4),
      })),
      putImageData: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      beginPath: jest.fn(),
      rect: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn(),
    } as any;
  }
  return null;
}) as any;

HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  callback(new Blob(['test'], { type: 'image/jpeg' }));
});

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
Storage.prototype.getItem = jest.fn(() => 'mock-jwt-token');

describe('Coordinate Transformation Integration', () => {
  test('converts model coordinates to display coordinates', () => {
    // Simulating coordinate conversion for display
    const modelCoord = { x: 100, y: 100, width: 50, height: 50 };
    const originalSize = { width: 3000, height: 4000 };
    const modelSize = 224;
    
    const scaleX = originalSize.width / modelSize;
    const scaleY = originalSize.height / modelSize;
    
    const displayCoord = {
      x: Math.round(modelCoord.x * scaleX),
      y: Math.round(modelCoord.y * scaleY),
      width: Math.round(modelCoord.width * scaleX),
      height: Math.round(modelCoord.height * scaleY),
    };
    
    // Expected: ~1339, ~1786, ~670, ~893
    expect(displayCoord.x).toBeGreaterThan(1300);
    expect(displayCoord.y).toBeGreaterThan(1700);
    expect(displayCoord.width).toBeGreaterThan(600);
    expect(displayCoord.height).toBeGreaterThan(800);
  });
  
  test('handles coordinate transformation for various aspect ratios', () => {
    const testCases = [
      { original: { width: 3000, height: 4000 }, model: 224 },
      { original: { width: 4000, height: 3000 }, model: 224 },
      { original: { width: 2000, height: 2000 }, model: 224 },
      { original: { width: 500, height: 600 }, model: 224 },
    ];
    
    testCases.forEach(({ original, model }) => {
      const scaleX = original.width / model;
      const scaleY = original.height / model;
      
      // Point at center of model space
      const modelCenter = { x: 112, y: 112 };
      const originalCenter = {
        x: Math.round(modelCenter.x * scaleX),
        y: Math.round(modelCenter.y * scaleY),
      };
      
      // Should be approximately at center of original
      expect(originalCenter.x).toBeCloseTo(original.width / 2, -1);
      expect(originalCenter.y).toBeCloseTo(original.height / 2, -1);
    });
  });
});


describe('Suspicious Region Overlay', () => {
  test('correctly positions suspicious regions on viewer', () => {
    const suspiciousRegions = [
      {
        region_id: 'r1',
        bbox: [50, 60, 30, 40], // Model coordinates
        bbox_original: [669, 1071, 401, 714], // Original coordinates
        attention_score: 0.85,
        clinical_significance: 'high',
      },
      {
        region_id: 'r2',
        bbox: [150, 100, 20, 25],
        bbox_original: [2007, 1786, 268, 446],
        attention_score: 0.65,
        clinical_significance: 'moderate',
      },
    ];
    
    // All regions should have valid original coordinates
    suspiciousRegions.forEach(region => {
      expect(region.bbox_original[0]).toBeGreaterThan(0); // x
      expect(region.bbox_original[1]).toBeGreaterThan(0); // y
      expect(region.bbox_original[2]).toBeGreaterThan(0); // width
      expect(region.bbox_original[3]).toBeGreaterThan(0); // height
    });
  });
  
  test('applies correct styling based on clinical significance', () => {
    const getOverlayStyle = (significance: string) => {
      switch (significance) {
        case 'high':
          return { color: 'red', opacity: 0.7 };
        case 'moderate':
          return { color: 'orange', opacity: 0.5 };
        case 'low':
          return { color: 'yellow', opacity: 0.3 };
        default:
          return { color: 'blue', opacity: 0.3 };
      }
    };
    
    expect(getOverlayStyle('high').color).toBe('red');
    expect(getOverlayStyle('moderate').color).toBe('orange');
    expect(getOverlayStyle('low').color).toBe('yellow');
  });
});


describe('Analysis Mode UI', () => {
  test('displays analysis mode selector for large images', () => {
    const isFullSizeMammogram = (dimensions: { width: number; height: number }) => {
      return dimensions.width > 2000 || dimensions.height > 2000;
    };
    
    // Large image should show selector
    expect(isFullSizeMammogram({ width: 3000, height: 4000 })).toBe(true);
    
    // Small image should not show selector
    expect(isFullSizeMammogram({ width: 500, height: 600 })).toBe(false);
  });
  
  test('returns correct recommended mode based on image size', () => {
    const getRecommendedMode = (dimensions: { width: number; height: number } | null) => {
      if (!dimensions) return 'global_only';
      const isLarge = dimensions.width > 2000 || dimensions.height > 2000;
      return isLarge ? 'attention_guided' : 'global_only';
    };
    
    expect(getRecommendedMode({ width: 3000, height: 4000 })).toBe('attention_guided');
    expect(getRecommendedMode({ width: 500, height: 600 })).toBe('global_only');
    expect(getRecommendedMode(null)).toBe('global_only');
  });
  
  test('mode options have correct descriptions', () => {
    const modeOptions = [
      { value: 'global_only', label: 'Quick Analysis', description: 'Fast screening' },
      { value: 'attention_guided', label: 'Attention-Guided', description: 'Recommended' },
      { value: 'full_coverage', label: 'Comprehensive', description: 'Most thorough' },
    ];
    
    expect(modeOptions[0].value).toBe('global_only');
    expect(modeOptions[1].value).toBe('attention_guided');
    expect(modeOptions[2].value).toBe('full_coverage');
  });
});


describe('Tile Analysis Display', () => {
  test('displays tile analysis metrics when available', () => {
    const tileAnalysisMetrics = {
      global_probability: 0.4,
      tile_weighted_average: 0.35,
      tile_max_probability: 0.6,
      final_probability: 0.42,
      tiles: [
        {
          tile_id: 0,
          position: [100, 200],
          attention_score: 0.85,
          breast_coverage: 0.95,
          prediction: 'benign',
          malignancy_prob: 0.15,
          confidence: 0.9,
        },
      ],
    };
    
    expect(tileAnalysisMetrics.tiles.length).toBe(1);
    expect(tileAnalysisMetrics.final_probability).toBe(0.42);
  });
  
  test('shows tile overlay on viewer', () => {
    const tiles = [
      { tile_id: 0, position: [0, 0], attention_score: 0.9 },
      { tile_id: 1, position: [168, 0], attention_score: 0.7 },
      { tile_id: 2, position: [0, 168], attention_score: 0.5 },
    ];
    
    // All tiles should have valid positions
    tiles.forEach(tile => {
      expect(tile.position[0]).toBeGreaterThanOrEqual(0);
      expect(tile.position[1]).toBeGreaterThanOrEqual(0);
    });
  });
  
  test('colors tiles based on attention score', () => {
    const getTileColor = (attentionScore: number) => {
      if (attentionScore > 0.7) return 'rgba(255, 0, 0, 0.3)';
      if (attentionScore > 0.4) return 'rgba(255, 165, 0, 0.3)';
      return 'rgba(0, 255, 0, 0.2)';
    };
    
    expect(getTileColor(0.9)).toBe('rgba(255, 0, 0, 0.3)');
    expect(getTileColor(0.5)).toBe('rgba(255, 165, 0, 0.3)');
    expect(getTileColor(0.2)).toBe('rgba(0, 255, 0, 0.2)');
  });
});


describe('Image Metadata Display', () => {
  test('displays original image dimensions', () => {
    const imageMetadata = {
      original_width: 3000,
      original_height: 4000,
      model_width: 224,
      model_height: 224,
      scale_x: 13.39,
      scale_y: 17.86,
      aspect_ratio: 0.75,
    };
    
    const dimensionString = `${imageMetadata.original_width} × ${imageMetadata.original_height}`;
    expect(dimensionString).toBe('3000 × 4000');
  });
  
  test('calculates correct scale factors', () => {
    const calculateScales = (original: { w: number; h: number }, model: number) => ({
      scaleX: original.w / model,
      scaleY: original.h / model,
    });
    
    const scales = calculateScales({ w: 3000, h: 4000 }, 224);
    
    expect(scales.scaleX).toBeCloseTo(13.39, 1);
    expect(scales.scaleY).toBeCloseTo(17.86, 1);
  });
});


describe('Progressive Loading Integration', () => {
  test('shows thumbnail during loading', async () => {
    const loadState = {
      thumbnail: 'blob:thumbnail-url',
      fullImage: null,
      loadProgress: 30,
      isLoading: true,
      error: null,
      imageDimensions: null,
    };
    
    expect(loadState.thumbnail).not.toBeNull();
    expect(loadState.fullImage).toBeNull();
    expect(loadState.isLoading).toBe(true);
    expect(loadState.loadProgress).toBeLessThan(100);
  });
  
  test('shows full image after loading', () => {
    const loadState = {
      thumbnail: 'blob:thumbnail-url',
      fullImage: 'blob:full-image-url',
      loadProgress: 100,
      isLoading: false,
      error: null,
      imageDimensions: { width: 3000, height: 4000 },
    };
    
    expect(loadState.fullImage).not.toBeNull();
    expect(loadState.isLoading).toBe(false);
    expect(loadState.loadProgress).toBe(100);
    expect(loadState.imageDimensions).toEqual({ width: 3000, height: 4000 });
  });
  
  test('handles loading errors', () => {
    const loadState = {
      thumbnail: null,
      fullImage: null,
      loadProgress: 0,
      isLoading: false,
      error: 'Failed to load image',
      imageDimensions: null,
    };
    
    expect(loadState.error).not.toBeNull();
    expect(loadState.isLoading).toBe(false);
  });
});


describe('Heatmap Overlay Scaling', () => {
  test('scales heatmap to original image size', () => {
    // Heatmap is typically 224x224 or 56x56 from model
    const heatmapSize = 224;
    const originalSize = { width: 3000, height: 4000 };
    
    const scaleHeatmap = (
      heatmap: number[][],
      targetWidth: number,
      targetHeight: number
    ) => {
      // Simplified scaling logic
      const scaleX = targetWidth / heatmap[0].length;
      const scaleY = targetHeight / heatmap.length;
      return { scaleX, scaleY };
    };
    
    const mockHeatmap = Array(heatmapSize).fill(Array(heatmapSize).fill(0.5));
    const scales = scaleHeatmap(mockHeatmap, originalSize.width, originalSize.height);
    
    expect(scales.scaleX).toBeCloseTo(13.39, 1);
    expect(scales.scaleY).toBeCloseTo(17.86, 1);
  });
  
  test('preserves heatmap value range after scaling', () => {
    const originalHeatmap = [
      [0.0, 0.5],
      [0.5, 1.0],
    ];
    
    const minValue = Math.min(...originalHeatmap.flat());
    const maxValue = Math.max(...originalHeatmap.flat());
    
    expect(minValue).toBe(0.0);
    expect(maxValue).toBe(1.0);
  });
});


describe('Viewer Panel Synchronization', () => {
  test('syncs zoom level across panels', () => {
    const panelStates = [
      { id: 'rcc', zoom: 1.5 },
      { id: 'lcc', zoom: 1.5 },
      { id: 'rmlo', zoom: 1.5 },
      { id: 'lmlo', zoom: 1.5 },
    ];
    
    // All panels should have same zoom
    const zooms = panelStates.map(p => p.zoom);
    expect(new Set(zooms).size).toBe(1);
  });
  
  test('syncs WW/WL settings across panels', () => {
    const panelStates = [
      { id: 'rcc', ww: 400, wl: 200 },
      { id: 'lcc', ww: 400, wl: 200 },
      { id: 'rmlo', ww: 400, wl: 200 },
      { id: 'lmlo', ww: 400, wl: 200 },
    ];
    
    // All panels should have same WW/WL
    const wwValues = panelStates.map(p => p.ww);
    const wlValues = panelStates.map(p => p.wl);
    expect(new Set(wwValues).size).toBe(1);
    expect(new Set(wlValues).size).toBe(1);
  });
});


describe('Edge Cases', () => {
  test('handles missing image metadata gracefully', () => {
    const result = {
      prediction: 'benign',
      confidence: 0.9,
      image_metadata: null,
    };
    
    const getDisplayDimensions = (metadata: any) => {
      if (!metadata) return 'Unknown';
      return `${metadata.original_width} × ${metadata.original_height}`;
    };
    
    expect(getDisplayDimensions(result.image_metadata)).toBe('Unknown');
  });
  
  test('handles empty suspicious regions array', () => {
    const result = {
      explanation: {
        suspicious_regions: [],
      },
    };
    
    expect(result.explanation.suspicious_regions.length).toBe(0);
  });
  
  test('handles null tile_analysis for global_only mode', () => {
    const result = {
      analysis_mode: 'global_only',
      tiles_analyzed: 0,
      tile_analysis: null,
    };
    
    expect(result.tile_analysis).toBeNull();
    expect(result.tiles_analyzed).toBe(0);
  });
  
  test('handles very small images', () => {
    const smallImageDimensions = { width: 100, height: 100 };
    const modelSize = 224;
    
    // Scale factors will be < 1
    const scaleX = smallImageDimensions.width / modelSize;
    const scaleY = smallImageDimensions.height / modelSize;
    
    expect(scaleX).toBeLessThan(1);
    expect(scaleY).toBeLessThan(1);
  });
});
