"""
SHAP Service Comprehensive Test Suite

Detailed tests for SHAP (SHapley Additive exPlanations) service.
Tests Shapley value computation, gradient-based methods, and explanation quality.

Coverage:
- SHAPConfig validation
- Background sample generation
- GradientSHAP method
- DeepSHAP method  
- PartitionSHAP method
- Region extraction (positive/negative)
- Anatomical mapping
- Fallback mechanisms
"""

import pytest
import numpy as np
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import time

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_mammogram_array():
    """Create a realistic mammogram-like image array."""
    np.random.seed(42)
    img = np.zeros((224, 224), dtype=np.float32)
    
    # Add tissue texture
    texture = np.random.rand(224, 224).astype(np.float32) * 0.3
    img += texture
    
    # Add suspicious mass
    y, x = np.ogrid[:224, :224]
    center = (120, 120)
    radius = 25
    mask = (x - center[0])**2 + (y - center[1])**2 <= radius**2
    img[mask] = 0.85
    
    # Convert to batch RGB format
    img_batch = img[np.newaxis, :, :, np.newaxis]
    img_batch = np.repeat(img_batch, 3, axis=-1)
    
    return img_batch.astype(np.float32)


@pytest.fixture
def sample_shap_values():
    """Create sample SHAP values array."""
    np.random.seed(42)
    # SHAP values centered around 0 with some positive and negative regions
    shap = np.random.randn(56, 56).astype(np.float32) * 0.1
    
    # Add positive region (supports malignancy)
    shap[20:35, 20:35] = 0.2
    
    # Add negative region (supports benign)
    shap[40:50, 40:50] = -0.15
    
    return shap


@pytest.fixture
def mock_tf_module():
    """Create mock TensorFlow module."""
    tf = Mock()
    
    # GradientTape mock
    tape = Mock()
    tape.__enter__ = Mock(return_value=tape)
    tape.__exit__ = Mock(return_value=False)
    tape.watch = Mock()
    
    # Return mock gradients with proper shape
    def mock_gradient(target, source):
        return Mock(numpy=Mock(return_value=np.random.randn(*source.shape).astype(np.float32)))
    
    tape.gradient = Mock(side_effect=mock_gradient)
    tf.GradientTape = Mock(return_value=tape)
    
    # Basic ops
    tf.Variable = Mock(side_effect=lambda x, dtype=None: x)
    tf.float32 = np.float32
    
    return tf


@pytest.fixture
def mock_keras_model():
    """Create mock Keras model that behaves like real model."""
    model = Mock()
    model.name = "test_densenet121"
    
    # Make it callable and return prediction
    def mock_call(inputs, training=False):
        batch_size = inputs.shape[0] if hasattr(inputs, 'shape') else 1
        result = Mock()
        result.numpy = Mock(return_value=np.array([[0.75]] * batch_size))
        result.shape = (batch_size, 1)
        return result
    
    model.__call__ = mock_call
    model.side_effect = mock_call
    
    return model


# =============================================================================
# Configuration Tests
# =============================================================================

class TestSHAPConfiguration:
    """Tests for SHAP configuration."""
    
    def test_default_config_values(self):
        """Test default configuration values."""
        from app.services.shap_service import SHAPConfig, SHAPMethod
        
        config = SHAPConfig()
        
        assert config.method == SHAPMethod.GRADIENT
        assert config.n_background_samples == 50
        assert config.n_samples == 50
        assert config.output_size == (56, 56)
        assert config.use_blur_baseline is True
        assert config.stdev == 0.15
    
    def test_config_with_deep_method(self):
        """Test config with DeepSHAP method."""
        from app.services.shap_service import SHAPConfig, SHAPMethod
        
        config = SHAPConfig(method=SHAPMethod.DEEP)
        
        assert config.method == SHAPMethod.DEEP
    
    def test_config_with_partition_method(self):
        """Test config with PartitionSHAP method."""
        from app.services.shap_service import SHAPConfig, SHAPMethod
        
        config = SHAPConfig(method=SHAPMethod.PARTITION)
        
        assert config.method == SHAPMethod.PARTITION
        assert config.max_evals == 500
    
    def test_shap_method_enum_values(self):
        """Test SHAP method enum values."""
        from app.services.shap_service import SHAPMethod
        
        assert SHAPMethod.GRADIENT.value == "gradient"
        assert SHAPMethod.DEEP.value == "deep"
        assert SHAPMethod.PARTITION.value == "partition"
        assert SHAPMethod.KERNEL.value == "kernel"
    
    def test_config_custom_values(self):
        """Test config with custom values."""
        from app.services.shap_service import SHAPConfig
        
        config = SHAPConfig(
            n_background_samples=20,
            n_samples=30,
            output_size=(112, 112),
            use_blur_baseline=False,
            stdev=0.25
        )
        
        assert config.n_background_samples == 20
        assert config.n_samples == 30
        assert config.output_size == (112, 112)
        assert config.use_blur_baseline is False
        assert config.stdev == 0.25


# =============================================================================
# Background Sample Tests
# =============================================================================

class TestSHAPBackgroundSamples:
    """Tests for SHAP background sample generation."""
    
    def test_create_background_shape(self, sample_mammogram_array, mock_tf_module):
        """Test background samples have correct shape."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        config = SHAPConfig(n_background_samples=10)
        background = service._create_background(sample_mammogram_array, config)
        
        assert background.shape[0] == 10
        assert background.shape[1:] == sample_mammogram_array.shape[1:]
    
    def test_create_background_with_blur(self, sample_mammogram_array, mock_tf_module):
        """Test background with blur baseline enabled."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        config = SHAPConfig(n_background_samples=15, use_blur_baseline=True)
        background = service._create_background(sample_mammogram_array, config)
        
        # Should create requested number of background samples
        assert background.shape[0] == 15
    
    def test_create_background_without_blur(self, sample_mammogram_array, mock_tf_module):
        """Test background without blur baseline."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        config = SHAPConfig(n_background_samples=10, use_blur_baseline=False)
        background = service._create_background(sample_mammogram_array, config)
        
        assert background.shape[0] == 10
    
    def test_background_values_in_range(self, sample_mammogram_array, mock_tf_module):
        """Test background values are in valid range."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        config = SHAPConfig(n_background_samples=10)
        background = service._create_background(sample_mammogram_array, config)
        
        # Values should be in [0, 1] range for normalized images
        assert background.min() >= 0
        assert background.max() <= 1


# =============================================================================
# Superpixel Tests
# =============================================================================

class TestSHAPSuperpixels:
    """Tests for superpixel segmentation."""
    
    def test_create_superpixels_shape(self, sample_mammogram_array):
        """Test superpixel creation returns correct shape."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        # Extract 2D image
        img_2d = sample_mammogram_array[0, :, :, 0]
        
        segments = service._create_superpixels(img_2d, n_segments=50)
        
        assert segments.shape == img_2d.shape
        assert segments.dtype == np.int32
    
    def test_superpixels_unique_labels(self, sample_mammogram_array):
        """Test superpixels have unique segment labels."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        img_2d = sample_mammogram_array[0, :, :, 0]
        
        segments = service._create_superpixels(img_2d, n_segments=25)
        
        # Should have multiple segments
        unique_labels = np.unique(segments)
        assert len(unique_labels) > 1


# =============================================================================
# Region Extraction Tests
# =============================================================================

class TestSHAPRegionExtraction:
    """Tests for SHAP region extraction."""
    
    def test_extract_positive_regions(self, sample_shap_values):
        """Test extraction of positive SHAP regions."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        regions = service._extract_extreme_regions(sample_shap_values, positive=True)
        
        assert isinstance(regions, list)
        for region in regions:
            assert region["contribution_type"] == "supports_malignancy"
            assert region["mean_shap"] > 0
    
    def test_extract_negative_regions(self, sample_shap_values):
        """Test extraction of negative SHAP regions."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        regions = service._extract_extreme_regions(sample_shap_values, positive=False)
        
        assert isinstance(regions, list)
        for region in regions:
            assert region["contribution_type"] == "supports_benign"
            assert region["mean_shap"] < 0
    
    def test_extract_regions_max_count(self, sample_shap_values):
        """Test max regions limit."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        # Create image with many regions
        multi_region = np.zeros((56, 56), dtype=np.float32)
        for i in range(10):
            y, x = np.random.randint(5, 50, 2)
            multi_region[y:y+5, x:x+5] = 0.5
        
        regions = service._extract_extreme_regions(multi_region, positive=True, max_regions=3)
        
        assert len(regions) <= 3
    
    def test_region_bbox_format(self, sample_shap_values):
        """Test region bbox has correct format [x, y, w, h]."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        regions = service._extract_extreme_regions(sample_shap_values, positive=True)
        
        if regions:
            bbox = regions[0]["bbox"]
            assert len(bbox) == 4
            assert all(isinstance(v, (int, float)) for v in bbox)
            # Width and height should be positive
            assert bbox[2] >= 0
            assert bbox[3] >= 0
    
    def test_region_centroid_format(self, sample_shap_values):
        """Test region centroid has correct format [x, y]."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        regions = service._extract_extreme_regions(sample_shap_values, positive=True)
        
        if regions:
            centroid = regions[0]["centroid"]
            assert len(centroid) == 2
    
    def test_region_area_fraction(self, sample_shap_values):
        """Test region area fraction is valid."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        regions = service._extract_extreme_regions(sample_shap_values, positive=True)
        
        if regions:
            area_frac = regions[0]["area_fraction"]
            assert 0 < area_frac <= 1.0
    
    def test_region_has_location(self, sample_shap_values):
        """Test region has anatomical location."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        regions = service._extract_extreme_regions(sample_shap_values, positive=True)
        
        if regions:
            assert "location" in regions[0]
            assert isinstance(regions[0]["location"], str)


# =============================================================================
# Anatomical Location Tests
# =============================================================================

class TestSHAPAnatomicalLocation:
    """Tests for anatomical location mapping."""
    
    def test_central_location(self):
        """Test central location detection."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        # Center coordinates
        loc = service._get_anatomical_location(28, 28, 56, 56)
        
        assert "central" in loc.lower() or "retroareolar" in loc.lower()
    
    def test_upper_outer_quadrant(self):
        """Test upper outer quadrant detection."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        loc = service._get_anatomical_location(50, 5, 56, 56)
        
        assert "upper" in loc.lower()
        assert "outer" in loc.lower()
    
    def test_lower_inner_quadrant(self):
        """Test lower inner quadrant detection."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        loc = service._get_anatomical_location(5, 50, 56, 56)
        
        assert "lower" in loc.lower()
        assert "inner" in loc.lower()
    
    def test_upper_inner_quadrant(self):
        """Test upper inner quadrant detection."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        loc = service._get_anatomical_location(5, 5, 56, 56)
        
        assert "upper" in loc.lower()
        assert "inner" in loc.lower()
    
    def test_lower_outer_quadrant(self):
        """Test lower outer quadrant detection."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        loc = service._get_anatomical_location(50, 50, 56, 56)
        
        assert "lower" in loc.lower()
        assert "outer" in loc.lower()


# =============================================================================
# Fallback Mechanism Tests
# =============================================================================

class TestSHAPFallback:
    """Tests for SHAP fallback mechanisms."""
    
    def test_fallback_structure(self):
        """Test fallback explanation structure."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        result = service._generate_fallback_explanation((56, 56))
        
        assert "shap_map" in result
        assert "base_value" in result
        assert "feature_importance" in result
        assert "positive_regions" in result
        assert "negative_regions" in result
        assert "method_used" in result
        assert result["method_used"] == "fallback"
    
    def test_fallback_shap_map_shape(self):
        """Test fallback SHAP map shape."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        result = service._generate_fallback_explanation((56, 56))
        
        shap_map = np.array(result["shap_map"])
        assert shap_map.shape == (56, 56)
    
    def test_fallback_values_in_range(self):
        """Test fallback values are in valid range."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        result = service._generate_fallback_explanation((56, 56))
        
        shap_map = np.array(result["shap_map"])
        assert shap_map.min() >= 0
        assert shap_map.max() <= 1
    
    def test_fallback_triggered_without_tf(self, sample_mammogram_array, mock_keras_model):
        """Test fallback triggered when TF not available."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        # Don't set TF module - should trigger fallback
        
        result = service.generate_shap_explanation(
            mock_keras_model,
            sample_mammogram_array,
            config=SHAPConfig(output_size=(56, 56))
        )
        
        assert result["method_used"] == "fallback"


# =============================================================================
# Process SHAP Values Tests
# =============================================================================

class TestProcessSHAPValues:
    """Tests for SHAP values processing."""
    
    def test_process_shap_values_output(self, sample_mammogram_array):
        """Test _process_shap_values output structure."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        
        # Create sample SHAP values
        shap_values = np.random.randn(1, 224, 224, 3).astype(np.float32) * 0.1
        
        config = SHAPConfig(output_size=(56, 56))
        result = service._process_shap_values(shap_values, 0.5, sample_mammogram_array, config)
        
        assert "shap_map" in result
        assert "base_value" in result
        assert "positive_regions" in result
        assert "negative_regions" in result
        assert "feature_importance" in result
        assert "method_used" in result
    
    def test_process_shap_values_resizes(self, sample_mammogram_array):
        """Test SHAP values are resized to output size."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        
        shap_values = np.random.randn(1, 224, 224, 3).astype(np.float32) * 0.1
        
        config = SHAPConfig(output_size=(28, 28))
        result = service._process_shap_values(shap_values, 0.5, sample_mammogram_array, config)
        
        shap_map = np.array(result["shap_map"])
        assert shap_map.shape == (28, 28)
    
    def test_process_shap_values_preserves_base_value(self, sample_mammogram_array):
        """Test base value is preserved in output."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        
        shap_values = np.random.randn(1, 224, 224, 3).astype(np.float32) * 0.1
        base_value = 0.65
        
        config = SHAPConfig()
        result = service._process_shap_values(shap_values, base_value, sample_mammogram_array, config)
        
        assert result["base_value"] == base_value


# =============================================================================
# Integration Tests
# =============================================================================

class TestSHAPIntegration:
    """Integration tests for SHAP service."""
    
    def test_generate_shap_explanation_structure(self, sample_mammogram_array, mock_tf_module, mock_keras_model):
        """Test complete SHAP explanation structure."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        config = SHAPConfig(n_samples=5, n_background_samples=5)
        
        result = service.generate_shap_explanation(
            mock_keras_model,
            sample_mammogram_array,
            config=config
        )
        
        # Verify all expected outputs
        assert "shap_map" in result
        assert "base_value" in result
        assert "positive_regions" in result
        assert "negative_regions" in result
        assert "method_used" in result
        assert "n_samples" in result
        assert "n_background" in result
    
    def test_service_set_modules(self, mock_tf_module):
        """Test set_modules correctly assigns modules."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        mock_keras = Mock()
        
        service.set_modules(mock_tf_module, mock_keras)
        
        assert service.tf is mock_tf_module
        assert service.keras is mock_keras
    
    def test_check_shap_availability(self):
        """Test SHAP library availability check."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        # Should not crash
        result = service._check_shap()
        
        assert isinstance(result, bool)


# =============================================================================
# Colored Overlay Tests
# =============================================================================

class TestSHAPColoredOverlay:
    """Tests for SHAP colored overlay generation."""
    
    def test_generate_colored_overlay_shape(self, sample_mammogram_array, sample_shap_values):
        """Test colored overlay has correct shape."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        # Extract 2D image
        original = sample_mammogram_array[0, :, :, 0]
        shap_map = sample_shap_values
        
        overlay = service.generate_colored_shap_overlay(original, shap_map)
        
        assert overlay.shape[0] == original.shape[0]
        assert overlay.shape[1] == original.shape[1]
        assert overlay.shape[2] == 3  # RGB
    
    def test_generate_colored_overlay_dtype(self, sample_mammogram_array, sample_shap_values):
        """Test colored overlay dtype."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        original = sample_mammogram_array[0, :, :, 0]
        
        overlay = service.generate_colored_shap_overlay(original, sample_shap_values)
        
        assert overlay.dtype == np.uint8
    
    def test_generate_colored_overlay_with_alpha(self, sample_mammogram_array, sample_shap_values):
        """Test colored overlay respects alpha parameter."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        original = sample_mammogram_array[0, :, :, 0]
        
        overlay_low_alpha = service.generate_colored_shap_overlay(original, sample_shap_values, alpha=0.2)
        overlay_high_alpha = service.generate_colored_shap_overlay(original, sample_shap_values, alpha=0.8)
        
        # Different alphas should produce different results
        assert not np.array_equal(overlay_low_alpha, overlay_high_alpha)


# =============================================================================
# Summary Plot Data Tests
# =============================================================================

class TestSHAPSummaryPlot:
    """Tests for SHAP summary plot data generation."""
    
    def test_summary_plot_data_structure(self, sample_shap_values):
        """Test summary plot data structure."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        # Flatten for feature-level view
        shap_flat = sample_shap_values.flatten()
        
        result = service.generate_shap_summary_plot_data(shap_flat)
        
        assert "feature_names" in result
        assert "importance_values" in result
        assert "mean_shap" in result
        assert "max_shap" in result
    
    def test_summary_plot_custom_feature_names(self, sample_shap_values):
        """Test summary plot with custom feature names."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        shap_flat = sample_shap_values.flatten()
        feature_names = [f"pixel_{i}" for i in range(len(shap_flat))]
        
        result = service.generate_shap_summary_plot_data(shap_flat, feature_names)
        
        assert all(name in result["feature_names"] for name in feature_names[:len(result["feature_names"])])


# =============================================================================
# Singleton Pattern Tests
# =============================================================================

class TestSHAPSingleton:
    """Tests for SHAP service singleton pattern."""
    
    def test_singleton_returns_same_instance(self):
        """Test singleton returns same instance."""
        from app.services.shap_service import get_shap_service
        
        service1 = get_shap_service()
        service2 = get_shap_service()
        
        assert service1 is service2
    
    def test_singleton_is_shap_service(self):
        """Test singleton is SHAPService instance."""
        from app.services.shap_service import get_shap_service, SHAPService
        
        service = get_shap_service()
        
        assert isinstance(service, SHAPService)


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestSHAPEdgeCases:
    """Edge case tests for SHAP service."""
    
    def test_all_zero_shap_values(self):
        """Test handling of all-zero SHAP values."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        zero_shap = np.zeros((56, 56), dtype=np.float32)
        
        positive = service._extract_extreme_regions(zero_shap, positive=True)
        negative = service._extract_extreme_regions(zero_shap, positive=False)
        
        # Should return empty or handle gracefully
        assert isinstance(positive, list)
        assert isinstance(negative, list)
    
    def test_uniform_shap_values(self):
        """Test handling of uniform SHAP values."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        uniform_shap = np.full((56, 56), 0.5, dtype=np.float32)
        
        # Should handle without error
        regions = service._extract_extreme_regions(uniform_shap, positive=True)
        
        assert isinstance(regions, list)
    
    def test_small_image_input(self, mock_tf_module):
        """Test handling of small image input."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        # Small 28x28 image
        small_img = np.random.rand(1, 28, 28, 3).astype(np.float32)
        
        config = SHAPConfig(n_background_samples=5)
        background = service._create_background(small_img, config)
        
        assert background.shape[1:] == small_img.shape[1:]
    
    def test_grayscale_input(self, mock_tf_module):
        """Test handling of grayscale (single channel) input."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        # Single channel image
        gray_img = np.random.rand(1, 224, 224, 1).astype(np.float32)
        
        config = SHAPConfig(n_background_samples=5)
        background = service._create_background(gray_img, config)
        
        assert background.shape[-1] == 1


# =============================================================================
# Performance Tests
# =============================================================================

@pytest.mark.slow
class TestSHAPPerformance:
    """Performance tests for SHAP service."""
    
    def test_region_extraction_performance(self, sample_shap_values):
        """Benchmark region extraction speed."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        start = time.time()
        for _ in range(100):
            service._extract_extreme_regions(sample_shap_values, positive=True)
        elapsed = time.time() - start
        
        assert elapsed < 2.0, f"Region extraction too slow: {elapsed:.2f}s for 100 iterations"
    
    def test_background_generation_performance(self, sample_mammogram_array, mock_tf_module):
        """Benchmark background generation speed."""
        from app.services.shap_service import SHAPService, SHAPConfig
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        config = SHAPConfig(n_background_samples=50)
        
        start = time.time()
        for _ in range(10):
            service._create_background(sample_mammogram_array, config)
        elapsed = time.time() - start
        
        assert elapsed < 5.0, f"Background generation too slow: {elapsed:.2f}s for 10 iterations"
    
    def test_superpixel_creation_performance(self, sample_mammogram_array):
        """Benchmark superpixel creation speed."""
        from app.services.shap_service import SHAPService
        
        service = SHAPService()
        
        img_2d = sample_mammogram_array[0, :, :, 0]
        
        start = time.time()
        for _ in range(10):
            service._create_superpixels(img_2d, n_segments=50)
        elapsed = time.time() - start
        
        assert elapsed < 5.0, f"Superpixel creation too slow: {elapsed:.2f}s for 10 iterations"
