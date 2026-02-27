"""
Model Version Tracking Utilities
FDA compliance tools for AI/ML model lifecycle management
Tracks training, validation, deployment, and monitoring
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
import hashlib
import json

from app.db.models import (
    ModelVersion,
    ModelPerformanceLog,
    AlgorithmType,
    ModelStatus,
    DeploymentEnvironment,
    ValidationStatus,
    Analysis
)


class ModelVersionManager:
    """
    Manage AI model versions for FDA compliance
    Tracks entire ML lifecycle from training to retirement
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def register_model(
        self,
        model_name: str,
        version: str,
        algorithm_type: AlgorithmType,
        validation_metrics: Dict[str, Any],
        hyperparameters: Optional[Dict[str, Any]] = None,
        training_dataset_size: Optional[int] = None,
        architecture: Optional[str] = None,
        framework: Optional[str] = None
    ) -> ModelVersion:
        """
        Register a new model version
        
        Args:
            model_name: Model identifier (e.g., "BreastCancer_DenseNet121")
            version: Semantic version (e.g., "2.1.0")
            algorithm_type: Type of algorithm
            validation_metrics: Performance metrics dict
            hyperparameters: Training hyperparameters
            training_dataset_size: Number of training samples
            architecture: Model architecture name
            framework: ML framework used
            
        Returns:
            ModelVersion instance
        """
        # Generate version hash from model params
        version_hash = self._generate_version_hash(
            model_name, version, hyperparameters
        )
        
        model_version = ModelVersion(
            model_name=model_name,
            version=version,
            version_hash=version_hash,
            algorithm_type=algorithm_type,
            architecture=architecture,
            framework=framework,
            training_date=datetime.utcnow().isoformat(),
            training_dataset_size=training_dataset_size,
            hyperparameters=hyperparameters,
            validation_metrics=validation_metrics,
            validation_status=ValidationStatus.NOT_VALIDATED,
            status=ModelStatus.DEVELOPMENT,
            is_active=False
        )
        
        self.db.add(model_version)
        self.db.commit()
        self.db.refresh(model_version)
        
        return model_version
    
    def update_validation_status(
        self,
        model_id: uuid.UUID,
        validation_status: ValidationStatus,
        external_validation_results: Optional[Dict[str, Any]] = None,
        clinical_study_id: Optional[str] = None
    ) -> ModelVersion:
        """
        Update model validation status
        
        Args:
            model_id: Model version UUID
            validation_status: New validation status
            external_validation_results: External validation metrics
            clinical_study_id: Clinical trial/study identifier
            
        Returns:
            Updated ModelVersion
        """
        model = self.db.query(ModelVersion).filter(
            ModelVersion.id == model_id
        ).first()
        
        if not model:
            raise ValueError(f"Model {model_id} not found")
        
        model.validation_status = validation_status
        
        if external_validation_results:
            model.external_validation_results = external_validation_results
        
        if clinical_study_id:
            model.clinical_study_id = clinical_study_id
        
        # Auto-update status based on validation
        if validation_status in [
            ValidationStatus.CLINICAL_VALIDATION,
            ValidationStatus.FDA_CLEARED,
            ValidationStatus.FDA_APPROVED
        ]:
            model.status = ModelStatus.APPROVED
        
        self.db.commit()
        self.db.refresh(model)
        
        return model
    
    def deploy_model(
        self,
        model_id: uuid.UUID,
        environment: DeploymentEnvironment,
        make_active: bool = True
    ) -> ModelVersion:
        """
        Deploy model to specified environment
        
        Args:
            model_id: Model version UUID
            environment: Deployment environment
            make_active: Set as active model for inference
            
        Returns:
            Updated ModelVersion
        """
        model = self.db.query(ModelVersion).filter(
            ModelVersion.id == model_id
        ).first()
        
        if not model:
            raise ValueError(f"Model {model_id} not found")
        
        # Check if model is ready for production
        if environment == DeploymentEnvironment.PRODUCTION:
            if not model.is_production_ready:
                raise ValueError(
                    f"Model not ready for production. Status: {model.status}, "
                    f"Validation: {model.validation_status}"
                )
        
        model.deployment_environment = environment
        model.deployment_date = datetime.utcnow().isoformat()
        model.status = ModelStatus.ACTIVE
        
        if make_active:
            # Deactivate other models with same name
            self.db.query(ModelVersion).filter(
                ModelVersion.model_name == model.model_name,
                ModelVersion.id != model_id
            ).update({"is_active": False})
            
            model.is_active = True
        
        self.db.commit()
        self.db.refresh(model)
        
        return model
    
    def deprecate_model(
        self,
        model_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> ModelVersion:
        """
        Mark model as deprecated (being phased out)
        
        Args:
            model_id: Model version UUID
            reason: Reason for deprecation
            
        Returns:
            Updated ModelVersion
        """
        model = self.db.query(ModelVersion).filter(
            ModelVersion.id == model_id
        ).first()
        
        if not model:
            raise ValueError(f"Model {model_id} not found")
        
        model.status = ModelStatus.DEPRECATED
        model.deprecation_date = datetime.utcnow().isoformat()
        model.is_active = False
        
        if reason:
            if not model.known_issues:
                model.known_issues = []
            model.known_issues.append({
                "type": "deprecation",
                "reason": reason,
                "date": datetime.utcnow().isoformat()
            })
        
        self.db.commit()
        self.db.refresh(model)
        
        return model
    
    def retire_model(
        self,
        model_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> ModelVersion:
        """
        Retire model (no longer used)
        
        Args:
            model_id: Model version UUID
            reason: Reason for retirement
            
        Returns:
            Updated ModelVersion
        """
        model = self.db.query(ModelVersion).filter(
            ModelVersion.id == model_id
        ).first()
        
        if not model:
            raise ValueError(f"Model {model_id} not found")
        
        model.status = ModelStatus.RETIRED
        model.retirement_date = datetime.utcnow().isoformat()
        model.is_active = False
        
        if reason:
            model.release_notes = (
                f"{model.release_notes or ''}\n\n"
                f"RETIRED: {datetime.utcnow().isoformat()}\n"
                f"Reason: {reason}"
            )
        
        self.db.commit()
        self.db.refresh(model)
        
        return model
    
    def get_active_model(self, model_name: str) -> Optional[ModelVersion]:
        """Get currently active model by name"""
        return self.db.query(ModelVersion).filter(
            ModelVersion.model_name == model_name,
            ModelVersion.is_active == True
        ).first()
    
    def get_model_by_version(
        self,
        model_name: str,
        version: str
    ) -> Optional[ModelVersion]:
        """Get specific model version"""
        return self.db.query(ModelVersion).filter(
            ModelVersion.model_name == model_name,
            ModelVersion.version == version
        ).first()
    
    def compare_models(
        self,
        model_id_1: uuid.UUID,
        model_id_2: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Compare two model versions
        
        Returns:
            Comparison results dict
        """
        model1 = self.db.query(ModelVersion).filter(
            ModelVersion.id == model_id_1
        ).first()
        model2 = self.db.query(ModelVersion).filter(
            ModelVersion.id == model_id_2
        ).first()
        
        if not model1 or not model2:
            raise ValueError("One or both models not found")
        
        comparison = {
            "model1": {
                "name": model1.model_name,
                "version": model1.version,
                "metrics": model1.validation_metrics
            },
            "model2": {
                "name": model2.model_name,
                "version": model2.version,
                "metrics": model2.validation_metrics
            },
            "metric_differences": {}
        }
        
        # Calculate metric differences
        for metric_name in model1.validation_metrics.keys():
            if metric_name in model2.validation_metrics:
                val1 = model1.validation_metrics[metric_name]
                val2 = model2.validation_metrics[metric_name]
                
                if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                    diff = val2 - val1
                    pct_change = (diff / val1 * 100) if val1 != 0 else 0
                    
                    comparison["metric_differences"][metric_name] = {
                        "model1": val1,
                        "model2": val2,
                        "difference": diff,
                        "percent_change": round(pct_change, 2)
                    }
        
        return comparison
    
    def _generate_version_hash(
        self,
        model_name: str,
        version: str,
        hyperparameters: Optional[Dict[str, Any]]
    ) -> str:
        """Generate unique hash for model version"""
        hash_input = f"{model_name}_{version}"
        if hyperparameters:
            hash_input += json.dumps(hyperparameters, sort_keys=True)
        
        return hashlib.sha256(hash_input.encode()).hexdigest()


class ModelPerformanceMonitor:
    """
    Monitor model performance in production
    Track drift, degradation, and real-world metrics
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_performance(
        self,
        model_version_id: uuid.UUID,
        log_date: str,
        metrics: Dict[str, Any],
        total_predictions: int,
        avg_confidence: Optional[float] = None,
        avg_inference_time_ms: Optional[float] = None,
        feedback_received: int = 0,
        agreement_rate: Optional[float] = None
    ) -> ModelPerformanceLog:
        """
        Log model performance for a time period
        
        Args:
            model_version_id: Model version UUID
            log_date: Date of measurement (ISO format)
            metrics: Performance metrics dict
            total_predictions: Number of predictions made
            avg_confidence: Average confidence score
            avg_inference_time_ms: Average processing time
            feedback_received: Number of feedback entries
            agreement_rate: Agreement with radiologist
            
        Returns:
            ModelPerformanceLog instance
        """
        log = ModelPerformanceLog(
            model_version_id=model_version_id,
            log_date=log_date,
            metrics=metrics,
            total_predictions=total_predictions,
            avg_confidence=avg_confidence,
            avg_inference_time_ms=avg_inference_time_ms,
            feedback_received=feedback_received,
            agreement_rate=agreement_rate
        )
        
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        
        # Check for performance degradation
        self._check_performance_drift(model_version_id, log)
        
        return log
    
    def calculate_daily_metrics(
        self,
        model_version_id: uuid.UUID,
        date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate performance metrics for a specific day
        Queries Analysis and Feedback tables
        
        Args:
            model_version_id: Model version UUID
            date: Date to calculate (defaults to today)
            
        Returns:
            Metrics dictionary
        """
        if not date:
            date = datetime.utcnow().date().isoformat()
        
        # Get model version
        model = self.db.query(ModelVersion).filter(
            ModelVersion.id == model_version_id
        ).first()
        
        if not model:
            raise ValueError(f"Model {model_version_id} not found")
        
        # Query analyses for this model and date
        analyses = self.db.query(Analysis).filter(
            Analysis.model_version == f"{model.model_name}_v{model.version}",
            func.date(Analysis.created_at) == date
        ).all()
        
        if not analyses:
            return {
                "total_predictions": 0,
                "message": "No predictions for this date"
            }
        
        # Calculate metrics
        total = len(analyses)
        confidences = [a.confidence_score for a in analyses]
        processing_times = [a.processing_time_ms for a in analyses if a.processing_time_ms]
        
        # Count feedback
        feedback_count = sum(1 for a in analyses if len(a.feedback) > 0)
        
        # Calculate agreement rate
        agreements = 0
        total_feedback = 0
        for analysis in analyses:
            for fb in analysis.feedback:
                total_feedback += 1
                if fb.diagnosis_type.value == analysis.prediction_class.value:
                    agreements += 1
        
        agreement_rate = agreements / total_feedback if total_feedback > 0 else None
        
        metrics = {
            "total_predictions": total,
            "avg_confidence": sum(confidences) / len(confidences),
            "min_confidence": min(confidences),
            "max_confidence": max(confidences),
            "avg_inference_time_ms": sum(processing_times) / len(processing_times) if processing_times else None,
            "feedback_received": feedback_count,
            "feedback_rate": feedback_count / total,
            "agreement_rate": agreement_rate,
            "date": date
        }
        
        return metrics
    
    def detect_drift(
        self,
        model_version_id: uuid.UUID,
        baseline_window_days: int = 30,
        current_window_days: int = 7,
        threshold: float = 0.05
    ) -> Dict[str, Any]:
        """
        Detect performance drift by comparing current vs baseline
        
        Args:
            model_version_id: Model version UUID
            baseline_window_days: Days for baseline calculation
            current_window_days: Days for current performance
            threshold: Acceptable performance drop (e.g., 0.05 = 5%)
            
        Returns:
            Drift detection results
        """
        now = datetime.utcnow().date()
        baseline_start = now - timedelta(days=baseline_window_days)
        current_start = now - timedelta(days=current_window_days)
        
        # Get performance logs
        baseline_logs = self.db.query(ModelPerformanceLog).filter(
            ModelPerformanceLog.model_version_id == model_version_id,
            ModelPerformanceLog.log_date >= baseline_start.isoformat(),
            ModelPerformanceLog.log_date < current_start.isoformat()
        ).all()
        
        current_logs = self.db.query(ModelPerformanceLog).filter(
            ModelPerformanceLog.model_version_id == model_version_id,
            ModelPerformanceLog.log_date >= current_start.isoformat()
        ).all()
        
        if not baseline_logs or not current_logs:
            return {
                "drift_detected": False,
                "message": "Insufficient data for drift detection"
            }
        
        # Calculate average metrics
        baseline_conf = sum(log.avg_confidence for log in baseline_logs if log.avg_confidence) / len(baseline_logs)
        current_conf = sum(log.avg_confidence for log in current_logs if log.avg_confidence) / len(current_logs)
        
        confidence_drop = baseline_conf - current_conf
        drift_detected = confidence_drop > threshold
        
        return {
            "drift_detected": drift_detected,
            "baseline_confidence": baseline_conf,
            "current_confidence": current_conf,
            "confidence_drop": confidence_drop,
            "threshold": threshold,
            "baseline_window_days": baseline_window_days,
            "current_window_days": current_window_days
        }
    
    def get_performance_trend(
        self,
        model_version_id: uuid.UUID,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get performance trend over time
        
        Args:
            model_version_id: Model version UUID
            days: Number of days to retrieve
            
        Returns:
            List of daily performance metrics
        """
        start_date = (datetime.utcnow().date() - timedelta(days=days)).isoformat()
        
        logs = self.db.query(ModelPerformanceLog).filter(
            ModelPerformanceLog.model_version_id == model_version_id,
            ModelPerformanceLog.log_date >= start_date
        ).order_by(ModelPerformanceLog.log_date).all()
        
        trend = []
        for log in logs:
            trend.append({
                "date": log.log_date,
                "predictions": log.total_predictions,
                "avg_confidence": log.avg_confidence,
                "agreement_rate": log.agreement_rate,
                "performance_alert": log.performance_alert,
                "drift_alert": log.drift_alert
            })
        
        return trend
    
    def _check_performance_drift(
        self,
        model_version_id: uuid.UUID,
        current_log: ModelPerformanceLog
    ):
        """
        Check if current performance indicates drift
        Updates model version if drift detected
        """
        drift_result = self.detect_drift(model_version_id)
        
        if drift_result.get("drift_detected"):
            current_log.drift_alert = True
            
            # Update model version
            model = self.db.query(ModelVersion).filter(
                ModelVersion.id == model_version_id
            ).first()
            
            if model:
                model.performance_drift_detected = True
                model.last_drift_check_date = datetime.utcnow().isoformat()
                
                if not model.known_issues:
                    model.known_issues = []
                
                model.known_issues.append({
                    "type": "performance_drift",
                    "detected_date": datetime.utcnow().isoformat(),
                    "details": drift_result
                })
        
        self.db.commit()


# Convenience functions
def get_active_model_version(db: Session, model_name: str) -> Optional[str]:
    """Get version string of active model"""
    manager = ModelVersionManager(db)
    model = manager.get_active_model(model_name)
    return f"{model.model_name}_v{model.version}" if model else None
