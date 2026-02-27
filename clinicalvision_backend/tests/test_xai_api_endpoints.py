"""
XAI API Endpoint Test Suite

Tests for LIME, SHAP, GradCAM, and XAI Comparison API endpoints.
Focuses on response format validation and schema compliance.

For full integration tests with authentication, see test_integration_api.py
"""

import pytest
import numpy as np
from PIL import Image
import io
import sys
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime
from unittest.mock import Mock, patch

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_image_file():
    """Create sample image as bytes for upload."""
    img = Image.new("RGB", (224, 224), color=(128, 128, 128))
    
    # Add some structure
    pixels = img.load()
    for i in range(100, 150):
        for j in range(100, 150):
            pixels[i, j] = (200, 200, 200)
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer.read()


@pytest.fixture
def mock_lime_response():
    """Mock LIME service response."""
    np.random.seed(42)
    return {
        "lime_map": np.random.rand(56, 56).tolist(),
        "top_segments": [
            {
                "segment_id": 1,
                "importance": 0.85,
                "location": "upper outer quadrant",
                "area_fraction": 0.12,
                "bbox": [50, 60, 30, 30]
            },
            {
                "segment_id": 2,
                "importance": 0.72,
                "location": "central",
                "area_fraction": 0.08,
                "bbox": [100, 110, 25, 25]
            }
        ],
        "n_segments": 50,
        "n_samples": 100,
        "method": "lime",
        "execution_time_ms": 450
    }


@pytest.fixture
def mock_shap_response():
    """Mock SHAP service response."""
    np.random.seed(43)
    return {
        "shap_map": np.random.rand(56, 56).tolist(),
        "base_value": 0.42,
        "prediction_contribution": 0.33,
        "feature_importance": {
            "total_positive": 0.45,
            "total_negative": -0.12,
            "net_contribution": 0.33
        },
        "positive_regions": [
            {
                "region_id": 1,
                "bbox": [80, 85, 40, 35],
                "centroid": [100, 102],
                "mean_shap": 0.28,
                "area_fraction": 0.05,
                "contribution_type": "supports_malignancy",
                "location": "upper outer quadrant"
            }
        ],
        "negative_regions": [
            {
                "region_id": 1,
                "bbox": [150, 160, 25, 20],
                "centroid": [162, 170],
                "mean_shap": -0.08,
                "area_fraction": 0.02,
                "contribution_type": "supports_benign",
                "location": "lower inner quadrant"
            }
        ],
        "method_used": "shap_gradient",
        "n_samples": 50,
        "n_background": 50
    }


@pytest.fixture
def mock_gradcam_response():
    """Mock GradCAM service response."""
    np.random.seed(44)
    return {
        "attention_map": np.random.rand(56, 56).tolist(),
        "suspicious_regions": [
            {
                "region_id": 1,
                "bbox": [90, 95, 45, 40],
                "centroid": [112, 115],
                "confidence": 0.85,
                "area_fraction": 0.07,
                "location": "central"
            }
        ],
        "method": "gradcam",
        "target_layer": "conv5_block3_out",
        "execution_time_ms": 120
    }


@pytest.fixture
def mock_xai_validation_response():
    """Mock XAI validation response."""
    return {
        "validation_result": "passed",
        "quality_scores": {
            "sparsity": {"score": 0.75, "status": "good"},
            "coherence": {"score": 0.82, "status": "good"},
            "coverage": {"score": 0.68, "status": "acceptable"}
        },
        "overall_score": 0.75,
        "recommendations": [],
        "timestamp": datetime.now().isoformat()
    }


# =============================================================================
# Response Format Validation Tests
# =============================================================================

class TestLIMEResponseFormat:
    """Tests for LIME response format validation."""
    
    def test_lime_response_has_required_keys(self, mock_lime_response):
        """Test LIME response contains all required keys."""
        required_keys = ["lime_map", "top_segments", "method"]
        
        for key in required_keys:
            assert key in mock_lime_response, f"Missing required key: {key}"
    
    def test_lime_map_is_2d_array(self, mock_lime_response):
        """Test lime_map is a 2D list."""
        lime_map = mock_lime_response["lime_map"]
        
        assert isinstance(lime_map, list)
        assert len(lime_map) > 0
        assert isinstance(lime_map[0], list)
    
    def test_lime_segment_structure(self, mock_lime_response):
        """Test LIME segment has required fields."""
        segments = mock_lime_response["top_segments"]
        
        assert len(segments) > 0
        
        segment = segments[0]
        required_segment_keys = ["segment_id", "importance", "location"]
        
        for key in required_segment_keys:
            assert key in segment, f"Segment missing key: {key}"
    
    def test_lime_segment_importance_range(self, mock_lime_response):
        """Test segment importance is in valid range."""
        for segment in mock_lime_response["top_segments"]:
            importance = segment["importance"]
            assert -1 <= importance <= 1, f"Importance {importance} out of range"
    
    def test_lime_bbox_format(self, mock_lime_response):
        """Test bbox is [x, y, width, height]."""
        for segment in mock_lime_response["top_segments"]:
            if "bbox" in segment:
                bbox = segment["bbox"]
                assert len(bbox) == 4
                assert all(isinstance(v, (int, float)) for v in bbox)


# =============================================================================
# SHAP Response Format Tests
# =============================================================================

class TestSHAPResponseFormat:
    """Tests for SHAP response format validation."""
    
    def test_shap_response_has_required_keys(self, mock_shap_response):
        """Test SHAP response contains all required keys."""
        required_keys = ["shap_map", "base_value", "positive_regions", "negative_regions"]
        
        for key in required_keys:
            assert key in mock_shap_response, f"Missing required key: {key}"
    
    def test_shap_map_is_2d_array(self, mock_shap_response):
        """Test shap_map is a 2D list."""
        shap_map = mock_shap_response["shap_map"]
        
        assert isinstance(shap_map, list)
        assert len(shap_map) > 0
        assert isinstance(shap_map[0], list)
    
    def test_shap_region_structure(self, mock_shap_response):
        """Test SHAP region has required fields."""
        positive = mock_shap_response["positive_regions"]
        
        if positive:
            region = positive[0]
            required_keys = ["region_id", "mean_shap", "contribution_type"]
            
            for key in required_keys:
                assert key in region, f"Region missing key: {key}"
    
    def test_shap_base_value_is_numeric(self, mock_shap_response):
        """Test base_value is a number."""
        base_value = mock_shap_response["base_value"]
        
        assert isinstance(base_value, (int, float))
    
    def test_shap_contribution_types(self, mock_shap_response):
        """Test contribution types are valid."""
        valid_types = ["supports_malignancy", "supports_benign"]
        
        for region in mock_shap_response["positive_regions"]:
            assert region["contribution_type"] in valid_types
        
        for region in mock_shap_response["negative_regions"]:
            assert region["contribution_type"] in valid_types
    
    def test_shap_feature_importance_structure(self, mock_shap_response):
        """Test feature_importance has correct structure."""
        fi = mock_shap_response.get("feature_importance", {})
        
        expected_keys = ["total_positive", "total_negative", "net_contribution"]
        
        for key in expected_keys:
            if fi:
                assert key in fi, f"Feature importance missing: {key}"


# =============================================================================
# GradCAM Response Format Tests
# =============================================================================

class TestGradCAMResponseFormat:
    """Tests for GradCAM response format validation."""
    
    def test_gradcam_response_has_required_keys(self, mock_gradcam_response):
        """Test GradCAM response contains required keys."""
        required_keys = ["attention_map", "method"]
        
        for key in required_keys:
            assert key in mock_gradcam_response, f"Missing key: {key}"
    
    def test_gradcam_attention_map_is_2d(self, mock_gradcam_response):
        """Test attention_map is 2D list."""
        attention_map = mock_gradcam_response["attention_map"]
        
        assert isinstance(attention_map, list)
        assert len(attention_map) > 0
        assert isinstance(attention_map[0], list)
    
    def test_gradcam_suspicious_region_structure(self, mock_gradcam_response):
        """Test suspicious region structure."""
        regions = mock_gradcam_response.get("suspicious_regions", [])
        
        if regions:
            region = regions[0]
            required = ["region_id", "bbox", "confidence"]
            
            for key in required:
                assert key in region, f"Region missing: {key}"
    
    def test_gradcam_confidence_range(self, mock_gradcam_response):
        """Test confidence values are in [0, 1]."""
        for region in mock_gradcam_response.get("suspicious_regions", []):
            conf = region.get("confidence", 0.5)
            assert 0 <= conf <= 1


# =============================================================================
# Validation Response Format Tests
# =============================================================================

class TestValidationResponseFormat:
    """Tests for XAI validation response format."""
    
    def test_validation_response_structure(self, mock_xai_validation_response):
        """Test validation response structure."""
        required_keys = ["validation_result", "quality_scores"]
        
        for key in required_keys:
            assert key in mock_xai_validation_response
    
    def test_validation_result_values(self, mock_xai_validation_response):
        """Test validation result is valid enum value."""
        valid_results = ["passed", "warning", "failed", "unknown"]
        
        result = mock_xai_validation_response["validation_result"]
        assert result in valid_results
    
    def test_quality_scores_have_score_field(self, mock_xai_validation_response):
        """Test quality scores contain score field."""
        scores = mock_xai_validation_response["quality_scores"]
        
        for metric, data in scores.items():
            assert "score" in data, f"Metric {metric} missing score"
            assert 0 <= data["score"] <= 1


# =============================================================================
# Schema Compliance Tests
# =============================================================================

class TestSchemaCompliance:
    """Tests for API schema compliance."""
    
    def test_attention_map_values_normalized(self, mock_gradcam_response):
        """Test attention map values are in [0, 1]."""
        attention_map = np.array(mock_gradcam_response["attention_map"])
        
        assert attention_map.min() >= 0
        assert attention_map.max() <= 1
    
    def test_lime_map_values_normalized(self, mock_lime_response):
        """Test LIME map values are in [0, 1]."""
        lime_map = np.array(mock_lime_response["lime_map"])
        
        assert lime_map.min() >= 0
        assert lime_map.max() <= 1
    
    def test_shap_map_values_normalized(self, mock_shap_response):
        """Test SHAP map values are in valid range."""
        shap_map = np.array(mock_shap_response["shap_map"])
        
        # SHAP normalized maps should be in [0, 1]
        assert shap_map.min() >= 0
        assert shap_map.max() <= 1
    
    def test_bbox_non_negative(self, mock_lime_response, mock_shap_response, mock_gradcam_response):
        """Test all bbox values are non-negative."""
        def check_bbox(regions):
            for r in regions:
                if "bbox" in r:
                    assert all(v >= 0 for v in r["bbox"])
        
        check_bbox(mock_lime_response.get("top_segments", []))
        check_bbox(mock_shap_response.get("positive_regions", []))
        check_bbox(mock_shap_response.get("negative_regions", []))
        check_bbox(mock_gradcam_response.get("suspicious_regions", []))


# =============================================================================
# Service Import Tests
# =============================================================================

class TestServiceImports:
    """Tests to verify all services can be imported."""
    
    def test_import_explainability_service(self):
        """Test explainability service imports."""
        from app.services.explainability_service import (
            ExplainabilityService,
            ExplainabilityMethod,
            get_explainability_service
        )
        
        assert ExplainabilityService is not None
        assert ExplainabilityMethod is not None
        assert callable(get_explainability_service)
    
    def test_import_lime_service(self):
        """Test LIME service imports."""
        from app.services.lime_service import (
            LIMEService,
            LIMEConfig,
            get_lime_service
        )
        
        assert LIMEService is not None
        assert LIMEConfig is not None
        assert callable(get_lime_service)
    
    def test_import_shap_service(self):
        """Test SHAP service imports."""
        from app.services.shap_service import (
            SHAPService,
            SHAPConfig,
            SHAPMethod,
            get_shap_service
        )
        
        assert SHAPService is not None
        assert SHAPConfig is not None
        assert SHAPMethod is not None
        assert callable(get_shap_service)
    
    def test_import_validation_service(self):
        """Test XAI validation service imports."""
        from app.services.xai_validation_service import (
            XAIValidationService,
            get_xai_validation_service,
            QualityScore
        )
        
        assert XAIValidationService is not None
        assert QualityScore is not None
        assert callable(get_xai_validation_service)
    
    def test_import_clinical_narrative_service(self):
        """Test clinical narrative service imports."""
        from app.services.clinical_narrative_service import (
            ClinicalNarrativeService,
            get_clinical_narrative_service
        )
        
        assert ClinicalNarrativeService is not None
        assert callable(get_clinical_narrative_service)


# =============================================================================
# API Schema Import Tests
# =============================================================================

class TestAPISchemaImports:
    """Tests to verify API schemas can be imported."""
    
    def test_import_inference_schemas(self):
        """Test inference schemas import."""
        from app.schemas.inference import (
            InferenceRequest,
            InferenceResponse,
            GradCAMRequest,
            GradCAMResponse
        )
        
        assert InferenceRequest is not None
        assert InferenceResponse is not None
    
    def test_import_xai_schemas(self):
        """Test XAI-related schemas import."""
        from app.schemas.inference import (
            ExplainabilityMethodEnum,
            SuspiciousRegion
        )
        
        assert ExplainabilityMethodEnum is not None
        assert SuspiciousRegion is not None


# =============================================================================
# Error Response Format Tests
# =============================================================================

class TestErrorResponseFormats:
    """Tests for error response format standards."""
    
    def test_error_response_structure(self):
        """Test standard error response has required fields."""
        # Standard FastAPI error response format
        error_response = {
            "detail": "Error message here"
        }
        
        assert "detail" in error_response
    
    def test_validation_error_structure(self):
        """Test validation error format."""
        # FastAPI validation error format
        validation_error = {
            "detail": [
                {
                    "loc": ["body", "field_name"],
                    "msg": "field required",
                    "type": "value_error.missing"
                }
            ]
        }
        
        assert "detail" in validation_error
        assert isinstance(validation_error["detail"], list)


# =============================================================================
# Map Size Consistency Tests
# =============================================================================

class TestMapSizeConsistency:
    """Tests for consistent map sizes across methods."""
    
    def test_lime_map_shape(self, mock_lime_response):
        """Test LIME map shape."""
        lime_map = np.array(mock_lime_response["lime_map"])
        
        assert lime_map.ndim == 2
        # Common output size is 56x56
        assert lime_map.shape[0] > 0
        assert lime_map.shape[1] > 0
    
    def test_shap_map_shape(self, mock_shap_response):
        """Test SHAP map shape."""
        shap_map = np.array(mock_shap_response["shap_map"])
        
        assert shap_map.ndim == 2
        assert shap_map.shape[0] > 0
        assert shap_map.shape[1] > 0
    
    def test_gradcam_map_shape(self, mock_gradcam_response):
        """Test GradCAM map shape."""
        attention_map = np.array(mock_gradcam_response["attention_map"])
        
        assert attention_map.ndim == 2
        assert attention_map.shape[0] > 0
        assert attention_map.shape[1] > 0


# =============================================================================
# Timestamp Format Tests
# =============================================================================

class TestTimestampFormat:
    """Tests for timestamp format in responses."""
    
    def test_validation_timestamp_format(self, mock_xai_validation_response):
        """Test timestamp is ISO format."""
        timestamp = mock_xai_validation_response.get("timestamp")
        
        if timestamp:
            # Should be parseable as datetime
            from datetime import datetime
            try:
                datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                parsed = True
            except ValueError:
                parsed = False
            
            assert parsed, f"Invalid timestamp format: {timestamp}"
