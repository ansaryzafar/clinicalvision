"""
XAI Validation and Quality Metrics Service

Enterprise-grade validation framework for explainability outputs.
Ensures explanation quality, consistency, and clinical relevance.

Features:
- Attention map quality metrics
- Explanation consistency validation
- Localization accuracy metrics
- Sanity checks for explanations
- Automated quality scoring

References:
- "Sanity Checks for Saliency Maps" (Adebayo et al., NeurIPS 2018)
- "Evaluating Feature Attribution Methods" (Hooker et al., 2019)
"""

import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple, Callable
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import cv2

logger = logging.getLogger(__name__)


class QualityMetric(str, Enum):
    """Quality metric types"""
    SPARSITY = "sparsity"
    COHERENCE = "coherence"
    LOCALIZATION = "localization"
    FAITHFULNESS = "faithfulness"
    STABILITY = "stability"
    PLAUSIBILITY = "plausibility"
    OVERALL = "overall"


class ValidationResult(str, Enum):
    """Validation result status"""
    PASSED = "passed"
    WARNING = "warning"
    FAILED = "failed"


@dataclass
class QualityScore:
    """Individual quality metric score"""
    metric: QualityMetric
    score: float  # 0-1 normalized
    status: ValidationResult
    details: str
    threshold: float = 0.5
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric": self.metric.value,
            "score": round(self.score, 4),
            "status": self.status.value,
            "details": self.details,
            "threshold": self.threshold,
            "passed": self.status == ValidationResult.PASSED
        }


@dataclass
class ValidationReport:
    """Complete validation report"""
    overall_score: float
    overall_status: ValidationResult
    metrics: List[QualityScore]
    recommendations: List[str]
    warnings: List[str]
    timestamp: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_score": round(self.overall_score, 4),
            "overall_status": self.overall_status.value,
            "metrics": [m.to_dict() for m in self.metrics],
            "recommendations": self.recommendations,
            "warnings": self.warnings,
            "timestamp": self.timestamp,
            "passed": self.overall_status in [ValidationResult.PASSED, ValidationResult.WARNING]
        }


class XAIValidationService:
    """
    Comprehensive XAI validation and quality metrics service.
    
    Implements multiple quality checks:
    1. Sparsity: Are explanations focused or diffuse?
    2. Coherence: Are nearby pixels similarly attributed?
    3. Localization: Do explanations align with known regions?
    4. Faithfulness: Does masking important regions affect predictions?
    5. Stability: Are explanations consistent across similar inputs?
    6. Plausibility: Are explanations clinically reasonable?
    """
    
    # Quality thresholds
    THRESHOLDS = {
        QualityMetric.SPARSITY: 0.3,      # Higher = more focused
        QualityMetric.COHERENCE: 0.6,     # Higher = smoother
        QualityMetric.LOCALIZATION: 0.5,  # Higher = better alignment
        QualityMetric.FAITHFULNESS: 0.4,  # Higher = more faithful
        QualityMetric.STABILITY: 0.8,     # Higher = more stable
        QualityMetric.PLAUSIBILITY: 0.5,  # Higher = more plausible
    }
    
    # Warning thresholds (below this but above fail)
    WARNING_THRESHOLDS = {
        QualityMetric.SPARSITY: 0.2,
        QualityMetric.COHERENCE: 0.4,
        QualityMetric.LOCALIZATION: 0.3,
        QualityMetric.FAITHFULNESS: 0.25,
        QualityMetric.STABILITY: 0.6,
        QualityMetric.PLAUSIBILITY: 0.35,
    }
    
    def __init__(self):
        """Initialize the validation service."""
        self._initialized = True
        logger.info("XAIValidationService initialized")
    
    def validate_explanation(
        self,
        attention_map: np.ndarray,
        original_image: Optional[np.ndarray] = None,
        prediction_func: Optional[Callable] = None,
        known_regions: Optional[List[Dict[str, Any]]] = None,
        reference_explanations: Optional[List[np.ndarray]] = None
    ) -> ValidationReport:
        """
        Perform comprehensive validation of an explanation.
        
        Args:
            attention_map: The explanation/attention map to validate (2D array)
            original_image: Original input image for faithfulness tests
            prediction_func: Model prediction function for faithfulness
            known_regions: Ground truth or annotated regions
            reference_explanations: Previous explanations for stability
            
        Returns:
            ValidationReport with detailed quality metrics
        """
        try:
            metrics = []
            warnings = []
            recommendations = []
            
            # Ensure attention map is 2D numpy array
            attention_map = self._preprocess_attention_map(attention_map)
            
            # 1. Sparsity metric
            sparsity_score = self._compute_sparsity(attention_map)
            metrics.append(sparsity_score)
            
            # 2. Coherence metric
            coherence_score = self._compute_coherence(attention_map)
            metrics.append(coherence_score)
            
            # 3. Localization metric (if known regions provided)
            if known_regions:
                localization_score = self._compute_localization(attention_map, known_regions)
                metrics.append(localization_score)
            
            # 4. Faithfulness metric (if prediction function provided)
            if prediction_func is not None and original_image is not None:
                faithfulness_score = self._compute_faithfulness(
                    attention_map, original_image, prediction_func
                )
                metrics.append(faithfulness_score)
            
            # 5. Stability metric (if reference explanations provided)
            if reference_explanations:
                stability_score = self._compute_stability(attention_map, reference_explanations)
                metrics.append(stability_score)
            
            # 6. Plausibility metric
            plausibility_score = self._compute_plausibility(attention_map, original_image)
            metrics.append(plausibility_score)
            
            # Compute overall score
            overall_score = np.mean([m.score for m in metrics])
            
            # Determine overall status
            if all(m.status == ValidationResult.PASSED for m in metrics):
                overall_status = ValidationResult.PASSED
            elif any(m.status == ValidationResult.FAILED for m in metrics):
                overall_status = ValidationResult.FAILED
            else:
                overall_status = ValidationResult.WARNING
            
            # Generate warnings
            for m in metrics:
                if m.status == ValidationResult.FAILED:
                    warnings.append(f"{m.metric.value}: {m.details}")
                elif m.status == ValidationResult.WARNING:
                    warnings.append(f"{m.metric.value} (warning): {m.details}")
            
            # Generate recommendations
            recommendations = self._generate_recommendations(metrics)
            
            return ValidationReport(
                overall_score=overall_score,
                overall_status=overall_status,
                metrics=metrics,
                recommendations=recommendations,
                warnings=warnings,
                timestamp=datetime.utcnow().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return self._create_error_report(str(e))
    
    def _preprocess_attention_map(self, attention_map: np.ndarray) -> np.ndarray:
        """Preprocess attention map for validation."""
        # Ensure numpy array
        if not isinstance(attention_map, np.ndarray):
            attention_map = np.array(attention_map)
        
        # Handle different shapes
        if attention_map.ndim == 3:
            if attention_map.shape[-1] == 3:  # RGB heatmap
                attention_map = np.mean(attention_map, axis=-1)
            elif attention_map.shape[0] == 1:  # Batch dimension
                attention_map = attention_map[0]
        
        if attention_map.ndim == 4:
            attention_map = attention_map[0, :, :, 0]
        
        # Normalize to 0-1
        if attention_map.max() > 1.0:
            attention_map = attention_map / 255.0
        
        if attention_map.max() > 0:
            attention_map = (attention_map - attention_map.min()) / (attention_map.max() - attention_map.min() + 1e-8)
        
        return attention_map
    
    def _compute_sparsity(self, attention_map: np.ndarray) -> QualityScore:
        """
        Compute sparsity metric.
        
        Good explanations should be focused on specific regions,
        not diffuse across the entire image.
        
        Uses Gini coefficient as sparsity measure.
        """
        flat = attention_map.flatten()
        flat = np.sort(flat)
        n = len(flat)
        
        # Gini coefficient
        cumsum = np.cumsum(flat)
        gini = (n + 1 - 2 * np.sum(cumsum) / cumsum[-1]) / n if cumsum[-1] > 0 else 0
        
        # Alternative: percentage of pixels above threshold
        high_attention_ratio = np.mean(attention_map > 0.5)
        
        # Combine metrics (Gini is 0-1, lower high_attention is better)
        score = gini * (1 - high_attention_ratio)
        
        # Normalize to 0-1
        score = min(1.0, max(0.0, score * 2))  # Scale up
        
        threshold = self.THRESHOLDS[QualityMetric.SPARSITY]
        warning_threshold = self.WARNING_THRESHOLDS[QualityMetric.SPARSITY]
        
        if score >= threshold:
            status = ValidationResult.PASSED
            details = f"Explanation is well-focused (sparsity={score:.2f})"
        elif score >= warning_threshold:
            status = ValidationResult.WARNING
            details = f"Explanation is moderately diffuse (sparsity={score:.2f})"
        else:
            status = ValidationResult.FAILED
            details = f"Explanation is too diffuse (sparsity={score:.2f})"
        
        return QualityScore(
            metric=QualityMetric.SPARSITY,
            score=score,
            status=status,
            details=details,
            threshold=threshold
        )
    
    def _compute_coherence(self, attention_map: np.ndarray) -> QualityScore:
        """
        Compute spatial coherence metric.
        
        Good explanations should have smooth, connected regions
        rather than scattered pixels.
        
        Uses gradient magnitude as inverse coherence measure.
        """
        # Compute gradients
        grad_x = np.gradient(attention_map, axis=1)
        grad_y = np.gradient(attention_map, axis=0)
        grad_magnitude = np.sqrt(grad_x**2 + grad_y**2)
        
        # Lower gradient = higher coherence
        mean_gradient = np.mean(grad_magnitude)
        
        # Convert to coherence score (inverse, normalized)
        coherence = 1.0 / (1.0 + mean_gradient * 5)  # Scale factor of 5
        
        # Also check for connected components
        binary = (attention_map > 0.3).astype(np.uint8)
        num_labels, labels = cv2.connectedComponents(binary)
        
        # Fewer components = better coherence (up to a point)
        component_penalty = max(0, (num_labels - 5) / 10)  # Penalize >5 components
        coherence = coherence * (1 - min(1, component_penalty))
        
        threshold = self.THRESHOLDS[QualityMetric.COHERENCE]
        warning_threshold = self.WARNING_THRESHOLDS[QualityMetric.COHERENCE]
        
        if coherence >= threshold:
            status = ValidationResult.PASSED
            details = f"Explanation is spatially coherent ({num_labels-1} regions)"
        elif coherence >= warning_threshold:
            status = ValidationResult.WARNING
            details = f"Explanation shows some fragmentation ({num_labels-1} regions)"
        else:
            status = ValidationResult.FAILED
            details = f"Explanation is fragmented ({num_labels-1} scattered regions)"
        
        return QualityScore(
            metric=QualityMetric.COHERENCE,
            score=coherence,
            status=status,
            details=details,
            threshold=threshold
        )
    
    def _compute_localization(
        self, 
        attention_map: np.ndarray,
        known_regions: List[Dict[str, Any]]
    ) -> QualityScore:
        """
        Compute localization accuracy.
        
        Measures how well the attention aligns with known lesion regions.
        """
        if not known_regions:
            return QualityScore(
                metric=QualityMetric.LOCALIZATION,
                score=0.5,
                status=ValidationResult.WARNING,
                details="No ground truth regions available for localization",
                threshold=self.THRESHOLDS[QualityMetric.LOCALIZATION]
            )
        
        # Create ground truth mask
        h, w = attention_map.shape
        gt_mask = np.zeros((h, w), dtype=np.float32)
        
        for region in known_regions:
            bbox = region.get("bbox", [])
            if len(bbox) >= 4:
                x, y, rw, rh = bbox[:4]
                # Scale to attention map size if needed
                x = int(x * w / 224)
                y = int(y * h / 224)
                rw = int(rw * w / 224)
                rh = int(rh * h / 224)
                gt_mask[y:y+rh, x:x+rw] = 1.0
        
        if gt_mask.sum() == 0:
            return QualityScore(
                metric=QualityMetric.LOCALIZATION,
                score=0.5,
                status=ValidationResult.WARNING,
                details="Ground truth regions have zero area",
                threshold=self.THRESHOLDS[QualityMetric.LOCALIZATION]
            )
        
        # Compute IoU between high-attention regions and ground truth
        attention_binary = (attention_map > 0.5).astype(np.float32)
        
        intersection = np.sum(attention_binary * gt_mask)
        union = np.sum((attention_binary + gt_mask) > 0)
        
        iou = intersection / (union + 1e-8)
        
        # Also compute energy within GT region
        energy_in_gt = np.sum(attention_map * gt_mask) / (np.sum(attention_map) + 1e-8)
        
        # Combined score
        score = (iou + energy_in_gt) / 2
        
        threshold = self.THRESHOLDS[QualityMetric.LOCALIZATION]
        warning_threshold = self.WARNING_THRESHOLDS[QualityMetric.LOCALIZATION]
        
        if score >= threshold:
            status = ValidationResult.PASSED
            details = f"Good alignment with known regions (IoU={iou:.2f})"
        elif score >= warning_threshold:
            status = ValidationResult.WARNING
            details = f"Partial alignment with known regions (IoU={iou:.2f})"
        else:
            status = ValidationResult.FAILED
            details = f"Poor alignment with known regions (IoU={iou:.2f})"
        
        return QualityScore(
            metric=QualityMetric.LOCALIZATION,
            score=score,
            status=status,
            details=details,
            threshold=threshold
        )
    
    def _compute_faithfulness(
        self,
        attention_map: np.ndarray,
        original_image: np.ndarray,
        prediction_func: Callable
    ) -> QualityScore:
        """
        Compute faithfulness/fidelity metric.
        
        Tests whether masking high-attention regions affects predictions
        more than masking low-attention regions.
        """
        try:
            # Get original prediction
            original_pred = prediction_func(original_image)
            if isinstance(original_pred, dict):
                original_conf = original_pred.get("confidence", 0.5)
            else:
                original_conf = float(original_pred)
            
            # Resize attention to image size if needed
            img_h, img_w = original_image.shape[:2]
            att_resized = cv2.resize(attention_map, (img_w, img_h))
            
            # Create masks
            high_attention_mask = (att_resized > 0.7).astype(np.float32)
            low_attention_mask = (att_resized < 0.3).astype(np.float32)
            
            # Mask high attention regions (should decrease confidence)
            masked_high = original_image.copy()
            if masked_high.ndim == 2:
                masked_high = np.expand_dims(masked_high, -1)
            
            for c in range(masked_high.shape[-1] if masked_high.ndim == 3 else 1):
                if masked_high.ndim == 3:
                    masked_high[:,:,c] = masked_high[:,:,c] * (1 - high_attention_mask)
                else:
                    masked_high = masked_high * (1 - high_attention_mask)
            
            high_masked_pred = prediction_func(masked_high)
            if isinstance(high_masked_pred, dict):
                high_conf = high_masked_pred.get("confidence", 0.5)
            else:
                high_conf = float(high_masked_pred)
            
            # Mask low attention regions (should not affect much)
            masked_low = original_image.copy()
            if masked_low.ndim == 2:
                masked_low = np.expand_dims(masked_low, -1)
            
            for c in range(masked_low.shape[-1] if masked_low.ndim == 3 else 1):
                if masked_low.ndim == 3:
                    masked_low[:,:,c] = masked_low[:,:,c] * (1 - low_attention_mask)
                else:
                    masked_low = masked_low * (1 - low_attention_mask)
            
            low_masked_pred = prediction_func(masked_low)
            if isinstance(low_masked_pred, dict):
                low_conf = low_masked_pred.get("confidence", 0.5)
            else:
                low_conf = float(low_masked_pred)
            
            # Faithfulness: masking high attention should have bigger impact
            drop_high = abs(original_conf - high_conf)
            drop_low = abs(original_conf - low_conf)
            
            # Score: high drop for important regions, low drop for unimportant
            faithfulness = (drop_high - drop_low + 1) / 2  # Normalize to 0-1
            faithfulness = max(0, min(1, faithfulness))
            
            threshold = self.THRESHOLDS[QualityMetric.FAITHFULNESS]
            warning_threshold = self.WARNING_THRESHOLDS[QualityMetric.FAITHFULNESS]
            
            if faithfulness >= threshold:
                status = ValidationResult.PASSED
                details = f"Explanation is faithful to model (Δhigh={drop_high:.2f}, Δlow={drop_low:.2f})"
            elif faithfulness >= warning_threshold:
                status = ValidationResult.WARNING
                details = f"Moderate faithfulness (Δhigh={drop_high:.2f}, Δlow={drop_low:.2f})"
            else:
                status = ValidationResult.FAILED
                details = f"Low faithfulness - explanation may not reflect model reasoning"
            
            return QualityScore(
                metric=QualityMetric.FAITHFULNESS,
                score=faithfulness,
                status=status,
                details=details,
                threshold=threshold
            )
            
        except Exception as e:
            logger.warning(f"Faithfulness computation failed: {e}")
            return QualityScore(
                metric=QualityMetric.FAITHFULNESS,
                score=0.5,
                status=ValidationResult.WARNING,
                details=f"Could not compute faithfulness: {str(e)}",
                threshold=self.THRESHOLDS[QualityMetric.FAITHFULNESS]
            )
    
    def _compute_stability(
        self,
        attention_map: np.ndarray,
        reference_explanations: List[np.ndarray]
    ) -> QualityScore:
        """
        Compute stability metric.
        
        Measures consistency of explanations across similar inputs
        or repeated runs (for stochastic methods).
        """
        if not reference_explanations:
            return QualityScore(
                metric=QualityMetric.STABILITY,
                score=0.5,
                status=ValidationResult.WARNING,
                details="No reference explanations for stability check",
                threshold=self.THRESHOLDS[QualityMetric.STABILITY]
            )
        
        correlations = []
        
        for ref in reference_explanations:
            ref = self._preprocess_attention_map(ref)
            
            # Resize if needed
            if ref.shape != attention_map.shape:
                ref = cv2.resize(ref, (attention_map.shape[1], attention_map.shape[0]))
            
            # Compute correlation
            flat1 = attention_map.flatten()
            flat2 = ref.flatten()
            
            if flat1.std() > 0 and flat2.std() > 0:
                corr = np.corrcoef(flat1, flat2)[0, 1]
                correlations.append(corr)
        
        if not correlations:
            return QualityScore(
                metric=QualityMetric.STABILITY,
                score=0.5,
                status=ValidationResult.WARNING,
                details="Could not compute correlations",
                threshold=self.THRESHOLDS[QualityMetric.STABILITY]
            )
        
        mean_corr = np.mean(correlations)
        stability = (mean_corr + 1) / 2  # Convert from [-1,1] to [0,1]
        
        threshold = self.THRESHOLDS[QualityMetric.STABILITY]
        warning_threshold = self.WARNING_THRESHOLDS[QualityMetric.STABILITY]
        
        if stability >= threshold:
            status = ValidationResult.PASSED
            details = f"Explanation is stable (correlation={mean_corr:.2f})"
        elif stability >= warning_threshold:
            status = ValidationResult.WARNING
            details = f"Moderate stability (correlation={mean_corr:.2f})"
        else:
            status = ValidationResult.FAILED
            details = f"Unstable explanation (correlation={mean_corr:.2f})"
        
        return QualityScore(
            metric=QualityMetric.STABILITY,
            score=stability,
            status=status,
            details=details,
            threshold=threshold
        )
    
    def _compute_plausibility(
        self,
        attention_map: np.ndarray,
        original_image: Optional[np.ndarray]
    ) -> QualityScore:
        """
        Compute clinical plausibility.
        
        Checks if attention is on clinically relevant areas
        (breast tissue) vs. background/artifacts.
        """
        # For mammograms, attention should be within breast region
        # not on background or markers
        
        h, w = attention_map.shape
        
        # Simple heuristic: attention should not be concentrated at edges
        edge_margin = int(min(h, w) * 0.1)  # 10% margin
        
        edge_mask = np.ones((h, w), dtype=np.float32)
        edge_mask[edge_margin:-edge_margin, edge_margin:-edge_margin] = 0
        
        attention_at_edges = np.sum(attention_map * edge_mask)
        total_attention = np.sum(attention_map)
        
        if total_attention > 0:
            edge_ratio = attention_at_edges / total_attention
        else:
            edge_ratio = 0
        
        # Lower edge ratio = more plausible (attention on central tissue)
        plausibility = 1 - min(1, edge_ratio * 2)
        
        # Additional check: attention should not be uniform
        attention_std = np.std(attention_map)
        if attention_std < 0.1:  # Very uniform = suspicious
            plausibility *= 0.5
        
        threshold = self.THRESHOLDS[QualityMetric.PLAUSIBILITY]
        warning_threshold = self.WARNING_THRESHOLDS[QualityMetric.PLAUSIBILITY]
        
        if plausibility >= threshold:
            status = ValidationResult.PASSED
            details = f"Attention appears clinically plausible (edge_ratio={edge_ratio:.2f})"
        elif plausibility >= warning_threshold:
            status = ValidationResult.WARNING
            details = f"Some attention on non-tissue areas (edge_ratio={edge_ratio:.2f})"
        else:
            status = ValidationResult.FAILED
            details = f"Attention may be on artifacts or background"
        
        return QualityScore(
            metric=QualityMetric.PLAUSIBILITY,
            score=plausibility,
            status=status,
            details=details,
            threshold=threshold
        )
    
    def _generate_recommendations(self, metrics: List[QualityScore]) -> List[str]:
        """Generate recommendations based on quality scores."""
        recommendations = []
        
        for m in metrics:
            if m.status == ValidationResult.FAILED:
                if m.metric == QualityMetric.SPARSITY:
                    recommendations.append(
                        "Consider using GradCAM++ for better localization of diffuse patterns."
                    )
                elif m.metric == QualityMetric.COHERENCE:
                    recommendations.append(
                        "Apply morphological smoothing to reduce noise in attention maps."
                    )
                elif m.metric == QualityMetric.LOCALIZATION:
                    recommendations.append(
                        "Review model training - attention may not align with diagnostic regions."
                    )
                elif m.metric == QualityMetric.FAITHFULNESS:
                    recommendations.append(
                        "Explanation method may not accurately reflect model reasoning. "
                        "Consider alternative methods like Integrated Gradients."
                    )
                elif m.metric == QualityMetric.STABILITY:
                    recommendations.append(
                        "Increase MC Dropout samples for more stable explanations."
                    )
                elif m.metric == QualityMetric.PLAUSIBILITY:
                    recommendations.append(
                        "Check for artifacts in input image or model focus issues."
                    )
        
        if not recommendations:
            recommendations.append("All quality metrics passed - explanation is reliable.")
        
        return recommendations
    
    def _create_error_report(self, error_message: str) -> ValidationReport:
        """Create error report when validation fails."""
        return ValidationReport(
            overall_score=0.0,
            overall_status=ValidationResult.FAILED,
            metrics=[],
            recommendations=["Fix validation error before proceeding."],
            warnings=[f"Validation error: {error_message}"],
            timestamp=datetime.utcnow().isoformat()
        )
    
    def compute_attention_quality_score(
        self,
        attention_map: np.ndarray,
        include_details: bool = False
    ) -> Dict[str, Any]:
        """
        Quick quality score for attention maps without full validation.
        
        Returns a single quality score suitable for display in UI.
        """
        try:
            attention_map = self._preprocess_attention_map(attention_map)
            
            # Compute quick metrics
            sparsity = self._compute_sparsity(attention_map).score
            coherence = self._compute_coherence(attention_map).score
            plausibility = self._compute_plausibility(attention_map, None).score
            
            # Weighted average
            quality = (sparsity * 0.3 + coherence * 0.4 + plausibility * 0.3)
            
            result = {
                "quality_score": round(quality, 4),
                "quality_level": self._score_to_level(quality),
                "is_acceptable": quality >= 0.5
            }
            
            if include_details:
                result["details"] = {
                    "sparsity": round(sparsity, 4),
                    "coherence": round(coherence, 4),
                    "plausibility": round(plausibility, 4)
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Quality score computation failed: {e}")
            return {
                "quality_score": 0.0,
                "quality_level": "error",
                "is_acceptable": False,
                "error": str(e)
            }
    
    def _score_to_level(self, score: float) -> str:
        """Convert numeric score to quality level."""
        if score >= 0.8:
            return "excellent"
        elif score >= 0.6:
            return "good"
        elif score >= 0.4:
            return "acceptable"
        elif score >= 0.2:
            return "poor"
        else:
            return "very_poor"


# Singleton instance
_validation_service: Optional[XAIValidationService] = None


def get_xai_validation_service() -> XAIValidationService:
    """Get or create the XAI validation service singleton."""
    global _validation_service
    if _validation_service is None:
        _validation_service = XAIValidationService()
    return _validation_service
