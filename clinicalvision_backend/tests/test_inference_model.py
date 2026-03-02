"""
TDD Tests for Model Inference — Phase 0 System Validation

Tests written FIRST (RED) to define expected behavior, then fixes applied (GREEN).

Test Categories:
1. MockModelInference — Response structure, schema compliance, deterministic behavior
2. Factory Function — get_model_inference switching, singleton pattern, fallback mechanism
3. Risk Level — Threshold boundary correctness
4. Calibration — Graceful fallback when calibrator.pkl missing
5. Response Schema — Pydantic model validation
6. Singleton Lifecycle — Proper reset between tests
7. Model Load Resilience — Real → Mock fallback with warning on failure

Covers critical issues from DEMO_DATA_IMPLEMENTATION_PLAN.md §13.2:
- ISSUE 1: CPU-only inference (validates response structure still correct)
- ISSUE 2: Missing calibration file (tests graceful fallback)
- ISSUE 4: Mock vs Real parity (validates both match InferenceResponse schema)
- ISSUE 5: Model load failure resilience (tests fallback mechanism)

Usage:
    pytest tests/test_inference_model.py -v
    pytest tests/test_inference_model.py -v -k "TestMockModel"
    pytest tests/test_inference_model.py -v -k "TestFallback"
"""

import pytest
import numpy as np
from unittest.mock import patch, Mock, MagicMock

from app.models.inference import (
    MockModelInference,
    RealModelInference,
    BaseModelInference,
    get_model_inference,
    _reset_model_instances,
)
from app.core.config import settings


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_model():
    """Create a fresh MockModelInference instance."""
    return MockModelInference()


@pytest.fixture
def sample_image():
    """Create a valid 224×224 RGB image normalized to [0,1]."""
    np.random.seed(42)
    img = np.random.rand(224, 224, 3).astype(np.float32)
    return img


@pytest.fixture
def sample_image_batch():
    """Create a valid batch image (1, 224, 224, 3)."""
    np.random.seed(42)
    return np.random.rand(1, 224, 224, 3).astype(np.float32)


@pytest.fixture
def sample_grayscale():
    """Create a valid grayscale image (224, 224, 1)."""
    np.random.seed(42)
    return np.random.rand(224, 224, 1).astype(np.float32)


@pytest.fixture(autouse=True)
def clean_singletons():
    """Ensure singletons are reset before and after each test."""
    _reset_model_instances()
    yield
    _reset_model_instances()


# ============================================================================
# Test 1: MockModelInference — Response Structure
# ============================================================================

@pytest.mark.unit
class TestMockModelInference:
    """Verify MockModelInference returns valid, schema-compliant responses."""

    def test_is_loaded(self, mock_model):
        """Mock model should always report as loaded."""
        assert mock_model.is_loaded() is True

    def test_is_base_model_instance(self, mock_model):
        """Mock model must implement BaseModelInference interface."""
        assert isinstance(mock_model, BaseModelInference)

    def test_model_version(self, mock_model):
        """Model version should be identifiable as mock."""
        assert mock_model.model_version == "mock-v1.0"

    def test_response_has_all_required_keys(self, mock_model, sample_image):
        """Response must contain all top-level keys needed by frontend."""
        result = mock_model.predict(sample_image)
        required_keys = {
            "prediction", "confidence", "probabilities", "risk_level",
            "uncertainty", "explanation", "model_version"
        }
        assert required_keys.issubset(result.keys()), (
            f"Missing keys: {required_keys - result.keys()}"
        )

    def test_prediction_is_valid_class(self, mock_model, sample_image):
        """Prediction must be 'benign' or 'malignant' (matches PredictionClass enum)."""
        result = mock_model.predict(sample_image)
        assert result["prediction"] in ("benign", "malignant")

    def test_confidence_in_valid_range(self, mock_model, sample_image):
        """Confidence must be between 0 and 1 inclusive."""
        result = mock_model.predict(sample_image)
        assert 0.0 <= result["confidence"] <= 1.0

    def test_confidence_equals_max_probability(self, mock_model, sample_image):
        """Confidence should be max(p_benign, p_malignant)."""
        result = mock_model.predict(sample_image)
        expected = max(
            result["probabilities"]["benign"],
            result["probabilities"]["malignant"]
        )
        assert abs(result["confidence"] - expected) < 1e-6

    def test_probabilities_sum_to_one(self, mock_model, sample_image):
        """Benign + malignant probabilities must sum to 1.0."""
        result = mock_model.predict(sample_image)
        total = result["probabilities"]["benign"] + result["probabilities"]["malignant"]
        assert abs(total - 1.0) < 1e-6, f"Probabilities sum to {total}, expected 1.0"

    def test_probabilities_has_both_classes(self, mock_model, sample_image):
        """Probabilities dict must have exactly 'benign' and 'malignant' keys."""
        result = mock_model.predict(sample_image)
        assert set(result["probabilities"].keys()) == {"benign", "malignant"}

    def test_risk_level_is_valid_enum(self, mock_model, sample_image):
        """Risk level must be 'low', 'moderate', or 'high' (matches RiskLevel enum)."""
        result = mock_model.predict(sample_image)
        assert result["risk_level"] in ("low", "moderate", "high")

    def test_risk_level_correlates_with_malignancy(self, mock_model, sample_image):
        """Risk level must be consistent with malignancy probability thresholds."""
        result = mock_model.predict(sample_image)
        prob_m = result["probabilities"]["malignant"]
        risk = result["risk_level"]

        if prob_m > 0.7:
            assert risk == "high"
        elif prob_m > 0.4:
            assert risk == "moderate"
        else:
            assert risk == "low"

    def test_attention_map_is_56x56(self, mock_model, sample_image):
        """Attention map must be downsampled to 56×56 for JSON efficiency."""
        result = mock_model.predict(sample_image)
        attention = result["explanation"]["attention_map"]
        assert len(attention) == 56, f"Expected 56 rows, got {len(attention)}"
        assert len(attention[0]) == 56, f"Expected 56 cols, got {len(attention[0])}"

    def test_attention_map_values_normalized(self, mock_model, sample_image):
        """All attention values must be in [0, 1]."""
        result = mock_model.predict(sample_image)
        attention = np.array(result["explanation"]["attention_map"])
        assert attention.min() >= 0.0, f"Min attention {attention.min()} < 0"
        assert attention.max() <= 1.0, f"Max attention {attention.max()} > 1"

    def test_suspicious_regions_have_required_fields(self, mock_model, sample_image):
        """Each suspicious region must have region_id, bbox, attention_score, location."""
        result = mock_model.predict(sample_image)
        regions = result["explanation"]["suspicious_regions"]
        assert isinstance(regions, list)
        assert len(regions) >= 1, "At least one suspicious region expected"
        for region in regions:
            assert "region_id" in region
            assert "bbox" in region
            assert len(region["bbox"]) == 4, "bbox must be [x, y, w, h]"
            assert "attention_score" in region
            assert 0.0 <= region["attention_score"] <= 1.0
            assert "location" in region
            assert isinstance(region["location"], str)

    def test_suspicious_regions_sorted_by_attention(self, mock_model, sample_image):
        """Regions must be sorted by attention_score descending."""
        result = mock_model.predict(sample_image)
        regions = result["explanation"]["suspicious_regions"]
        scores = [r["attention_score"] for r in regions]
        assert scores == sorted(scores, reverse=True), "Regions not sorted by attention score"

    def test_uncertainty_has_required_fields(self, mock_model, sample_image):
        """Uncertainty metrics must include epistemic, entropy, and review flag."""
        result = mock_model.predict(sample_image)
        u = result["uncertainty"]
        assert "epistemic_uncertainty" in u
        assert "predictive_entropy" in u
        assert "requires_human_review" in u
        assert isinstance(u["requires_human_review"], bool)
        assert u["epistemic_uncertainty"] >= 0.0
        assert u["predictive_entropy"] >= 0.0

    def test_explanation_has_narrative(self, mock_model, sample_image):
        """Explanation must include a clinical narrative string."""
        result = mock_model.predict(sample_image)
        narrative = result["explanation"]["narrative"]
        assert isinstance(narrative, str)
        assert len(narrative) > 10, "Narrative should be meaningful text"

    def test_explanation_has_confidence_explanation(self, mock_model, sample_image):
        """Explanation must include confidence explanation string."""
        result = mock_model.predict(sample_image)
        conf_exp = result["explanation"]["confidence_explanation"]
        assert isinstance(conf_exp, str)
        assert len(conf_exp) > 10


# ============================================================================
# Test 2: Factory Function — get_model_inference
# ============================================================================

@pytest.mark.unit
class TestGetModelInference:
    """Verify factory function correctly switches between mock and real models."""

    def test_returns_mock_when_configured(self, monkeypatch):
        """When USE_MOCK_MODEL=true, should return MockModelInference."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', True)
        model = get_model_inference()
        assert isinstance(model, MockModelInference)

    def test_mock_is_singleton(self, monkeypatch):
        """Multiple calls should return the same MockModelInference instance."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', True)
        m1 = get_model_inference()
        m2 = get_model_inference()
        assert m1 is m2, "Mock model should be a singleton"

    def test_returns_base_model_interface(self, monkeypatch):
        """Factory must always return BaseModelInference subclass."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', True)
        model = get_model_inference()
        assert isinstance(model, BaseModelInference)

    def test_mock_model_is_functional(self, monkeypatch):
        """Mock model from factory should produce valid predictions."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', True)
        model = get_model_inference()
        image = np.random.rand(224, 224, 3).astype(np.float32)
        result = model.predict(image)
        assert result["prediction"] in ("benign", "malignant")

    def test_fallback_to_mock_on_real_model_failure(self, monkeypatch):
        """If RealModelInference fails to init, should fall back to MockModelInference."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', False)

        with patch(
            'app.models.inference.RealModelInference',
            side_effect=Exception("TF not available")
        ):
            model = get_model_inference()
            assert isinstance(model, MockModelInference), (
                "Should fall back to MockModelInference on failure"
            )
            assert getattr(model, '_fallback_active', False) is True

    def test_fallback_preserves_error_reason(self, monkeypatch):
        """Fallback should store the reason for failure (for debugging/UI banner)."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', False)

        with patch(
            'app.models.inference.RealModelInference',
            side_effect=RuntimeError("CUDA version mismatch: expected 570.195.3")
        ):
            model = get_model_inference()
            reason = getattr(model, '_fallback_reason', '')
            assert "CUDA version mismatch" in reason

    def test_fallback_model_produces_valid_predictions(self, monkeypatch):
        """Fallback mock model should still produce valid predictions."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', False)

        with patch(
            'app.models.inference.RealModelInference',
            side_effect=Exception("model load failed")
        ):
            model = get_model_inference()
            image = np.random.rand(224, 224, 3).astype(np.float32)
            result = model.predict(image)
            assert result["prediction"] in ("benign", "malignant")
            assert 0.0 <= result["confidence"] <= 1.0

    def test_fallback_on_model_not_loaded(self, monkeypatch):
        """If RealModelInference creates but is_loaded()=False, should fall back."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', False)

        mock_real = Mock(spec=RealModelInference)
        mock_real.is_loaded.return_value = False

        with patch(
            'app.models.inference.RealModelInference',
            return_value=mock_real
        ):
            model = get_model_inference()
            assert isinstance(model, MockModelInference), (
                "Should fall back when model creates but fails to load"
            )
            assert getattr(model, '_fallback_active', False) is True


# ============================================================================
# Test 3: Risk Level Determination
# ============================================================================

@pytest.mark.unit
class TestRiskLevelDetermination:
    """Verify risk level thresholds are correct and consistent.

    Risk levels (from _determine_risk_level):
    - 'high': malignancy_prob >= 0.70
    - 'moderate': 0.40 <= malignancy_prob < 0.70
    - 'low': malignancy_prob < 0.40
    """

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create an uninitialized instance to test pure methods."""
        self.model = object.__new__(RealModelInference)

    def test_high_risk_at_boundary(self):
        assert self.model._determine_risk_level(0.70) == "high"

    def test_high_risk_above_boundary(self):
        assert self.model._determine_risk_level(0.85) == "high"

    def test_high_risk_at_max(self):
        assert self.model._determine_risk_level(1.0) == "high"

    def test_moderate_risk_at_boundary(self):
        assert self.model._determine_risk_level(0.40) == "moderate"

    def test_moderate_risk_middle(self):
        assert self.model._determine_risk_level(0.55) == "moderate"

    def test_moderate_risk_just_below_high(self):
        assert self.model._determine_risk_level(0.699) == "moderate"

    def test_low_risk_below_boundary(self):
        assert self.model._determine_risk_level(0.30) == "low"

    def test_low_risk_just_below_moderate(self):
        assert self.model._determine_risk_level(0.399) == "low"

    def test_low_risk_at_zero(self):
        assert self.model._determine_risk_level(0.0) == "low"

    def test_risk_exhaustive_coverage(self):
        """Every probability from 0 to 1 must map to exactly one valid risk level."""
        valid_levels = {"low", "moderate", "high"}
        for prob in np.arange(0.0, 1.01, 0.01):
            level = self.model._determine_risk_level(float(prob))
            assert level in valid_levels, f"Invalid risk level '{level}' for prob {prob}"


# ============================================================================
# Test 4: Calibration Fallback (ISSUE 2 from critical evaluation)
# ============================================================================

@pytest.mark.unit
class TestCalibrationFallback:
    """Verify calibration gracefully falls back when calibrator.pkl is missing.

    From DEMO_DATA_IMPLEMENTATION_PLAN.md §13.2 ISSUE 2:
    calibration/calibrator.pkl is MISSING — code must handle this gracefully.
    """

    @pytest.fixture(autouse=True)
    def setup(self):
        self.model = object.__new__(RealModelInference)

    def test_returns_raw_prediction_when_no_calibrator(self):
        """With calibrator=None, _calibrate should return the raw probability."""
        self.model.calibrator = None
        assert self.model._calibrate(0.75) == 0.75

    def test_returns_raw_prediction_when_calibrator_crashes(self):
        """If calibrator.calibrate() throws, should return raw probability."""
        self.model.calibrator = Mock()
        self.model.calibrator.calibrate = Mock(
            side_effect=Exception("pkl corrupt or incompatible")
        )
        assert self.model._calibrate(0.75) == 0.75

    def test_preserves_exact_value_without_calibrator(self):
        """All probabilities from 0 to 1 should pass through unchanged."""
        self.model.calibrator = None
        for prob in [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]:
            assert self.model._calibrate(prob) == prob, (
                f"Calibrate changed {prob} without calibrator"
            )

    def test_uses_calibrator_when_available(self):
        """When calibrator is available and works, should use its output."""
        self.model.calibrator = Mock()
        self.model.calibrator.calibrate = Mock(
            return_value=np.array([0.82])
        )
        result = self.model._calibrate(0.75)
        assert abs(result - 0.82) < 1e-6
        self.model.calibrator.calibrate.assert_called_once()


# ============================================================================
# Test 5: Response Schema Compliance
# ============================================================================

@pytest.mark.unit
class TestResponseSchemaCompliance:
    """Verify model responses can be validated by Pydantic InferenceResponse schema.

    Tests that the model output structure matches what the API endpoint
    expects to serialize into InferenceResponse.
    """

    def test_mock_prediction_validates_as_prediction_class(self):
        """Prediction value must be valid PredictionClass enum."""
        from app.schemas.inference import PredictionClass

        model = MockModelInference()
        image = np.random.rand(224, 224, 3).astype(np.float32)
        result = model.predict(image)

        # Should not raise
        PredictionClass(result["prediction"])

    def test_mock_risk_validates_as_risk_level(self):
        """Risk level must be valid RiskLevel enum."""
        from app.schemas.inference import RiskLevel

        model = MockModelInference()
        image = np.random.rand(224, 224, 3).astype(np.float32)
        result = model.predict(image)

        # Should not raise
        RiskLevel(result["risk_level"])

    def test_mock_uncertainty_validates_as_uncertainty_metrics(self):
        """Uncertainty dict must construct valid UncertaintyMetrics."""
        from app.schemas.inference import UncertaintyMetrics

        model = MockModelInference()
        image = np.random.rand(224, 224, 3).astype(np.float32)
        result = model.predict(image)
        u = result["uncertainty"]

        # Should not raise
        UncertaintyMetrics(
            epistemic_uncertainty=u["epistemic_uncertainty"],
            predictive_entropy=u["predictive_entropy"],
            requires_human_review=u["requires_human_review"],
            aleatoric_uncertainty=u.get("aleatoric_uncertainty"),
            mutual_information=u.get("mutual_information"),
        )

    def test_mock_regions_validate_as_suspicious_region(self):
        """Each suspicious region must construct valid SuspiciousRegion."""
        from app.schemas.inference import SuspiciousRegion

        model = MockModelInference()
        image = np.random.rand(224, 224, 3).astype(np.float32)
        result = model.predict(image)

        for r in result["explanation"]["suspicious_regions"]:
            # Should not raise
            SuspiciousRegion(
                region_id=r["region_id"],
                bbox=r["bbox"],
                attention_score=r["attention_score"],
                location=r["location"],
            )


# ============================================================================
# Test 6: Singleton Lifecycle
# ============================================================================

@pytest.mark.unit
class TestSingletonLifecycle:
    """Verify singleton instances are properly managed and reset between tests."""

    def test_reset_clears_mock_instance(self, monkeypatch):
        """After reset, a new MockModelInference should be created."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', True)
        m1 = get_model_inference()
        _reset_model_instances()
        m2 = get_model_inference()
        assert m1 is not m2, "Reset should create a new instance"

    def test_reset_clears_real_instance_cache(self):
        """After reset, the real model cache should be empty."""
        from app.models.inference import _model_instances
        _model_instances["test_key"] = Mock()
        assert len(_model_instances) == 1
        _reset_model_instances()
        assert len(_model_instances) == 0

    def test_independent_tests_get_independent_instances(self, monkeypatch):
        """Each test should start with clean singletons (autouse fixture)."""
        monkeypatch.setattr(settings, 'USE_MOCK_MODEL', True)
        model = get_model_inference()
        # If singletons leaked from previous test, this would be stale
        assert isinstance(model, MockModelInference)
        assert model.is_loaded()


# ============================================================================
# Test 7: Anatomical Location Mapping
# ============================================================================

@pytest.mark.unit
class TestAnatomicalLocationMapping:
    """Verify coordinate-to-location mapping is correct."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.model = object.__new__(RealModelInference)

    def test_upper_inner_quadrant(self):
        assert self.model._get_anatomical_location(10, 10, 56) == "upper inner quadrant"

    def test_upper_outer_quadrant(self):
        assert self.model._get_anatomical_location(40, 10, 56) == "upper outer quadrant"

    def test_lower_inner_quadrant(self):
        assert self.model._get_anatomical_location(10, 40, 56) == "lower inner quadrant"

    def test_lower_outer_quadrant(self):
        assert self.model._get_anatomical_location(40, 40, 56) == "lower outer quadrant"


# ============================================================================
# Test 8: Narrative Generation
# ============================================================================

@pytest.mark.unit
class TestNarrativeGeneration:
    """Verify clinical narrative is correctly generated based on prediction."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.model = object.__new__(RealModelInference)

    def test_malignant_narrative_mentions_risk(self):
        """Malignant prediction narrative should mention risk level."""
        regions = [{"location": "upper outer quadrant", "attention_score": 0.85}]
        narrative = self.model._generate_narrative("malignant", 0.80, "high", 0.01, regions)
        assert "HIGH" in narrative or "malignancy" in narrative.lower()

    def test_benign_narrative_mentions_benign(self):
        """Benign prediction narrative should indicate benign findings."""
        regions = [{"location": "central", "attention_score": 0.3}]
        narrative = self.model._generate_narrative("benign", 0.20, "low", 0.01, regions)
        assert "benign" in narrative.lower()

    def test_high_uncertainty_narrative_warns(self):
        """High uncertainty should produce a warning in the narrative."""
        regions = [{"location": "central", "attention_score": 0.7}]
        # variance > 0.01 (std > 10%) should trigger uncertainty note
        narrative = self.model._generate_narrative("malignant", 0.75, "high", 0.05, regions)
        assert "uncertainty" in narrative.lower() or "correlation" in narrative.lower()

    def test_narrative_is_nonempty_string(self):
        """Narrative should always be a non-empty string."""
        regions = []
        narrative = self.model._generate_narrative("benign", 0.30, "low", 0.001, regions)
        assert isinstance(narrative, str)
        assert len(narrative) > 10


# ============================================================================
# Test 9: Confidence Explanation
# ============================================================================

@pytest.mark.unit
class TestConfidenceExplanation:
    """Verify confidence explanation text is correctly generated."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.model = object.__new__(RealModelInference)

    def test_high_confidence_explanation(self):
        """High confidence (>85%) should describe 'High confidence'."""
        explanation = self.model._generate_confidence_explanation(0.001, 0.90, False)
        assert "high confidence" in explanation.lower() or "90%" in explanation

    def test_low_confidence_explanation(self):
        """Low confidence (<55%) should describe ambiguity."""
        explanation = self.model._generate_confidence_explanation(0.001, 0.52, False)
        assert "low" in explanation.lower() or "ambig" in explanation.lower()

    def test_review_required_adds_flag_text(self):
        """When requires_review=True with reason, should include the reason."""
        reason = "Flagged for radiologist review: Borderline prediction."
        explanation = self.model._generate_confidence_explanation(
            0.02, 0.55, True, reason
        )
        assert "radiologist" in explanation.lower() or "review" in explanation.lower()

    def test_elevated_uncertainty_noted(self):
        """High uncertainty (>10% std) should be mentioned."""
        # variance=0.02 → std=14.1%
        explanation = self.model._generate_confidence_explanation(0.02, 0.70, False)
        assert "uncertainty" in explanation.lower()
