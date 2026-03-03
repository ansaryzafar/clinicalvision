"""
Fairness Service Test Suite

Tests fairness monitoring functionality:
- Subgroup metrics calculation
- Disparity detection
- Bias indicators
- Fairness thresholds
"""

import pytest
from typing import Optional
from enum import Enum

# ============================================================================
# Types and Constants
# ============================================================================

class Prediction(str, Enum):
    BENIGN = "benign"
    MALIGNANT = "malignant"


# Fairness thresholds (80% rule - industry standard)
DISPARITY_THRESHOLD = 0.8


# ============================================================================
# Subgroup Definitions
# ============================================================================

DEMOGRAPHIC_SUBGROUPS = {
    "age": ["under_40", "40_49", "50_59", "60_69", "70_plus"],
    "breast_density": ["A", "B", "C", "D"],
    "race_ethnicity": ["white", "black", "asian", "hispanic", "other"],
}


# ============================================================================
# Metrics Classes
# ============================================================================

class SubgroupMetrics:
    def __init__(
        self,
        subgroup_name: str,
        subgroup_value: str,
        total_samples: int,
        true_positives: int,
        true_negatives: int,
        false_positives: int,
        false_negatives: int,
    ):
        self.subgroup_name = subgroup_name
        self.subgroup_value = subgroup_value
        self.total_samples = total_samples
        self.true_positives = true_positives
        self.true_negatives = true_negatives
        self.false_positives = false_positives
        self.false_negatives = false_negatives
    
    @property
    def sensitivity(self) -> float:
        """True Positive Rate / Recall."""
        denominator = self.true_positives + self.false_negatives
        if denominator == 0:
            return 0.0
        return self.true_positives / denominator
    
    @property
    def specificity(self) -> float:
        """True Negative Rate."""
        denominator = self.true_negatives + self.false_positives
        if denominator == 0:
            return 0.0
        return self.true_negatives / denominator
    
    @property
    def precision(self) -> float:
        """Positive Predictive Value."""
        denominator = self.true_positives + self.false_positives
        if denominator == 0:
            return 0.0
        return self.true_positives / denominator
    
    @property
    def accuracy(self) -> float:
        """Overall accuracy."""
        if self.total_samples == 0:
            return 0.0
        return (self.true_positives + self.true_negatives) / self.total_samples
    
    @property
    def f1_score(self) -> float:
        """F1 score."""
        if self.precision + self.sensitivity == 0:
            return 0.0
        return 2 * (self.precision * self.sensitivity) / (self.precision + self.sensitivity)
    
    @property
    def false_positive_rate(self) -> float:
        """False Positive Rate."""
        denominator = self.false_positives + self.true_negatives
        if denominator == 0:
            return 0.0
        return self.false_positives / denominator
    
    @property
    def false_negative_rate(self) -> float:
        """False Negative Rate - critical for cancer screening."""
        denominator = self.false_negatives + self.true_positives
        if denominator == 0:
            return 0.0
        return self.false_negatives / denominator


class DisparityResult:
    def __init__(
        self,
        subgroup_name: str,
        metric_name: str,
        reference_value: float,
        comparison_value: float,
        reference_group: str,
        comparison_group: str,
    ):
        self.subgroup_name = subgroup_name
        self.metric_name = metric_name
        self.reference_value = reference_value
        self.comparison_value = comparison_value
        self.reference_group = reference_group
        self.comparison_group = comparison_group
    
    @property
    def disparity_ratio(self) -> float:
        """Calculate disparity ratio (comparison / reference)."""
        if self.reference_value == 0:
            return float('inf') if self.comparison_value > 0 else 1.0
        return self.comparison_value / self.reference_value
    
    @property
    def absolute_disparity(self) -> float:
        """Calculate absolute disparity."""
        return abs(self.comparison_value - self.reference_value)
    
    @property
    def passes_80_percent_rule(self) -> bool:
        """Check if disparity passes the 80% rule."""
        ratio = self.disparity_ratio
        eps = 1e-9  # tolerance for IEEE 754 floating-point boundary
        return ratio >= (DISPARITY_THRESHOLD - eps) and ratio <= (1 / DISPARITY_THRESHOLD + eps)
    
    @property
    def severity(self) -> str:
        """Categorize disparity severity."""
        ratio = self.disparity_ratio
        
        if ratio >= 0.9 and ratio <= 1.1:
            return "minimal"
        elif ratio >= 0.8 and ratio <= 1.25:
            return "low"
        elif ratio >= 0.7 and ratio <= 1.43:
            return "moderate"
        else:
            return "high"


# ============================================================================
# Fairness Calculator
# ============================================================================

class FairnessCalculator:
    def __init__(self, reference_group: Optional[str] = None):
        self.reference_group = reference_group
        self.subgroup_metrics: list[SubgroupMetrics] = []
    
    def add_subgroup_metrics(self, metrics: SubgroupMetrics):
        """Add metrics for a subgroup."""
        self.subgroup_metrics.append(metrics)
    
    def get_metrics_for_subgroup(self, subgroup_name: str, subgroup_value: str) -> Optional[SubgroupMetrics]:
        """Get metrics for specific subgroup."""
        for m in self.subgroup_metrics:
            if m.subgroup_name == subgroup_name and m.subgroup_value == subgroup_value:
                return m
        return None
    
    def calculate_disparity(
        self,
        subgroup_name: str,
        metric_name: str,
        reference_group: str,
        comparison_group: str,
    ) -> Optional[DisparityResult]:
        """Calculate disparity between two subgroups."""
        ref_metrics = self.get_metrics_for_subgroup(subgroup_name, reference_group)
        comp_metrics = self.get_metrics_for_subgroup(subgroup_name, comparison_group)
        
        if not ref_metrics or not comp_metrics:
            return None
        
        # Get the metric value
        ref_value = getattr(ref_metrics, metric_name, None)
        comp_value = getattr(comp_metrics, metric_name, None)
        
        if ref_value is None or comp_value is None:
            return None
        
        return DisparityResult(
            subgroup_name=subgroup_name,
            metric_name=metric_name,
            reference_value=ref_value,
            comparison_value=comp_value,
            reference_group=reference_group,
            comparison_group=comparison_group,
        )
    
    def find_largest_disparity(self, subgroup_name: str, metric_name: str) -> Optional[DisparityResult]:
        """Find the largest disparity for a given metric across subgroups."""
        # Get all subgroups for this category
        subgroups = [m for m in self.subgroup_metrics if m.subgroup_name == subgroup_name]
        
        if len(subgroups) < 2:
            return None
        
        # Find min and max values
        metric_values = [(m.subgroup_value, getattr(m, metric_name)) for m in subgroups]
        metric_values.sort(key=lambda x: x[1])
        
        min_group, min_value = metric_values[0]
        max_group, max_value = metric_values[-1]
        
        return DisparityResult(
            subgroup_name=subgroup_name,
            metric_name=metric_name,
            reference_value=max_value,
            comparison_value=min_value,
            reference_group=max_group,
            comparison_group=min_group,
        )
    
    def check_all_disparities(self, threshold: float = DISPARITY_THRESHOLD) -> list[dict]:
        """Check all disparity metrics and return violations."""
        violations = []
        
        # Group metrics by subgroup name
        subgroup_names = set(m.subgroup_name for m in self.subgroup_metrics)
        
        critical_metrics = ["sensitivity", "false_negative_rate", "accuracy"]
        
        for subgroup_name in subgroup_names:
            for metric in critical_metrics:
                disparity = self.find_largest_disparity(subgroup_name, metric)
                
                if disparity and not disparity.passes_80_percent_rule:
                    violations.append({
                        "subgroup": subgroup_name,
                        "metric": metric,
                        "ratio": disparity.disparity_ratio,
                        "severity": disparity.severity,
                        "reference_group": disparity.reference_group,
                        "comparison_group": disparity.comparison_group,
                    })
        
        return violations


# ============================================================================
# Statistical Tests for Fairness
# ============================================================================

def calculate_statistical_parity_difference(
    privileged_positive_rate: float,
    unprivileged_positive_rate: float,
) -> float:
    """
    Calculate Statistical Parity Difference.
    Measures difference in positive prediction rates between groups.
    Ideal value is 0.
    """
    return unprivileged_positive_rate - privileged_positive_rate


def calculate_equal_opportunity_difference(
    privileged_tpr: float,
    unprivileged_tpr: float,
) -> float:
    """
    Calculate Equal Opportunity Difference.
    Measures difference in True Positive Rates.
    Ideal value is 0.
    """
    return unprivileged_tpr - privileged_tpr


def calculate_average_odds_difference(
    privileged_tpr: float,
    privileged_fpr: float,
    unprivileged_tpr: float,
    unprivileged_fpr: float,
) -> float:
    """
    Calculate Average Odds Difference.
    Average of TPR difference and FPR difference.
    Ideal value is 0.
    """
    tpr_diff = unprivileged_tpr - privileged_tpr
    fpr_diff = unprivileged_fpr - privileged_fpr
    return (tpr_diff + fpr_diff) / 2


# ============================================================================
# Tests
# ============================================================================

class TestSubgroupMetrics:
    """Tests for SubgroupMetrics calculations."""
    
    @pytest.fixture
    def sample_metrics(self):
        return SubgroupMetrics(
            subgroup_name="age",
            subgroup_value="50_59",
            total_samples=100,
            true_positives=40,
            true_negatives=45,
            false_positives=5,
            false_negatives=10,
        )
    
    def test_sensitivity_calculation(self, sample_metrics):
        # TP / (TP + FN) = 40 / (40 + 10) = 0.8
        assert sample_metrics.sensitivity == pytest.approx(0.8)
    
    def test_specificity_calculation(self, sample_metrics):
        # TN / (TN + FP) = 45 / (45 + 5) = 0.9
        assert sample_metrics.specificity == pytest.approx(0.9)
    
    def test_precision_calculation(self, sample_metrics):
        # TP / (TP + FP) = 40 / (40 + 5) = 0.889
        assert sample_metrics.precision == pytest.approx(40/45)
    
    def test_accuracy_calculation(self, sample_metrics):
        # (TP + TN) / total = (40 + 45) / 100 = 0.85
        assert sample_metrics.accuracy == pytest.approx(0.85)
    
    def test_f1_score_calculation(self, sample_metrics):
        precision = 40 / 45
        sensitivity = 0.8
        expected_f1 = 2 * (precision * sensitivity) / (precision + sensitivity)
        assert sample_metrics.f1_score == pytest.approx(expected_f1)
    
    def test_false_positive_rate(self, sample_metrics):
        # FP / (FP + TN) = 5 / (5 + 45) = 0.1
        assert sample_metrics.false_positive_rate == pytest.approx(0.1)
    
    def test_false_negative_rate(self, sample_metrics):
        # FN / (FN + TP) = 10 / (10 + 40) = 0.2
        assert sample_metrics.false_negative_rate == pytest.approx(0.2)
    
    def test_zero_samples_handling(self):
        metrics = SubgroupMetrics(
            subgroup_name="age",
            subgroup_value="under_40",
            total_samples=0,
            true_positives=0,
            true_negatives=0,
            false_positives=0,
            false_negatives=0,
        )
        
        assert metrics.sensitivity == 0.0
        assert metrics.specificity == 0.0
        assert metrics.precision == 0.0
        assert metrics.accuracy == 0.0


class TestDisparityResult:
    """Tests for DisparityResult calculations."""
    
    def test_disparity_ratio_calculation(self):
        result = DisparityResult(
            subgroup_name="age",
            metric_name="sensitivity",
            reference_value=0.9,
            comparison_value=0.72,
            reference_group="50_59",
            comparison_group="under_40",
        )
        
        # 0.72 / 0.9 = 0.8
        assert result.disparity_ratio == pytest.approx(0.8)
    
    def test_passes_80_percent_rule_borderline(self):
        result = DisparityResult(
            subgroup_name="age",
            metric_name="sensitivity",
            reference_value=0.9,
            comparison_value=0.72,
            reference_group="50_59",
            comparison_group="under_40",
        )
        
        # Exactly at threshold
        assert result.passes_80_percent_rule is True
    
    def test_fails_80_percent_rule(self):
        result = DisparityResult(
            subgroup_name="age",
            metric_name="sensitivity",
            reference_value=0.9,
            comparison_value=0.65,
            reference_group="50_59",
            comparison_group="under_40",
        )
        
        # 0.65 / 0.9 = 0.722 < 0.8
        assert result.passes_80_percent_rule is False
    
    def test_severity_minimal(self):
        result = DisparityResult(
            subgroup_name="age",
            metric_name="sensitivity",
            reference_value=0.9,
            comparison_value=0.89,
            reference_group="50_59",
            comparison_group="40_49",
        )
        
        assert result.severity == "minimal"
    
    def test_severity_high(self):
        result = DisparityResult(
            subgroup_name="age",
            metric_name="sensitivity",
            reference_value=0.9,
            comparison_value=0.5,
            reference_group="50_59",
            comparison_group="under_40",
        )
        
        assert result.severity == "high"
    
    def test_absolute_disparity(self):
        result = DisparityResult(
            subgroup_name="age",
            metric_name="sensitivity",
            reference_value=0.9,
            comparison_value=0.7,
            reference_group="50_59",
            comparison_group="under_40",
        )
        
        assert result.absolute_disparity == pytest.approx(0.2)
    
    def test_zero_reference_handling(self):
        result = DisparityResult(
            subgroup_name="age",
            metric_name="sensitivity",
            reference_value=0,
            comparison_value=0.5,
            reference_group="50_59",
            comparison_group="under_40",
        )
        
        assert result.disparity_ratio == float('inf')


class TestFairnessCalculator:
    """Tests for FairnessCalculator."""
    
    @pytest.fixture
    def calculator(self):
        calc = FairnessCalculator()
        
        # Add age group metrics
        calc.add_subgroup_metrics(SubgroupMetrics(
            subgroup_name="age",
            subgroup_value="under_40",
            total_samples=50,
            true_positives=15,
            true_negatives=25,
            false_positives=5,
            false_negatives=5,
        ))
        
        calc.add_subgroup_metrics(SubgroupMetrics(
            subgroup_name="age",
            subgroup_value="50_59",
            total_samples=100,
            true_positives=40,
            true_negatives=45,
            false_positives=5,
            false_negatives=10,
        ))
        
        return calc
    
    def test_get_metrics_for_subgroup(self, calculator):
        metrics = calculator.get_metrics_for_subgroup("age", "under_40")
        
        assert metrics is not None
        assert metrics.total_samples == 50
    
    def test_get_nonexistent_subgroup(self, calculator):
        metrics = calculator.get_metrics_for_subgroup("age", "80_plus")
        
        assert metrics is None
    
    def test_calculate_disparity(self, calculator):
        disparity = calculator.calculate_disparity(
            subgroup_name="age",
            metric_name="sensitivity",
            reference_group="50_59",
            comparison_group="under_40",
        )
        
        assert disparity is not None
        assert disparity.reference_value == pytest.approx(0.8)  # 40/(40+10)
        assert disparity.comparison_value == pytest.approx(0.75)  # 15/(15+5)
    
    def test_find_largest_disparity(self, calculator):
        disparity = calculator.find_largest_disparity("age", "sensitivity")
        
        assert disparity is not None
        # Should compare min vs max sensitivity groups
    
    def test_check_all_disparities_no_violations(self, calculator):
        violations = calculator.check_all_disparities()
        
        # Should be minimal violations with our sample data
        assert isinstance(violations, list)


class TestStatisticalParity:
    """Tests for statistical fairness metrics."""
    
    def test_statistical_parity_equal_rates(self):
        diff = calculate_statistical_parity_difference(0.5, 0.5)
        assert diff == 0.0
    
    def test_statistical_parity_unequal_rates(self):
        diff = calculate_statistical_parity_difference(0.6, 0.4)
        assert diff == pytest.approx(-0.2)
    
    def test_equal_opportunity_difference(self):
        diff = calculate_equal_opportunity_difference(0.85, 0.75)
        assert diff == pytest.approx(-0.1)
    
    def test_average_odds_difference(self):
        diff = calculate_average_odds_difference(
            privileged_tpr=0.8,
            privileged_fpr=0.1,
            unprivileged_tpr=0.7,
            unprivileged_fpr=0.15,
        )
        
        # TPR diff: 0.7 - 0.8 = -0.1
        # FPR diff: 0.15 - 0.1 = 0.05
        # Average: (-0.1 + 0.05) / 2 = -0.025
        assert diff == pytest.approx(-0.025)


class TestDemographicSubgroups:
    """Tests for demographic subgroup definitions."""
    
    def test_age_groups_defined(self):
        assert "age" in DEMOGRAPHIC_SUBGROUPS
        assert len(DEMOGRAPHIC_SUBGROUPS["age"]) >= 5
    
    def test_breast_density_groups_defined(self):
        assert "breast_density" in DEMOGRAPHIC_SUBGROUPS
        assert set(DEMOGRAPHIC_SUBGROUPS["breast_density"]) == {"A", "B", "C", "D"}
    
    def test_race_ethnicity_groups_defined(self):
        assert "race_ethnicity" in DEMOGRAPHIC_SUBGROUPS


class TestCriticalMetrics:
    """Tests for critical medical screening metrics."""
    
    def test_false_negative_rate_critical(self):
        """False negative rate is critical for cancer screening."""
        # High FN rate means missing cancer cases
        metrics = SubgroupMetrics(
            subgroup_name="age",
            subgroup_value="40_49",
            total_samples=100,
            true_positives=20,
            true_negatives=60,
            false_positives=5,
            false_negatives=15,  # High FN rate
        )
        
        # FNR = 15 / (15 + 20) = 0.428 - this is concerning
        assert metrics.false_negative_rate > 0.4
        
        # Sensitivity should be correspondingly low
        assert metrics.sensitivity < 0.6
    
    def test_acceptable_false_negative_rate(self):
        """Target: FNR < 10% for screening mammography."""
        metrics = SubgroupMetrics(
            subgroup_name="age",
            subgroup_value="50_59",
            total_samples=100,
            true_positives=45,
            true_negatives=50,
            false_positives=3,
            false_negatives=2,  # Low FN rate
        )
        
        # FNR = 2 / (2 + 45) = 0.043 - acceptable
        assert metrics.false_negative_rate < 0.1
        
        # Sensitivity should be high
        assert metrics.sensitivity > 0.9


class TestDisparityThresholds:
    """Tests for disparity threshold constants."""
    
    def test_80_percent_rule_threshold(self):
        assert DISPARITY_THRESHOLD == 0.8
    
    def test_threshold_applied_correctly(self):
        # Ratio of 0.79 should fail
        result_fail = DisparityResult(
            subgroup_name="test",
            metric_name="sensitivity",
            reference_value=1.0,
            comparison_value=0.79,
            reference_group="a",
            comparison_group="b",
        )
        
        assert result_fail.passes_80_percent_rule is False
        
        # Ratio of 0.81 should pass
        result_pass = DisparityResult(
            subgroup_name="test",
            metric_name="sensitivity",
            reference_value=1.0,
            comparison_value=0.81,
            reference_group="a",
            comparison_group="b",
        )
        
        assert result_pass.passes_80_percent_rule is True
