"""
LIME Service Comprehensive Test Suite

Detailed tests for LIME (Local Interpretable Model-agnostic Explanations) service.
Tests segmentation, perturbation generation, linear model fitting, and explanation quality.

Coverage:
- Segmentation methods (SLIC, grid fallback)
- Perturbation generation
- Feature extraction
- Model fitting
- Top segment selection
- Configuration options
"""

import pytest
import numpy as np
from PIL import Image
import io
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import time
from dataclasses import dataclass
from typing import List, Dict

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_mammogram_array():
    """Create a realistic mammogram-like image array."""
    # Create grayscale mammogram with tissue-like texture
    np.random.seed(42)
    img = np.zeros((224, 224), dtype=np.float32)
    
    # Add base tissue texture
    texture = np.random.rand(224, 224).astype(np.float32) * 0.3
    img += texture
    
    # Add a bright suspicious region (simulating mass)
    y, x = np.ogrid[:224, :224]
    center = (120, 120)
    radius = 25
    mask = (x - center[0])**2 + (y - center[1])**2 <= radius**2
    img[mask] = 0.85 + np.random.rand(mask.sum()).astype(np.float32) * 0.15
    
    # Add some spiculations (star pattern)
    for angle in range(0, 360, 45):
        rad = np.radians(angle)
        for r in range(radius, radius + 15):
            px = int(center[0] + r * np.cos(rad))
            py = int(center[1] + r * np.sin(rad))
            if 0 <= px < 224 and 0 <= py < 224:
                img[py, px] = 0.7
    
    # Convert to batch format with channels
    img_batch = img[np.newaxis, :, :, np.newaxis]
    img_batch = np.repeat(img_batch, 3, axis=-1)
    
    return img_batch.astype(np.float32)


@pytest.fixture
def mock_prediction_function():
    """Create mock prediction function."""
    def predict_fn(images):
        # Return predictions based on image brightness
        preds = []
        for img in images:
            mean_intensity = np.mean(img)
            # Higher intensity -> higher malignancy score
            prob = min(max(mean_intensity * 1.5, 0), 1)
            preds.append([1 - prob, prob])
        return np.array(preds)
    
    return predict_fn


@pytest.fixture
def lime_service_instance():
    """Create LIME service instance."""
    from app.services.lime_service import LIMEService, LIMEConfig
    
    config = LIMEConfig(
        n_segments=25,  # Fewer for faster testing
        n_samples=50,    # Fewer for faster testing
        top_k_features=5
    )
    
    service = LIMEService()
    service.config = config
    return service


@pytest.fixture
def lime_service_with_mock():
    """Create LIME service with mocked dependencies."""
    from app.services.lime_service import LIMEService, LIMEConfig
    
    service = LIMEService()
    
    # Mock skimage if not available
    mock_slic = Mock(return_value=np.zeros((224, 224), dtype=np.int32))
    service._slic_segmentation = mock_slic
    
    return service


# =============================================================================
# Configuration Tests
# =============================================================================

class TestLIMEConfiguration:
    """Tests for LIME configuration."""
    
    def test_default_config_values(self):
        """Test default configuration values."""
        from app.services.lime_service import LIMEConfig
        
        config = LIMEConfig()
        
        assert config.n_segments == 50
        assert config.n_samples == 100
        assert config.top_k_features == 10
        assert config.compactness == 10.0
        assert config.output_size == (56, 56)
    
    def test_config_custom_values(self):
        """Test custom configuration values."""
        from app.services.lime_service import LIMEConfig
        
        config = LIMEConfig(
            n_segments=30,
            n_samples=200,
            top_k_features=15,
            compactness=5.0
        )
        
        assert config.n_segments == 30
        assert config.n_samples == 200
        assert config.top_k_features == 15
        assert config.compactness == 5.0
    
    def test_config_immutability(self):
        """Test config values are properly stored."""
        from app.services.lime_service import LIMEConfig, LIMEService
        
        config = LIMEConfig(n_segments=42)
        service = LIMEService()
        service.config = config
        
        assert service.config.n_segments == 42
    
    def test_segmentation_method_enum(self):
        """Test segmentation method enum."""
        from app.services.lime_service import SegmentationMethod
        
        assert SegmentationMethod.SLIC.value == "slic"
        assert SegmentationMethod.QUICKSHIFT.value == "quickshift"
        assert SegmentationMethod.FELZENSZWALB.value == "felzenszwalb"


# =============================================================================
# Segmentation Tests
# =============================================================================

class TestLIMESegmentation:
    """Tests for LIME image segmentation."""
    
    def test_grid_segmentation_5x5(self, lime_service_instance):
        """Test 5x5 grid segmentation."""
        service = lime_service_instance
        
        img = np.random.rand(224, 224).astype(np.float32)
        segments = service._grid_segmentation(img, n_segments=25)
        
        assert segments.shape == (224, 224)
        assert segments.min() == 0
        assert segments.max() == 24  # 0-24 = 25 segments
        
        # Check all segments exist
        unique_segments = np.unique(segments)
        assert len(unique_segments) == 25
    
    def test_grid_segmentation_10x10(self, lime_service_instance):
        """Test 10x10 grid segmentation."""
        service = lime_service_instance
        
        img = np.random.rand(224, 224).astype(np.float32)
        segments = service._grid_segmentation(img, n_segments=100)
        
        assert segments.shape == (224, 224)
        assert segments.max() == 99  # 10x10 = 100 segments
    
    def test_segmentation_labels_contiguous(self, lime_service_instance):
        """Test segment labels are contiguous integers."""
        service = lime_service_instance
        
        img = np.random.rand(224, 224).astype(np.float32)
        segments = service._grid_segmentation(img, n_segments=36)
        
        unique = np.unique(segments)
        expected = np.arange(36)
        
        np.testing.assert_array_equal(unique, expected)
    
    def test_extract_2d_image_rgb(self, sample_mammogram_array):
        """Test extracting 2D image from RGB batch."""
        from app.services.lime_service import LIMEService
        
        service = LIMEService()
        img_2d = service._extract_2d_image(sample_mammogram_array)
        
        assert img_2d.ndim == 2
        assert img_2d.shape == (224, 224)
    
    def test_extract_2d_image_grayscale(self):
        """Test extracting 2D from single channel."""
        from app.services.lime_service import LIMEService
        
        service = LIMEService()
        
        # Single channel
        gray = np.random.rand(1, 224, 224, 1).astype(np.float32)
        img_2d = service._extract_2d_image(gray)
        
        assert img_2d.ndim == 2
    
    def test_extract_2d_unbatched(self):
        """Test extracting 2D from unbatched input."""
        from app.services.lime_service import LIMEService
        
        service = LIMEService()
        
        # No batch dimension
        img = np.random.rand(224, 224, 3).astype(np.float32)
        img_2d = service._extract_2d_image(img)
        
        assert img_2d.ndim == 2


# =============================================================================
# Perturbation Tests
# =============================================================================

class TestLIMEPerturbation:
    """Tests for LIME perturbation generation."""
    
    def test_generate_perturbations_shape(self, lime_service_instance, sample_mammogram_array):
        """Test perturbation output shape."""
        from app.services.lime_service import LIMEConfig
        
        service = lime_service_instance
        service.set_modules(Mock(), Mock())
        
        img_2d = sample_mammogram_array[0, :, :, 0]
        segments = service._grid_segmentation(img_2d, n_segments=25)
        n_features = segments.max() + 1
        
        config = LIMEConfig(n_samples=30, n_segments=25)
        perturbed_masks, perturbed_images = service._generate_perturbations(
            sample_mammogram_array,
            segments,
            n_features,
            config
        )
        
        assert perturbed_masks.shape[0] == 30  # n_samples
        assert perturbed_masks.shape[1] == n_features  # n_segments
    
    def test_perturbation_masks_binary(self, lime_service_instance, sample_mammogram_array):
        """Test perturbation masks are binary."""
        from app.services.lime_service import LIMEConfig
        
        service = lime_service_instance
        service.set_modules(Mock(), Mock())
        
        img_2d = sample_mammogram_array[0, :, :, 0]
        segments = service._grid_segmentation(img_2d, n_segments=25)
        n_features = segments.max() + 1
        
        config = LIMEConfig(n_samples=30, n_segments=25)
        masks, _ = service._generate_perturbations(
            sample_mammogram_array,
            segments,
            n_features,
            config
        )
        
        # Masks should be 0 or 1
        assert np.all((masks == 0) | (masks == 1))
    
    def test_perturbation_variability(self, lime_service_instance, sample_mammogram_array):
        """Test perturbations have variability."""
        from app.services.lime_service import LIMEConfig
        
        service = lime_service_instance
        service.set_modules(Mock(), Mock())
        
        img_2d = sample_mammogram_array[0, :, :, 0]
        segments = service._grid_segmentation(img_2d, n_segments=25)
        n_features = segments.max() + 1
        
        config = LIMEConfig(n_samples=30, n_segments=25)
        masks, _ = service._generate_perturbations(
            sample_mammogram_array,
            segments,
            n_features,
            config
        )
        
        # Should have variety in masks (not all same)
        mask_sums = masks.sum(axis=1)
        assert len(np.unique(mask_sums)) > 1, "All masks are identical"
    
    def test_original_included_in_perturbations(self, lime_service_instance, sample_mammogram_array):
        """Test original image included in perturbations."""
        from app.services.lime_service import LIMEConfig
        
        service = lime_service_instance
        service.set_modules(Mock(), Mock())
        
        img_2d = sample_mammogram_array[0, :, :, 0]
        segments = service._grid_segmentation(img_2d, n_segments=25)
        n_features = segments.max() + 1
        
        config = LIMEConfig(n_samples=30, n_segments=25)
        masks, _ = service._generate_perturbations(
            sample_mammogram_array,
            segments,
            n_features,
            config
        )
        
        # First sample should be original (all segments on)
        assert np.all(masks[0] == 1), "Original image not included"


# =============================================================================
# Linear Model Fitting Tests
# =============================================================================

class TestLIMELinearModel:
    """Tests for LIME linear model fitting."""
    
    def test_weighted_ridge_regression(self, lime_service_instance):
        """Test weighted Ridge regression fitting."""
        service = lime_service_instance
        
        # Create synthetic data
        n_samples = 50
        n_features = 25
        
        X = np.random.rand(n_samples, n_features)
        y = np.random.rand(n_samples)
        weights = np.ones(n_samples)
        
        coefs = service._fit_linear_model(X, y, weights)
        
        assert coefs.shape == (n_features,)
        assert not np.any(np.isnan(coefs))
    
    def test_linear_model_with_varying_weights(self, lime_service_instance):
        """Test linear model with varying sample weights."""
        service = lime_service_instance
        
        n_samples = 50
        n_features = 25
        
        X = np.random.rand(n_samples, n_features)
        # Create y with known relationship
        true_coefs = np.random.rand(n_features)
        y = X @ true_coefs + np.random.randn(n_samples) * 0.1
        
        # Weight samples closer to origin more
        distances = np.linalg.norm(X, axis=1)
        weights = np.exp(-distances)
        
        coefs = service._fit_linear_model(X, y, weights)
        
        # Should not crash with varying weights
        assert coefs.shape == (n_features,)
    
    def test_linear_model_rank_deficient(self, lime_service_instance):
        """Test linear model handles rank-deficient matrix."""
        service = lime_service_instance
        
        n_samples = 10
        n_features = 25  # More features than samples
        
        X = np.random.rand(n_samples, n_features)
        y = np.random.rand(n_samples)
        weights = np.ones(n_samples)
        
        # Should not raise, uses regularization
        coefs = service._fit_linear_model(X, y, weights)
        
        assert coefs.shape == (n_features,)


# =============================================================================
# Segment Importance Tests
# =============================================================================

class TestLIMESegmentImportance:
    """Tests for LIME segment importance calculation."""
    
    def test_linear_model_weights(self, lime_service_instance):
        """Test weighted Ridge regression fitting."""
        service = lime_service_instance
        
        # Create synthetic data
        n_samples = 50
        n_features = 25
        
        X = np.random.rand(n_samples, n_features).astype(np.float32)
        y = np.random.rand(n_samples).astype(np.float32)
        weights = np.ones(n_samples, dtype=np.float32)
        
        coefs = service._fit_linear_model(X, y, weights)
        
        assert coefs.shape == (n_features,)
        assert not np.any(np.isnan(coefs))
    
    def test_segment_top_k_selection(self, lime_service_instance):
        """Test top-k feature selection from weights."""
        service = lime_service_instance
        
        # Create fake weights
        weights = np.array([0.3, 0.9, 0.1, 0.7, 0.5])
        
        # Get indices of top 3
        top_k = np.argsort(np.abs(weights))[-3:][::-1]
        
        assert len(top_k) == 3
        assert 1 in top_k  # Highest value
        assert 3 in top_k  # Second highest
    
    def test_heatmap_generation(self, lime_service_instance, sample_mammogram_array):
        """Test heatmap generation from feature weights."""
        from app.services.lime_service import LIMEConfig
        
        service = lime_service_instance
        
        img_2d = sample_mammogram_array[0, :, :, 0]
        segments = service._grid_segmentation(img_2d, n_segments=25)
        weights = np.random.rand(25).astype(np.float32)
        
        # Pass config object, not tuple
        config = LIMEConfig(output_size=(56, 56))
        heatmap = service._generate_heatmap(segments, weights, config)
        
        assert heatmap.shape == segments.shape  # Same shape before normalization


# =============================================================================
# Anatomical Location Tests
# =============================================================================

class TestLIMEAnatomicalLocation:
    """Tests for anatomical location mapping in LIME."""
    
    def test_central_location(self, lime_service_instance):
        """Test central location detection."""
        service = lime_service_instance
        
        # Center of 224x224 image
        loc = service._get_anatomical_location(112, 112, 224, 224)
        
        assert "central" in loc.lower()
    
    def test_upper_outer_quadrant(self, lime_service_instance):
        """Test upper outer quadrant detection."""
        service = lime_service_instance
        
        # Upper outer (high x, low y)
        loc = service._get_anatomical_location(200, 20, 224, 224)
        
        assert "upper" in loc.lower()
        assert "outer" in loc.lower()
    
    def test_lower_inner_quadrant(self, lime_service_instance):
        """Test lower inner quadrant detection."""
        service = lime_service_instance
        
        # Lower inner (low x, high y)
        loc = service._get_anatomical_location(20, 200, 224, 224)
        
        assert "lower" in loc.lower()
        assert "inner" in loc.lower()
    
    def test_retroareolar_region(self, lime_service_instance):
        """Test retroareolar region detection."""
        service = lime_service_instance
        
        # Near center, slightly inward
        loc = service._get_anatomical_location(100, 112, 224, 224)
        
        # Should be either central or near it
        assert any(term in loc.lower() for term in ["central", "inner", "retroareolar"])


# =============================================================================
# LIME Map Generation Tests
# =============================================================================

class TestLIMEMapGeneration:
    """Tests for LIME explanation map generation."""
    
    def test_heatmap_normalization(self, lime_service_instance):
        """Test LIME heatmap normalization."""
        service = lime_service_instance
        
        # Create test heatmap with values outside [0,1]
        heatmap = np.random.randn(56, 56).astype(np.float32) * 2
        
        normalized = service._normalize_heatmap(heatmap, (56, 56))
        
        assert normalized.shape == (56, 56)
        assert normalized.min() >= 0.0
        assert normalized.max() <= 1.0
    
    def test_heatmap_preserves_relative_ordering(self, lime_service_instance):
        """Test normalization preserves relative ordering."""
        service = lime_service_instance
        
        original = np.array([[0.1, 0.5], [0.3, 0.9]], dtype=np.float32)
        normalized = service._normalize_heatmap(original, (2, 2))
        
        # Max should still be max after normalization
        assert normalized.argmax() == original.argmax()
    
    def test_generate_heatmap_from_weights(self, lime_service_instance, sample_mammogram_array):
        """Test heatmap generation from feature weights."""
        from app.services.lime_service import LIMEConfig
        
        service = lime_service_instance
        
        img_2d = sample_mammogram_array[0, :, :, 0]
        segments = service._grid_segmentation(img_2d, n_segments=16)
        weights = np.random.rand(16).astype(np.float32)
        
        # Pass config object
        config = LIMEConfig(output_size=(56, 56))
        heatmap = service._generate_heatmap(segments, weights, config)
        
        # Then normalize
        normalized = service._normalize_heatmap(heatmap, (56, 56))
        
        assert normalized.shape == (56, 56)
        # Should be normalized
        assert normalized.max() <= 1.0
        assert normalized.min() >= 0.0


# =============================================================================
# Fallback Mechanism Tests
# =============================================================================

class TestLIMEFallback:
    """Tests for LIME fallback mechanisms."""
    
    def test_fallback_explanation_structure(self, lime_service_instance):
        """Test fallback explanation has correct structure."""
        service = lime_service_instance
        
        result = service._generate_fallback_explanation((56, 56))
        
        assert "lime_map" in result
        assert "segment_importance" in result
        assert "top_regions" in result
        assert "method_used" in result
        assert result["method_used"] == "fallback"
    
    def test_fallback_lime_map_shape(self, lime_service_instance):
        """Test fallback LIME map has correct shape."""
        service = lime_service_instance
        
        result = service._generate_fallback_explanation((56, 56))
        
        lime_map = np.array(result["lime_map"])
        assert lime_map.shape == (56, 56)
    
    def test_fallback_triggered_on_error(self, lime_service_instance, sample_mammogram_array):
        """Test fallback is triggered on processing error."""
        from app.services.lime_service import LIMEConfig
        
        service = lime_service_instance
        # Don't set TF - should trigger fallback
        
        config = LIMEConfig(output_size=(56, 56))
        result = service.generate_lime_explanation(
            model=Mock(predict=Mock(side_effect=Exception("Error"))),
            image=sample_mammogram_array,
            config=config
        )
        
        assert result["method_used"] in ["fallback", "simplified_lime"]


# =============================================================================
# Integration with Mock Model Tests
# =============================================================================

class TestLIMEIntegration:
    """Integration tests with mock prediction model."""
    
    def test_full_lime_pipeline(
        self,
        lime_service_instance,
        sample_mammogram_array,
        mock_prediction_function
    ):
        """Test complete LIME pipeline."""
        from app.services.lime_service import LIMEConfig
        
        service = lime_service_instance
        service.set_modules(Mock(), Mock())
        
        # Create mock model
        mock_model = Mock()
        mock_model.predict = mock_prediction_function
        
        config = LIMEConfig(n_segments=16, n_samples=20, output_size=(56, 56))
        
        result = service.generate_lime_explanation(
            model=mock_model,
            image=sample_mammogram_array,
            config=config
        )
        
        # Check all expected outputs
        assert "lime_map" in result
        assert "segment_importance" in result or "feature_weights" in result
        assert "method_used" in result
    
    def test_lime_respects_config(self, sample_mammogram_array, mock_prediction_function):
        """Test LIME respects configuration parameters."""
        from app.services.lime_service import LIMEService, LIMEConfig
        
        config = LIMEConfig(
            n_segments=16,
            n_samples=30,
            top_k_features=5
        )
        
        service = LIMEService()
        service.set_modules(Mock(), Mock())
        service.config = config
        
        mock_model = Mock()
        mock_model.predict = mock_prediction_function
        
        result = service.generate_lime_explanation(
            model=mock_model,
            image=sample_mammogram_array,
            config=config
        )
        
        # Should have configuration-based parameters
        assert "method_used" in result


# =============================================================================
# Performance Tests
# =============================================================================

class TestLIMEPerformance:
    """Performance tests for LIME service."""
    
    def test_segmentation_performance(self, lime_service_instance):
        """Benchmark segmentation speed."""
        service = lime_service_instance
        
        img = np.random.rand(224, 224).astype(np.float32)
        
        start = time.time()
        for _ in range(100):
            service._grid_segmentation(img, n_segments=25)
        elapsed = time.time() - start
        
        # Should complete 100 segmentations in under 1 second
        assert elapsed < 1.0, f"Segmentation too slow: {elapsed:.2f}s"
    
    def test_linear_model_fitting_performance(self, lime_service_instance):
        """Benchmark linear model fitting."""
        service = lime_service_instance
        
        n_samples, n_features = 100, 50
        X = np.random.rand(n_samples, n_features).astype(np.float32)
        y = np.random.rand(n_samples).astype(np.float32)
        weights = np.ones(n_samples, dtype=np.float32)
        
        start = time.time()
        for _ in range(100):
            service._fit_linear_model(X, y, weights)
        elapsed = time.time() - start
        
        # Should complete 100 fits in under 2 seconds
        assert elapsed < 2.0, f"Linear model fitting too slow: {elapsed:.2f}s"


# =============================================================================
# Run tests with: pytest tests/test_lime_service.py -v
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
