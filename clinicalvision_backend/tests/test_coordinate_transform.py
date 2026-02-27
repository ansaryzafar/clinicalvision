"""
Comprehensive Test Suite for Coordinate Transformation Utilities

Tests coordinate transformations between model space (224×224) and 
original mammogram space (variable sizes like 3000×4000).

Edge cases tested:
- Square images
- Portrait/landscape aspect ratios
- Extreme aspect ratios
- Boundary conditions
- Round-trip transformations
- Heatmap scaling
- Non-Maximum Suppression
"""

import pytest
import numpy as np
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.utils.coordinate_transform import (
    CoordinateTransformer,
    transform_regions_to_original,
    merge_overlapping_regions
)


class TestCoordinateTransformerBasics:
    """Basic coordinate transformation tests."""
    
    def test_init_square_image(self):
        """Test initialization with square image."""
        transformer = CoordinateTransformer((1000, 1000), model_size=224)
        assert transformer.original_width == 1000
        assert transformer.original_height == 1000
        assert transformer.scale_x == pytest.approx(1000 / 224, rel=1e-6)
        assert transformer.scale_y == pytest.approx(1000 / 224, rel=1e-6)
    
    def test_init_landscape_image(self):
        """Test initialization with landscape image."""
        transformer = CoordinateTransformer((4000, 3000), model_size=224)
        assert transformer.original_width == 4000
        assert transformer.original_height == 3000
        assert transformer.scale_x > transformer.scale_y
    
    def test_init_portrait_image(self):
        """Test initialization with portrait image."""
        transformer = CoordinateTransformer((2000, 4000), model_size=224)
        assert transformer.scale_x < transformer.scale_y
    
    def test_init_custom_model_size(self):
        """Test with custom model size."""
        transformer = CoordinateTransformer((1000, 1000), model_size=512)
        assert transformer.model_size == 512
        assert transformer.scale_x == pytest.approx(1000 / 512, rel=1e-6)


class TestBboxTransformations:
    """Test bounding box coordinate transformations."""
    
    @pytest.fixture
    def standard_transformer(self):
        """Standard 3000×4000 mammogram transformer."""
        return CoordinateTransformer((3000, 4000), model_size=224)
    
    def test_model_to_original_basic(self, standard_transformer):
        """Test basic model-to-original transformation."""
        model_bbox = [50, 50, 30, 40]
        original = standard_transformer.model_to_original(model_bbox)
        
        # x = 50 * (3000/224) ≈ 670
        # y = 50 * (4000/224) ≈ 893
        assert original[0] > model_bbox[0]  # x should scale up
        assert original[1] > model_bbox[1]  # y should scale up
        assert original[2] > model_bbox[2]  # width should scale up
        assert original[3] > model_bbox[3]  # height should scale up
    
    def test_original_to_model_basic(self, standard_transformer):
        """Test basic original-to-model transformation."""
        original_bbox = [670, 893, 400, 700]
        model = standard_transformer.original_to_model(original_bbox)
        
        assert model[0] < original_bbox[0]  # x should scale down
        assert model[1] < original_bbox[1]  # y should scale down
    
    def test_round_trip_bbox(self, standard_transformer):
        """Test that model→original→model gives same result (within rounding)."""
        original_bbox = [50, 60, 30, 40]
        
        # Round trip
        scaled_up = standard_transformer.model_to_original(original_bbox)
        round_trip = standard_transformer.original_to_model(scaled_up)
        
        # Allow 1 pixel tolerance for rounding
        assert abs(round_trip[0] - original_bbox[0]) <= 1
        assert abs(round_trip[1] - original_bbox[1]) <= 1
        assert abs(round_trip[2] - original_bbox[2]) <= 1
        assert abs(round_trip[3] - original_bbox[3]) <= 1
    
    def test_zero_bbox(self, standard_transformer):
        """Test with bbox at origin."""
        bbox = [0, 0, 10, 10]
        result = standard_transformer.model_to_original(bbox)
        assert result[0] == 0
        assert result[1] == 0
        assert result[2] > 0
        assert result[3] > 0
    
    def test_max_bbox(self, standard_transformer):
        """Test with bbox at maximum model coordinates."""
        bbox = [224 - 10, 224 - 10, 10, 10]
        result = standard_transformer.model_to_original(bbox)
        
        # Should be near original image boundary
        assert result[0] > 2800  # Near 3000 width edge
        assert result[1] > 3800  # Near 4000 height edge


class TestPointTransformations:
    """Test single point coordinate transformations."""
    
    @pytest.fixture
    def transformer(self):
        return CoordinateTransformer((3000, 4000), model_size=224)
    
    def test_model_point_to_original(self, transformer):
        """Test model point to original."""
        x, y = transformer.model_point_to_original(112, 112)
        assert x == pytest.approx(1500, rel=0.01)  # Center of 3000
        assert y == pytest.approx(2000, rel=0.01)  # Center of 4000
    
    def test_original_point_to_model(self, transformer):
        """Test original point to model."""
        x, y = transformer.original_point_to_model(1500, 2000)
        assert x == pytest.approx(112, abs=1)  # Center of 224
        assert y == pytest.approx(112, abs=1)
    
    def test_corner_points(self, transformer):
        """Test corner point transformations."""
        # Top-left
        x, y = transformer.model_point_to_original(0, 0)
        assert x == 0 and y == 0
        
        # Bottom-right (model space is 0-223)
        x, y = transformer.model_point_to_original(223, 223)
        assert x > 2900  # Near 3000
        assert y > 3900  # Near 4000


class TestHeatmapOperations:
    """Test heatmap upscaling and downscaling."""
    
    @pytest.fixture
    def transformer(self):
        return CoordinateTransformer((1000, 800), model_size=224)
    
    def test_upscale_heatmap_shape(self, transformer):
        """Test that upscaled heatmap has correct shape."""
        heatmap = np.random.rand(56, 56).astype(np.float32)
        upscaled = transformer.upscale_heatmap(heatmap)
        
        assert upscaled.shape == (800, 1000)  # height × width (numpy convention)
    
    def test_upscale_heatmap_range(self, transformer):
        """Test that upscaling preserves value range approximately."""
        heatmap = np.random.rand(56, 56).astype(np.float32)
        upscaled = transformer.upscale_heatmap(heatmap)
        
        # Cubic interpolation can cause slight overshoot/undershoot
        # Allow for interpolation artifacts
        assert upscaled.min() >= -0.3
        assert upscaled.max() <= 1.3
    
    def test_upscale_heatmap_224(self, transformer):
        """Test upscaling from 224×224 attention map."""
        heatmap = np.random.rand(224, 224).astype(np.float32)
        upscaled = transformer.upscale_heatmap(heatmap)
        
        assert upscaled.shape == (800, 1000)
    
    def test_downscale_to_model(self, transformer):
        """Test downscaling image to model size."""
        image = np.random.randint(0, 255, (800, 1000), dtype=np.uint8)
        downscaled = transformer.downscale_to_model(image)
        
        assert downscaled.shape == (224, 224)
    
    def test_uniform_heatmap_upscale(self, transformer):
        """Test that uniform heatmap stays uniform after upscaling."""
        heatmap = np.ones((56, 56), dtype=np.float32) * 0.5
        upscaled = transformer.upscale_heatmap(heatmap)
        
        assert np.allclose(upscaled, 0.5, atol=0.01)


class TestMetadata:
    """Test metadata generation."""
    
    def test_get_metadata_square(self):
        """Test metadata for square image."""
        transformer = CoordinateTransformer((2000, 2000), model_size=224)
        meta = transformer.get_metadata()
        
        assert meta['original_width'] == 2000
        assert meta['original_height'] == 2000
        assert meta['model_width'] == 224
        assert meta['model_height'] == 224
        assert meta['aspect_ratio'] == pytest.approx(1.0)
        assert meta['scale_x'] == meta['scale_y']
    
    def test_get_metadata_landscape(self):
        """Test metadata for landscape image."""
        transformer = CoordinateTransformer((4000, 3000), model_size=224)
        meta = transformer.get_metadata()
        
        assert meta['aspect_ratio'] == pytest.approx(4000/3000)
        assert meta['scale_x'] > meta['scale_y']
    
    def test_get_metadata_portrait(self):
        """Test metadata for portrait image."""
        transformer = CoordinateTransformer((2000, 4000), model_size=224)
        meta = transformer.get_metadata()
        
        assert meta['aspect_ratio'] == pytest.approx(0.5)
        assert meta['scale_x'] < meta['scale_y']


class TestRegionTransformation:
    """Test bulk region transformations."""
    
    def test_transform_empty_regions(self):
        """Test with empty region list."""
        transformer = CoordinateTransformer((3000, 4000))
        result = transform_regions_to_original([], transformer)
        assert result == []
    
    def test_transform_single_region(self):
        """Test transforming a single region."""
        transformer = CoordinateTransformer((3000, 4000))
        regions = [
            {'bbox': [50, 50, 30, 40], 'attention_score': 0.8}
        ]
        
        result = transform_regions_to_original(regions, transformer)
        
        assert len(result) == 1
        assert 'bbox_model' in result[0]
        assert 'bbox_original' in result[0]
        assert result[0]['bbox_model'] == [50, 50, 30, 40]
        assert all(v > 0 for v in result[0]['bbox_original'])
    
    def test_transform_multiple_regions(self):
        """Test transforming multiple regions."""
        transformer = CoordinateTransformer((3000, 4000))
        regions = [
            {'bbox': [10, 10, 20, 20], 'attention_score': 0.9},
            {'bbox': [100, 100, 50, 50], 'attention_score': 0.7},
            {'bbox': [200, 150, 30, 60], 'attention_score': 0.5}
        ]
        
        result = transform_regions_to_original(regions, transformer)
        
        assert len(result) == 3
        for r in result:
            assert 'bbox_original' in r
            assert 'bbox_model' in r
    
    def test_preserves_other_fields(self):
        """Test that transformation preserves non-bbox fields."""
        transformer = CoordinateTransformer((3000, 4000))
        regions = [
            {
                'bbox': [50, 50, 30, 40],
                'attention_score': 0.8,
                'label': 'suspicious',
                'extra_data': {'key': 'value'}
            }
        ]
        
        result = transform_regions_to_original(regions, transformer)
        
        assert result[0]['attention_score'] == 0.8
        assert result[0]['label'] == 'suspicious'
        assert result[0]['extra_data'] == {'key': 'value'}


class TestNonMaxSuppression:
    """Test Non-Maximum Suppression for overlapping regions."""
    
    def test_merge_empty_regions(self):
        """Test with empty region list."""
        result = merge_overlapping_regions([])
        assert result == []
    
    def test_merge_single_region(self):
        """Test with single region (no merging needed)."""
        regions = [
            {'bbox_original': [100, 100, 50, 50], 'attention_score': 0.8}
        ]
        result = merge_overlapping_regions(regions)
        assert len(result) == 1
    
    def test_merge_non_overlapping(self):
        """Test that non-overlapping regions are kept separate."""
        regions = [
            {'bbox_original': [0, 0, 50, 50], 'attention_score': 0.8},
            {'bbox_original': [200, 200, 50, 50], 'attention_score': 0.7}
        ]
        result = merge_overlapping_regions(regions)
        assert len(result) == 2
    
    def test_merge_overlapping(self):
        """Test that overlapping regions are merged."""
        regions = [
            {'bbox_original': [0, 0, 100, 100], 'attention_score': 0.9},
            {'bbox_original': [10, 10, 100, 100], 'attention_score': 0.8},
            {'bbox_original': [20, 20, 100, 100], 'attention_score': 0.7}
        ]
        result = merge_overlapping_regions(regions, iou_threshold=0.3)
        # High-overlap boxes should be suppressed, keeping highest score
        assert len(result) < 3
        # Highest score should be kept
        assert result[0]['attention_score'] == 0.9
    
    def test_merge_keeps_highest_score(self):
        """Test that NMS keeps the region with highest attention score."""
        regions = [
            {'bbox_original': [0, 0, 100, 100], 'attention_score': 0.5},
            {'bbox_original': [0, 0, 100, 100], 'attention_score': 0.9},  # Same box, higher score
            {'bbox_original': [0, 0, 100, 100], 'attention_score': 0.7}
        ]
        result = merge_overlapping_regions(regions, iou_threshold=0.5)
        assert len(result) == 1
        assert result[0]['attention_score'] == 0.9
    
    def test_merge_respects_threshold(self):
        """Test that IoU threshold is respected."""
        regions = [
            {'bbox_original': [0, 0, 100, 100], 'attention_score': 0.9},
            {'bbox_original': [80, 80, 100, 100], 'attention_score': 0.8}  # Small overlap
        ]
        # With high threshold, should keep both
        result = merge_overlapping_regions(regions, iou_threshold=0.8)
        assert len(result) == 2


class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_very_small_image(self):
        """Test with image smaller than model size."""
        transformer = CoordinateTransformer((100, 100), model_size=224)
        
        # Scale factors should be < 1
        assert transformer.scale_x < 1
        assert transformer.scale_y < 1
        
        # Transformation should still work
        bbox = [50, 50, 30, 30]
        result = transformer.model_to_original(bbox)
        assert all(v >= 0 for v in result)
    
    def test_very_large_image(self):
        """Test with very large image."""
        transformer = CoordinateTransformer((10000, 8000), model_size=224)
        
        bbox = [10, 10, 20, 20]
        result = transformer.model_to_original(bbox)
        
        # Should produce large coordinates
        assert result[0] > 400
        assert result[1] > 350
    
    def test_extreme_aspect_ratio(self):
        """Test with extreme aspect ratio (panoramic)."""
        transformer = CoordinateTransformer((10000, 500), model_size=224)
        
        assert transformer.scale_x > 40  # Very wide
        assert transformer.scale_y < 3   # Short
        
        meta = transformer.get_metadata()
        assert meta['aspect_ratio'] == pytest.approx(20.0)
    
    def test_single_pixel_bbox(self):
        """Test with 1×1 pixel bounding box."""
        transformer = CoordinateTransformer((2000, 2000), model_size=224)
        
        bbox = [100, 100, 1, 1]
        result = transformer.model_to_original(bbox)
        
        # Width/height should be at least scale factor
        assert result[2] >= 1
        assert result[3] >= 1
    
    def test_full_image_bbox(self):
        """Test bbox covering entire model space."""
        transformer = CoordinateTransformer((3000, 4000), model_size=224)
        
        bbox = [0, 0, 224, 224]
        result = transformer.model_to_original(bbox)
        
        # Should cover most of original image
        assert result[2] >= 2900  # Near full width
        assert result[3] >= 3900  # Near full height
    
    def test_negative_coordinates_handling(self):
        """Test that negative coordinates are handled (even if unusual)."""
        transformer = CoordinateTransformer((1000, 1000), model_size=224)
        
        # Negative coordinates (edge case, shouldn't happen in practice)
        bbox = [-10, -10, 30, 30]
        result = transformer.model_to_original(bbox)
        
        # Should return negative values (caller's responsibility to handle)
        assert result[0] < 0
        assert result[1] < 0


class TestRealWorldScenarios:
    """Test realistic mammogram scenarios."""
    
    def test_typical_ffdm_mammogram(self):
        """Test with typical Full-Field Digital Mammogram dimensions."""
        # FFDM is typically 3328×4096 or similar
        transformer = CoordinateTransformer((3328, 4096), model_size=224)
        
        # Suspicious region at center
        model_bbox = [100, 100, 50, 60]
        original_bbox = transformer.model_to_original(model_bbox)
        
        assert original_bbox[0] > 1400  # Should be past center x
        assert original_bbox[1] > 1800  # Should be past center y
    
    def test_screen_film_mammogram(self):
        """Test with digitized screen-film mammogram."""
        # Digitized films can be various sizes
        transformer = CoordinateTransformer((2048, 2560), model_size=224)
        
        meta = transformer.get_metadata()
        assert meta['aspect_ratio'] == pytest.approx(0.8)
    
    def test_multiple_suspicious_regions(self):
        """Test handling multiple suspicious regions in single mammogram."""
        transformer = CoordinateTransformer((3000, 4000), model_size=224)
        
        regions = [
            {'bbox': [30, 40, 40, 50], 'attention_score': 0.95},  # Mass
            {'bbox': [150, 100, 20, 30], 'attention_score': 0.75},  # Calcification
            {'bbox': [80, 180, 35, 40], 'attention_score': 0.60}   # Suspicious area
        ]
        
        transformed = transform_regions_to_original(regions, transformer)
        
        # All regions should be properly transformed
        assert len(transformed) == 3
        
        # Higher model coordinates should result in higher original coordinates
        # (maintaining relative positions)
        assert transformed[1]['bbox_original'][0] > transformed[0]['bbox_original'][0]


# Run with pytest
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
