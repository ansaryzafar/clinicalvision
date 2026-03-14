"""
Health check schemas for monitoring and observability
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Dict, Optional


class HealthResponse(BaseModel):
    """
    System health check response
    Used by load balancers and monitoring systems
    """
    status: str = Field(
        ...,
        description="Overall system status (healthy/degraded/unhealthy)"
    )
    version: str = Field(..., description="Application version")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Health check timestamp"
    )
    services: Dict[str, str] = Field(
        default_factory=dict,
        description="Status of individual services"
    )
    model_loaded: bool = Field(..., description="Whether AI model is loaded")
    database_connected: bool = Field(..., description="Database connection status")
    uptime_seconds: Optional[float] = Field(
        None,
        description="Application uptime in seconds"
    )
    model_version: Optional[str] = Field(
        None,
        description="Active AI model version identifier"
    )
    
    model_config = ConfigDict(protected_namespaces=())
