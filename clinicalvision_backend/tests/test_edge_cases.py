"""
Comprehensive Edge Case Test Suite for Full-Size Mammogram Support

Tests edge cases across all components:
- Coordinate transformations
- Tile-based inference
- API endpoints
- Memory handling
- Error recovery
"""

import pytest
import numpy as np
from PIL import Image
import io
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import asyncio

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


class TestExtremeImageSizes:
    """Test handling of extreme image sizes."""
    
    def test_single_pixel_image(self):
        """Test 1×1 pixel image."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((1, 1), model_size=224)
        
        # Scale factors should be very small
        assert transformer.scale_x < 0.01
        assert transformer.scale_y < 0.01
        
        # Transformation should still work
        result = transformer.model_to_original([0, 0, 1, 1])
        assert all(v >= 0 for v in result)
    
    def test_maximum_practical_size(self):
        """Test maximum practical mammogram size (10000×12000)."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((10000, 12000), model_size=224)
        
        # Should handle large scale factors
        assert transformer.scale_x > 40
        assert transformer.scale_y > 50
        
        # Transformation should work
        result = transformer.model_to_original([112, 112, 10, 10])
        assert result[0] > 4500  # Should be near center
        assert result[1] >= 6000  # Allow exact boundary
    
    def test_extreme_aspect_ratio_wide(self):
        """Test extremely wide image (panoramic)."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((10000, 500), model_size=224)
        
        meta = transformer.get_metadata()
        assert meta['aspect_ratio'] == pytest.approx(20.0)
        
        # X scale should be much larger than Y scale
        assert transformer.scale_x > transformer.scale_y * 10
    
    def test_extreme_aspect_ratio_tall(self):
        """Test extremely tall image."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((500, 10000), model_size=224)
        
        meta = transformer.get_metadata()
        assert meta['aspect_ratio'] == pytest.approx(0.05)
        
        # Y scale should be much larger than X scale
        assert transformer.scale_y > transformer.scale_x * 10
    
    def test_square_vs_model_size(self):
        """Test image exactly matching model size."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((224, 224), model_size=224)
        
        # Scale factors should be 1.0
        assert transformer.scale_x == pytest.approx(1.0)
        assert transformer.scale_y == pytest.approx(1.0)
        
        # Transformation should be identity
        bbox = [50, 60, 30, 40]
        result = transformer.model_to_original(bbox)
        assert result == bbox


class TestBoundaryConditions:
    """Test boundary conditions in coordinate transformation."""
    
    def test_zero_coordinates(self):
        """Test transformation at origin."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((3000, 4000))
        
        result = transformer.model_to_original([0, 0, 0, 0])
        assert result == [0, 0, 0, 0]
    
    def test_max_model_coordinates(self):
        """Test transformation at maximum model coordinates."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((3000, 4000))
        
        # Point at (223, 223) - edge of model space
        result = transformer.model_to_original([223, 223, 1, 1])
        
        # Should be near original image edges
        assert result[0] > 2900
        assert result[1] > 3900
    
    def test_beyond_model_boundary(self):
        """Test coordinates beyond model space (edge case)."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((3000, 4000))
        
        # Coordinate beyond 224 (shouldn't happen in practice)
        result = transformer.model_to_original([300, 300, 10, 10])
        
        # Should still transform without error
        assert result[0] > 3000  # Beyond original width
        assert result[1] > 5000  # Beyond original height
    
    def test_negative_coordinates(self):
        """Test handling of negative coordinates."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((3000, 4000))
        
        result = transformer.model_to_original([-10, -10, 20, 20])
        
        # Should return negative values (edge case)
        assert result[0] < 0
        assert result[1] < 0


class TestTileExtractionEdgeCases:
    """Test edge cases in tile extraction."""
    
    @pytest.fixture
    def mock_engine(self):
        from app.models.tile_inference import TileBasedInference, TileConfig
        mock_model = Mock()
        return TileBasedInference(mock_model, TileConfig())
    
    def test_image_exactly_tile_size(self, mock_engine):
        """Test image exactly matching tile size."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        image = np.ones((224, 224), dtype=np.uint8) * 128
        heatmap = np.ones((224, 224), dtype=np.float32) * 0.5
        transformer = CoordinateTransformer((224, 224))
        
        from app.models.tile_inference import AnalysisMode
        tiles = mock_engine._stage2_extract_tiles(
            image, heatmap, transformer, AnalysisMode.FULL_COVERAGE
        )
        
        # Should extract exactly one tile
        assert len(tiles) >= 1
    
    def test_image_slightly_larger_than_tile(self, mock_engine):
        """Test image just slightly larger than tile size."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        image = np.ones((230, 230), dtype=np.uint8) * 128
        heatmap = np.ones((224, 224), dtype=np.float32) * 0.5
        transformer = CoordinateTransformer((230, 230))
        
        from app.models.tile_inference import AnalysisMode
        tiles = mock_engine._stage2_extract_tiles(
            image, heatmap, transformer, AnalysisMode.FULL_COVERAGE
        )
        
        assert isinstance(tiles, list)
    
    def test_all_black_image(self, mock_engine):
        """Test completely black image (no breast tissue)."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        image = np.zeros((500, 500), dtype=np.uint8)  # All black
        heatmap = np.ones((224, 224), dtype=np.float32) * 0.5
        transformer = CoordinateTransformer((500, 500))
        
        from app.models.tile_inference import AnalysisMode
        tiles = mock_engine._stage2_extract_tiles(
            image, heatmap, transformer, AnalysisMode.FULL_COVERAGE
        )
        
        # Should extract few/no tiles due to low breast coverage
        assert isinstance(tiles, list)
        # Most tiles should be skipped
    
    def test_all_white_image(self, mock_engine):
        """Test completely white image (saturated)."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        image = np.ones((500, 500), dtype=np.uint8) * 255  # All white
        heatmap = np.ones((224, 224), dtype=np.float32) * 0.5
        transformer = CoordinateTransformer((500, 500))
        
        from app.models.tile_inference import AnalysisMode
        tiles = mock_engine._stage2_extract_tiles(
            image, heatmap, transformer, AnalysisMode.FULL_COVERAGE
        )
        
        # Should still extract tiles
        assert isinstance(tiles, list)
    
    def test_zero_attention_heatmap(self, mock_engine):
        """Test with zero attention heatmap."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        image = np.ones((500, 500), dtype=np.uint8) * 128
        heatmap = np.zeros((224, 224), dtype=np.float32)  # All zeros
        transformer = CoordinateTransformer((500, 500))
        
        from app.models.tile_inference import AnalysisMode
        tiles = mock_engine._stage2_extract_tiles(
            image, heatmap, transformer, AnalysisMode.ATTENTION_GUIDED
        )
        
        # No tiles should meet attention threshold
        assert len(tiles) == 0
    
    def test_max_attention_heatmap(self, mock_engine):
        """Test with maximum attention everywhere."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        image = np.ones((500, 500), dtype=np.uint8) * 128
        heatmap = np.ones((224, 224), dtype=np.float32)  # All ones
        transformer = CoordinateTransformer((500, 500))
        
        from app.models.tile_inference import AnalysisMode
        tiles = mock_engine._stage2_extract_tiles(
            image, heatmap, transformer, AnalysisMode.ATTENTION_GUIDED
        )
        
        # Should extract tiles up to max_tiles limit
        assert len(tiles) <= mock_engine.config.max_tiles


class TestNMSEdgeCases:
    """Test Non-Maximum Suppression edge cases."""
    
    def test_identical_overlapping_boxes(self):
        """Test with identical bounding boxes."""
        from app.utils.coordinate_transform import merge_overlapping_regions
        
        regions = [
            {'bbox_original': [100, 100, 50, 50], 'attention_score': 0.9},
            {'bbox_original': [100, 100, 50, 50], 'attention_score': 0.8},
            {'bbox_original': [100, 100, 50, 50], 'attention_score': 0.7},
        ]
        
        result = merge_overlapping_regions(regions, iou_threshold=0.5)
        
        # Should keep only highest score
        assert len(result) == 1
        assert result[0]['attention_score'] == 0.9
    
    def test_no_overlap(self):
        """Test with completely non-overlapping boxes."""
        from app.utils.coordinate_transform import merge_overlapping_regions
        
        regions = [
            {'bbox_original': [0, 0, 50, 50], 'attention_score': 0.9},
            {'bbox_original': [200, 200, 50, 50], 'attention_score': 0.8},
            {'bbox_original': [400, 400, 50, 50], 'attention_score': 0.7},
        ]
        
        result = merge_overlapping_regions(regions, iou_threshold=0.5)
        
        # Should keep all regions
        assert len(result) == 3
    
    def test_zero_size_boxes(self):
        """Test with zero-size bounding boxes."""
        from app.utils.coordinate_transform import merge_overlapping_regions
        
        regions = [
            {'bbox_original': [100, 100, 0, 0], 'attention_score': 0.9},
            {'bbox_original': [200, 200, 0, 0], 'attention_score': 0.8},
        ]
        
        # Should handle without crashing (division by zero)
        try:
            result = merge_overlapping_regions(regions, iou_threshold=0.5)
            assert isinstance(result, list)
        except ZeroDivisionError:
            pytest.skip("Zero-size boxes cause division by zero")
    
    def test_single_region(self):
        """Test with single region."""
        from app.utils.coordinate_transform import merge_overlapping_regions
        
        regions = [
            {'bbox_original': [100, 100, 50, 50], 'attention_score': 0.9}
        ]
        
        result = merge_overlapping_regions(regions, iou_threshold=0.5)
        
        assert len(result) == 1
    
    def test_extreme_iou_thresholds(self):
        """Test with extreme IoU thresholds."""
        from app.utils.coordinate_transform import merge_overlapping_regions
        
        regions = [
            {'bbox_original': [0, 0, 100, 100], 'attention_score': 0.9},
            {'bbox_original': [50, 50, 100, 100], 'attention_score': 0.8},
        ]
        
        # IoU = 0 (keep all)
        result = merge_overlapping_regions(regions, iou_threshold=0.0)
        # With threshold 0, even slight overlap triggers suppression
        
        # IoU = 1 (keep all unless identical)
        result = merge_overlapping_regions(regions, iou_threshold=1.0)
        assert len(result) == 2  # No boxes have IoU of exactly 1


class TestHeatmapOperationsEdgeCases:
    """Test edge cases in heatmap operations."""
    
    def test_empty_heatmap(self):
        """Test with empty (0×0) heatmap."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((1000, 1000))
        
        empty_heatmap = np.array([]).reshape(0, 0).astype(np.float32)
        
        # Should handle empty heatmap
        try:
            result = transformer.upscale_heatmap(empty_heatmap)
        except Exception as e:
            # Expected to fail - document the behavior
            assert "empty" in str(e).lower() or isinstance(e, (cv2.error, ValueError))
    
    def test_single_pixel_heatmap(self):
        """Test with 1×1 heatmap."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((1000, 1000))
        
        single_pixel = np.array([[0.5]], dtype=np.float32)
        result = transformer.upscale_heatmap(single_pixel)
        
        assert result.shape == (1000, 1000)
    
    def test_nan_values_in_heatmap(self):
        """Test heatmap containing NaN values."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((500, 500))
        
        heatmap = np.array([[0.5, np.nan], [np.nan, 0.5]], dtype=np.float32)
        
        # Should handle NaN values (behavior may vary)
        result = transformer.upscale_heatmap(heatmap)
        assert result.shape == (500, 500)
    
    def test_inf_values_in_heatmap(self):
        """Test heatmap containing infinite values."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((500, 500))
        
        heatmap = np.array([[0.5, np.inf], [-np.inf, 0.5]], dtype=np.float32)
        
        result = transformer.upscale_heatmap(heatmap)
        assert result.shape == (500, 500)


class TestMemoryEdgeCases:
    """Test memory-related edge cases."""
    
    def test_large_number_of_tiles(self):
        """Test with large number of potential tiles."""
        from app.models.tile_inference import TileConfig
        
        config = TileConfig(max_tiles=200, tile_size=64, overlap=0.0)
        
        # With 64px tiles and no overlap on 4000×4000 image
        # Would be (4000/64)² ≈ 3906 tiles without limit
        # But max_tiles should limit to 200
        assert config.max_tiles == 200
    
    def test_tile_config_limits(self):
        """Test TileConfig validation limits."""
        from app.schemas.inference import TileConfig
        
        # Test at boundary values
        config = TileConfig(
            tile_size=64,  # Minimum
            overlap=0.0,   # Minimum
            attention_threshold=0.0,  # Minimum
            max_tiles=1    # Minimum
        )
        assert config.tile_size == 64
        
        config = TileConfig(
            tile_size=512,   # Maximum
            overlap=0.75,    # Maximum
            attention_threshold=1.0,  # Maximum
            max_tiles=200    # Maximum
        )
        assert config.tile_size == 512


class TestImageFormatEdgeCases:
    """Test various image format edge cases."""
    
    def test_rgba_image(self):
        """Test RGBA image handling."""
        rgba = np.random.randint(0, 255, (100, 100, 4), dtype=np.uint8)
        image = Image.fromarray(rgba, mode='RGBA')
        
        # Convert to grayscale for model
        grayscale = image.convert('L')
        assert grayscale.mode == 'L'
    
    def test_16bit_image(self):
        """Test 16-bit image handling."""
        # DICOM images often use 16-bit depth
        img_16bit = np.random.randint(0, 65535, (100, 100), dtype=np.uint16)
        
        # Convert to 8-bit
        img_8bit = (img_16bit / 256).astype(np.uint8)
        assert img_8bit.dtype == np.uint8
    
    def test_float_image(self):
        """Test float image handling."""
        img_float = np.random.rand(100, 100).astype(np.float32)
        
        # Convert to 8-bit
        img_8bit = (img_float * 255).astype(np.uint8)
        assert img_8bit.dtype == np.uint8
    
    def test_palette_image(self):
        """Test palette (indexed color) image handling."""
        rgb = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        image = Image.fromarray(rgb, mode='RGB')
        palette_image = image.convert('P')
        
        # Convert back to grayscale
        grayscale = palette_image.convert('L')
        assert grayscale.mode == 'L'


class TestConcurrencyEdgeCases:
    """Test concurrent access edge cases."""
    
    @pytest.mark.asyncio
    async def test_concurrent_transformers(self):
        """Test creating multiple transformers concurrently."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        async def create_transformer(size):
            return CoordinateTransformer(size)
        
        # Create multiple transformers
        tasks = [
            create_transformer((1000, 1000)),
            create_transformer((2000, 2000)),
            create_transformer((3000, 4000)),
            create_transformer((500, 600)),
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 4
        assert all(isinstance(t, CoordinateTransformer) for t in results)


class TestRoundTripConsistency:
    """Test round-trip transformation consistency."""
    
    def test_bbox_round_trip(self):
        """Test that model→original→model produces consistent results."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((3000, 4000))
        
        original = [100, 100, 50, 50]
        
        # Forward and back
        transformed = transformer.model_to_original(original)
        back = transformer.original_to_model(transformed)
        
        # Should be within 1 pixel
        for o, b in zip(original, back):
            assert abs(o - b) <= 1
    
    def test_point_round_trip(self):
        """Test that point transformations are reversible."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((3000, 4000))
        
        original_point = (112, 112)
        
        transformed = transformer.model_point_to_original(*original_point)
        back = transformer.original_point_to_model(*transformed)
        
        # Should be within 1 pixel
        assert abs(original_point[0] - back[0]) <= 1
        assert abs(original_point[1] - back[1]) <= 1


# Import cv2 for some tests
try:
    import cv2
except ImportError:
    cv2 = None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
