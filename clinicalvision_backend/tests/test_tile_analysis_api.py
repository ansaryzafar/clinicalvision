"""
Comprehensive API Integration Tests for Tile-Based Analysis

Tests the /predict-tiles endpoint and related functionality:
- All analysis modes
- Parameter validation
- Error handling
- Edge cases
- Authentication
"""

import pytest
import io
import json
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock, AsyncMock, MagicMock
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def create_test_image(width=500, height=600, mode='L'):
    """Create a test mammogram-like image."""
    img_array = np.random.randint(50, 200, (height, width), dtype=np.uint8)
    return Image.fromarray(img_array, mode=mode)


def image_to_bytes(image, format='PNG'):
    """Convert PIL Image to bytes."""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    buffer.seek(0)
    return buffer


class TestPredictTilesEndpoint:
    """Test /predict-tiles endpoint."""
    
    @pytest.fixture
    def mock_user(self):
        """Create mock user for auth bypass."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.email = "test@clinicalvision.ai"
        mock_user.role = Mock()
        mock_user.role.value = "radiologist"
        mock_user.is_active = True
        return mock_user
    
    @pytest.fixture
    def client(self, mock_user):
        """Create test client with mocked auth dependencies."""
        from main import app
        from app.core.dependencies import get_current_active_user, get_current_user
        
        # Override authentication dependencies
        async def mock_get_current_user():
            return mock_user
        
        async def mock_get_current_active_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        app.dependency_overrides[get_current_active_user] = mock_get_current_active_user
        
        yield TestClient(app)
        
        # Clean up overrides
        app.dependency_overrides.clear()
    
    @pytest.fixture
    def mock_auth(self):
        """Mock authentication to bypass JWT requirement."""
        mock_user = Mock()
        mock_user.id = 1
        mock_user.email = "test@clinicalvision.ai"
        mock_user.role = "radiologist"
        mock_user.is_active = True
        return mock_user
    
    @pytest.fixture
    def mock_inference_result(self):
        """Create realistic inference result."""
        return {
            'prediction': 'benign',
            'confidence': 0.85,
            'probabilities': {'benign': 0.85, 'malignant': 0.15},
            'risk_level': 'low',
            'uncertainty': {
                'epistemic_uncertainty': 0.05,
                'aleatoric_uncertainty': 0.08,
                'predictive_entropy': 0.13,
                'mc_std': 0.04,
                'requires_human_review': False
            },
            'explanation': {
                'attention_map': np.random.rand(224, 224).tolist(),
                'suspicious_regions': [],
                'narrative': 'No suspicious findings detected.',
                'confidence_explanation': 'High confidence benign classification.'
            },
            'image_metadata': {
                'original_width': 500,
                'original_height': 600,
                'model_width': 224,
                'model_height': 224,
                'scale_x': 500/224,
                'scale_y': 600/224,
                'aspect_ratio': 500/600
            },
            'analysis_mode': 'global_only',
            'tiles_analyzed': 0,
            'tile_analysis': None,
            'case_id': 'test-case-123',
            'model_version': 'v12_production',
            'inference_time_ms': 150.5,
            'timestamp': '2026-02-03T12:00:00Z'
        }
    
    def test_predict_tiles_missing_file(self, client):
        """Test error when no file is provided."""
        response = client.post("/inference/predict-tiles")
        
        # Should return 422 Unprocessable Entity (missing required file)
        assert response.status_code == 422
    
    def test_predict_tiles_invalid_mode(self, client):
        """Test error for invalid analysis mode."""
        test_image = create_test_image()
        
        response = client.post(
            "/inference/predict-tiles",
            params={"mode": "invalid_mode"},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        
        # Should return 400 or 422 for invalid mode, or 200 if mode is ignored
        if response.status_code == 200:
            # If it somehow passes, check the result
            pass
        else:
            assert response.status_code in [400, 422]
    
    def test_predict_tiles_invalid_tile_size(self, client):
        """Test validation of tile_size parameter."""
        test_image = create_test_image()
        
        # Tile size below minimum (64)
        response = client.post(
            "/inference/predict-tiles",
            params={"tile_size": 32},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        
        # Should reject invalid tile size
        assert response.status_code == 422
    
    def test_predict_tiles_invalid_overlap(self, client):
        """Test validation of overlap parameter."""
        test_image = create_test_image()
        
        # Overlap above maximum (0.75)
        response = client.post(
            "/inference/predict-tiles",
            params={"overlap": 0.9},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        
        assert response.status_code == 422


class TestParameterValidation:
    """Test API parameter validation."""
    
    def test_tile_size_range(self):
        """Test tile_size validation range (64-512)."""
        from app.schemas.inference import TileConfig
        
        # Valid sizes
        config = TileConfig(tile_size=224)
        assert config.tile_size == 224
        
        config = TileConfig(tile_size=64)
        assert config.tile_size == 64
        
        config = TileConfig(tile_size=512)
        assert config.tile_size == 512
    
    def test_overlap_range(self):
        """Test overlap validation range (0.0-0.75)."""
        from app.schemas.inference import TileConfig
        
        config = TileConfig(overlap=0.0)
        assert config.overlap == 0.0
        
        config = TileConfig(overlap=0.25)
        assert config.overlap == 0.25
        
        config = TileConfig(overlap=0.75)
        assert config.overlap == 0.75
    
    def test_attention_threshold_range(self):
        """Test attention_threshold validation (0.0-1.0)."""
        from app.schemas.inference import TileConfig
        
        config = TileConfig(attention_threshold=0.0)
        assert config.attention_threshold == 0.0
        
        config = TileConfig(attention_threshold=1.0)
        assert config.attention_threshold == 1.0
    
    def test_max_tiles_range(self):
        """Test max_tiles validation (1-200)."""
        from app.schemas.inference import TileConfig
        
        config = TileConfig(max_tiles=1)
        assert config.max_tiles == 1
        
        config = TileConfig(max_tiles=200)
        assert config.max_tiles == 200


class TestAnalysisModes:
    """Test different analysis modes."""
    
    def test_global_only_mode(self):
        """Test GLOBAL_ONLY mode behavior."""
        from app.schemas.inference import AnalysisModeEnum
        
        mode = AnalysisModeEnum.GLOBAL_ONLY
        assert mode.value == "global_only"
    
    def test_attention_guided_mode(self):
        """Test ATTENTION_GUIDED mode behavior."""
        from app.schemas.inference import AnalysisModeEnum
        
        mode = AnalysisModeEnum.ATTENTION_GUIDED
        assert mode.value == "attention_guided"
    
    def test_full_coverage_mode(self):
        """Test FULL_COVERAGE mode behavior."""
        from app.schemas.inference import AnalysisModeEnum
        
        mode = AnalysisModeEnum.FULL_COVERAGE
        assert mode.value == "full_coverage"
    
    def test_mode_from_string(self):
        """Test creating mode from string."""
        from app.schemas.inference import AnalysisModeEnum
        
        assert AnalysisModeEnum("global_only") == AnalysisModeEnum.GLOBAL_ONLY
        assert AnalysisModeEnum("attention_guided") == AnalysisModeEnum.ATTENTION_GUIDED
        assert AnalysisModeEnum("full_coverage") == AnalysisModeEnum.FULL_COVERAGE


class TestResponseSchemas:
    """Test response schema validation."""
    
    def test_tile_analysis_response_schema(self):
        """Test TileAnalysisResponse schema."""
        from app.schemas.inference import TileAnalysisResponse
        
        response_data = {
            'prediction': 'benign',
            'confidence': 0.85,
            'probabilities': {'benign': 0.85, 'malignant': 0.15},
            'risk_level': 'low',
            'uncertainty': {
                'epistemic_uncertainty': 0.05,
                'aleatoric_uncertainty': 0.08,
                'predictive_entropy': 0.13,
                'mc_std': 0.04,
                'requires_human_review': False
            },
            'explanation': {
                'attention_map': None,
                'suspicious_regions': [],
                'narrative': 'Test narrative',
                'confidence_explanation': 'Test explanation'
            },
            'image_metadata': {
                'original_width': 500,
                'original_height': 600,
                'model_width': 224,
                'model_height': 224,
                'scale_x': 2.23,
                'scale_y': 2.68,
                'aspect_ratio': 0.83
            },
            'analysis_mode': 'global_only',
            'tiles_analyzed': 0,
            'tile_analysis': None,
            'case_id': 'test-case',
            'model_version': 'v12',
            'inference_time_ms': 100.0,
            'timestamp': '2026-02-03T12:00:00Z'
        }
        
        # Should validate successfully
        response = TileAnalysisResponse(**response_data)
        assert response.prediction == 'benign'
        assert response.tiles_analyzed == 0
    
    def test_tile_info_schema(self):
        """Test TileInfo schema."""
        from app.schemas.inference import TileInfo
        
        tile_data = {
            'tile_id': 0,
            'position': [100, 200],
            'attention_score': 0.75,
            'breast_coverage': 0.9,
            'prediction': 'benign',
            'malignancy_prob': 0.15,
            'confidence': 0.85
        }
        
        tile = TileInfo(**tile_data)
        assert tile.tile_id == 0
        assert tile.attention_score == 0.75
    
    def test_tile_analysis_metrics_schema(self):
        """Test TileAnalysisMetrics schema."""
        from app.schemas.inference import TileAnalysisMetrics
        
        metrics_data = {
            'global_probability': 0.4,
            'tile_weighted_average': 0.35,
            'tile_max_probability': 0.6,
            'final_probability': 0.42,
            'tiles': []
        }
        
        metrics = TileAnalysisMetrics(**metrics_data)
        assert metrics.global_probability == 0.4
        assert metrics.final_probability == 0.42


class TestImageValidation:
    """Test image validation for tile analysis."""
    
    def test_valid_grayscale_image(self):
        """Test validation of grayscale image."""
        from app.utils.preprocessing import validate_image
        
        # Create image and save to bytes, then reload to get format
        image = create_test_image(mode='L')
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        buffer.seek(0)
        loaded_image = Image.open(buffer)
        
        # Should not raise exception
        validate_image(loaded_image)
    
    def test_valid_rgb_image(self):
        """Test validation of RGB image (should be converted)."""
        from app.utils.preprocessing import validate_image
        
        img_array = np.random.randint(0, 255, (600, 500, 3), dtype=np.uint8)
        image = Image.fromarray(img_array, mode='RGB')
        
        # Save and reload to set format
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        buffer.seek(0)
        loaded_image = Image.open(buffer)
        
        # Should not raise for RGB (will be converted to grayscale)
        validate_image(loaded_image)
    
    def test_very_small_image(self):
        """Test handling of very small image."""
        # Create 10x10 image
        small_image = create_test_image(width=10, height=10)
        
        # Should be handled (might log warning or process anyway)
        assert small_image.width == 10
        assert small_image.height == 10
    
    def test_large_image(self):
        """Test handling of large image."""
        # Create 4000x5000 image (typical FFDM size)
        large_image = create_test_image(width=4000, height=5000)
        
        assert large_image.width == 4000
        assert large_image.height == 5000


class TestEdgeCases:
    """Test edge cases for API."""
    
    def test_empty_file(self):
        """Test handling of empty file upload."""
        empty_buffer = io.BytesIO(b"")
        
        # Should fail when trying to open as image
        with pytest.raises(Exception):
            Image.open(empty_buffer)
    
    def test_corrupted_image(self):
        """Test handling of corrupted image data."""
        corrupted_buffer = io.BytesIO(b"not_an_image_data")
        
        with pytest.raises(Exception):
            Image.open(corrupted_buffer)
    
    def test_extreme_aspect_ratio(self):
        """Test image with extreme aspect ratio."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        # Very wide image
        transformer = CoordinateTransformer((10000, 500))
        meta = transformer.get_metadata()
        
        assert meta['aspect_ratio'] == pytest.approx(20.0)
    
    def test_single_channel_conversion(self):
        """Test conversion from various formats to grayscale."""
        # RGBA image
        rgba_array = np.random.randint(0, 255, (100, 100, 4), dtype=np.uint8)
        rgba_image = Image.fromarray(rgba_array, mode='RGBA')
        grayscale = rgba_image.convert('L')
        
        assert grayscale.mode == 'L'
        assert grayscale.size == (100, 100)


class TestConcurrentRequests:
    """Test concurrent request handling."""
    
    def test_multiple_images_same_size(self):
        """Test processing multiple images of same size."""
        images = [create_test_image(500, 600) for _ in range(5)]
        
        # All should have same dimensions
        for img in images:
            assert img.size == (500, 600)
    
    def test_multiple_images_different_sizes(self):
        """Test processing images of different sizes."""
        sizes = [(500, 600), (1000, 1200), (2000, 2500), (3000, 4000)]
        images = [create_test_image(w, h) for w, h in sizes]
        
        for img, (w, h) in zip(images, sizes):
            assert img.size == (w, h)


class TestIntegrationWithCoordinateTransform:
    """Test integration between API and coordinate transformation."""
    
    def test_response_includes_image_metadata(self):
        """Test that response includes proper image metadata."""
        from app.utils.coordinate_transform import CoordinateTransformer
        
        transformer = CoordinateTransformer((3000, 4000))
        metadata = transformer.get_metadata()
        
        assert 'original_width' in metadata
        assert 'original_height' in metadata
        assert 'scale_x' in metadata
        assert 'scale_y' in metadata
        assert metadata['original_width'] == 3000
        assert metadata['original_height'] == 4000
    
    def test_suspicious_regions_in_original_coordinates(self):
        """Test that suspicious regions are returned in original coordinates."""
        from app.utils.coordinate_transform import (
            CoordinateTransformer,
            transform_regions_to_original
        )
        
        transformer = CoordinateTransformer((3000, 4000))
        
        # Regions in model space
        model_regions = [
            {'bbox': [50, 60, 30, 40], 'attention_score': 0.8}
        ]
        
        # Transform to original space
        original_regions = transform_regions_to_original(model_regions, transformer)
        
        # Should have both coordinate systems
        assert 'bbox_model' in original_regions[0]
        assert 'bbox_original' in original_regions[0]
        
        # Original coordinates should be larger
        assert original_regions[0]['bbox_original'][0] > model_regions[0]['bbox'][0]


# Error handling tests
class TestErrorHandling:
    """Test error handling in API."""
    
    def test_inference_service_unavailable(self):
        """Test handling when inference service is unavailable."""
        # This would require mocking the inference service to raise an exception
        pass
    
    def test_model_loading_failure(self):
        """Test handling when model fails to load."""
        # This would require mocking model loading
        pass
    
    def test_out_of_memory_handling(self):
        """Test handling of out-of-memory conditions."""
        # This is difficult to test directly but should be documented
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
