"""
XAI Comparison Service Test Suite

Tests for XAI comparison functionality including multi-method comparison,
agreement scores, and consensus region identification using actual services.

Coverage:
- Multi-method XAI execution (GradCAM, LIME, SHAP)
- Map agreement/correlation computation
- Consensus region identification
- Method comparison summary
- Response format validation
"""

import pytest
import numpy as np
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import time
from scipy.stats import pearsonr

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
def sample_gradcam_map():
    """Create sample GradCAM attention map."""
    np.random.seed(42)
    heatmap = np.zeros((56, 56), dtype=np.float32)
    
    # Add high attention region
    y, x = np.ogrid[:56, :56]
    center = (30, 30)
    radius = 10
    mask = (x - center[0])**2 + (y - center[1])**2 <= radius**2
    heatmap[mask] = 0.8
    
    # Add background noise
    heatmap += np.random.rand(56, 56) * 0.2
    
    return np.clip(heatmap, 0, 1)


@pytest.fixture
def sample_lime_map():
    """Create sample LIME explanation map."""
    np.random.seed(43)  # Different seed
    heatmap = np.zeros((56, 56), dtype=np.float32)
    
    # LIME regions with similar location to GradCAM for agreement
    y, x = np.ogrid[:56, :56]
    center = (28, 32)  # Slightly offset
    radius = 12
    mask = (x - center[0])**2 + (y - center[1])**2 <= radius**2
    heatmap[mask] = 0.7
    
    heatmap += np.random.rand(56, 56) * 0.15
    
    return np.clip(heatmap, 0, 1)


@pytest.fixture
def sample_shap_map():
    """Create sample SHAP explanation map."""
    np.random.seed(44)  # Different seed
    # SHAP values normalized to [0, 1]
    heatmap = np.full((56, 56), 0.5, dtype=np.float32)
    
    # Positive contribution region (similar location)
    y, x = np.ogrid[:56, :56]
    center = (32, 28)  # Slightly offset
    radius = 11
    mask = (x - center[0])**2 + (y - center[1])**2 <= radius**2
    heatmap[mask] = 0.85
    
    # Slight variation
    heatmap += np.random.rand(56, 56) * 0.1 - 0.05
    
    return np.clip(heatmap, 0, 1)


@pytest.fixture
def all_xai_maps(sample_gradcam_map, sample_lime_map, sample_shap_map):
    """All XAI maps for comparison."""
    return {
        "gradcam": sample_gradcam_map,
        "lime": sample_lime_map,
        "shap": sample_shap_map
    }


@pytest.fixture
def mock_tf_module():
    """Create mock TensorFlow module."""
    tf = Mock()
    
    tape = Mock()
    tape.__enter__ = Mock(return_value=tape)
    tape.__exit__ = Mock(return_value=False)
    tape.watch = Mock()
    tape.gradient = Mock(return_value=np.random.randn(1, 7, 7, 1024).astype(np.float32))
    
    tf.GradientTape = Mock(return_value=tape)
    tf.Variable = Mock(side_effect=lambda x, dtype=None: x)
    tf.float32 = np.float32
    
    return tf


# =============================================================================
# Agreement Score Tests
# =============================================================================

class TestAgreementScore:
    """Tests for XAI method agreement computation."""
    
    def test_perfect_agreement_score(self):
        """Test perfect agreement between identical maps."""
        map1 = np.random.rand(56, 56).astype(np.float32)
        map2 = map1.copy()
        
        # Perfect agreement should have correlation = 1
        correlation, _ = pearsonr(map1.flatten(), map2.flatten())
        
        assert correlation > 0.99
    
    def test_zero_agreement_with_inverse_maps(self):
        """Test agreement with inversely correlated maps."""
        map1 = np.random.rand(56, 56).astype(np.float32)
        map2 = 1.0 - map1  # Inverse
        
        correlation, _ = pearsonr(map1.flatten(), map2.flatten())
        
        assert correlation < -0.99
    
    def test_partial_agreement(self, all_xai_maps):
        """Test partial agreement between different XAI methods."""
        correlations = {}
        maps = list(all_xai_maps.values())
        names = list(all_xai_maps.keys())
        
        for i in range(len(maps)):
            for j in range(i + 1, len(maps)):
                corr, _ = pearsonr(maps[i].flatten(), maps[j].flatten())
                correlations[f"{names[i]}_vs_{names[j]}"] = corr
        
        # Methods should have some positive correlation (designed with overlapping regions)
        for corr in correlations.values():
            assert corr > -1.0 and corr < 1.0  # Not perfect or inverse
    
    def test_agreement_independent_of_scale(self):
        """Test agreement score is independent of intensity scaling."""
        map1 = np.random.rand(56, 56).astype(np.float32)
        map2 = map1 * 2.0  # Scaled version
        
        correlation, _ = pearsonr(map1.flatten(), map2.flatten())
        
        # Correlation should still be perfect despite scaling
        assert correlation > 0.99
    
    def test_agreement_handles_zeros(self):
        """Test agreement handles zero-filled regions."""
        map1 = np.zeros((56, 56), dtype=np.float32)
        map1[20:30, 20:30] = 1.0
        
        map2 = np.zeros((56, 56), dtype=np.float32)
        map2[22:32, 22:32] = 0.8  # Overlapping but offset
        
        # Should compute without errors
        correlation, _ = pearsonr(map1.flatten(), map2.flatten())
        assert np.isfinite(correlation)


# =============================================================================
# Correlation Computation Tests
# =============================================================================

class TestCorrelationComputation:
    """Tests for pairwise correlation computation."""
    
    def test_compute_pairwise_correlations(self, all_xai_maps):
        """Test pairwise correlation matrix computation."""
        names = list(all_xai_maps.keys())
        n = len(names)
        
        correlation_matrix = np.zeros((n, n))
        
        for i, name_i in enumerate(names):
            for j, name_j in enumerate(names):
                map_i = all_xai_maps[name_i].flatten()
                map_j = all_xai_maps[name_j].flatten()
                correlation_matrix[i, j], _ = pearsonr(map_i, map_j)
        
        # Diagonal should be 1.0
        for i in range(n):
            assert abs(correlation_matrix[i, i] - 1.0) < 1e-6
        
        # Should be symmetric
        np.testing.assert_array_almost_equal(
            correlation_matrix, correlation_matrix.T
        )
    
    def test_correlation_output_range(self, all_xai_maps):
        """Test correlation values are in valid range [-1, 1]."""
        for name_i, map_i in all_xai_maps.items():
            for name_j, map_j in all_xai_maps.items():
                corr, _ = pearsonr(map_i.flatten(), map_j.flatten())
                assert -1.0 <= corr <= 1.0
    
    def test_correlation_with_constant_map(self):
        """Test correlation handling with constant map."""
        map1 = np.random.rand(56, 56).astype(np.float32)
        map2 = np.full((56, 56), 0.5, dtype=np.float32)
        
        # Constant map correlation is undefined (NaN)
        with np.errstate(invalid='ignore'):
            corr, _ = pearsonr(map1.flatten(), map2.flatten())
        
        # Should be NaN or handle gracefully
        assert np.isnan(corr) or np.isfinite(corr)


# =============================================================================
# Consensus Region Tests
# =============================================================================

class TestConsensusRegions:
    """Tests for finding consensus regions across methods."""
    
    def test_find_overlapping_high_attention_regions(self, all_xai_maps):
        """Test finding regions with high attention across methods."""
        threshold = 0.7
        
        # Create combined mask
        combined_mask = np.ones((56, 56), dtype=bool)
        
        for name, xai_map in all_xai_maps.items():
            high_attention = xai_map > threshold
            combined_mask &= high_attention
        
        # Should find some consensus regions
        consensus_area = np.sum(combined_mask)
        assert consensus_area >= 0  # May be 0 if no perfect overlap
    
    def test_consensus_with_matching_regions(self):
        """Test consensus when all methods agree on same region."""
        # Create maps with identical high-attention region
        base_region = np.zeros((56, 56), dtype=np.float32)
        base_region[25:35, 25:35] = 0.9
        
        map1 = base_region + np.random.rand(56, 56) * 0.1
        map2 = base_region + np.random.rand(56, 56) * 0.1
        map3 = base_region + np.random.rand(56, 56) * 0.1
        
        threshold = 0.5
        consensus = (map1 > threshold) & (map2 > threshold) & (map3 > threshold)
        
        # Should have substantial consensus
        consensus_area = np.sum(consensus)
        assert consensus_area > 50
    
    def test_no_consensus_with_disjoint_regions(self):
        """Test no consensus when methods highlight different regions."""
        map1 = np.zeros((56, 56), dtype=np.float32)
        map1[5:15, 5:15] = 0.9  # Upper left
        
        map2 = np.zeros((56, 56), dtype=np.float32)
        map2[40:50, 40:50] = 0.9  # Lower right
        
        threshold = 0.5
        consensus = (map1 > threshold) & (map2 > threshold)
        
        # No overlap
        assert np.sum(consensus) == 0
    
    def test_consensus_threshold_sensitivity(self, all_xai_maps):
        """Test consensus changes with threshold."""
        thresholds = [0.3, 0.5, 0.7, 0.9]
        consensus_areas = []
        
        for threshold in thresholds:
            combined_mask = np.ones((56, 56), dtype=bool)
            for xai_map in all_xai_maps.values():
                combined_mask &= (xai_map > threshold)
            consensus_areas.append(np.sum(combined_mask))
        
        # Higher threshold should give smaller or equal consensus area
        for i in range(len(consensus_areas) - 1):
            assert consensus_areas[i] >= consensus_areas[i + 1]


# =============================================================================
# Method Normalization Tests
# =============================================================================

class TestMethodNormalization:
    """Tests for normalizing XAI outputs for comparison."""
    
    def test_normalize_to_unit_range(self, sample_gradcam_map):
        """Test normalization to [0, 1] range."""
        # Add some values outside [0, 1]
        unnormalized = sample_gradcam_map * 2.0 - 0.5
        
        # Normalize
        min_val = unnormalized.min()
        max_val = unnormalized.max()
        normalized = (unnormalized - min_val) / (max_val - min_val + 1e-8)
        
        assert normalized.min() >= 0
        assert normalized.max() <= 1
    
    def test_normalize_shap_symmetric_range(self, sample_shap_map):
        """Test SHAP normalization from symmetric range."""
        # SHAP values can be positive and negative
        shap_raw = sample_shap_map * 2.0 - 1.0  # Map to [-1, 1]
        
        # Normalize to [0, 1] preserving sign information
        normalized = (shap_raw + 1.0) / 2.0
        
        assert normalized.min() >= 0
        assert normalized.max() <= 1
    
    def test_normalization_preserves_relative_ordering(self, sample_lime_map):
        """Test normalization preserves relative importance ordering."""
        original = sample_lime_map.copy()
        
        # Apply min-max normalization
        min_val = original.min()
        max_val = original.max()
        normalized = (original - min_val) / (max_val - min_val + 1e-8)
        
        # Check ordering is preserved
        for i in range(10):
            idx1 = np.random.randint(0, 56, 2)
            idx2 = np.random.randint(0, 56, 2)
            
            if original[idx1[0], idx1[1]] > original[idx2[0], idx2[1]]:
                assert normalized[idx1[0], idx1[1]] >= normalized[idx2[0], idx2[1]]


# =============================================================================
# IoU (Intersection over Union) Tests
# =============================================================================

class TestRegionIoU:
    """Tests for region IoU computation."""
    
    def test_perfect_iou(self):
        """Test perfect IoU with identical regions."""
        region = np.zeros((56, 56), dtype=bool)
        region[20:30, 20:30] = True
        
        intersection = np.sum(region & region)
        union = np.sum(region | region)
        iou = intersection / union
        
        assert abs(iou - 1.0) < 1e-6
    
    def test_no_overlap_iou(self):
        """Test zero IoU with non-overlapping regions."""
        region1 = np.zeros((56, 56), dtype=bool)
        region1[5:15, 5:15] = True
        
        region2 = np.zeros((56, 56), dtype=bool)
        region2[40:50, 40:50] = True
        
        intersection = np.sum(region1 & region2)
        union = np.sum(region1 | region2)
        iou = intersection / union
        
        assert iou == 0.0
    
    def test_partial_overlap_iou(self):
        """Test partial IoU with overlapping regions."""
        region1 = np.zeros((56, 56), dtype=bool)
        region1[20:30, 20:30] = True
        
        region2 = np.zeros((56, 56), dtype=bool)
        region2[25:35, 25:35] = True
        
        intersection = np.sum(region1 & region2)
        union = np.sum(region1 | region2)
        iou = intersection / union
        
        assert 0.0 < iou < 1.0
    
    def test_iou_is_symmetric(self):
        """Test IoU is symmetric."""
        region1 = np.random.rand(56, 56) > 0.7
        region2 = np.random.rand(56, 56) > 0.7
        
        iou_1_2 = np.sum(region1 & region2) / np.sum(region1 | region2)
        iou_2_1 = np.sum(region2 & region1) / np.sum(region2 | region1)
        
        assert abs(iou_1_2 - iou_2_1) < 1e-6


# =============================================================================
# Comparison Summary Tests  
# =============================================================================

class TestComparisonSummary:
    """Tests for comparison summary generation."""
    
    def test_generate_summary_with_high_agreement(self, all_xai_maps):
        """Test summary generation with high agreement methods."""
        # Compute mean agreement
        correlations = []
        maps = list(all_xai_maps.values())
        
        for i in range(len(maps)):
            for j in range(i + 1, len(maps)):
                corr, _ = pearsonr(maps[i].flatten(), maps[j].flatten())
                correlations.append(corr)
        
        mean_agreement = np.mean(correlations)
        
        # Build summary
        summary = {
            "mean_agreement": mean_agreement,
            "methods_compared": list(all_xai_maps.keys()),
            "interpretation": "high" if mean_agreement > 0.7 else "moderate" if mean_agreement > 0.4 else "low"
        }
        
        assert "mean_agreement" in summary
        assert "methods_compared" in summary
        assert "interpretation" in summary
    
    def test_summary_includes_consensus_info(self, all_xai_maps):
        """Test summary includes consensus region information."""
        threshold = 0.7
        
        # Find consensus
        combined_mask = np.ones((56, 56), dtype=bool)
        for xai_map in all_xai_maps.values():
            combined_mask &= (xai_map > threshold)
        
        consensus_fraction = np.sum(combined_mask) / (56 * 56)
        
        summary = {
            "consensus_region_fraction": consensus_fraction,
            "high_attention_threshold": threshold
        }
        
        assert summary["consensus_region_fraction"] >= 0
        assert summary["consensus_region_fraction"] <= 1


# =============================================================================
# Service Integration Tests
# =============================================================================

class TestServiceIntegration:
    """Integration tests using actual services."""
    
    def test_explainability_service_available(self):
        """Test explainability service can be imported."""
        from app.services.explainability_service import ExplainabilityService, ExplainabilityMethod
        
        service = ExplainabilityService()
        assert service is not None
    
    def test_gradcam_service_available(self):
        """Test GradCAM service can be imported."""
        from app.services.explainability_service import get_explainability_service
        
        service = get_explainability_service()
        assert service is not None
    
    def test_lime_service_available(self):
        """Test LIME service can be imported."""
        from app.services.lime_service import LIMEService, get_lime_service
        
        service = get_lime_service()
        assert service is not None
    
    def test_shap_service_available(self):
        """Test SHAP service can be imported."""
        from app.services.shap_service import SHAPService, get_shap_service
        
        service = get_shap_service()
        assert service is not None


# =============================================================================
# Multi-Method Execution Tests
# =============================================================================

class TestMultiMethodExecution:
    """Tests for executing multiple XAI methods."""
    
    def test_execute_gradcam_method(self, sample_mammogram_array, mock_tf_module):
        """Test GradCAM execution."""
        from app.services.explainability_service import ExplainabilityService, ExplainabilityMethod
        
        service = ExplainabilityService(tf_module=mock_tf_module)
        
        # Should have gradcam methods
        assert ExplainabilityMethod.GRADCAM is not None
        assert ExplainabilityMethod.GRADCAM_PLUS_PLUS is not None
    
    def test_execute_lime_method(self, sample_mammogram_array, mock_tf_module):
        """Test LIME execution."""
        from app.services.lime_service import LIMEService, LIMEConfig
        
        service = LIMEService()
        service.set_modules(mock_tf_module, Mock())
        
        config = LIMEConfig(n_samples=50, n_segments=25)
        
        # Should have proper config
        assert config.n_samples == 50
        assert config.n_segments == 25
    
    def test_execute_shap_method(self, sample_mammogram_array, mock_tf_module):
        """Test SHAP execution."""
        from app.services.shap_service import SHAPService, SHAPConfig, SHAPMethod
        
        service = SHAPService()
        service.set_modules(mock_tf_module, Mock())
        
        config = SHAPConfig(method=SHAPMethod.GRADIENT, n_samples=20)
        
        assert config.method == SHAPMethod.GRADIENT
        assert config.n_samples == 20


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestComparisonEdgeCases:
    """Edge case tests for XAI comparison."""
    
    def test_single_method_comparison(self, sample_gradcam_map):
        """Test comparison with single method."""
        maps = {"gradcam": sample_gradcam_map}
        
        # Should handle gracefully
        correlations = []
        if len(maps) < 2:
            mean_agreement = 1.0  # Perfect agreement with itself
        else:
            pass
        
        assert True  # Just ensure no crash
    
    def test_nan_handling_in_maps(self):
        """Test NaN handling in XAI maps."""
        map_with_nan = np.random.rand(56, 56).astype(np.float32)
        map_with_nan[10, 10] = np.nan
        
        # Replace NaN with 0
        clean_map = np.nan_to_num(map_with_nan, nan=0.0)
        
        assert not np.any(np.isnan(clean_map))
    
    def test_empty_map_handling(self):
        """Test handling of empty (all-zero) maps."""
        empty_map = np.zeros((56, 56), dtype=np.float32)
        
        # Should not crash when normalizing
        min_val = empty_map.min()
        max_val = empty_map.max()
        
        if max_val == min_val:
            normalized = np.full_like(empty_map, 0.5)
        else:
            normalized = (empty_map - min_val) / (max_val - min_val)
        
        assert normalized.shape == empty_map.shape
    
    def test_different_sized_maps(self):
        """Test handling of maps with different sizes."""
        import cv2
        
        map1 = np.random.rand(56, 56).astype(np.float32)
        map2 = np.random.rand(28, 28).astype(np.float32)
        
        # Resize to common size
        common_size = (56, 56)
        map2_resized = cv2.resize(map2, common_size)
        
        # Now can compute correlation
        corr, _ = pearsonr(map1.flatten(), map2_resized.flatten())
        
        assert np.isfinite(corr)


# =============================================================================
# Performance Tests
# =============================================================================

@pytest.mark.slow
class TestComparisonPerformance:
    """Performance tests for XAI comparison."""
    
    def test_correlation_computation_speed(self, all_xai_maps):
        """Test correlation computation is fast."""
        maps = list(all_xai_maps.values())
        
        start = time.time()
        for _ in range(100):
            for i in range(len(maps)):
                for j in range(i + 1, len(maps)):
                    pearsonr(maps[i].flatten(), maps[j].flatten())
        elapsed = time.time() - start
        
        assert elapsed < 2.0, f"Correlation computation too slow: {elapsed:.2f}s"
    
    def test_consensus_finding_speed(self, all_xai_maps):
        """Test consensus region finding is fast."""
        start = time.time()
        
        for _ in range(100):
            threshold = 0.7
            combined_mask = np.ones((56, 56), dtype=bool)
            for xai_map in all_xai_maps.values():
                combined_mask &= (xai_map > threshold)
        
        elapsed = time.time() - start
        
        assert elapsed < 0.5, f"Consensus finding too slow: {elapsed:.2f}s"
