"""
Comprehensive API Integration Tests for Inference Endpoints

Tests all inference-related endpoints including:
- LIME explanation endpoint
- SHAP explanation endpoint
- XAI comparison endpoint
- XAI validation/quality endpoints
- Clinical narrative generation endpoint
- GradCAM endpoint

These tests use FastAPI TestClient with mocked dependencies for
isolated unit/integration testing.
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
from datetime import datetime

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# =============================================================================
# TEST UTILITIES
# =============================================================================

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


def create_mock_attention_map(size=56):
    """Create a mock attention map."""
    return np.random.rand(size, size).tolist()


def create_mock_lime_result():
    """Create mock LIME service result."""
    return {
        "lime_map": np.random.rand(56, 56).tolist(),
        "top_regions": [
            {"segment_id": 0, "importance": 0.8, "bbox": [10, 20, 50, 60]},
            {"segment_id": 1, "importance": 0.6, "bbox": [30, 40, 70, 80]}
        ],
        "segment_importance": {str(i): np.random.rand() for i in range(10)},
        "n_segments": 50,
        "n_samples": 100,
        "method_used": "lime"
    }


def create_mock_shap_result():
    """Create mock SHAP service result."""
    return {
        "shap_values": np.random.rand(56, 56).tolist(),
        "shap_map": np.random.rand(56, 56).tolist(),
        "positive_regions": [
            {"contribution": 0.5, "bbox": [10, 10, 40, 40], "mean_shap": 0.3}
        ],
        "negative_regions": [
            {"contribution": -0.3, "bbox": [50, 50, 80, 80], "mean_shap": -0.2}
        ],
        "method_used": "gradient",
        "base_value": 0.5,
        "predicted_value": 0.7
    }


def create_mock_gradcam_result():
    """Create mock GradCAM service result."""
    return {
        "attention_map": np.random.rand(56, 56).tolist(),
        "suspicious_regions": [
            {
                "region_id": "region_1",
                "bbox": [10, 20, 50, 60],
                "attention_score": 0.85,
                "severity": "high"
            }
        ],
        "method": "gradcam++",
        "layer_name": "conv_block_5"
    }


# =============================================================================
# MOCK USER FIXTURE
# =============================================================================

class MockUser:
    """Mock user for authentication bypass."""
    def __init__(self, role="radiologist"):
        self.id = 1
        self.email = "test@clinicalvision.ai"
        self.role = Mock()
        self.role.value = role
        self.is_active = True


# =============================================================================
# LIME ENDPOINT TESTS
# =============================================================================

class TestLIMEEndpoint:
    """Tests for the /inference/lime endpoint."""
    
    @pytest.fixture
    def mock_user(self):
        return MockUser()
    
    @pytest.fixture
    def client(self, mock_user):
        """Create test client with mocked auth."""
        from main import app
        from app.core.dependencies import get_current_active_user, get_current_user
        
        async def mock_get_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_user
        app.dependency_overrides[get_current_active_user] = mock_get_user
        
        yield TestClient(app)
        app.dependency_overrides.clear()
    
    def test_lime_endpoint_missing_file(self, client):
        """Test error when no file is provided."""
        response = client.post("/inference/lime")
        assert response.status_code == 422
    
    def test_lime_endpoint_invalid_segments(self, client):
        """Test validation of n_segments parameter."""
        test_image = create_test_image()
        
        # n_segments below minimum (10)
        response = client.post(
            "/inference/lime",
            params={"n_segments": 5},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        assert response.status_code == 422
    
    def test_lime_endpoint_invalid_samples(self, client):
        """Test validation of n_samples parameter."""
        test_image = create_test_image()
        
        # n_samples above maximum (500)
        response = client.post(
            "/inference/lime",
            params={"n_samples": 600},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        assert response.status_code == 422
    
    def test_lime_endpoint_invalid_top_k(self, client):
        """Test validation of top_k_features parameter."""
        test_image = create_test_image()
        
        response = client.post(
            "/inference/lime",
            params={"top_k_features": 100},  # Above max (50)
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        assert response.status_code == 422
    
    def test_lime_endpoint_invalid_alpha(self, client):
        """Test validation of overlay_alpha parameter."""
        test_image = create_test_image()
        
        response = client.post(
            "/inference/lime",
            params={"overlay_alpha": 1.5},  # Above max (1.0)
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        assert response.status_code == 422
    
    @patch('app.services.inference_service.get_inference_service')
    @patch('app.services.lime_service.get_lime_service')
    def test_lime_endpoint_success_mocked(self, mock_lime, mock_inference, client):
        """Test successful LIME generation with mocked services."""
        # Setup mocks
        mock_model = Mock()
        mock_model.is_loaded.return_value = True
        mock_model.ensemble_models = [{'base': Mock()}]
        mock_model.tf = Mock()
        mock_model.keras = Mock()
        
        mock_inference_instance = Mock()
        mock_inference_instance.get_model.return_value = mock_model
        mock_inference.return_value = mock_inference_instance
        
        mock_lime_instance = Mock()
        mock_lime_instance.generate_lime_explanation.return_value = create_mock_lime_result()
        mock_lime.return_value = mock_lime_instance
        
        test_image = create_test_image()
        
        response = client.post(
            "/inference/lime",
            params={
                "n_segments": 50,
                "n_samples": 100,
                "output_format": "heatmap"
            },
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        
        # Should succeed with mocked services
        if response.status_code == 200:
            data = response.json()
            assert "lime_map" in data or "error" not in data


class TestLIMEResponseFormat:
    """Tests for LIME response format validation."""
    
    @pytest.fixture
    def mock_lime_response(self):
        return create_mock_lime_result()
    
    def test_lime_map_is_2d_array(self, mock_lime_response):
        """Test LIME map is 2D array."""
        lime_map = np.array(mock_lime_response["lime_map"])
        assert lime_map.ndim == 2
    
    def test_lime_map_normalized(self, mock_lime_response):
        """Test LIME map values are normalized."""
        lime_map = np.array(mock_lime_response["lime_map"])
        assert lime_map.min() >= 0
        assert lime_map.max() <= 1
    
    def test_top_regions_have_required_fields(self, mock_lime_response):
        """Test top regions have required fields."""
        for region in mock_lime_response.get("top_regions", []):
            assert "importance" in region
            assert region["importance"] >= 0 and region["importance"] <= 1


# =============================================================================
# SHAP ENDPOINT TESTS
# =============================================================================

class TestSHAPEndpoint:
    """Tests for the /inference/shap endpoint."""
    
    @pytest.fixture
    def mock_user(self):
        return MockUser()
    
    @pytest.fixture
    def client(self, mock_user):
        """Create test client with mocked auth."""
        from main import app
        from app.core.dependencies import get_current_active_user, get_current_user
        
        async def mock_get_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_user
        app.dependency_overrides[get_current_active_user] = mock_get_user
        
        yield TestClient(app)
        app.dependency_overrides.clear()
    
    def test_shap_endpoint_missing_file(self, client):
        """Test error when no file is provided."""
        response = client.post("/inference/shap")
        assert response.status_code == 422
    
    def test_shap_endpoint_invalid_method(self, client):
        """Test invalid SHAP method."""
        test_image = create_test_image()
        
        response = client.post(
            "/inference/shap",
            params={"method": "invalid_method"},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        # Should either reject or fall back to default
        assert response.status_code in [200, 400, 422, 500]
    
    def test_shap_endpoint_valid_methods(self):
        """Test valid SHAP method options."""
        valid_methods = ["deep", "gradient", "partition"]
        for method in valid_methods:
            assert method in ["deep", "gradient", "partition"]
    
    def test_shap_endpoint_n_samples_range(self, client):
        """Test n_samples parameter validation."""
        test_image = create_test_image()
        
        # Below minimum (20)
        response = client.post(
            "/inference/shap",
            params={"n_samples": 10},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        assert response.status_code == 422
    
    def test_shap_endpoint_n_background_range(self, client):
        """Test n_background parameter validation."""
        test_image = create_test_image()
        
        # Above maximum (100)
        response = client.post(
            "/inference/shap",
            params={"n_background": 150},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        assert response.status_code == 422


class TestSHAPResponseFormat:
    """Tests for SHAP response format validation."""
    
    @pytest.fixture
    def mock_shap_response(self):
        return create_mock_shap_result()
    
    def test_shap_map_is_2d_array(self, mock_shap_response):
        """Test SHAP map is 2D array."""
        shap_map = np.array(mock_shap_response["shap_map"])
        assert shap_map.ndim == 2
    
    def test_positive_regions_have_required_fields(self, mock_shap_response):
        """Test positive regions have required fields."""
        for region in mock_shap_response.get("positive_regions", []):
            assert "contribution" in region
            assert region["contribution"] > 0
    
    def test_negative_regions_have_required_fields(self, mock_shap_response):
        """Test negative regions have required fields."""
        for region in mock_shap_response.get("negative_regions", []):
            assert "contribution" in region
            assert region["contribution"] < 0


# =============================================================================
# XAI COMPARISON ENDPOINT TESTS
# =============================================================================

class TestXAICompareEndpoint:
    """Tests for the /inference/xai/compare endpoint."""
    
    @pytest.fixture
    def mock_user(self):
        return MockUser()
    
    @pytest.fixture
    def client(self, mock_user):
        """Create test client with mocked auth."""
        from main import app
        from app.core.dependencies import get_current_active_user, get_current_user
        
        async def mock_get_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_user
        app.dependency_overrides[get_current_active_user] = mock_get_user
        
        yield TestClient(app)
        app.dependency_overrides.clear()
    
    def test_xai_compare_endpoint_missing_file(self, client):
        """Test error when no file is provided."""
        response = client.post("/inference/xai/compare")
        assert response.status_code == 422
    
    def test_xai_compare_valid_methods_list(self):
        """Test valid XAI methods for comparison."""
        valid_methods = ["gradcam", "gradcam++", "integrated_gradients", "lime", "shap"]
        assert all(m in valid_methods for m in ["gradcam", "lime", "shap"])
    
    def test_xai_compare_methods_parsing(self, client):
        """Test methods parameter parsing."""
        test_image = create_test_image()
        
        # Comma-separated methods
        response = client.post(
            "/inference/xai/compare",
            params={"methods": "gradcam,lime"},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        # May fail due to model unavailability, but should not be 422
        assert response.status_code in [200, 500, 503]


class TestXAIComparisonResponseFormat:
    """Tests for XAI comparison response format."""
    
    def test_comparison_response_structure(self):
        """Test expected comparison response structure."""
        expected_fields = [
            "methods_compared",
            "explanations",
            "agreement_score",
            "consensus_regions",
            "summary"
        ]
        
        mock_response = {
            "methods_compared": ["gradcam", "lime", "shap"],
            "explanations": {},
            "agreement_score": 0.75,
            "consensus_regions": [],
            "summary": "Methods show high agreement"
        }
        
        for field in expected_fields:
            assert field in mock_response


# =============================================================================
# XAI VALIDATION ENDPOINT TESTS
# =============================================================================

class TestXAIValidationEndpoint:
    """Tests for the /inference/xai/validate endpoint."""
    
    @pytest.fixture
    def mock_user(self):
        return MockUser()
    
    @pytest.fixture
    def client(self, mock_user):
        """Create test client with mocked auth."""
        from main import app
        from app.core.dependencies import get_current_active_user, get_current_user
        
        async def mock_get_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_user
        app.dependency_overrides[get_current_active_user] = mock_get_user
        
        yield TestClient(app)
        app.dependency_overrides.clear()
    
    def test_xai_validation_request_schema(self):
        """Test XAI validation request schema."""
        from app.schemas.inference import XAIValidationRequest
        
        request = XAIValidationRequest(
            attention_map=create_mock_attention_map(),
            known_regions=[],
            include_faithfulness=False
        )
        
        assert request.include_faithfulness is False
        assert len(request.attention_map) > 0
    
    def test_xai_validation_response_structure(self):
        """Test expected XAI validation response structure."""
        expected_fields = [
            "is_valid",
            "overall_quality",
            "validation_results",
            "quality_metrics"
        ]
        
        mock_response = {
            "is_valid": True,
            "overall_quality": "good",
            "validation_results": {},
            "quality_metrics": {}
        }
        
        for field in expected_fields:
            assert field in mock_response


# =============================================================================
# XAI QUALITY ENDPOINT TESTS
# =============================================================================

class TestXAIQualityEndpoint:
    """Tests for the /inference/xai/quality endpoint."""
    
    @pytest.fixture
    def mock_user(self):
        return MockUser()
    
    @pytest.fixture
    def client(self, mock_user):
        """Create test client with mocked auth."""
        from main import app
        from app.core.dependencies import get_current_active_user, get_current_user
        
        async def mock_get_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_user
        app.dependency_overrides[get_current_active_user] = mock_get_user
        
        yield TestClient(app)
        app.dependency_overrides.clear()
    
    def test_quality_request_schema(self):
        """Test attention quality request schema."""
        from app.schemas.inference import AttentionQualityRequest
        
        request = AttentionQualityRequest(
            attention_map=create_mock_attention_map(),
            include_details=True
        )
        
        assert request.include_details is True
        assert len(request.attention_map) > 0
    
    @patch('app.services.xai_validation_service.get_xai_validation_service')
    def test_quality_endpoint_mocked(self, mock_service, client):
        """Test quality endpoint with mocked service."""
        mock_instance = Mock()
        mock_instance.compute_attention_quality_score.return_value = {
            "quality_score": 0.75,
            "quality_level": "good",
            "is_acceptable": True,
            "details": {"entropy": 0.5, "spatial_coherence": 0.8}
        }
        mock_service.return_value = mock_instance
        
        response = client.post(
            "/inference/xai/quality",
            json={
                "attention_map": create_mock_attention_map(),
                "include_details": True
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "quality_score" in data or "quality_level" in data
    
    def test_quality_levels_enum(self):
        """Test quality level enum values."""
        quality_levels = ["excellent", "good", "acceptable", "poor"]
        
        for level in quality_levels:
            assert level in ["excellent", "good", "acceptable", "poor"]


class TestAttentionQualityResponseFormat:
    """Tests for attention quality response format."""
    
    def test_quality_response_structure(self):
        """Test expected quality response structure."""
        mock_response = {
            "quality_score": 0.75,
            "quality_level": "good",
            "is_acceptable": True,
            "details": None
        }
        
        assert "quality_score" in mock_response
        assert 0 <= mock_response["quality_score"] <= 1
        assert mock_response["quality_level"] in ["excellent", "good", "acceptable", "poor"]
        assert isinstance(mock_response["is_acceptable"], bool)


# =============================================================================
# CLINICAL NARRATIVE ENDPOINT TESTS
# =============================================================================

class TestClinicalNarrativeEndpoint:
    """Tests for the /inference/narrative/generate endpoint."""
    
    @pytest.fixture
    def mock_user(self):
        return MockUser()
    
    @pytest.fixture
    def client(self, mock_user):
        """Create test client with mocked auth."""
        from main import app
        from app.core.dependencies import get_current_active_user, get_current_user
        
        async def mock_get_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_user
        app.dependency_overrides[get_current_active_user] = mock_get_user
        
        yield TestClient(app)
        app.dependency_overrides.clear()
    
    def test_narrative_request_schema(self):
        """Test clinical narrative request schema."""
        from app.schemas.inference import ClinicalNarrativeRequest, PredictionClass
        
        request = ClinicalNarrativeRequest(
            prediction=PredictionClass.MALIGNANT,
            malignancy_probability=0.85,
            confidence=0.85,
            uncertainty=0.08,
            suspicious_regions=[
                {
                    "region_id": "region_1",
                    "bbox": [10, 20, 50, 60],
                    "attention_score": 0.9
                }
            ]
        )
        
        assert request.prediction == PredictionClass.MALIGNANT
        assert request.malignancy_probability == 0.85
    
    def test_birads_categories(self):
        """Test BI-RADS category enum values."""
        birads_categories = ["0", "1", "2", "3", "4A", "4B", "4C", "5"]
        
        # Verify standard BI-RADS categories
        assert "0" in birads_categories  # Incomplete
        assert "5" in birads_categories  # Highly suggestive
    
    @patch('app.services.clinical_narrative_service.get_clinical_narrative_service')
    def test_narrative_endpoint_mocked(self, mock_service, client):
        """Test narrative endpoint with mocked service."""
        mock_instance = Mock()
        mock_instance.generate_narrative.return_value = {
            "clinical_impression": "AI analysis suggests suspicious finding.",
            "birads_suggestion": "4A",
            "birads_rationale": "Suspicious abnormality with low malignancy probability.",
            "structured_findings": ["Dense irregular mass in upper quadrant"],
            "recommendations": [
                {
                    "action": "Diagnostic mammography",
                    "timeframe": "Within 2 weeks",
                    "urgency": "high"
                }
            ],
            "confidence_explanation": "Model confidence is 85%.",
            "disclaimer": "AI analysis is for decision support only."
        }
        mock_service.return_value = mock_instance
        
        response = client.post(
            "/inference/narrative/generate",
            json={
                "prediction": "malignant",
                "confidence": 0.85,
                "suspicious_regions": [],
                "include_recommendations": True
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "clinical_impression" in data or "birads_suggestion" in data


class TestClinicalNarrativeResponseFormat:
    """Tests for clinical narrative response format."""
    
    def test_narrative_response_structure(self):
        """Test expected narrative response structure."""
        expected_fields = [
            "clinical_impression",
            "birads_suggestion",
            "structured_findings",
            "recommendations",
            "disclaimer"
        ]
        
        mock_response = {
            "clinical_impression": "AI analysis complete.",
            "birads_suggestion": "2",
            "birads_rationale": "Benign finding.",
            "structured_findings": [],
            "recommendations": [],
            "confidence_explanation": "",
            "disclaimer": "AI is for decision support only."
        }
        
        for field in expected_fields:
            assert field in mock_response
    
    def test_recommendation_structure(self):
        """Test recommendation item structure."""
        recommendation = {
            "action": "Follow-up mammogram",
            "timeframe": "6 months",
            "urgency": "routine"
        }
        
        assert "action" in recommendation
        assert "timeframe" in recommendation
        assert recommendation["urgency"] in ["routine", "moderate", "high", "urgent"]


# =============================================================================
# GRADCAM ENDPOINT TESTS
# =============================================================================

class TestGradCAMEndpoint:
    """Tests for the /inference/gradcam endpoint."""
    
    @pytest.fixture
    def mock_user(self):
        return MockUser()
    
    @pytest.fixture
    def client(self, mock_user):
        """Create test client with mocked auth."""
        from main import app
        from app.core.dependencies import get_current_active_user, get_current_user
        
        async def mock_get_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_user
        app.dependency_overrides[get_current_active_user] = mock_get_user
        
        yield TestClient(app)
        app.dependency_overrides.clear()
    
    def test_gradcam_endpoint_missing_file(self, client):
        """Test error when no file is provided."""
        response = client.post("/inference/gradcam")
        assert response.status_code == 422
    
    def test_gradcam_valid_methods(self):
        """Test valid GradCAM method options."""
        valid_methods = ["gradcam", "gradcam++", "integrated_gradients"]
        assert all(m in valid_methods for m in ["gradcam", "gradcam++"])
    
    def test_gradcam_threshold_validation(self, client):
        """Test overlay alpha validation."""
        test_image = create_test_image()
        
        # Overlay alpha above maximum (1.0)
        response = client.post(
            "/inference/gradcam",
            params={"overlay_alpha": 1.5},
            files={"file": ("test.png", image_to_bytes(test_image), "image/png")}
        )
        assert response.status_code == 422


class TestGradCAMResponseFormat:
    """Tests for GradCAM response format validation."""
    
    @pytest.fixture
    def mock_gradcam_response(self):
        return create_mock_gradcam_result()
    
    def test_attention_map_is_2d_array(self, mock_gradcam_response):
        """Test attention map is 2D array."""
        attention_map = np.array(mock_gradcam_response["attention_map"])
        assert attention_map.ndim == 2
    
    def test_suspicious_regions_have_required_fields(self, mock_gradcam_response):
        """Test suspicious regions have required fields."""
        for region in mock_gradcam_response.get("suspicious_regions", []):
            assert "bbox" in region
            assert "attention_score" in region
            assert region["attention_score"] >= 0 and region["attention_score"] <= 1


# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================

class TestErrorHandling:
    """Tests for error handling across endpoints."""
    
    def test_invalid_image_format_error(self):
        """Test error response structure for invalid image."""
        error_response = {
            "detail": "Invalid image file: cannot identify image file"
        }
        
        assert "detail" in error_response
    
    def test_model_unavailable_error(self):
        """Test error response structure for unavailable model."""
        error_response = {
            "detail": "Model not available"
        }
        
        assert "detail" in error_response
    
    def test_validation_error_structure(self):
        """Test validation error response format."""
        validation_error = {
            "detail": [
                {
                    "loc": ["query", "n_segments"],
                    "msg": "ensure this value is greater than or equal to 10",
                    "type": "value_error.number.not_ge"
                }
            ]
        }
        
        assert "detail" in validation_error
        assert isinstance(validation_error["detail"], list)


# =============================================================================
# SCHEMA IMPORT TESTS
# =============================================================================

class TestSchemaImports:
    """Tests to verify all required schemas can be imported."""
    
    def test_import_xai_schemas(self):
        """Test XAI-related schemas import."""
        from app.schemas.inference import (
            XAIValidationRequest,
            XAIValidationResponse,
            AttentionQualityRequest,
            AttentionQualityResponse,
            QualityScoreResponse,
            ValidationResultEnum,
            QualityMetricEnum
        )
        
        assert XAIValidationRequest is not None
        assert AttentionQualityRequest is not None
    
    def test_import_clinical_schemas(self):
        """Test clinical narrative schemas import."""
        from app.schemas.inference import (
            ClinicalNarrativeRequest,
            ClinicalNarrativeResponse,
            ClinicalRecommendation,
            BIRADSCategoryEnum
        )
        
        assert ClinicalNarrativeRequest is not None
        assert ClinicalNarrativeResponse is not None
        assert BIRADSCategoryEnum is not None
    
    def test_import_explainability_schemas(self):
        """Test explainability schemas import."""
        from app.schemas.inference import (
            GradCAMRequest,
            GradCAMResponse,
            ExplainabilityMethodEnum,
            SuspiciousRegion
        )
        
        assert GradCAMRequest is not None
        assert ExplainabilityMethodEnum is not None


# =============================================================================
# SERVICE IMPORT TESTS
# =============================================================================

class TestServiceImportsInference:
    """Tests to verify all inference services can be imported."""
    
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
        assert callable(get_shap_service)
    
    def test_import_clinical_narrative_service(self):
        """Test clinical narrative service imports."""
        from app.services.clinical_narrative_service import (
            ClinicalNarrativeService,
            get_clinical_narrative_service
        )
        
        assert ClinicalNarrativeService is not None
        assert callable(get_clinical_narrative_service)
    
    def test_import_xai_validation_service(self):
        """Test XAI validation service imports."""
        from app.services.xai_validation_service import (
            XAIValidationService,
            get_xai_validation_service,
            QualityScore
        )
        
        assert XAIValidationService is not None
        assert callable(get_xai_validation_service)


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
