"""
Model Versions API Endpoints

This module provides REST API endpoints for AI/ML model version management,
including registration, deployment, performance monitoring, and FDA compliance.

Standards:
- RESTful API design patterns
- OpenAPI 3.0 documentation
- FDA 21 CFR Part 820 (SaMD QSR)
- FDA 21 CFR Part 11 (Electronic Records)
"""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging

from app.db.session import get_db
from app.db.models.user import User
from app.core.dependencies import (
    get_current_active_user,
    require_admin,
    require_radiologist_or_admin,
    RoleChecker
)
from app.services.models_service import (
    ModelVersionService,
    ModelVersionNotFoundException,
    ModelVersionConflictException,
    InvalidDeploymentException,
    PerformanceDriftException,
    ModelVersionServiceException
)
from app.schemas.models import (
    ModelVersionCreate,
    ModelVersionUpdate,
    ModelVersionResponse,
    ModelVersionListResponse,
    ModelDeploymentRequest,
    ModelComparisonRequest,
    ModelComparisonResponse,
    ModelPerformanceLogCreate,
    ModelPerformanceLogResponse,
    ModelPerformanceTrendResponse,
    ModelDriftCheckResponse,
    ModelStatistics,
    ErrorResponse,
    ModelStatusEnum,
    AlgorithmTypeEnum
)

logger = logging.getLogger(__name__)

# Router configuration
router = APIRouter(
    prefix="/api/v1/models",
    tags=["Model Versions"]
)


# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

def get_model_service(db: Session = Depends(get_db)) -> ModelVersionService:
    """Dependency injection for model version service"""
    return ModelVersionService(db)


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "/register",
    response_model=ModelVersionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new model version",
    description="""
    Register a new AI/ML model version with complete metadata.
    
    **Required Information:**
    - Model name and semantic version
    - Algorithm type and architecture
    - Validation metrics (accuracy, AUC-ROC, sensitivity, etc.)
    - Training dataset information
    - Hyperparameters
    
    **FDA Compliance:**
    - Tracks all model versions for regulatory submission
    - Documents training and validation procedures
    - Maintains audit trail for 21 CFR Part 11
    
    **Responsible AI:**
    - Fairness metrics for bias detection
    - Explainability method documentation
    - Uncertainty quantification support
    """,
    responses={
        201: {"description": "Model version registered successfully"},
        409: {"model": ErrorResponse, "description": "Model version already exists"},
        400: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def register_model(
    model_data: ModelVersionCreate,
    current_user: User = Depends(require_admin),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelVersionResponse:
    """
    Register new model version
    
    **Authentication Required:** Admin role only (FDA compliance)
    **Permissions:** REGISTER_MODEL
    
    **Request Body:**
    - Complete model metadata including training, validation, and compliance info
    
    **Returns:**
    - Created model version with assigned UUID
    """
    try:
        logger.info(f"Registering model: {model_data.model_name} v{model_data.version}")
        model_version = service.register_model(model_data)
        
        return ModelVersionResponse.model_validate(model_version)
        
    except ModelVersionConflictException as e:
        logger.error(f"Model version conflict: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error registering model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/active",
    response_model=ModelVersionResponse,
    summary="Get active model",
    description="""
    Retrieve the currently active model in production.
    
    **Use Cases:**
    - Determine which model is serving predictions
    - Check active model version for audit
    - Verify deployment status
    
    **Returns:**
    - Complete metadata for active model
    - Performance metrics and deployment info
    """,
    responses={
        200: {"description": "Active model retrieved"},
        404: {"model": ErrorResponse, "description": "No active model found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def get_active_model(
    current_user: User = Depends(get_current_active_user),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelVersionResponse:
    """
    Get currently active production model
    
    **Authentication Required:** Any active user
    **Permissions:** READ_MODEL
    
    **Returns:**
    - Active model version details
    """
    try:
        logger.info("Retrieving active model")
        active_model = service.get_active_model()
        
        return ModelVersionResponse.model_validate(active_model)
        
    except ModelVersionNotFoundException as e:
        logger.error(f"Active model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error retrieving active model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/{model_id}",
    response_model=ModelVersionResponse,
    summary="Get model version by ID",
    description="""
    Retrieve complete metadata for a specific model version.
    
    **Returns:**
    - All model metadata including:
      - Training information and hyperparameters
      - Validation metrics and confidence intervals
      - Deployment history
      - FDA compliance status
      - Performance monitoring data
      - Responsible AI metrics
    """,
    responses={
        200: {"description": "Model version retrieved"},
        404: {"model": ErrorResponse, "description": "Model not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def get_model_by_id(
    model_id: UUID,
    current_user: User = Depends(get_current_active_user),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelVersionResponse:
    """
    Get model version by ID
    
    **Authentication Required:** Any active user
    **Permissions:** READ_MODEL
    
    **Path Parameters:**
    - model_id: UUID of model version
    
    **Returns:**
    - Complete model version metadata
    """
    try:
        logger.info(f"Retrieving model version: {model_id}")
        model_version = service.get_by_id(model_id)
        
        return ModelVersionResponse.model_validate(model_version)
        
    except ModelVersionNotFoundException as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error retrieving model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/",
    response_model=ModelVersionListResponse,
    summary="List model versions",
    description="""
    List all model versions with optional filtering.
    
    **Filters Available:**
    - **Status**: Filter by lifecycle status (development, active, deprecated, etc.)
    - **Algorithm Type**: Filter by algorithm (CNN, ensemble, etc.)
    - **Is Active**: Filter for currently active models
    
    **Pagination:**
    - Use skip/limit for pagination
    - Default: 100 models per page
    
    **Use Cases:**
    - View all models in system
    - Find models by status or type
    - Track model lifecycle
    - Audit model versions
    """,
    responses={
        200: {"description": "Models listed successfully"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def list_models(
    status: Optional[ModelStatusEnum] = Query(None, description="Filter by status"),
    algorithm_type: Optional[AlgorithmTypeEnum] = Query(None, description="Filter by algorithm type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=1000, description="Max results"),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelVersionListResponse:
    """
    List model versions with filters
    
    **Query Parameters:**
    - All filters are optional
    - Results are paginated
    
    **Returns:**
    - List of model versions
    - Total count
    """
    try:
        logger.info(f"Listing models: status={status}, type={algorithm_type}, active={is_active}")
        
        models, total = service.list_models(
            status=status,
            algorithm_type=algorithm_type,
            is_active=is_active,
            skip=skip,
            limit=limit
        )
        
        return ModelVersionListResponse(
            models=[ModelVersionResponse.model_validate(m) for m in models],
            total=total,
            skip=skip,
            limit=limit
        )
        
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/{model_id}/deploy",
    response_model=ModelVersionResponse,
    summary="Deploy model to environment",
    description="""
    Deploy a model version to specified environment.
    
    **Deployment Validation:**
    - **Production**: Requires APPROVED status and clinical validation
    - **Staging**: Requires at least internal validation
    - **Development**: No restrictions
    
    **Deployment Process:**
    1. Validates model readiness for target environment
    2. Optionally deactivates other models
    3. Updates deployment timestamp
    4. Changes status to ACTIVE
    5. Logs deployment notes
    
    **Safety:**
    - Prevents invalid production deployments
    - Maintains audit trail
    - Supports rollback capability
    """,
    responses={
        200: {"description": "Model deployed successfully"},
        400: {"model": ErrorResponse, "description": "Invalid deployment request"},
        404: {"model": ErrorResponse, "description": "Model not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def deploy_model(
    model_id: UUID,
    deployment_request: ModelDeploymentRequest,
    current_user: User = Depends(require_admin),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelVersionResponse:
    """
    Deploy model to environment
    
    **Authentication Required:** Admin role only (FDA compliance)
    **Permissions:** DEPLOY_MODEL
    
    **Path Parameters:**
    - model_id: UUID of model to deploy
    
    **Request Body:**
    - Deployment configuration
    
    **Returns:**
    - Deployed model version
    """
    try:
        logger.info(f"Deploying model {model_id} to {deployment_request.environment}")
        model_version = service.deploy_model(model_id, deployment_request)
        
        return ModelVersionResponse.model_validate(model_version)
        
    except ModelVersionNotFoundException as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvalidDeploymentException as e:
        logger.error(f"Invalid deployment: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error deploying model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/{model_id}/performance",
    response_model=ModelPerformanceTrendResponse,
    summary="Get model performance trend",
    description="""
    Retrieve performance metrics over time for continuous monitoring.
    
    **Returns:**
    - Performance logs for specified time window (default: 30 days)
    - Trend analysis (stable, improving, declining)
    - Performance alerts (drift, threshold violations)
    - Aggregated statistics
    
    **Use Cases:**
    - Monitor model performance in production
    - Detect performance degradation
    - Track prediction volume
    - Verify model stability
    
    **FDA Compliance:**
    - Post-market surveillance requirement
    - Continuous performance monitoring
    - Adverse event detection
    """,
    responses={
        200: {"description": "Performance trend retrieved"},
        404: {"model": ErrorResponse, "description": "Model not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def get_performance_trend(
    model_id: UUID,
    days: int = Query(30, ge=1, le=365, description="Days to look back"),
    current_user: User = Depends(get_current_active_user),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelPerformanceTrendResponse:
    """
    Get performance trend over time
    
    **Authentication Required:** Any active user
    **Permissions:** READ_PERFORMANCE
    
    **Path Parameters:**
    - model_id: UUID of model version
    
    **Query Parameters:**
    - days: Time window (1-365 days)
    
    **Returns:**
    - Performance logs and trend analysis
    """
    try:
        logger.info(f"Getting performance trend for model {model_id} ({days} days)")
        
        model_version, logs, trend_analysis = service.get_performance_trend(
            model_id=model_id,
            days=days
        )
        
        # Extract alerts from logs
        alerts = []
        for log in logs:
            if log.performance_alert:
                alerts.append({
                    "type": "performance",
                    "date": log.log_date,
                    "message": "Performance below threshold"
                })
            if log.drift_alert:
                alerts.append({
                    "type": "drift",
                    "date": log.log_date,
                    "message": "Distribution drift detected"
                })
        
        return ModelPerformanceTrendResponse(
            model_version_id=model_version.id,
            model_name=model_version.model_name,
            version=model_version.version,
            logs=[ModelPerformanceLogResponse.model_validate(log) for log in logs],
            trend_analysis=trend_analysis,
            alerts=alerts
        )
        
    except ModelVersionNotFoundException as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting performance trend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/{model_id}/drift",
    response_model=ModelDriftCheckResponse,
    summary="Check for performance drift",
    description="""
    Perform drift detection analysis on model performance.
    
    **Drift Detection:**
    - Compares recent performance to baseline validation metrics
    - Detects statistical degradation (default threshold: 5%)
    - Identifies affected metrics (AUC-ROC, sensitivity, specificity, etc.)
    - Generates actionable recommendations
    
    **Triggers:**
    - Scheduled checks (daily/weekly)
    - After deployment
    - Following model updates
    - Manual audit requests
    
    **Response Actions:**
    - No drift: Continue monitoring
    - Mild drift: Increase monitoring frequency
    - Significant drift: Consider retraining or rollback
    - Severe drift: Immediate investigation required
    """,
    responses={
        200: {"description": "Drift check completed"},
        404: {"model": ErrorResponse, "description": "Model not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def check_model_drift(
    model_id: UUID,
    current_user: User = Depends(require_radiologist_or_admin),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelDriftCheckResponse:
    """
    Check for performance drift
    
    **Authentication Required:** Radiologist or Admin role
    **Permissions:** CHECK_DRIFT
    
    **Path Parameters:**
    - model_id: UUID of model version
    
    **Returns:**
    - Drift detection results and recommendations
    """
    try:
        logger.info(f"Checking drift for model {model_id}")
        drift_result = service.check_drift(model_id)
        
        return ModelDriftCheckResponse(
            model_version_id=model_id,
            **drift_result
        )
        
    except ModelVersionNotFoundException as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error checking drift: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/compare",
    response_model=ModelComparisonResponse,
    summary="Compare multiple model versions",
    description="""
    Compare performance metrics across multiple model versions.
    
    **Comparison Features:**
    - Side-by-side metric comparison
    - Identify best-performing model for each metric
    - Calculate improvements/regressions
    - Generate deployment recommendation
    
    **Metrics Compared:**
    - AUC-ROC, AUC-PR
    - Sensitivity, Specificity
    - Accuracy, Precision, Recall, F1-Score
    - Inference time
    - Model size
    
    **Use Cases:**
    - Model selection for deployment
    - A/B testing results
    - Version upgrade decisions
    - Regression testing
    """,
    responses={
        200: {"description": "Comparison completed"},
        400: {"model": ErrorResponse, "description": "Invalid comparison request"},
        404: {"model": ErrorResponse, "description": "One or more models not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def compare_models(
    comparison_request: ModelComparisonRequest,
    current_user: User = Depends(get_current_active_user),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelComparisonResponse:
    """
    Compare multiple model versions
    
    **Authentication Required:** Any active user
    **Permissions:** COMPARE_MODELS
    
    **Request Body:**
    - List of model UUIDs to compare
    - Optional: specific metrics to compare
    
    **Returns:**
    - Detailed comparison with recommendations
    """
    try:
        logger.info(f"Comparing {len(comparison_request.model_version_ids)} models")
        
        comparison = service.compare_models(
            model_ids=comparison_request.model_version_ids,
            metrics_to_compare=comparison_request.metrics_to_compare
        )
        
        return ModelComparisonResponse(**comparison)
        
    except ModelVersionNotFoundException as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error comparing models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/{model_id}/deprecate",
    response_model=ModelVersionResponse,
    summary="Deprecate model version",
    description="""
    Mark model version as deprecated.
    
    **Deprecation Process:**
    1. Changes status to DEPRECATED
    2. Sets deprecation date
    3. Deactivates model (stops serving predictions)
    4. Logs deprecation reason
    5. Maintains historical record
    
    **Reasons for Deprecation:**
    - New version available
    - Performance degradation
    - Safety concerns
    - Compliance issues
    - End of lifecycle
    
    **Post-Deprecation:**
    - Model remains in database for audit
    - Performance logs retained
    - Can be reactivated if needed (rollback)
    """,
    responses={
        200: {"description": "Model deprecated successfully"},
        404: {"model": ErrorResponse, "description": "Model not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def deprecate_model(
    model_id: UUID,
    reason: Optional[str] = Query(None, description="Deprecation reason"),
    current_user: User = Depends(require_admin),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelVersionResponse:
    """
    Deprecate model version
    
    **Authentication Required:** Admin role only (FDA compliance)
    **Permissions:** DEPRECATE_MODEL
    
    **Path Parameters:**
    - model_id: UUID of model to deprecate
    
    **Query Parameters:**
    - reason: Optional deprecation reason
    
    **Returns:**
    - Deprecated model version
    """
    try:
        logger.info(f"Deprecating model {model_id}")
        model_version = service.deprecate_model(model_id, reason)
        
        return ModelVersionResponse.model_validate(model_version)
        
    except ModelVersionNotFoundException as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error deprecating model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/{model_id}/rollback",
    response_model=ModelVersionResponse,
    summary="Rollback to previous model version",
    description="""
    Rollback from current model to a previous version.
    
    **Rollback Scenarios:**
    - Performance degradation detected
    - Critical bug discovered
    - Adverse event investigation
    - Failed deployment
    - Regulatory requirement
    
    **Rollback Process:**
    1. Deactivates current model
    2. Marks current as DEPRECATED
    3. Reactivates target model
    4. Updates deployment timestamp
    5. Logs rollback event
    
    **Safety:**
    - Immediate switchover
    - No downtime
    - Audit trail maintained
    - Can rollback again if needed
    """,
    responses={
        200: {"description": "Rollback completed"},
        404: {"model": ErrorResponse, "description": "Model not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def rollback_model(
    model_id: UUID,
    target_model_id: UUID = Query(..., description="Target model UUID to roll back to"),
    current_user: User = Depends(require_admin),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelVersionResponse:
    """
    Rollback to previous model version
    
    **Authentication Required:** Admin role only (FDA compliance)
    **Permissions:** ROLLBACK_MODEL
    
    **Path Parameters:**
    - model_id: Current active model UUID
    
    **Query Parameters:**
    - target_model_id: Previous model UUID to activate
    
    **Returns:**
    - Target model version (now active)
    """
    try:
        logger.info(f"Rolling back from {model_id} to {target_model_id}")
        target_model = service.rollback_deployment(model_id, target_model_id)
        
        return ModelVersionResponse.model_validate(target_model)
        
    except ModelVersionNotFoundException as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error rolling back model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/statistics/summary",
    response_model=ModelStatistics,
    summary="Get model version statistics",
    description="""
    Get comprehensive statistics about all model versions.
    
    **Statistics Include:**
    - Total model count
    - Distribution by status (development, active, deprecated, etc.)
    - Distribution by algorithm type
    - Active models count
    - FDA cleared/approved models
    - Models in production
    - Average performance metrics
    - Latest version information
    
    **Use Cases:**
    - System monitoring dashboard
    - Management reporting
    - Compliance audits
    - Model inventory
    """,
    responses={
        200: {"description": "Statistics retrieved"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
def get_model_statistics(
    current_user: User = Depends(get_current_active_user),
    service: ModelVersionService = Depends(get_model_service)
) -> ModelStatistics:
    """
    Get comprehensive model version statistics
    
    **Authentication Required:** Any active user
    **Permissions:** READ_STATISTICS
    
    **Returns:**
    - Aggregated statistics across all models
    """
    try:
        logger.info("Generating model version statistics")
        stats = service.get_statistics()
        
        return ModelStatistics(**stats)
        
    except Exception as e:
        logger.error(f"Error generating statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
