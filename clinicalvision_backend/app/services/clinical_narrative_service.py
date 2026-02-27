"""
Clinical Narrative Generation Service

Enterprise-grade clinical explanation system for mammogram AI analysis.
Generates radiologist-friendly narratives following ACR BI-RADS guidelines.

Features:
- Template-based narrative generation
- BI-RADS category mapping
- Anatomical location descriptions
- Uncertainty-aware recommendations
- Multi-language support (extensible)

References:
- ACR BI-RADS Atlas 5th Edition
- FDA guidance on AI/ML-based SaMD
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


class BIRADSCategory(str, Enum):
    """ACR BI-RADS Assessment Categories"""
    BIRADS_0 = "0"  # Incomplete - Need Additional Imaging
    BIRADS_1 = "1"  # Negative
    BIRADS_2 = "2"  # Benign
    BIRADS_3 = "3"  # Probably Benign
    BIRADS_4A = "4A"  # Low Suspicion for Malignancy
    BIRADS_4B = "4B"  # Moderate Suspicion for Malignancy
    BIRADS_4C = "4C"  # High Suspicion for Malignancy
    BIRADS_5 = "5"  # Highly Suggestive of Malignancy
    BIRADS_6 = "6"  # Known Biopsy-Proven Malignancy


class FindingType(str, Enum):
    """Types of mammographic findings"""
    MASS = "mass"
    CALCIFICATION = "calcification"
    ARCHITECTURAL_DISTORTION = "architectural_distortion"
    ASYMMETRY = "asymmetry"
    FOCAL_ASYMMETRY = "focal_asymmetry"
    DEVELOPING_ASYMMETRY = "developing_asymmetry"
    INTRAMAMMARY_LYMPH_NODE = "intramammary_lymph_node"
    SKIN_LESION = "skin_lesion"
    SOLITARY_DILATED_DUCT = "solitary_dilated_duct"
    NO_FINDING = "no_finding"


class RecommendationAction(str, Enum):
    """Clinical recommendation actions"""
    ROUTINE_SCREENING = "routine_screening"
    SHORT_INTERVAL_FOLLOWUP = "short_interval_followup"
    ADDITIONAL_IMAGING = "additional_imaging"
    ULTRASOUND = "ultrasound"
    MRI = "mri"
    BIOPSY = "biopsy"
    SURGICAL_CONSULTATION = "surgical_consultation"
    CLINICAL_CORRELATION = "clinical_correlation"


@dataclass
class AnatomicalLocation:
    """Anatomical location description for findings"""
    quadrant: str  # UOQ, UIQ, LOQ, LIQ, central, subareolar
    clock_position: Optional[str] = None  # e.g., "2 o'clock"
    depth: Optional[str] = None  # anterior, middle, posterior
    distance_from_nipple: Optional[str] = None  # in cm
    laterality: Optional[str] = None  # left, right, bilateral
    
    def to_clinical_description(self) -> str:
        """Convert to clinical description string."""
        parts = []
        
        if self.laterality:
            parts.append(self.laterality.capitalize())
        
        parts.append(self._quadrant_full_name())
        
        if self.clock_position:
            parts.append(f"at {self.clock_position}")
        
        if self.depth:
            parts.append(f"({self.depth} third)")
        
        if self.distance_from_nipple:
            parts.append(f"{self.distance_from_nipple} from nipple")
        
        return " ".join(parts)
    
    def _quadrant_full_name(self) -> str:
        """Convert quadrant abbreviation to full name."""
        mapping = {
            "UOQ": "upper outer quadrant",
            "UIQ": "upper inner quadrant", 
            "LOQ": "lower outer quadrant",
            "LIQ": "lower inner quadrant",
            "central": "central region",
            "subareolar": "subareolar region",
            "upper outer quadrant": "upper outer quadrant",
            "upper inner quadrant": "upper inner quadrant",
            "lower outer quadrant": "lower outer quadrant",
            "lower inner quadrant": "lower inner quadrant",
        }
        return mapping.get(self.quadrant.lower(), self.quadrant)


@dataclass
class ClinicalFinding:
    """Structured clinical finding from AI analysis"""
    finding_type: FindingType
    location: AnatomicalLocation
    size_mm: Optional[float] = None
    attention_score: float = 0.0
    confidence: float = 0.0
    characteristics: Dict[str, Any] = field(default_factory=dict)
    
    def to_narrative(self) -> str:
        """Generate narrative description of finding."""
        desc = []
        
        # Size if available
        if self.size_mm:
            desc.append(f"{self.size_mm:.0f}mm")
        
        # Finding type
        desc.append(self._finding_type_description())
        
        # Location
        desc.append(f"in the {self.location.to_clinical_description()}")
        
        # Confidence qualifier
        if self.confidence < 0.7:
            desc.insert(0, "Possible")
        elif self.confidence > 0.9:
            desc.insert(0, "Definite")
        
        return " ".join(desc)
    
    def _finding_type_description(self) -> str:
        """Get clinical description of finding type."""
        mapping = {
            FindingType.MASS: "mass",
            FindingType.CALCIFICATION: "calcification cluster",
            FindingType.ARCHITECTURAL_DISTORTION: "architectural distortion",
            FindingType.ASYMMETRY: "asymmetry",
            FindingType.FOCAL_ASYMMETRY: "focal asymmetry",
            FindingType.DEVELOPING_ASYMMETRY: "developing asymmetry",
            FindingType.INTRAMAMMARY_LYMPH_NODE: "intramammary lymph node",
            FindingType.SKIN_LESION: "skin lesion",
            FindingType.SOLITARY_DILATED_DUCT: "solitary dilated duct",
            FindingType.NO_FINDING: "no significant finding"
        }
        return mapping.get(self.finding_type, str(self.finding_type.value))


@dataclass
class ClinicalRecommendation:
    """Structured clinical recommendation"""
    action: RecommendationAction
    urgency: str  # routine, timely, urgent
    timeframe: Optional[str] = None  # e.g., "6 months", "2 weeks"
    rationale: str = ""
    additional_notes: Optional[str] = None
    
    def to_narrative(self) -> str:
        """Generate recommendation narrative."""
        action_text = self._action_description()
        
        if self.timeframe:
            action_text += f" within {self.timeframe}"
        
        if self.rationale:
            action_text += f" ({self.rationale})"
        
        return action_text
    
    def _action_description(self) -> str:
        """Get action description."""
        mapping = {
            RecommendationAction.ROUTINE_SCREENING: "Continue routine annual screening mammography",
            RecommendationAction.SHORT_INTERVAL_FOLLOWUP: "Short-interval follow-up mammography recommended",
            RecommendationAction.ADDITIONAL_IMAGING: "Additional mammographic views recommended",
            RecommendationAction.ULTRASOUND: "Targeted ultrasound evaluation recommended",
            RecommendationAction.MRI: "Breast MRI recommended for further evaluation",
            RecommendationAction.BIOPSY: "Image-guided biopsy recommended",
            RecommendationAction.SURGICAL_CONSULTATION: "Surgical consultation recommended",
            RecommendationAction.CLINICAL_CORRELATION: "Clinical correlation advised"
        }
        return mapping.get(self.action, str(self.action.value))


class ClinicalNarrativeService:
    """
    Enterprise-grade clinical narrative generation service.
    
    Generates structured, clinically-appropriate narratives following
    ACR BI-RADS guidelines and FDA recommendations for AI/ML diagnostics.
    """
    
    # BI-RADS probability thresholds (based on ACR guidelines)
    BIRADS_THRESHOLDS = {
        BIRADSCategory.BIRADS_1: (0.0, 0.02),    # <2% malignancy
        BIRADSCategory.BIRADS_2: (0.0, 0.02),    # <2% malignancy (known benign)
        BIRADSCategory.BIRADS_3: (0.02, 0.10),   # 2-10% (probably benign)
        BIRADSCategory.BIRADS_4A: (0.10, 0.30),  # 10-30% (low suspicion)
        BIRADSCategory.BIRADS_4B: (0.30, 0.60),  # 30-60% (moderate suspicion)
        BIRADSCategory.BIRADS_4C: (0.60, 0.90),  # 60-90% (high suspicion)
        BIRADSCategory.BIRADS_5: (0.90, 1.0),    # >90% (highly suggestive)
    }
    
    # Narrative templates
    IMPRESSION_TEMPLATES = {
        "benign_low_uncertainty": (
            "AI-assisted analysis demonstrates findings consistent with benign breast tissue. "
            "No suspicious masses, calcifications, or architectural distortion identified. "
            "Model confidence: {confidence:.0%}."
        ),
        "benign_moderate_uncertainty": (
            "AI-assisted analysis suggests predominantly benign findings. "
            "Some features demonstrate borderline characteristics requiring clinical correlation. "
            "Model confidence: {confidence:.0%}. Uncertainty: {uncertainty:.1%}."
        ),
        "probably_benign": (
            "AI-assisted analysis identifies findings with low probability of malignancy. "
            "{finding_description} "
            "BI-RADS 3 assessment: Probably benign. "
            "Model confidence: {confidence:.0%}."
        ),
        "suspicious_low": (
            "AI-assisted analysis identifies findings warranting further evaluation. "
            "{finding_description} "
            "BI-RADS 4A assessment: Low suspicion for malignancy. "
            "Model confidence: {confidence:.0%}."
        ),
        "suspicious_moderate": (
            "AI-assisted analysis identifies findings with moderate suspicion for malignancy. "
            "{finding_description} "
            "BI-RADS 4B assessment: Moderate suspicion for malignancy. "
            "Model confidence: {confidence:.0%}."
        ),
        "suspicious_high": (
            "AI-assisted analysis identifies findings with high suspicion for malignancy. "
            "{finding_description} "
            "BI-RADS 4C assessment: High suspicion for malignancy. "
            "Model confidence: {confidence:.0%}."
        ),
        "highly_suspicious": (
            "AI-assisted analysis identifies findings highly suggestive of malignancy. "
            "{finding_description} "
            "BI-RADS 5 assessment: Highly suggestive of malignancy. "
            "Model confidence: {confidence:.0%}. Immediate action required."
        ),
        "incomplete": (
            "AI-assisted analysis incomplete due to {reason}. "
            "Additional imaging recommended for complete evaluation. "
            "BI-RADS 0 assessment: Incomplete - needs additional imaging."
        )
    }
    
    def __init__(self):
        """Initialize the clinical narrative service."""
        self._initialized = True
        logger.info("ClinicalNarrativeService initialized")
    
    def generate_narrative(
        self,
        prediction: str,
        malignancy_probability: float,
        confidence: float,
        uncertainty: float,
        suspicious_regions: List[Dict[str, Any]],
        attention_quality: Optional[float] = None,
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive clinical narrative.
        
        Args:
            prediction: Model prediction (benign/malignant)
            malignancy_probability: Probability of malignancy (0-1)
            confidence: Model confidence (0-1)
            uncertainty: Epistemic uncertainty (variance)
            suspicious_regions: List of detected suspicious regions
            attention_quality: Quality score of attention maps (0-1)
            patient_context: Optional patient information for context
            
        Returns:
            Dictionary containing:
            - impression: Main clinical impression
            - birads_category: Suggested BI-RADS category
            - findings: List of structured findings
            - recommendations: List of recommendations
            - technical_notes: Technical analysis notes
            - confidence_explanation: Explanation of confidence level
            - limitations: Known limitations and caveats
        """
        try:
            # Determine BI-RADS category
            birads = self._determine_birads(malignancy_probability, uncertainty)
            
            # Convert regions to clinical findings
            findings = self._convert_to_findings(suspicious_regions, malignancy_probability)
            
            # Generate finding description
            finding_description = self._generate_finding_description(findings)
            
            # Select appropriate template
            template_key = self._select_template(birads, uncertainty, findings)
            
            # Generate impression
            impression = self._generate_impression(
                template_key, confidence, uncertainty, finding_description
            )
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                birads, uncertainty, findings, patient_context
            )
            
            # Generate confidence explanation
            confidence_explanation = self._generate_confidence_explanation(
                confidence, uncertainty, attention_quality
            )
            
            # Generate technical notes
            technical_notes = self._generate_technical_notes(
                malignancy_probability, confidence, uncertainty, attention_quality
            )
            
            # Generate limitations
            limitations = self._generate_limitations(uncertainty, attention_quality)
            
            return {
                "impression": impression,
                "birads_category": birads.value,
                "birads_description": self._birads_description(birads),
                "findings": [f.to_narrative() for f in findings] if findings else ["No significant findings identified"],
                "recommendations": [r.to_narrative() for r in recommendations],
                "technical_notes": technical_notes,
                "confidence_explanation": confidence_explanation,
                "limitations": limitations,
                "generated_at": datetime.utcnow().isoformat(),
                "disclaimer": self._get_disclaimer()
            }
            
        except Exception as e:
            logger.error(f"Narrative generation failed: {e}")
            return self._generate_fallback_narrative(prediction, malignancy_probability)
    
    def _determine_birads(
        self, 
        malignancy_prob: float, 
        uncertainty: float
    ) -> BIRADSCategory:
        """
        Determine BI-RADS category based on malignancy probability.
        
        Uses ACR-aligned thresholds with uncertainty adjustment.
        High uncertainty may result in more conservative categorization.
        """
        # Adjust probability based on uncertainty (conservative approach)
        uncertainty_std = uncertainty ** 0.5
        
        # For high uncertainty, we consider the upper bound of confidence interval
        if uncertainty_std > 0.1:  # >10% uncertainty
            # Use upper bound (conservative)
            adjusted_prob = min(1.0, malignancy_prob + uncertainty_std)
        else:
            adjusted_prob = malignancy_prob
        
        # Map to BI-RADS
        if adjusted_prob < 0.02:
            return BIRADSCategory.BIRADS_1 if adjusted_prob < 0.01 else BIRADSCategory.BIRADS_2
        elif adjusted_prob < 0.10:
            return BIRADSCategory.BIRADS_3
        elif adjusted_prob < 0.30:
            return BIRADSCategory.BIRADS_4A
        elif adjusted_prob < 0.60:
            return BIRADSCategory.BIRADS_4B
        elif adjusted_prob < 0.90:
            return BIRADSCategory.BIRADS_4C
        else:
            return BIRADSCategory.BIRADS_5
    
    def _convert_to_findings(
        self, 
        regions: List[Dict[str, Any]], 
        malignancy_prob: float
    ) -> List[ClinicalFinding]:
        """Convert suspicious regions to clinical findings."""
        findings = []
        
        for region in regions:
            # Parse location
            location_str = region.get("location", "central region")
            location = self._parse_location(location_str)
            
            # Determine finding type based on attention pattern
            # In a real system, this would come from a lesion classifier
            finding_type = self._infer_finding_type(region, malignancy_prob)
            
            # Estimate size from bbox (rough approximation)
            bbox = region.get("bbox", [0, 0, 20, 20])
            size_mm = max(bbox[2], bbox[3]) * 0.5 if bbox else None  # Scale factor
            
            finding = ClinicalFinding(
                finding_type=finding_type,
                location=location,
                size_mm=size_mm,
                attention_score=region.get("attention_score", 0.0),
                confidence=region.get("confidence", malignancy_prob),
                characteristics={"bbox": bbox}
            )
            findings.append(finding)
        
        # Sort by attention score (most suspicious first)
        findings.sort(key=lambda f: f.attention_score, reverse=True)
        
        return findings[:3]  # Return top 3 findings
    
    def _parse_location(self, location_str: str) -> AnatomicalLocation:
        """Parse location string to structured format."""
        location_str = location_str.lower()
        
        # Map common location strings
        quadrant_mapping = {
            "upper outer": "UOQ",
            "upper inner": "UIQ", 
            "lower outer": "LOQ",
            "lower inner": "LIQ",
            "central": "central",
            "retroareolar": "subareolar",
            "subareolar": "subareolar"
        }
        
        quadrant = "central"  # default
        for key, value in quadrant_mapping.items():
            if key in location_str:
                quadrant = value
                break
        
        return AnatomicalLocation(quadrant=quadrant)
    
    def _infer_finding_type(
        self, 
        region: Dict[str, Any], 
        malignancy_prob: float
    ) -> FindingType:
        """Infer finding type from region characteristics."""
        # In production, this would use a dedicated classifier
        # For now, use heuristics based on attention pattern
        
        attention = region.get("attention_score", 0.0)
        
        if attention < 0.3:
            return FindingType.NO_FINDING
        elif malignancy_prob > 0.7:
            return FindingType.MASS  # Assume mass for high suspicion
        elif malignancy_prob > 0.4:
            return FindingType.FOCAL_ASYMMETRY
        else:
            return FindingType.ASYMMETRY
    
    def _generate_finding_description(self, findings: List[ClinicalFinding]) -> str:
        """Generate combined finding description."""
        if not findings:
            return "No significant findings identified."
        
        descriptions = [f.to_narrative() for f in findings]
        
        if len(descriptions) == 1:
            return descriptions[0] + "."
        else:
            return "; ".join(descriptions[:-1]) + "; and " + descriptions[-1] + "."
    
    def _select_template(
        self, 
        birads: BIRADSCategory, 
        uncertainty: float,
        findings: List[ClinicalFinding]
    ) -> str:
        """Select appropriate narrative template."""
        uncertainty_std = uncertainty ** 0.5
        
        if birads in [BIRADSCategory.BIRADS_1, BIRADSCategory.BIRADS_2]:
            if uncertainty_std < 0.05:
                return "benign_low_uncertainty"
            else:
                return "benign_moderate_uncertainty"
        elif birads == BIRADSCategory.BIRADS_3:
            return "probably_benign"
        elif birads == BIRADSCategory.BIRADS_4A:
            return "suspicious_low"
        elif birads == BIRADSCategory.BIRADS_4B:
            return "suspicious_moderate"
        elif birads == BIRADSCategory.BIRADS_4C:
            return "suspicious_high"
        elif birads == BIRADSCategory.BIRADS_5:
            return "highly_suspicious"
        else:
            return "incomplete"
    
    def _generate_impression(
        self, 
        template_key: str, 
        confidence: float,
        uncertainty: float,
        finding_description: str
    ) -> str:
        """Generate impression from template."""
        template = self.IMPRESSION_TEMPLATES.get(template_key, self.IMPRESSION_TEMPLATES["benign_low_uncertainty"])
        
        uncertainty_pct = (uncertainty ** 0.5) * 100
        
        return template.format(
            confidence=confidence,
            uncertainty=uncertainty_pct,
            finding_description=finding_description,
            reason="technical factors"
        )
    
    def _generate_recommendations(
        self,
        birads: BIRADSCategory,
        uncertainty: float,
        findings: List[ClinicalFinding],
        patient_context: Optional[Dict[str, Any]]
    ) -> List[ClinicalRecommendation]:
        """Generate clinical recommendations based on BI-RADS."""
        recommendations = []
        
        # Primary recommendation based on BI-RADS
        if birads in [BIRADSCategory.BIRADS_1, BIRADSCategory.BIRADS_2]:
            recommendations.append(ClinicalRecommendation(
                action=RecommendationAction.ROUTINE_SCREENING,
                urgency="routine",
                timeframe="12 months",
                rationale="Negative/benign findings"
            ))
        
        elif birads == BIRADSCategory.BIRADS_3:
            recommendations.append(ClinicalRecommendation(
                action=RecommendationAction.SHORT_INTERVAL_FOLLOWUP,
                urgency="timely",
                timeframe="6 months",
                rationale="Probably benign findings require follow-up"
            ))
        
        elif birads == BIRADSCategory.BIRADS_4A:
            recommendations.append(ClinicalRecommendation(
                action=RecommendationAction.BIOPSY,
                urgency="timely",
                timeframe="2-4 weeks",
                rationale="Low suspicion, biopsy for definitive diagnosis"
            ))
            recommendations.append(ClinicalRecommendation(
                action=RecommendationAction.ULTRASOUND,
                urgency="timely",
                timeframe="1-2 weeks",
                rationale="Additional characterization may be helpful"
            ))
        
        elif birads in [BIRADSCategory.BIRADS_4B, BIRADSCategory.BIRADS_4C]:
            recommendations.append(ClinicalRecommendation(
                action=RecommendationAction.BIOPSY,
                urgency="urgent" if birads == BIRADSCategory.BIRADS_4C else "timely",
                timeframe="1-2 weeks",
                rationale="Moderate-high suspicion requires tissue diagnosis"
            ))
        
        elif birads == BIRADSCategory.BIRADS_5:
            recommendations.append(ClinicalRecommendation(
                action=RecommendationAction.BIOPSY,
                urgency="urgent",
                timeframe="within 1 week",
                rationale="Highly suggestive of malignancy"
            ))
            recommendations.append(ClinicalRecommendation(
                action=RecommendationAction.SURGICAL_CONSULTATION,
                urgency="urgent",
                timeframe="within 2 weeks",
                rationale="Prepare for treatment planning"
            ))
        
        # Add clinical correlation for high uncertainty
        if uncertainty ** 0.5 > 0.1:
            recommendations.append(ClinicalRecommendation(
                action=RecommendationAction.CLINICAL_CORRELATION,
                urgency="routine",
                rationale="Elevated AI uncertainty"
            ))
        
        return recommendations
    
    def _generate_confidence_explanation(
        self,
        confidence: float,
        uncertainty: float,
        attention_quality: Optional[float]
    ) -> str:
        """Generate explanation of confidence level."""
        parts = []
        
        # Confidence level
        if confidence > 0.9:
            parts.append("Very high model confidence indicates clear distinguishing features.")
        elif confidence > 0.8:
            parts.append("High model confidence with well-defined characteristics.")
        elif confidence > 0.7:
            parts.append("Good model confidence, though some features show variability.")
        elif confidence > 0.6:
            parts.append("Moderate confidence - borderline features present.")
        else:
            parts.append("Lower confidence indicates ambiguous features requiring expert review.")
        
        # Uncertainty
        uncertainty_std = uncertainty ** 0.5
        if uncertainty_std > 0.15:
            parts.append(f"Elevated uncertainty ({uncertainty_std*100:.0f}%) suggests clinical correlation is essential.")
        elif uncertainty_std > 0.10:
            parts.append(f"Moderate uncertainty ({uncertainty_std*100:.0f}%) - radiologist verification recommended.")
        elif uncertainty_std < 0.05:
            parts.append(f"Low uncertainty ({uncertainty_std*100:.0f}%) indicates consistent model predictions.")
        
        # Attention quality
        if attention_quality is not None:
            if attention_quality > 0.8:
                parts.append("Attention maps show focused, clinically plausible regions.")
            elif attention_quality < 0.5:
                parts.append("Attention pattern quality is suboptimal; findings should be verified.")
        
        return " ".join(parts)
    
    def _generate_technical_notes(
        self,
        malignancy_prob: float,
        confidence: float,
        uncertainty: float,
        attention_quality: Optional[float]
    ) -> str:
        """Generate technical analysis notes."""
        notes = []
        
        notes.append(f"Malignancy probability: {malignancy_prob:.1%}")
        notes.append(f"Model confidence: {confidence:.1%}")
        notes.append(f"Epistemic uncertainty (σ): {uncertainty**0.5:.1%}")
        
        if attention_quality is not None:
            notes.append(f"Attention quality score: {attention_quality:.2f}")
        
        notes.append("Analysis performed using DenseNet-121 ensemble with MC Dropout uncertainty quantification.")
        
        return " | ".join(notes)
    
    def _generate_limitations(
        self,
        uncertainty: float,
        attention_quality: Optional[float]
    ) -> List[str]:
        """Generate list of limitations and caveats."""
        limitations = [
            "AI analysis is intended as a decision support tool and does not replace clinical judgment.",
            "Findings should be correlated with clinical history and physical examination.",
        ]
        
        if uncertainty ** 0.5 > 0.1:
            limitations.append(
                "Elevated model uncertainty may indicate image quality issues or unusual presentation."
            )
        
        if attention_quality is not None and attention_quality < 0.6:
            limitations.append(
                "Attention map quality is reduced; findings may require additional verification."
            )
        
        limitations.append(
            "This AI system has been validated on screening mammography and may have "
            "reduced performance on diagnostic cases or special populations."
        )
        
        return limitations
    
    def _birads_description(self, birads: BIRADSCategory) -> str:
        """Get full BI-RADS category description."""
        descriptions = {
            BIRADSCategory.BIRADS_0: "Incomplete - Need Additional Imaging Evaluation",
            BIRADSCategory.BIRADS_1: "Negative",
            BIRADSCategory.BIRADS_2: "Benign",
            BIRADSCategory.BIRADS_3: "Probably Benign",
            BIRADSCategory.BIRADS_4A: "Low Suspicion for Malignancy",
            BIRADSCategory.BIRADS_4B: "Moderate Suspicion for Malignancy",
            BIRADSCategory.BIRADS_4C: "High Suspicion for Malignancy",
            BIRADSCategory.BIRADS_5: "Highly Suggestive of Malignancy",
            BIRADSCategory.BIRADS_6: "Known Biopsy-Proven Malignancy"
        }
        return descriptions.get(birads, str(birads.value))
    
    def _get_disclaimer(self) -> str:
        """Get standard disclaimer text."""
        return (
            "IMPORTANT: This AI-generated analysis is provided as clinical decision support only. "
            "Final diagnosis and treatment decisions must be made by qualified healthcare professionals "
            "based on comprehensive clinical evaluation. This system is not FDA-cleared for "
            "standalone diagnostic use."
        )
    
    def _generate_fallback_narrative(
        self,
        prediction: str,
        malignancy_prob: float
    ) -> Dict[str, Any]:
        """Generate fallback narrative when main generation fails."""
        return {
            "impression": f"AI analysis suggests {prediction} findings. Malignancy probability: {malignancy_prob:.0%}. "
                         "Clinical correlation recommended.",
            "birads_category": "0",
            "birads_description": "Incomplete - Technical Error",
            "findings": ["Unable to generate detailed findings due to technical error."],
            "recommendations": ["Clinical correlation and repeat analysis recommended."],
            "technical_notes": f"Fallback narrative generated. Probability: {malignancy_prob:.1%}",
            "confidence_explanation": "Unable to generate confidence explanation.",
            "limitations": ["Technical error during narrative generation."],
            "generated_at": datetime.utcnow().isoformat(),
            "disclaimer": self._get_disclaimer()
        }


# Singleton instance
_narrative_service: Optional[ClinicalNarrativeService] = None


def get_clinical_narrative_service() -> ClinicalNarrativeService:
    """Get or create the clinical narrative service singleton."""
    global _narrative_service
    if _narrative_service is None:
        _narrative_service = ClinicalNarrativeService()
    return _narrative_service
