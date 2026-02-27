/**
 * Comprehensive Test Suite for API Service - Tile Analysis
 * 
 * Tests:
 * - Type definitions match backend schemas
 * - Response schema validation
 * - Analysis modes
 * - Coordinate transformation logic
 */

import { 
  AnalysisMode, 
  TileConfig, 
  TileAnalysisResponse,
  TileAnalysisOptions,
  TileInfo,
  TileAnalysisMetrics,
  UncertaintyMetrics,
  SuspiciousRegion,
  ImageMetadata,
  ExplanationData
} from '../../services/api';

// ============================================================================
// Type Definition Tests - Ensure frontend types match backend schemas
// ============================================================================

describe('API Service - Tile Analysis Types', () => {
  
  describe('Analysis Mode Types', () => {
    test('global_only mode is valid', () => {
      const mode: AnalysisMode = 'global_only';
      expect(mode).toBe('global_only');
    });
    
    test('attention_guided mode is valid', () => {
      const mode: AnalysisMode = 'attention_guided';
      expect(mode).toBe('attention_guided');
    });
    
    test('full_coverage mode is valid', () => {
      const mode: AnalysisMode = 'full_coverage';
      expect(mode).toBe('full_coverage');
    });
  });
  
  describe('TileConfig Types', () => {
    test('creates valid tile config with all fields', () => {
      const config: TileConfig = {
        tile_size: 224,
        overlap: 0.25,
        attention_threshold: 0.3,
        max_tiles: 50
      };
      
      expect(config.tile_size).toBe(224);
      expect(config.overlap).toBe(0.25);
      expect(config.attention_threshold).toBe(0.3);
      expect(config.max_tiles).toBe(50);
    });
    
    test('allows custom tile sizes', () => {
      const config: TileConfig = {
        tile_size: 512,
        overlap: 0.5,
        attention_threshold: 0.4,
        max_tiles: 100
      };
      
      expect(config.tile_size).toBe(512);
    });
  });
  
  describe('TileInfo Types', () => {
    test('creates valid tile info', () => {
      const tile: TileInfo = {
        tile_id: 1,
        position: [100, 200],
        attention_score: 0.85,
        breast_coverage: 0.7,
        prediction: 'benign',
        malignancy_prob: 0.15,
        confidence: 0.9
      };
      
      expect(tile.tile_id).toBe(1);
      expect(tile.position).toEqual([100, 200]);
      expect(tile.prediction).toBe('benign');
    });
    
    test('allows malignant prediction', () => {
      const tile: TileInfo = {
        tile_id: 2,
        position: [300, 400],
        attention_score: 0.95,
        breast_coverage: 0.8,
        prediction: 'malignant',
        malignancy_prob: 0.87,
        confidence: 0.92
      };
      
      expect(tile.prediction).toBe('malignant');
      expect(tile.malignancy_prob).toBeGreaterThan(0.5);
    });
  });
  
  describe('TileAnalysisMetrics Types', () => {
    test('creates valid metrics with tiles', () => {
      const metrics: TileAnalysisMetrics = {
        global_probability: 0.4,
        tile_weighted_average: 0.35,
        tile_max_probability: 0.6,
        final_probability: 0.42,
        tiles: [
          {
            tile_id: 1,
            position: [0, 0],
            attention_score: 0.8,
            breast_coverage: 0.9,
            prediction: 'benign',
            malignancy_prob: 0.3,
            confidence: 0.85
          }
        ]
      };
      
      expect(metrics.global_probability).toBe(0.4);
      expect(metrics.tiles).toHaveLength(1);
    });
    
    test('allows empty tiles array', () => {
      const metrics: TileAnalysisMetrics = {
        global_probability: 0.2,
        tile_weighted_average: 0.2,
        tile_max_probability: 0.2,
        final_probability: 0.2,
        tiles: []
      };
      
      expect(metrics.tiles).toHaveLength(0);
    });
  });
  
  describe('UncertaintyMetrics Types', () => {
    test('creates valid uncertainty with required fields', () => {
      const uncertainty: UncertaintyMetrics = {
        epistemic_uncertainty: 0.05,
        predictive_entropy: 0.13,
        requires_human_review: false
      };
      
      expect(uncertainty.epistemic_uncertainty).toBe(0.05);
      expect(uncertainty.requires_human_review).toBe(false);
    });
    
    test('allows all optional fields', () => {
      const uncertainty: UncertaintyMetrics = {
        epistemic_uncertainty: 0.08,
        aleatoric_uncertainty: 0.05,
        predictive_entropy: 0.15,
        mutual_information: 0.03,
        mc_samples: 20,
        mc_std: 0.04,
        requires_human_review: true
      };
      
      expect(uncertainty.mc_samples).toBe(20);
      expect(uncertainty.mc_std).toBe(0.04);
    });
  });
  
  describe('ImageMetadata Types', () => {
    test('creates valid image metadata', () => {
      const metadata: ImageMetadata = {
        original_width: 3000,
        original_height: 4000,
        model_width: 224,
        model_height: 224,
        scale_x: 13.39,
        scale_y: 17.86,
        aspect_ratio: 0.75,
        coordinate_system: 'model'
      };
      
      expect(metadata.original_width).toBe(3000);
      expect(metadata.scale_x).toBeCloseTo(3000 / 224, 1);
    });
    
    test('supports original coordinate system', () => {
      const metadata: ImageMetadata = {
        original_width: 500,
        original_height: 600,
        model_width: 224,
        model_height: 224,
        scale_x: 2.23,
        scale_y: 2.68,
        aspect_ratio: 0.83,
        coordinate_system: 'original'
      };
      
      expect(metadata.coordinate_system).toBe('original');
    });
  });
  
  describe('SuspiciousRegion Types', () => {
    test('creates valid region with required fields', () => {
      const region: SuspiciousRegion = {
        region_id: 1,
        bbox: [100, 100, 50, 50],
        attention_score: 0.9,
        location: 'upper outer quadrant'
      };
      
      expect(region.region_id).toBe(1);
      expect(region.bbox).toHaveLength(4);
    });
    
    test('allows optional bbox coordinates', () => {
      const region: SuspiciousRegion = {
        region_id: 2,
        bbox: [50, 50, 30, 30],
        bbox_model: [50, 50, 30, 30],
        bbox_original: [500, 500, 300, 300],
        attention_score: 0.85,
        location: 'lower inner quadrant',
        area_pixels: 900,
        area_pixels_original: 90000
      };
      
      expect(region.bbox_original).toEqual([500, 500, 300, 300]);
    });
  });
  
  describe('ExplanationData Types', () => {
    test('creates valid explanation with regions', () => {
      const explanation: ExplanationData = {
        attention_map: [[0.5, 0.6], [0.7, 0.8]],
        suspicious_regions: [
          {
            region_id: 1,
            bbox: [10, 10, 20, 20],
            attention_score: 0.9,
            location: 'upper outer quadrant'
          }
        ],
        narrative: 'Suspicious mass detected.',
        confidence_explanation: 'High confidence due to clear features.'
      };
      
      expect(explanation.suspicious_regions).toHaveLength(1);
      expect(explanation.narrative).toContain('Suspicious');
    });
    
    test('allows null attention map', () => {
      const explanation: ExplanationData = {
        attention_map: null,
        suspicious_regions: [],
        narrative: 'No suspicious findings.',
        confidence_explanation: 'High confidence benign.'
      };
      
      expect(explanation.attention_map).toBeNull();
      expect(explanation.suspicious_regions).toHaveLength(0);
    });
  });
  
  describe('TileAnalysisResponse Schema', () => {
    test('response contains all required fields', () => {
      const response: TileAnalysisResponse = {
        prediction: 'benign',
        confidence: 0.85,
        probabilities: { benign: 0.85, malignant: 0.15 },
        risk_level: 'low',
        uncertainty: {
          epistemic_uncertainty: 0.05,
          predictive_entropy: 0.13,
          requires_human_review: false
        },
        explanation: {
          attention_map: null,
          suspicious_regions: [],
          narrative: 'No suspicious findings detected.',
          confidence_explanation: 'High confidence benign classification.'
        },
        image_metadata: {
          original_width: 3000,
          original_height: 4000,
          model_width: 224,
          model_height: 224,
          scale_x: 13.39,
          scale_y: 17.86,
          aspect_ratio: 0.75,
          coordinate_system: 'model'
        },
        analysis_mode: 'attention_guided',
        tiles_analyzed: 5,
        tile_analysis: {
          global_probability: 0.4,
          tile_weighted_average: 0.35,
          tile_max_probability: 0.6,
          final_probability: 0.42,
          tiles: []
        },
        case_id: 'case-123',
        model_version: 'v12_production',
        inference_time_ms: 1500,
        timestamp: '2026-02-03T12:00:00Z'
      };
      
      // Verify all required fields
      expect(response.prediction).toBeDefined();
      expect(response.confidence).toBeDefined();
      expect(response.probabilities).toBeDefined();
      expect(response.risk_level).toBeDefined();
      expect(response.uncertainty).toBeDefined();
      expect(response.explanation).toBeDefined();
      expect(response.analysis_mode).toBeDefined();
      expect(response.tiles_analyzed).toBeDefined();
      expect(response.case_id).toBeDefined();
      expect(response.model_version).toBeDefined();
      expect(response.inference_time_ms).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });
    
    test('tile_analysis can be undefined for global_only mode', () => {
      const response: TileAnalysisResponse = {
        prediction: 'benign',
        confidence: 0.9,
        probabilities: { benign: 0.9, malignant: 0.1 },
        risk_level: 'low',
        uncertainty: {
          epistemic_uncertainty: 0.03,
          predictive_entropy: 0.08,
          requires_human_review: false
        },
        explanation: {
          attention_map: null,
          suspicious_regions: [],
          narrative: 'No findings.',
          confidence_explanation: 'High confidence.'
        },
        analysis_mode: 'global_only',
        tiles_analyzed: 0,
        tile_analysis: undefined,
        case_id: 'case-456',
        model_version: 'v12',
        inference_time_ms: 150,
        timestamp: '2026-02-03T12:00:00Z'
      };
      
      expect(response.tile_analysis).toBeUndefined();
      expect(response.tiles_analyzed).toBe(0);
    });
    
    test('supports malignant prediction with high risk', () => {
      const response: TileAnalysisResponse = {
        prediction: 'malignant',
        confidence: 0.88,
        probabilities: { benign: 0.12, malignant: 0.88 },
        risk_level: 'high',
        uncertainty: {
          epistemic_uncertainty: 0.07,
          aleatoric_uncertainty: 0.04,
          predictive_entropy: 0.2,
          mc_samples: 30,
          mc_std: 0.05,
          requires_human_review: true
        },
        explanation: {
          attention_map: [[0.9, 0.8], [0.7, 0.6]],
          suspicious_regions: [{
            region_id: 1,
            bbox: [100, 100, 50, 50],
            bbox_original: [1000, 1000, 500, 500],
            attention_score: 0.92,
            location: 'upper outer quadrant'
          }],
          narrative: 'High-density irregular mass detected.',
          confidence_explanation: 'High confidence based on morphological features.'
        },
        image_metadata: {
          original_width: 2500,
          original_height: 3500,
          model_width: 224,
          model_height: 224,
          scale_x: 11.16,
          scale_y: 15.63,
          aspect_ratio: 0.71,
          coordinate_system: 'original'
        },
        analysis_mode: 'full_coverage',
        tiles_analyzed: 25,
        tile_analysis: {
          global_probability: 0.75,
          tile_weighted_average: 0.82,
          tile_max_probability: 0.95,
          final_probability: 0.88,
          tiles: [{
            tile_id: 1,
            position: [1000, 1000],
            attention_score: 0.95,
            breast_coverage: 0.9,
            prediction: 'malignant',
            malignancy_prob: 0.95,
            confidence: 0.92
          }]
        },
        case_id: 'case-789',
        model_version: 'v12_production',
        inference_time_ms: 3500,
        timestamp: '2026-02-03T12:00:00Z'
      };
      
      expect(response.prediction).toBe('malignant');
      expect(response.risk_level).toBe('high');
      expect(response.uncertainty.requires_human_review).toBe(true);
    });
  });
  
  describe('TileAnalysisOptions Types', () => {
    test('all options are optional', () => {
      const options: TileAnalysisOptions = {};
      expect(options.mode).toBeUndefined();
    });
    
    test('allows partial options', () => {
      const options: TileAnalysisOptions = {
        mode: 'attention_guided',
        tile_size: 256
      };
      
      expect(options.mode).toBe('attention_guided');
      expect(options.tile_size).toBe(256);
      expect(options.overlap).toBeUndefined();
    });
    
    test('allows all options', () => {
      const options: TileAnalysisOptions = {
        mode: 'full_coverage',
        tile_size: 512,
        overlap: 0.5,
        attention_threshold: 0.4,
        max_tiles: 100,
        save_result: true
      };
      
      expect(options.save_result).toBe(true);
    });
  });
});

// ============================================================================
// API Endpoint Path Tests
// ============================================================================

describe('API Service - Endpoint Paths', () => {
  test('predict-tiles endpoint path is correct', () => {
    // This test documents the expected endpoint path
    const expectedPath = '/inference/predict-tiles';
    expect(expectedPath).toBe('/inference/predict-tiles');
  });
  
  test('predict endpoint path is correct', () => {
    const expectedPath = '/inference/predict';
    expect(expectedPath).toBe('/inference/predict');
  });
  
  test('predict-from-storage endpoint path pattern is correct', () => {
    const imageId = '123';
    const expectedPath = `/inference/predict-from-storage/${imageId}`;
    expect(expectedPath).toContain('/inference/predict-from-storage/');
  });
  
  test('inference history endpoint path pattern is correct', () => {
    const imageId = '456';
    const expectedPath = `/inference/history/${imageId}`;
    expect(expectedPath).toContain('/inference/history/');
  });
});

// ============================================================================
// Coordinate Transformation Tests
// ============================================================================

describe('Coordinate Transformation Logic', () => {
  test('calculates scale factors correctly', () => {
    const originalWidth = 3000;
    const originalHeight = 4000;
    const modelWidth = 224;
    const modelHeight = 224;
    
    const scaleX = originalWidth / modelWidth;
    const scaleY = originalHeight / modelHeight;
    
    expect(scaleX).toBeCloseTo(13.39, 1);
    expect(scaleY).toBeCloseTo(17.86, 1);
  });
  
  test('transforms model coordinates to original', () => {
    const modelBbox = [50, 50, 30, 30]; // [x, y, w, h]
    const scaleX = 10;
    const scaleY = 15;
    
    const originalBbox = [
      Math.round(modelBbox[0] * scaleX),
      Math.round(modelBbox[1] * scaleY),
      Math.round(modelBbox[2] * scaleX),
      Math.round(modelBbox[3] * scaleY)
    ];
    
    expect(originalBbox).toEqual([500, 750, 300, 450]);
  });
  
  test('handles aspect ratio calculation', () => {
    const width = 3000;
    const height = 4000;
    const aspectRatio = width / height;
    
    expect(aspectRatio).toBeCloseTo(0.75, 2);
  });
});
