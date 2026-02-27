"""
Model Version Service Layer

This module provides business logic for AI/ML model version management,
including registration, deployment, performance monitoring, drift detection,
and FDA compliance tracking.

Standards:
- FDA 21 CFR Part 820 (SaMD QSR)
- FDA 21 CFR Part 11 (Electronic Records)
- ISO 13485 (Medical Device QMS)
"""

from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import logging
import hashlib
import json

from app.db.models.model_version import (
    ModelVersion,
    ModelPerformanceLog,
    AlgorithmType,
    ModelStatus,
    DeploymentEnvironment,
    ValidationStatus
)
from app.schemas.models import (
    ModelVersionCreate,
    ModelVersionUpdate,
    ModelDeploymentRequest,
    ModelPerformanceLogCreate
)

logger = logging.getLogger(__name__)


# ============================================================================
# CUSTOM EXCEPTIONS
# ============================================================================

class ModelVersionNotFoundException(Exception):
    """Raised when model version is not found"""
    pass


class ModelVersionConflictException(Exception):
    """Raised when model version already exists"""
    pass


class InvalidDeploymentException(Exception):
    """Raised when deployment is not allowed"""
    pass


class PerformanceDriftException(Exception):
    """Raised when performance drift is detected"""
    pass


class ModelVersionServiceException(Exception):
    """Base exception for model version service errors"""
    pass


# ============================================================================
# SERVICE CLASS
# ============================================================================

class ModelVersionService:
    """
    Service for managing AI/ML model versions
    
    Provides:
    - Model version registration and lifecycle management
    - Deployment to different environments
    - Performance monitoring and drift detection
    - Model comparison and statistics
    - FDA compliance tracking
    """
    
    def __init__(self, db: Session):
        """
        Initialize service with database session
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        
    # ========================================================================
    # CREATE OPERATIONS
    # ========================================================================
    
    def register_model(self, model_data: ModelVersionCreate) -> ModelVersion:
        """
        Register a new model version
        
        Args:
            model_data: Model version creation data
            
        Returns:
            Created ModelVersion instance
            
        Raises:
            ModelVersionConflictException: If model name+version exists
            ModelVersionServiceException: For other errors
        """
        try:
            # Check if this version already exists
            existing = self.db.query(ModelVersion).filter(
                and_(
                    ModelVersion.model_name == model_data.model_name,
                    ModelVersion.version == model_data.version
                )
            ).first()
            
            if existing:
                raise ModelVersionConflictException(
                    f"Model version already exists: {model_data.model_name} v{model_data.version}"
                )
            
            # Generate version hash
            version_hash = self._generate_version_hash(
                model_data.model_name,
                model_data.version,
                model_data.hyperparameters
            )
            
            # Create model version
            model_version = ModelVersion(
                model_name=model_data.model_name,
                version=model_data.version,
                version_hash=version_hash,
                algorithm_type=model_data.algorithm_type.value,
                architecture=model_data.architecture,
                framework=model_data.framework,
                training_date=datetime.utcnow().isoformat(),
                training_duration_hours=model_data.training_duration_hours,
                training_dataset_size=model_data.training_dataset_size,
                training_dataset_version=model_data.training_dataset_version,
                hyperparameters=model_data.hyperparameters,
                validation_metrics=model_data.validation_metrics,
                confidence_intervals=model_data.confidence_intervals,
                subgroup_performance=model_data.subgroup_performance,
                validation_status=model_data.validation_status.value,
                clinical_study_id=model_data.clinical_study_id,
                fda_approval_status=model_data.fda_approval_status,
                intended_use=model_data.intended_use,
                indications_for_use=model_data.indications_for_use,
                contraindications=model_data.contraindications,
                release_notes=model_data.release_notes,
                known_issues=model_data.known_issues,
                fairness_metrics=model_data.fairness_metrics,
                explainability_method=model_data.explainability_method,
                uncertainty_quantification=model_data.uncertainty_quantification,
                developed_by=model_data.developed_by,
                contact_email=model_data.contact_email,
                status=ModelStatus.DEVELOPMENT.value,
                is_active=False
            )
            
            self.db.add(model_version)
            self.db.commit()
            self.db.refresh(model_version)
            
            logger.info(f"Registered model version: {model_version.model_name} v{model_version.version}")
            return model_version
            
        except ModelVersionConflictException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error registering model version: {e}")
            raise ModelVersionServiceException(f"Failed to register model: {str(e)}")
    
    # ========================================================================
    # READ OPERATIONS
    # ========================================================================
    
    def get_by_id(self, model_id: UUID) -> ModelVersion:
        """
        Retrieve model version by ID
        
        Args:
            model_id: Model version UUID
            
        Returns:
            ModelVersion instance
            
        Raises:
            ModelVersionNotFoundException: If not found
        """
        model_version = self.db.query(ModelVersion).filter(
            ModelVersion.id == model_id
        ).first()
        
        if not model_version:
            raise ModelVersionNotFoundException(f"Model version not found: {model_id}")
        
        return model_version
    
    def get_active_model(self) -> ModelVersion:
        """
        Get currently active production model
        
        Returns:
            Active ModelVersion instance
            
        Raises:
            ModelVersionNotFoundException: If no active model
        """
        active_model = self.db.query(ModelVersion).filter(
            and_(
                ModelVersion.is_active == True,
                ModelVersion.status == ModelStatus.ACTIVE.value
            )
        ).first()
        
        if not active_model:
            raise ModelVersionNotFoundException("No active model in production")
        
        return active_model
    
    def list_models(
        self,
        status: Optional[ModelStatus] = None,
        algorithm_type: Optional[AlgorithmType] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ModelVersion], int]:
        """
        List model versions with filters
        
        Args:
            status: Filter by status
            algorithm_type: Filter by algorithm type
            is_active: Filter by active status
            skip: Pagination offset
            limit: Max results
            
        Returns:
            Tuple of (list of models, total count)
        """
        query = self.db.query(ModelVersion)
        
        # Apply filters
        if status:
            query = query.filter(ModelVersion.status == status.value)
        
        if algorithm_type:
            query = query.filter(ModelVersion.algorithm_type == algorithm_type.value)
        
        if is_active is not None:
            query = query.filter(ModelVersion.is_active == is_active)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        models = query.order_by(
            desc(ModelVersion.created_at)
        ).offset(skip).limit(limit).all()
        
        logger.info(f"Listed {len(models)} model versions (total: {total})")
        return models, total
    
    # ========================================================================
    # UPDATE OPERATIONS
    # ========================================================================
    
    def update_model(self, model_id: UUID, update_data: ModelVersionUpdate) -> ModelVersion:
        """
        Update model version
        
        Args:
            model_id: Model version UUID
            update_data: Update data
            
        Returns:
            Updated ModelVersion instance
        """
        model_version = self.get_by_id(model_id)
        
        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if hasattr(model_version, key):
                # Convert enums to values
                if isinstance(value, (ModelStatus, ValidationStatus, DeploymentEnvironment)):
                    value = value.value
                setattr(model_version, key, value)
        
        model_version.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(model_version)
        
        logger.info(f"Updated model version: {model_id}")
        return model_version
    
    def deploy_model(
        self,
        model_id: UUID,
        deployment_request: ModelDeploymentRequest
    ) -> ModelVersion:
        """
        Deploy model to specified environment
        
        Args:
            model_id: Model version UUID
            deployment_request: Deployment configuration
            
        Returns:
            Deployed ModelVersion instance
            
        Raises:
            InvalidDeploymentException: If deployment not allowed
        """
        model_version = self.get_by_id(model_id)
        
        # Validate deployment readiness
        if deployment_request.environment == DeploymentEnvironment.PRODUCTION:
            if model_version.status not in [ModelStatus.APPROVED.value, ModelStatus.ACTIVE.value]:
                raise InvalidDeploymentException(
                    f"Model must be APPROVED before production deployment (current: {model_version.status})"
                )
            
            if model_version.validation_status not in [
                ValidationStatus.CLINICAL_VALIDATION.value,
                ValidationStatus.FDA_CLEARED.value,
                ValidationStatus.FDA_APPROVED.value
            ]:
                raise InvalidDeploymentException(
                    f"Model must have clinical validation before production (current: {model_version.validation_status})"
                )
        
        # If setting as active, deactivate other models
        if deployment_request.set_as_active:
            self.db.query(ModelVersion).filter(
                ModelVersion.is_active == True
            ).update({"is_active": False})
        
        # Update model
        model_version.deployment_environment = deployment_request.environment.value
        model_version.deployment_date = datetime.utcnow().isoformat()
        model_version.status = ModelStatus.ACTIVE.value
        model_version.is_active = deployment_request.set_as_active
        
        if deployment_request.deployment_notes:
            # Append to release notes
            notes = model_version.release_notes or ""
            notes += f"\n\n[Deployment {datetime.utcnow().isoformat()}]\n{deployment_request.deployment_notes}"
            model_version.release_notes = notes
        
        self.db.commit()
        self.db.refresh(model_version)
        
        logger.info(f"Deployed model {model_id} to {deployment_request.environment}")
        return model_version
    
    def deprecate_model(self, model_id: UUID, reason: Optional[str] = None) -> ModelVersion:
        """
        Mark model for deprecation
        
        Args:
            model_id: Model version UUID
            reason: Deprecation reason
            
        Returns:
            Deprecated ModelVersion instance
        """
        model_version = self.get_by_id(model_id)
        
        model_version.status = ModelStatus.DEPRECATED.value
        model_version.deprecation_date = datetime.utcnow().isoformat()
        model_version.is_active = False
        
        if reason:
            notes = model_version.release_notes or ""
            notes += f"\n\n[Deprecated {datetime.utcnow().isoformat()}]\n{reason}"
            model_version.release_notes = notes
        
        self.db.commit()
        self.db.refresh(model_version)
        
        logger.info(f"Deprecated model: {model_id}")
        return model_version
    
    def rollback_deployment(self, current_model_id: UUID, target_model_id: UUID) -> ModelVersion:
        """
        Rollback to previous model version
        
        Args:
            current_model_id: Current active model UUID
            target_model_id: Target model to roll back to
            
        Returns:
            Target ModelVersion instance (now active)
        """
        current_model = self.get_by_id(current_model_id)
        target_model = self.get_by_id(target_model_id)
        
        # Deactivate current
        current_model.is_active = False
        current_model.status = ModelStatus.DEPRECATED.value
        
        # Activate target
        target_model.is_active = True
        target_model.status = ModelStatus.ACTIVE.value
        target_model.deployment_date = datetime.utcnow().isoformat()
        
        self.db.commit()
        self.db.refresh(target_model)
        
        logger.info(f"Rolled back from {current_model_id} to {target_model_id}")
        return target_model
    
    # ========================================================================
    # PERFORMANCE MONITORING
    # ========================================================================
    
    def log_performance(self, log_data: ModelPerformanceLogCreate) -> ModelPerformanceLog:
        """
        Log performance metrics for a model version
        
        Args:
            log_data: Performance log data
            
        Returns:
            Created ModelPerformanceLog instance
        """
        # Verify model exists
        self.get_by_id(log_data.model_version_id)
        
        perf_log = ModelPerformanceLog(
            model_version_id=log_data.model_version_id,
            log_date=log_data.log_date,
            measurement_window_days=log_data.measurement_window_days,
            metrics=log_data.metrics,
            total_predictions=log_data.total_predictions,
            avg_confidence=log_data.avg_confidence,
            avg_inference_time_ms=log_data.avg_inference_time_ms,
            feedback_received=log_data.feedback_received,
            agreement_rate=log_data.agreement_rate,
            performance_alert=log_data.performance_alert,
            drift_alert=log_data.drift_alert,
            notes=log_data.notes
        )
        
        self.db.add(perf_log)
        self.db.commit()
        self.db.refresh(perf_log)
        
        logger.info(f"Logged performance for model {log_data.model_version_id}")
        return perf_log
    
    def get_performance_trend(
        self,
        model_id: UUID,
        days: int = 30
    ) -> Tuple[ModelVersion, List[ModelPerformanceLog], Dict[str, Any]]:
        """
        Get performance trend over time
        
        Args:
            model_id: Model version UUID
            days: Number of days to look back
            
        Returns:
            Tuple of (model, logs, trend_analysis)
        """
        model_version = self.get_by_id(model_id)
        
        # Get performance logs
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        logs = self.db.query(ModelPerformanceLog).filter(
            and_(
                ModelPerformanceLog.model_version_id == model_id,
                ModelPerformanceLog.log_date >= cutoff_date
            )
        ).order_by(ModelPerformanceLog.log_date).all()
        
        # Analyze trend
        trend_analysis = self._analyze_trend(logs, model_version.validation_metrics)
        
        return model_version, logs, trend_analysis
    
    def check_drift(self, model_id: UUID) -> Dict[str, Any]:
        """
        Check for performance drift
        
        Args:
            model_id: Model version UUID
            
        Returns:
            Drift detection results
        """
        model_version = self.get_by_id(model_id)
        
        # Get recent performance (last 30 days)
        recent_logs = self.db.query(ModelPerformanceLog).filter(
            and_(
                ModelPerformanceLog.model_version_id == model_id,
                ModelPerformanceLog.log_date >= (datetime.utcnow() - timedelta(days=30)).isoformat()
            )
        ).all()
        
        if not recent_logs:
            return {
                "drift_detected": False,
                "drift_score": 0.0,
                "drift_threshold": 0.05,
                "affected_metrics": [],
                "recommendation": "Insufficient data for drift detection",
                "last_check_date": datetime.utcnow().isoformat()
            }
        
        # Calculate drift
        drift_result = self._calculate_drift(
            model_version.validation_metrics,
            recent_logs
        )
        
        # Update model
        model_version.performance_drift_detected = drift_result["drift_detected"]
        model_version.last_drift_check_date = datetime.utcnow().isoformat()
        self.db.commit()
        
        return drift_result
    
    # ========================================================================
    # COMPARISON & ANALYTICS
    # ========================================================================
    
    def compare_models(
        self,
        model_ids: List[UUID],
        metrics_to_compare: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Compare multiple model versions
        
        Args:
            model_ids: List of model version UUIDs
            metrics_to_compare: Specific metrics to compare
            
        Returns:
            Comparison results
        """
        models = [self.get_by_id(model_id) for model_id in model_ids]
        
        # Default metrics
        if not metrics_to_compare:
            metrics_to_compare = ["auc_roc", "sensitivity", "specificity", "accuracy"]
        
        # Build comparison
        comparison = {
            "models": [],
            "comparison_summary": {},
            "recommendation": None
        }
        
        for model in models:
            model_data = {
                "id": str(model.id),
                "model_name": model.model_name,
                "version": model.version,
                "status": model.status,
                "metrics": {}
            }
            
            for metric in metrics_to_compare:
                value = model.validation_metrics.get(metric) if model.validation_metrics else None
                model_data["metrics"][metric] = value
            
            comparison["models"].append(model_data)
        
        # Find best for each metric
        for metric in metrics_to_compare:
            best_model = max(
                comparison["models"],
                key=lambda m: m["metrics"].get(metric) or 0
            )
            comparison["comparison_summary"][f"best_{metric}"] = best_model["version"]
        
        # Generate recommendation
        comparison["recommendation"] = self._generate_recommendation(comparison["models"])
        
        return comparison
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics about model versions
        
        Returns:
            Statistics dictionary
        """
        total_models = self.db.query(func.count(ModelVersion.id)).scalar()
        
        # By status
        status_stats = self.db.query(
            ModelVersion.status,
            func.count(ModelVersion.id)
        ).group_by(ModelVersion.status).all()
        by_status = {status: count for status, count in status_stats}
        
        # By algorithm type
        algo_stats = self.db.query(
            ModelVersion.algorithm_type,
            func.count(ModelVersion.id)
        ).group_by(ModelVersion.algorithm_type).all()
        by_algorithm_type = {algo: count for algo, count in algo_stats}
        
        # Active models
        active_models = self.db.query(func.count(ModelVersion.id)).filter(
            ModelVersion.is_active == True
        ).scalar()
        
        # FDA cleared
        fda_cleared = self.db.query(func.count(ModelVersion.id)).filter(
            ModelVersion.fda_clearance_number.isnot(None)
        ).scalar()
        
        # Production models
        production_models = self.db.query(func.count(ModelVersion.id)).filter(
            ModelVersion.deployment_environment == DeploymentEnvironment.PRODUCTION.value
        ).scalar()
        
        # Average AUC-ROC (from validation_metrics JSON)
        # This requires extracting from JSONB which varies by DB
        # For simplicity, we'll skip or do a rough calculation
        
        # Latest version
        latest = self.db.query(ModelVersion).order_by(
            desc(ModelVersion.created_at)
        ).first()
        
        return {
            "total_models": total_models or 0,
            "by_status": by_status,
            "by_algorithm_type": by_algorithm_type,
            "active_models": active_models or 0,
            "fda_cleared_models": fda_cleared or 0,
            "models_in_production": production_models or 0,
            "avg_auc_roc": None,  # Would need complex query
            "latest_version": latest.version if latest else None
        }
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    @staticmethod
    def _generate_version_hash(
        model_name: str,
        version: str,
        hyperparameters: Optional[Dict[str, Any]]
    ) -> str:
        """Generate unique hash for model version"""
        data = f"{model_name}:{version}:{json.dumps(hyperparameters or {}, sort_keys=True)}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    @staticmethod
    def _analyze_trend(
        logs: List[ModelPerformanceLog],
        baseline_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze performance trend"""
        if not logs:
            return {"trend": "insufficient_data", "alerts": []}
        
        # Calculate average metrics over period
        total_preds = sum(log.total_predictions for log in logs)
        avg_confidence = sum(log.avg_confidence or 0 for log in logs) / len(logs) if logs else 0
        
        # Check for alerts
        alerts = []
        drift_alerts = [log for log in logs if log.drift_alert]
        perf_alerts = [log for log in logs if log.performance_alert]
        
        if drift_alerts:
            alerts.append({
                "type": "drift",
                "count": len(drift_alerts),
                "message": "Performance drift detected"
            })
        
        if perf_alerts:
            alerts.append({
                "type": "performance",
                "count": len(perf_alerts),
                "message": "Performance below threshold"
            })
        
        return {
            "trend": "stable" if not alerts else "declining",
            "total_predictions": total_preds,
            "avg_confidence": round(avg_confidence, 3),
            "alerts": alerts
        }
    
    @staticmethod
    def _calculate_drift(
        baseline_metrics: Dict[str, Any],
        recent_logs: List[ModelPerformanceLog]
    ) -> Dict[str, Any]:
        """Calculate performance drift"""
        if not recent_logs:
            return {
                "drift_detected": False,
                "drift_score": 0.0,
                "affected_metrics": []
            }
        
        # Simple drift calculation: compare average recent performance to baseline
        drift_threshold = 0.05  # 5% degradation threshold
        
        # Calculate average from recent logs
        avg_metrics = {}
        metric_keys = ["auc_roc", "sensitivity", "specificity", "accuracy"]
        
        for key in metric_keys:
            values = []
            for log in recent_logs:
                if log.metrics and key in log.metrics:
                    values.append(log.metrics[key])
            
            if values:
                avg_metrics[key] = sum(values) / len(values)
        
        # Compare to baseline
        affected_metrics = []
        max_drift = 0.0
        
        for key, current_value in avg_metrics.items():
            baseline_value = baseline_metrics.get(key)
            if baseline_value:
                drift = baseline_value - current_value
                if drift > drift_threshold:
                    affected_metrics.append(key)
                    max_drift = max(max_drift, drift)
        
        drift_detected = len(affected_metrics) > 0
        
        recommendation = "No action required"
        if drift_detected:
            recommendation = f"Performance degradation detected in {', '.join(affected_metrics)}. Consider retraining or rollback."
        
        return {
            "drift_detected": drift_detected,
            "drift_score": round(max_drift, 4),
            "drift_threshold": drift_threshold,
            "affected_metrics": affected_metrics,
            "recommendation": recommendation,
            "last_check_date": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def _generate_recommendation(models: List[Dict[str, Any]]) -> str:
        """Generate deployment recommendation"""
        # Simple logic: recommend model with highest AUC-ROC
        best_model = max(
            models,
            key=lambda m: m["metrics"].get("auc_roc") or 0
        )
        
        return f"Recommend deploying {best_model['model_name']} {best_model['version']} (highest AUC-ROC)"
