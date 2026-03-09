"""
AI Inference Service for Breast Cancer Detection
Handles model loading, caching, inference execution, and result management
"""

import asyncio
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.db.models.image import Image
from app.db.models.analysis import Analysis
from app.db.models.model_version import ModelVersion
from app.models.inference import get_model_inference, BaseModelInference


class InferenceService:
    """
    Service class for AI inference operations
    Manages model lifecycle, prediction execution, and result persistence
    """
    
    def __init__(self):
        """Initialize inference service"""
        self._model_cache: Dict[str, BaseModelInference] = {}
        self._default_model: Optional[BaseModelInference] = None
        logger.info("Inference service initialized")
    
    def get_model(self, model_version: Optional[str] = None) -> BaseModelInference:
        """
        Get model instance (cached or newly loaded)
        
        Args:
            model_version: Specific model version to load (default: latest active)
            
        Returns:
            Model inference instance
        """
        # Use default model if no version specified
        if model_version is None:
            if self._default_model is None:
                self._default_model = get_model_inference()
                logger.info("Loaded default model")
            return self._default_model
        
        # Check cache
        if model_version in self._model_cache:
            logger.debug(f"Model {model_version} retrieved from cache")
            return self._model_cache[model_version]
        
        # Load and cache model
        model = get_model_inference(version=model_version)
        self._model_cache[model_version] = model
        logger.info(f"Loaded and cached model version: {model_version}")
        
        return model
    
    async def predict_single_image(
        self,
        image_array: np.ndarray,
        image_id: Optional[int] = None,
        db: Optional[Session] = None,
        model_version: Optional[str] = None,
        save_result: bool = False
    ) -> Dict[str, Any]:
        """
        Run inference on single mammogram image
        
        Args:
            image_array: Preprocessed image array (224, 224, 1)
            image_id: Database image ID (optional)
            db: Database session for saving results
            model_version: Specific model version to use
            save_result: Whether to save prediction to database
            
        Returns:
            Comprehensive prediction result dictionary
        """
        inference_start = time.time()
        
        try:
            # Get model
            model = self.get_model(model_version)
            
            # Validate model is loaded
            if not model.is_loaded():
                raise ValueError("Model not properly loaded")
            
            # Run inference — offload CPU-bound model.predict() to a thread
            # so the async event loop stays free for concurrent requests.
            # Without this, 4 concurrent image requests are serialized because
            # the synchronous model.predict() blocks the single uvicorn worker.
            logger.debug(f"Running inference on image_id={image_id}")
            prediction = await asyncio.to_thread(model.predict, image_array)
            
            # Calculate metrics
            inference_time_ms = (time.time() - inference_start) * 1000
            
            # Enrich prediction with metadata
            result = {
                **prediction,
                "case_id": f"case_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}",
                "image_id": image_id,
                "model_version": getattr(model, 'model_version', 'unknown'),
                "inference_time_ms": inference_time_ms,
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            # Save to database if requested
            if save_result and db and image_id:
                await self._save_prediction_result(result, db, image_id)
            
            logger.info(
                f"Inference complete: image_id={image_id}, "
                f"prediction={result['prediction']}, "
                f"confidence={result['confidence']:.2%}, "
                f"time={inference_time_ms:.2f}ms"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Inference failed for image_id={image_id}: {str(e)}")
            raise
    
    async def predict_bilateral(
        self,
        left_cc_array: np.ndarray,
        right_cc_array: np.ndarray,
        left_mlo_array: np.ndarray,
        right_mlo_array: np.ndarray,
        image_ids: Optional[Dict[str, int]] = None,
        db: Optional[Session] = None,
        model_version: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Run inference on bilateral mammogram study (4 views)
        
        Args:
            left_cc_array: Left CC view preprocessed array
            right_cc_array: Right CC view preprocessed array
            left_mlo_array: Left MLO view preprocessed array
            right_mlo_array: Right MLO view preprocessed array
            image_ids: Dictionary mapping view names to image IDs
            db: Database session
            model_version: Specific model version to use
            
        Returns:
            Comprehensive bilateral analysis result
        """
        inference_start = time.time()
        image_ids = image_ids or {}
        
        try:
            # Get model
            model = self.get_model(model_version)
            
            # Run inference on each view
            logger.info("Running bilateral inference on 4 views")
            
            predictions = {}
            views = {
                "left_cc": left_cc_array,
                "right_cc": right_cc_array,
                "left_mlo": left_mlo_array,
                "right_mlo": right_mlo_array
            }
            
            for view_name, array in views.items():
                pred = await asyncio.to_thread(model.predict, array)
                predictions[view_name] = {
                    **pred,
                    "image_id": image_ids.get(view_name),
                    "view": view_name
                }
                logger.debug(f"{view_name}: {pred['prediction']} ({pred['confidence']:.2%})")
            
            # Aggregate results
            result = self._aggregate_bilateral_predictions(predictions)
            
            # Add metadata
            result["case_id"] = f"bilateral_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
            result["model_version"] = getattr(model, 'model_version', 'unknown')
            result["inference_time_ms"] = (time.time() - inference_start) * 1000
            result["timestamp"] = datetime.utcnow().isoformat()
            
            # Save results if db provided
            if db:
                for view_name, pred in predictions.items():
                    if image_ids.get(view_name):
                        await self._save_prediction_result(pred, db, image_ids[view_name])
            
            logger.info(
                f"Bilateral inference complete: "
                f"overall={result['overall_prediction']}, "
                f"confidence={result['overall_confidence']:.2%}, "
                f"time={result['inference_time_ms']:.2f}ms"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Bilateral inference failed: {str(e)}")
            raise
    
    def _aggregate_bilateral_predictions(
        self,
        predictions: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Aggregate predictions from 4 views into overall assessment
        
        Args:
            predictions: Dictionary of predictions per view
            
        Returns:
            Aggregated bilateral assessment
        """
        # Extract probabilities
        malignant_probs = [p["probabilities"]["malignant"] for p in predictions.values()]
        benign_probs = [p["probabilities"]["benign"] for p in predictions.values()]
        
        # Max pooling strategy (most suspicious finding)
        max_malignant_prob = max(malignant_probs)
        max_malignant_view = [k for k, v in predictions.items() 
                              if v["probabilities"]["malignant"] == max_malignant_prob][0]
        
        # Average strategy
        avg_malignant_prob = np.mean(malignant_probs)
        avg_benign_prob = np.mean(benign_probs)
        
        # Count suspicious views
        suspicious_views = [k for k, v in predictions.items() 
                           if v["prediction"] == "malignant"]
        
        # Determine overall prediction
        # Use conservative approach: any suspicious view requires attention
        if len(suspicious_views) > 0:
            overall_prediction = "malignant"
            overall_confidence = max_malignant_prob
            risk_level = "high" if len(suspicious_views) >= 2 else "moderate"
        else:
            overall_prediction = "benign"
            overall_confidence = min(benign_probs)
            risk_level = "low"
        
        # Aggregate uncertainty
        uncertainties = [p["uncertainty"]["epistemic_uncertainty"] for p in predictions.values()]
        max_uncertainty = max(uncertainties)
        avg_uncertainty = np.mean(uncertainties)
        
        return {
            "overall_prediction": overall_prediction,
            "overall_confidence": float(overall_confidence),
            "overall_risk_level": risk_level,
            "view_predictions": predictions,
            "aggregation_method": "max_pooling",
            "statistics": {
                "max_malignant_probability": float(max_malignant_prob),
                "most_suspicious_view": max_malignant_view,
                "average_malignant_probability": float(avg_malignant_prob),
                "average_benign_probability": float(avg_benign_prob),
                "suspicious_view_count": len(suspicious_views),
                "suspicious_views": suspicious_views,
                "max_uncertainty": float(max_uncertainty),
                "average_uncertainty": float(avg_uncertainty)
            }
        }
    
    async def _save_prediction_result(
        self,
        prediction: Dict[str, Any],
        db: Session,
        image_id: Any
    ) -> Analysis:
        """
        Save prediction result to database
        
        Args:
            prediction: Prediction result dictionary
            db: Database session
            image_id: Image ID
            
        Returns:
            Created Analysis record
        """
        try:
            # Create Analysis record
            analysis = Analysis(
                image_id=image_id,
                model_version=prediction.get("model_version", "unknown"),
                prediction_class=prediction["prediction"],
                confidence_score=prediction["confidence"],
                malignant_probability=prediction["probabilities"]["malignant"],
                benign_probability=prediction["probabilities"]["benign"],
                risk_level=prediction["risk_level"],
                epistemic_uncertainty=prediction["uncertainty"]["epistemic_uncertainty"],
                predictive_entropy=prediction["uncertainty"]["predictive_entropy"],
                requires_human_review=prediction["uncertainty"]["requires_human_review"],
                inference_time_ms=prediction.get("inference_time_ms", 0),
                attention_map=prediction.get("explanation", {}).get("attention_map"),
                suspicious_regions=prediction.get("explanation", {}).get("suspicious_regions", []),
                clinical_narrative=prediction.get("explanation", {}).get("narrative"),
                processing_metadata={
                    "case_id": prediction.get("case_id"),
                    "timestamp": prediction.get("timestamp"),
                    "model_version": prediction.get("model_version")
                }
            )
            
            db.add(analysis)
            db.commit()
            db.refresh(analysis)
            
            logger.info(f"Saved prediction result: analysis_id={analysis.id}, image_id={image_id}")
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to save prediction result: {str(e)}")
            db.rollback()
            raise
    
    async def get_image_predictions(
        self,
        image_id: int,
        db: Session,
        limit: int = 10
    ) -> List[Analysis]:
        """
        Get all predictions for a specific image
        
        Args:
            image_id: Image ID
            db: Database session
            limit: Maximum number of results
            
        Returns:
            List of Analysis records
        """
        try:
            analyses = db.query(Analysis).filter(
                Analysis.image_id == image_id
            ).order_by(
                Analysis.created_at.desc()
            ).limit(limit).all()
            
            logger.debug(f"Retrieved {len(analyses)} predictions for image_id={image_id}")
            return analyses
            
        except Exception as e:
            logger.error(f"Failed to retrieve predictions for image_id={image_id}: {str(e)}")
            raise
    
    def clear_model_cache(self):
        """Clear model cache (useful for reloading models)"""
        self._model_cache.clear()
        self._default_model = None
        logger.info("Model cache cleared")


# Singleton instance
_inference_service: Optional[InferenceService] = None


def get_inference_service() -> InferenceService:
    """
    Get or create inference service singleton
    
    Returns:
        InferenceService instance
    """
    global _inference_service
    if _inference_service is None:
        _inference_service = InferenceService()
    return _inference_service
