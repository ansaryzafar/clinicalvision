"""
Comprehensive Test Configuration for ClinicalVision Backend

Provides pytest fixtures for:
- Environment configuration
- Sample data (images, arrays, attention maps)
- Mock services (TensorFlow, Keras, models)
- API client setup
- XAI-specific fixtures

Usage:
    pytest tests/ -v --tb=short
    pytest tests/test_xai_explainability.py -v
"""

import pytest
import sys
import os
from pathlib import Path
import numpy as np
from PIL import Image
import io
from unittest.mock import Mock, MagicMock, patch
from typing import Dict, Any, List

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# =============================================================================
# Environment Fixtures
# =============================================================================

@pytest.fixture
def mock_env_vars(monkeypatch):
    """Set environment variables for testing."""
    monkeypatch.setenv("USE_MOCK_MODEL", "true")
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-testing")
    monkeypatch.setenv("TESTING", "true")


@pytest.fixture
def production_env_vars(monkeypatch):
    """Set production-like environment variables."""
    monkeypatch.setenv("USE_MOCK_MODEL", "false")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost/test")


# =============================================================================
# Image Fixtures
# =============================================================================

@pytest.fixture
def sample_image_array():
    """Create a sample normalized image array for testing (batch format)."""
    np.random.seed(42)
    img = np.zeros((1, 224, 224, 3), dtype=np.float32)
    
    # Add a bright region (simulating a lesion)
    img[0, 80:140, 80:140, :] = 0.8
    
    # Add some noise
    noise = np.random.rand(1, 224, 224, 3).astype(np.float32) * 0.1
    img = np.clip(img + noise, 0, 1)
    
    return img


@pytest.fixture
def sample_grayscale_image():
    """Create a sample grayscale image array."""
    np.random.seed(42)
    img = np.zeros((1, 224, 224, 1), dtype=np.float32)
    img[0, 80:140, 80:140, 0] = 0.8
    img += np.random.rand(1, 224, 224, 1).astype(np.float32) * 0.1
    return np.clip(img, 0, 1)


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
    img[mask] = 0.85 + np.random.rand(mask.sum()).astype(np.float32) * 0.15
    
    # Add spiculations
    for angle in range(0, 360, 45):
        rad = np.radians(angle)
        for r in range(radius, radius + 15):
            px = int(center[0] + r * np.cos(rad))
            py = int(center[1] + r * np.sin(rad))
            if 0 <= px < 224 and 0 <= py < 224:
                img[py, px] = 0.7
    
    # Convert to batch RGB format
    img_batch = img[np.newaxis, :, :, np.newaxis]
    img_batch = np.repeat(img_batch, 3, axis=-1)
    
    return img_batch.astype(np.float32)


@pytest.fixture
def sample_pil_image():
    """Create a sample PIL Image for upload testing."""
    img = Image.new("RGB", (224, 224), color=(128, 128, 128))
    
    # Draw a "lesion" region
    for x in range(80, 140):
        for y in range(80, 140):
            img.putpixel((x, y), (200, 200, 200))
    
    return img


@pytest.fixture
def sample_image_file(sample_pil_image):
    """Create a sample image file buffer for upload testing."""
    buffer = io.BytesIO()
    sample_pil_image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


# =============================================================================
# Attention Map Fixtures
# =============================================================================

@pytest.fixture
def sample_attention_map():
    """Create a sample attention map for validation testing."""
    np.random.seed(42)
    attention = np.zeros((56, 56), dtype=np.float32)
    
    # Create focused region (good quality attention)
    y, x = np.ogrid[:56, :56]
    center = (28, 28)
    mask = (x - center[0])**2 + (y - center[1])**2 <= 10**2
    attention[mask] = 0.9
    
    # Add some noise
    attention += np.random.rand(56, 56).astype(np.float32) * 0.1
    attention = np.clip(attention, 0, 1)
    
    return attention


@pytest.fixture
def diffuse_attention_map():
    """Create a diffuse (poor quality) attention map."""
    np.random.seed(42)
    return np.random.rand(56, 56).astype(np.float32) * 0.5 + 0.25


@pytest.fixture
def sample_shap_values():
    """Create sample SHAP values with positive and negative regions."""
    np.random.seed(42)
    shap = np.random.randn(56, 56).astype(np.float32) * 0.1
    
    # Positive region (supports malignancy)
    shap[20:35, 20:35] = 0.2
    
    # Negative region (supports benign)
    shap[40:50, 40:50] = -0.15
    
    return shap


# =============================================================================
# Mock TensorFlow/Keras Fixtures
# =============================================================================

@pytest.fixture
def mock_tf_module():
    """Create a mock TensorFlow module."""
    tf = Mock()
    
    # Mock GradientTape
    tape = Mock()
    tape.__enter__ = Mock(return_value=tape)
    tape.__exit__ = Mock(return_value=False)
    tape.watch = Mock()
    tape.gradient = Mock(return_value=np.random.rand(1, 7, 7, 1024).astype(np.float32))
    
    tf.GradientTape = Mock(return_value=tape)
    
    # Mock operations
    tf.reduce_mean = Mock(side_effect=lambda x, axis=None: np.mean(x, axis=axis) if axis else np.mean(x))
    tf.reduce_sum = Mock(side_effect=lambda x, axis=None: np.sum(x, axis=axis) if axis else np.sum(x))
    tf.nn.relu = Mock(side_effect=lambda x: np.maximum(x, 0))
    tf.zeros_like = Mock(side_effect=lambda x: np.zeros_like(x))
    tf.ones_like = Mock(side_effect=lambda x: np.ones_like(x))
    tf.Variable = Mock(side_effect=lambda x, dtype=None: x)
    tf.linspace = Mock(side_effect=lambda start, end, num: np.linspace(start, end, num))
    tf.stack = Mock(side_effect=lambda x, axis=0: np.stack(x, axis=axis))
    tf.abs = Mock(side_effect=lambda x: np.abs(x))
    tf.where = Mock(side_effect=lambda cond, x, y: np.where(cond, x, y))
    tf.pow = Mock(side_effect=lambda x, y: np.power(x, y))
    tf.float32 = np.float32
    
    return tf


@pytest.fixture
def mock_keras_module():
    """Create a mock Keras module."""
    keras = Mock()
    keras.Model = Mock()
    return keras


@pytest.fixture
def mock_keras_model():
    """Create a mock Keras model for testing."""
    model = Mock()
    model.name = "test_densenet121"
    
    # Mock layers
    mock_layers = [
        Mock(name='input', output_shape=(None, 224, 224, 3)),
        Mock(name='conv1', output_shape=(None, 112, 112, 64)),
        Mock(name='conv5_block16_concat', output_shape=(None, 7, 7, 1024)),
        Mock(name='global_avg_pool', output_shape=(None, 1024)),
        Mock(name='dense', output_shape=(None, 1))
    ]
    
    for i, layer in enumerate(mock_layers):
        layer.name = ['input', 'conv1', 'conv5_block16_concat', 'global_avg_pool', 'dense'][i]
    
    model.layers = mock_layers
    model.inputs = [Mock()]
    model.output = Mock()
    
    def get_layer(name):
        for layer in mock_layers:
            if layer.name == name:
                return layer
        raise ValueError(f"Layer {name} not found")
    
    model.get_layer = get_layer
    model.predict = Mock(return_value=np.array([[0.75]]))
    
    return model


@pytest.fixture
def mock_prediction_function():
    """Create mock prediction function."""
    def predict_fn(images):
        preds = []
        for img in images:
            mean_intensity = np.mean(img)
            prob = min(max(mean_intensity * 1.5, 0), 1)
            preds.append([1 - prob, prob])
        return np.array(preds)
    
    return predict_fn


# =============================================================================
# XAI Service Fixtures
# =============================================================================

@pytest.fixture
def mock_gradcam_response():
    """Mock GradCAM service response."""
    np.random.seed(42)
    attention = np.zeros((56, 56), dtype=np.float32)
    attention[20:35, 20:35] = 0.9
    
    return {
        "attention_map": attention.tolist(),
        "suspicious_regions": [
            {
                "region_id": 1,
                "bbox": [20, 20, 15, 15],
                "attention_score": 0.9,
                "location": "central"
            }
        ],
        "method_used": "gradcam"
    }


@pytest.fixture
def mock_lime_response():
    """Mock LIME service response."""
    np.random.seed(42)
    lime_map = np.zeros((56, 56), dtype=np.float32)
    lime_map[18:38, 18:38] = 0.85
    
    return {
        "lime_map": lime_map.tolist(),
        "segment_importance": {"1": 0.85, "2": 0.3},
        "top_segments": [
            {
                "segment_id": 1,
                "rank": 1,
                "importance": 0.85,
                "bbox": [18, 18, 20, 20],
                "centroid": [28, 28],
                "area_fraction": 0.05,
                "location": "central"
            }
        ],
        "method_used": "lime",
        "n_segments": 50,
        "n_samples": 100,
        "prediction_local": 0.75,
        "execution_time_ms": 4500
    }


@pytest.fixture
def mock_shap_response():
    """Mock SHAP service response."""
    np.random.seed(42)
    shap_map = np.zeros((56, 56), dtype=np.float32)
    shap_map[22:33, 22:33] = 0.8
    shap_map[45:52, 5:12] = -0.3
    
    return {
        "shap_map": shap_map.tolist(),
        "base_value": 0.55,
        "feature_importance": [[0.1] * 56] * 56,
        "positive_regions": [
            {
                "region_id": 1,
                "bbox": [22, 22, 11, 11],
                "centroid": [27, 27],
                "mean_shap": 0.15,
                "area_fraction": 0.04,
                "contribution_type": "supports_malignancy",
                "location": "central"
            }
        ],
        "negative_regions": [
            {
                "region_id": 1,
                "bbox": [5, 45, 7, 7],
                "centroid": [8, 48],
                "mean_shap": -0.08,
                "area_fraction": 0.02,
                "contribution_type": "supports_benign",
                "location": "lower inner"
            }
        ],
        "method_used": "gradient_shap",
        "total_shap_effect": 0.25,
        "execution_time_ms": 28000
    }


@pytest.fixture
def mock_validation_response():
    """Mock XAI validation service response."""
    from datetime import datetime
    
    return Mock(
        overall_score=0.85,
        overall_status="passed",
        metrics={"sparsity": 0.75, "coherence": 0.82},
        recommendations=[],
        timestamp=datetime.now().isoformat()
    )


# =============================================================================
# API Client Fixtures
# =============================================================================

@pytest.fixture
def client():
    """Create FastAPI test client."""
    from fastapi.testclient import TestClient
    from app.main import app
    
    return TestClient(app)


@pytest.fixture
def mock_inference_state():
    """Mock the global inference state."""
    return {
        "is_initialized": True,
        "model": Mock(name="test_model"),
        "model_loaded_at": "2025-01-01T00:00:00",
        "architecture": "DenseNet121",
        "input_shape": (224, 224, 3)
    }


# =============================================================================
# Service Instance Fixtures
# =============================================================================

@pytest.fixture
def lime_service_instance():
    """Create LIME service instance with test config."""
    from app.services.lime_service import LIMEService, LIMEConfig
    
    config = LIMEConfig(
        n_segments=25,
        n_samples=50,
        top_k_features=5
    )
    
    service = LIMEService()
    service.config = config
    return service


@pytest.fixture
def shap_service_instance():
    """Create SHAP service instance with test config."""
    from app.services.shap_service import SHAPService, SHAPConfig
    
    config = SHAPConfig(
        n_background_samples=10,
        n_samples=20,
        top_k_regions=3
    )
    
    service = SHAPService()
    service.config = config
    return service


@pytest.fixture
def explainability_service_instance():
    """Create explainability service instance."""
    from app.services.explainability_service import ExplainabilityService
    return ExplainabilityService()


@pytest.fixture
def validation_service_instance():
    """Create XAI validation service instance."""
    from app.services.xai_validation_service import XAIValidationService
    return XAIValidationService()


@pytest.fixture
def narrative_service_instance():
    """Create clinical narrative service instance."""
    from app.services.clinical_narrative_service import ClinicalNarrativeService
    return ClinicalNarrativeService()


# =============================================================================
# Cleanup Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset singleton instances between tests.
    
    Ensures each test gets a clean model state — prevents
    singleton leakage between tests that could mask bugs.
    """
    yield
    # Cleanup after test — actually reset inference singletons
    try:
        from app.models.inference import _reset_model_instances
        _reset_model_instances()
    except ImportError:
        pass  # inference module may not be loaded in all test contexts


# =============================================================================
# Fairness Monitoring Fixtures
# =============================================================================

@pytest.fixture
def sample_fairness_dataset():
    """Create sample dataset for fairness testing."""
    np.random.seed(42)
    n_samples = 1000
    
    # Generate predictions
    y_true = np.random.binomial(1, 0.25, n_samples)
    y_pred_proba = np.clip(y_true * 0.8 + np.random.normal(0, 0.15, n_samples), 0, 1)
    
    # Generate subgroup data
    age_groups = np.random.choice(
        ['under_40', '40_49', '50_64', '65_74', '75_plus'],
        n_samples,
        p=[0.1, 0.2, 0.35, 0.25, 0.1]
    )
    
    density_groups = np.random.choice(
        ['fatty', 'scattered', 'heterogeneous', 'dense'],
        n_samples,
        p=[0.1, 0.4, 0.35, 0.15]
    )
    
    return {
        'y_true': y_true,
        'y_pred_proba': y_pred_proba,
        'age_groups': age_groups,
        'density_groups': density_groups
    }


# Fairness fixtures removed - will be re-implemented


# =============================================================================
# Clinical Narrative Fixtures
# =============================================================================

@pytest.fixture
def mock_clinical_narrative_response():
    """Create mock clinical narrative response."""
    return {
        "clinical_impression": "AI analysis indicates suspicious finding requiring follow-up.",
        "birads_suggestion": "4A",
        "birads_rationale": "Suspicious abnormality with low probability of malignancy.",
        "structured_findings": [
            "Irregular mass identified in upper outer quadrant",
            "Focal asymmetry with associated microcalcifications"
        ],
        "recommendations": [
            {
                "action": "Diagnostic mammography with spot compression",
                "timeframe": "Within 2 weeks",
                "urgency": "high"
            },
            {
                "action": "Consider ultrasound correlation",
                "timeframe": "Concurrent with diagnostic mammogram",
                "urgency": "moderate"
            }
        ],
        "confidence_explanation": "Model confidence is 85% with low uncertainty.",
        "disclaimer": "AI analysis is for clinical decision support only. Final diagnosis requires radiologist review."
    }


@pytest.fixture
def mock_suspicious_regions():
    """Create mock suspicious regions for narrative generation."""
    return [
        {
            "region_id": "region_1",
            "bbox": [100, 120, 50, 60],
            "bbox_original": [200, 240, 100, 120],
            "attention_score": 0.92,
            "severity": "high",
            "location": "upper outer quadrant"
        },
        {
            "region_id": "region_2",
            "bbox": [30, 40, 25, 30],
            "bbox_original": [60, 80, 50, 60],
            "attention_score": 0.65,
            "severity": "moderate",
            "location": "central"
        }
    ]


@pytest.fixture
def mock_uncertainty_metrics():
    """Create mock uncertainty metrics for testing."""
    return {
        "epistemic_uncertainty": 0.05,
        "aleatoric_uncertainty": 0.08,
        "predictive_entropy": 0.13,
        "mc_std": 0.04,
        "requires_human_review": False,
        "confidence_calibrated": True
    }


# =============================================================================
# XAI Comparison Fixtures
# =============================================================================

@pytest.fixture
def mock_xai_comparison_response():
    """Create mock XAI comparison response."""
    np.random.seed(42)
    
    return {
        "methods_compared": ["gradcam++", "lime", "shap"],
        "explanations": {
            "gradcam++": {
                "attention_map": np.random.rand(56, 56).tolist(),
                "top_regions": [{"bbox": [20, 20, 15, 15], "score": 0.85}]
            },
            "lime": {
                "lime_map": np.random.rand(56, 56).tolist(),
                "top_segments": [{"segment_id": 1, "importance": 0.78}]
            },
            "shap": {
                "shap_map": np.random.rand(56, 56).tolist(),
                "positive_regions": [{"mean_shap": 0.12, "bbox": [22, 22, 12, 12]}]
            }
        },
        "agreement_score": 0.75,
        "consensus_regions": [
            {
                "bbox": [21, 21, 14, 14],
                "agreed_by": ["gradcam++", "lime", "shap"],
                "mean_importance": 0.80
            }
        ],
        "summary": "All three methods show high agreement on central region.",
        "inference_time_ms": 5500
    }


# =============================================================================
# Mock User Fixtures for API Testing
# =============================================================================

@pytest.fixture
def mock_radiologist_user():
    """Create mock radiologist user for API testing."""
    user = Mock()
    user.id = 1
    user.email = "radiologist@clinicalvision.ai"
    user.role = Mock()
    user.role.value = "radiologist"
    user.is_active = True
    return user


@pytest.fixture
def mock_admin_user():
    """Create mock admin user for API testing."""
    user = Mock()
    user.id = 2
    user.email = "admin@clinicalvision.ai"
    user.role = Mock()
    user.role.value = "admin"
    user.is_active = True
    return user


@pytest.fixture
def mock_technician_user():
    """Create mock technician user for API testing."""
    user = Mock()
    user.id = 3
    user.email = "tech@clinicalvision.ai"
    user.role = Mock()
    user.role.value = "technician"
    user.is_active = True
    return user


# =============================================================================
# Test Image Generation Fixtures
# =============================================================================

@pytest.fixture
def create_test_mammogram():
    """Factory fixture to create test mammogram images."""
    def _create(width=500, height=600, mode='L', add_lesion=True):
        np.random.seed(42)
        img_array = np.random.randint(50, 150, (height, width), dtype=np.uint8)
        
        if add_lesion:
            # Add a suspicious region
            cx, cy = width // 3, height // 3
            for y in range(max(0, cy - 30), min(height, cy + 30)):
                for x in range(max(0, cx - 30), min(width, cx + 30)):
                    if (x - cx) ** 2 + (y - cy) ** 2 <= 900:
                        img_array[y, x] = 200
        
        return Image.fromarray(img_array, mode=mode)
    
    return _create


@pytest.fixture
def image_to_bytes_factory():
    """Factory fixture to convert images to bytes."""
    def _convert(image, format='PNG'):
        buffer = io.BytesIO()
        image.save(buffer, format=format)
        buffer.seek(0)
        return buffer
    
    return _convert
