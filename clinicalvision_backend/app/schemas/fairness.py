"""
Fairness Monitoring Schemas - Clean Implementation

Pydantic models for fairness monitoring API.
Designed for fast serialization and validation.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime


class ProtectedAttribute(str, Enum):
    """Protected attributes for fairness analysis."""
    AGE_GROUP = "age_group"
    BREAST_DENSITY = "breast_density"
    IMAGING_DEVICE = "imaging_device"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ComplianceStatus(str, Enum):
    """Regulatory compliance status."""
    COMPLIANT = "compliant"
    CONDITIONAL = "conditional"
    NON_COMPLIANT = "non_compliant"


# =============================================================================
# Response Models
# =============================================================================

class SubgroupMetrics(BaseModel):
    """Performance metrics for a demographic subgroup."""
    group_name: str
    n_samples: int
    sensitivity: float = Field(ge=0, le=1)
    specificity: float = Field(ge=0, le=1)
    auc: float = Field(ge=0, le=1)
    
    class Config:
        frozen = True  # Immutable for caching


class FairnessAlert(BaseModel):
    """Alert for detected fairness issues."""
    alert_id: str
    severity: AlertSeverity
    attribute: ProtectedAttribute
    metric: str
    disparity: float
    threshold: float
    groups: tuple[str, str]  # (disadvantaged, advantaged)
    message: str
    timestamp: datetime
    acknowledged: bool = False


class AttributeSummary(BaseModel):
    """Summary of fairness for one attribute."""
    attribute: ProtectedAttribute
    status: ComplianceStatus
    n_groups: int
    max_disparity: float
    groups: List[SubgroupMetrics]


class ComplianceBreakdown(BaseModel):
    """Regulatory compliance breakdown."""
    fda_status: ComplianceStatus
    eu_ai_act_status: ComplianceStatus
    nist_rmf_status: ComplianceStatus


class DashboardSummary(BaseModel):
    """Summary metrics for dashboard."""
    total_alerts: int
    critical_alerts: int
    warning_alerts: int
    attributes_analyzed: int
    compliance_score: float = Field(ge=0, le=100)


class FairnessDashboardResponse(BaseModel):
    """Complete fairness dashboard response."""
    overall_status: ComplianceStatus
    last_evaluation: Optional[datetime] = Field(
        default=None,
        description="Timestamp of last real evaluation. None for demo data."
    )
    model_version: str
    summary: DashboardSummary
    compliance: ComplianceBreakdown
    alerts: List[FairnessAlert]
    attributes: List[AttributeSummary]
    # Metadata about data source (real vs demo)
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, 
        description="Metadata about data source and computation"
    )
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
