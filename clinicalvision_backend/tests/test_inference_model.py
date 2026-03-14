"""
TDD Tests for Model Inference — Phase 0 System Validation

Tests written FIRST (RED) to define expected behavior, then fixes applied (GREEN).

Test Categories:
1. Factory Function — get_model_inference singleton, error handling (no mock fallback)
2. Risk Level — Threshold boundary correctness
3. Calibration — Graceful fallback when calibrator.pkl missing
4. Singleton Lifecycle — Proper reset between tests
5. Anatomical Location Mapping
6. Narrative Generation
7. Confidence Explanation

NOTE: MockModelInference was permanently removed from inference.py.
ClinicalVision requires real AI inference via RealModelInference (V12 DenseNet-121 ensemble).
Tests that previously tested MockModelInference have been removed to match the updated
production code. The factory function now raises RuntimeError on failure instead of
falling back to a mock.

Usage:
    pytest tests/test_inference_model.py -v
    pytest tests/test_inference_model.py -v -k "TestRiskLevel"
    pytest tests/test_inference_model.py -v -k "TestCalibration"
"""

import pytest
import numpy as np
from unittest.mock import patch, Mock, MagicMock

from app.models.inference import (
    RealModelInference,
    BaseModelInference,
    get_model_inference,
    _reset_model_instances,
    _model_instances,
)
from app.core.config import settings


# ============================================================================
# Fixtures
# ============================================================================

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
# Test 1: Factory Function — get_model_inference (No Mock Fallback)
# ============================================================================

@pytest.mark.unit
class TestGetModelInference:
    """Verify factory function behavior with real model only (no mock fallback).

    The factory now raises RuntimeError when the real model fails to load,
    requiring the issue to be fixed rather than silently falling back to mock.
    """

    def test_factory_returns_base_model_interface(self):
        """Factory must return a BaseModelInference subclass when it succeeds."""
        mock_instance = Mock(spec=RealModelInference)
        mock_instance.is_loaded.return_value = True

        with patch(
            'app.models.inference.RealModelInference',
            return_value=mock_instance
        ):
            model = get_model_inference()
            assert isinstance(model, BaseModelInference)

    def test_factory_raises_on_model_load_failure(self):
        """If RealModelInference fails to init, factory MUST raise RuntimeError."""
        with patch(
            'app.models.inference.RealModelInference',
            side_effect=Exception("TF not available")
        ):
            with pytest.raises(RuntimeError, match="Real AI model failed to load"):
                get_model_inference()

    def test_factory_raises_when_model_not_loaded(self):
        """If RealModelInference creates but is_loaded()=False, MUST raise."""
        mock_instance = Mock(spec=RealModelInference)
        mock_instance.is_loaded.return_value = False

        with patch(
            'app.models.inference.RealModelInference',
            return_value=mock_instance
        ):
            with pytest.raises(RuntimeError, match="failed to load"):
                get_model_inference()

    def test_factory_caches_successful_instance(self):
        """Multiple calls should return the same cached instance."""
        mock_instance = Mock(spec=RealModelInference)
        mock_instance.is_loaded.return_value = True

        with patch(
            'app.models.inference.RealModelInference',
            return_value=mock_instance
        ):
            m1 = get_model_inference()
            m2 = get_model_inference()
            assert m1 is m2, "Factory should cache and reuse instances"

    def test_factory_does_not_cache_failed_attempts(self):
        """Failed load attempts must NOT be cached — allow retry."""
        call_count = 0

        def create_model(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            raise Exception(f"Load failed attempt {call_count}")

        with patch('app.models.inference.RealModelInference', side_effect=create_model):
            with pytest.raises(RuntimeError):
                get_model_inference()
            with pytest.raises(RuntimeError):
                get_model_inference()
            # Should attempt to create each time since failures aren't cached
            assert call_count == 2

    def test_factory_error_message_includes_cause(self):
        """RuntimeError should include the original exception message."""
        with patch(
            'app.models.inference.RealModelInference',
            side_effect=Exception("CUDA version mismatch: expected 12.4")
        ):
            with pytest.raises(RuntimeError, match="CUDA version mismatch"):
                get_model_inference()


# ============================================================================
# Test 2: Risk Level Determination
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
# Test 3: Calibration Fallback (ISSUE 2 from critical evaluation)
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
# Test 4: Singleton Lifecycle
# ============================================================================

@pytest.mark.unit
class TestSingletonLifecycle:
    """Verify singleton instances are properly managed and reset between tests."""

    def test_reset_clears_all_instances(self):
        """After reset, the instance cache should be empty."""
        _model_instances["test_key"] = Mock()
        assert len(_model_instances) == 1
        _reset_model_instances()
        assert len(_model_instances) == 0

    def test_reset_allows_new_instance_creation(self):
        """After reset, factory should attempt to create a new instance."""
        def make_mock(*args, **kwargs):
            m = Mock(spec=RealModelInference)
            m.is_loaded.return_value = True
            return m

        with patch(
            'app.models.inference.RealModelInference',
            side_effect=make_mock
        ):
            m1 = get_model_inference()
            _reset_model_instances()
            m2 = get_model_inference()
            assert m1 is not m2, "Reset should force new instance creation"

    def test_multiple_resets_are_safe(self):
        """Calling reset multiple times should not raise."""
        _reset_model_instances()
        _reset_model_instances()
        _reset_model_instances()
        assert len(_model_instances) == 0


# ============================================================================
# Test 5: Anatomical Location Mapping
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
# Test 6: Narrative Generation
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
# Test 7: Confidence Explanation
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
