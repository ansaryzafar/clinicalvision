"""
Fairness Monitoring Service - Clean Implementation

Fast, efficient fairness monitoring with pre-computed demo data.
No heavy computation on API requests.
"""

from typing import List
from datetime import datetime, timedelta
from uuid import uuid4
import logging

from app.schemas.fairness import (
    ProtectedAttribute,
    AlertSeverity,
    ComplianceStatus,
    SubgroupMetrics,
    FairnessAlert,
    AttributeSummary,
    ComplianceBreakdown,
    DashboardSummary,
    FairnessDashboardResponse,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Pre-computed Demo Data (Loaded Once at Startup)
# =============================================================================

# Realistic pre-computed metrics based on mammography research
_PRECOMPUTED_DATA = {
    ProtectedAttribute.AGE_GROUP: {
        "groups": [
            SubgroupMetrics(
                group_name="under_40",
                n_samples=245,
                sensitivity=0.84,
                specificity=0.89,
                auc=0.91
            ),
            SubgroupMetrics(
                group_name="40_49",
                n_samples=412,
                sensitivity=0.87,
                specificity=0.91,
                auc=0.93
            ),
            SubgroupMetrics(
                group_name="50_64",
                n_samples=523,
                sensitivity=0.90,
                specificity=0.92,
                auc=0.95
            ),
            SubgroupMetrics(
                group_name="65_plus",
                n_samples=320,
                sensitivity=0.88,
                specificity=0.90,
                auc=0.93
            ),
        ],
        "max_disparity": 0.06,  # 90% - 84% sensitivity
        "status": ComplianceStatus.COMPLIANT
    },
    ProtectedAttribute.BREAST_DENSITY: {
        "groups": [
            SubgroupMetrics(
                group_name="fatty",
                n_samples=280,
                sensitivity=0.92,
                specificity=0.94,
                auc=0.96
            ),
            SubgroupMetrics(
                group_name="scattered",
                n_samples=450,
                sensitivity=0.89,
                specificity=0.92,
                auc=0.94
            ),
            SubgroupMetrics(
                group_name="heterogeneous",
                n_samples=420,
                sensitivity=0.85,
                specificity=0.88,
                auc=0.91
            ),
            SubgroupMetrics(
                group_name="dense",
                n_samples=350,
                sensitivity=0.77,
                specificity=0.84,
                auc=0.86
            ),
        ],
        "max_disparity": 0.15,  # 92% - 77% sensitivity  
        "status": ComplianceStatus.CONDITIONAL
    },
    ProtectedAttribute.IMAGING_DEVICE: {
        "groups": [
            SubgroupMetrics(
                group_name="hologic_selenia",
                n_samples=520,
                sensitivity=0.88,
                specificity=0.91,
                auc=0.94
            ),
            SubgroupMetrics(
                group_name="ge_senographe",
                n_samples=480,
                sensitivity=0.87,
                specificity=0.90,
                auc=0.93
            ),
            SubgroupMetrics(
                group_name="siemens_mammomat",
                n_samples=350,
                sensitivity=0.86,
                specificity=0.89,
                auc=0.92
            ),
            SubgroupMetrics(
                group_name="fuji_amulet",
                n_samples=150,
                sensitivity=0.85,
                specificity=0.88,
                auc=0.91
            ),
        ],
        "max_disparity": 0.03,  # 88% - 85% sensitivity
        "status": ComplianceStatus.COMPLIANT
    },
}

# Pre-computed alerts
_PRECOMPUTED_ALERTS: List[FairnessAlert] = [
    FairnessAlert(
        alert_id=str(uuid4()),
        severity=AlertSeverity.WARNING,
        attribute=ProtectedAttribute.BREAST_DENSITY,
        metric="sensitivity_parity",
        disparity=0.15,
        threshold=0.10,
        groups=("dense", "fatty"),
        message="Sensitivity disparity of 15% between dense and fatty breast tissue exceeds 10% threshold",
        timestamp=datetime.utcnow() - timedelta(hours=2),
        acknowledged=False
    ),
    FairnessAlert(
        alert_id=str(uuid4()),
        severity=AlertSeverity.INFO,
        attribute=ProtectedAttribute.AGE_GROUP,
        metric="calibration",
        disparity=0.08,
        threshold=0.10,
        groups=("under_40", "50_64"),
        message="Calibration difference of 8% between age groups is within acceptable range",
        timestamp=datetime.utcnow() - timedelta(hours=6),
        acknowledged=True
    ),
]


class FairnessService:
    """
    Efficient fairness monitoring service.
    
    Uses pre-computed data for instant responses.
    No heavy computation on API requests.
    """
    
    def __init__(self):
        """Initialize with pre-loaded data."""
        self._data = _PRECOMPUTED_DATA
        self._alerts = _PRECOMPUTED_ALERTS.copy()
        # F2: Do NOT fabricate a "last evaluated" timestamp for demo data.
        # None signals to the frontend that no real evaluation has occurred.
        self._last_evaluation = None
        self._model_version = "v12_production"
        logger.info("FairnessService initialized with pre-computed demo data")
    
    def get_dashboard(self) -> FairnessDashboardResponse:
        """
        Get complete fairness dashboard data.
        
        Returns pre-computed data instantly (< 10ms).
        """
        # Build attribute summaries from pre-computed data
        attributes = []
        for attr, data in self._data.items():
            attributes.append(AttributeSummary(
                attribute=attr,
                status=data["status"],
                n_groups=len(data["groups"]),
                max_disparity=data["max_disparity"],
                groups=data["groups"]
            ))
        
        # Count alerts
        active_alerts = [a for a in self._alerts if not a.acknowledged]
        critical_count = sum(1 for a in active_alerts if a.severity == AlertSeverity.CRITICAL)
        warning_count = sum(1 for a in active_alerts if a.severity == AlertSeverity.WARNING)
        
        # Determine overall status
        if critical_count > 0:
            overall_status = ComplianceStatus.NON_COMPLIANT
        elif warning_count > 0:
            overall_status = ComplianceStatus.CONDITIONAL
        else:
            overall_status = ComplianceStatus.COMPLIANT
        
        # Calculate compliance score (0-100)
        compliance_score = 100.0
        for data in self._data.values():
            if data["status"] == ComplianceStatus.CONDITIONAL:
                compliance_score -= 10
            elif data["status"] == ComplianceStatus.NON_COMPLIANT:
                compliance_score -= 25
        compliance_score = max(0, compliance_score)
        
        # F7: Derive regulatory statuses from computed metrics (not hardcoded)
        # FDA: Check if any attribute has disparity > 10% threshold
        has_fda_violation = any(
            data["max_disparity"] > 0.10 for data in self._data.values()
        )
        fda_status = ComplianceStatus.CONDITIONAL if has_fda_violation else ComplianceStatus.COMPLIANT
        
        # NIST RMF: Based on overall compliance score (>= 80 = compliant, >= 60 = conditional)
        nist_status = (
            ComplianceStatus.COMPLIANT if compliance_score >= 80
            else ComplianceStatus.CONDITIONAL if compliance_score >= 60
            else ComplianceStatus.NON_COMPLIANT
        )
        
        return FairnessDashboardResponse(
            overall_status=overall_status,
            last_evaluation=self._last_evaluation,
            model_version=self._model_version,
            summary=DashboardSummary(
                total_alerts=len(active_alerts),
                critical_alerts=critical_count,
                warning_alerts=warning_count,
                attributes_analyzed=len(self._data),
                compliance_score=compliance_score
            ),
            compliance=ComplianceBreakdown(
                fda_status=fda_status,
                eu_ai_act_status=overall_status,
                nist_rmf_status=nist_status
            ),
            alerts=active_alerts,
            attributes=attributes
        )
    
    def get_alerts(
        self,
        severity: AlertSeverity = None,
        acknowledged: bool = None
    ) -> List[FairnessAlert]:
        """
        Get fairness alerts with optional filtering.
        
        Returns instantly from pre-computed data.
        """
        alerts = self._alerts
        
        if severity is not None:
            alerts = [a for a in alerts if a.severity == severity]
        
        if acknowledged is not None:
            alerts = [a for a in alerts if a.acknowledged == acknowledged]
        
        return alerts
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged."""
        for alert in self._alerts:
            if alert.alert_id == alert_id:
                # Create new alert with acknowledged=True (immutable pattern)
                idx = self._alerts.index(alert)
                self._alerts[idx] = FairnessAlert(
                    alert_id=alert.alert_id,
                    severity=alert.severity,
                    attribute=alert.attribute,
                    metric=alert.metric,
                    disparity=alert.disparity,
                    threshold=alert.threshold,
                    groups=alert.groups,
                    message=alert.message,
                    timestamp=alert.timestamp,
                    acknowledged=True
                )
                return True
        return False


# Singleton instance for reuse
_service_instance: FairnessService = None


def get_fairness_service() -> FairnessService:
    """Get or create the fairness service singleton."""
    global _service_instance
    if _service_instance is None:
        _service_instance = FairnessService()
    return _service_instance
