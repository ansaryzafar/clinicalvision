"""
Health check endpoints
Provides monitoring and observability for production deployment
"""

import os
from fastapi import APIRouter
from datetime import datetime
from app.schemas.health import HealthResponse
from app.core.config import settings
from app.core.logging import logger
from app.models.inference import get_model_inference
import time

router = APIRouter(prefix="/health", tags=["health"])

# Track application start time
_start_time = time.time()


@router.get("/", response_model=HealthResponse)
async def health_check():
    """
    Basic health check endpoint
    Returns system status and service availability
    
    Used by:
    - Load balancers for traffic routing
    - Monitoring systems (Prometheus, DataDog, etc.)
    - CI/CD pipelines for deployment verification
    """
    
    try:
        # Check if model is loaded
        model = get_model_inference()
        model_loaded = model.is_loaded()
        
        # TODO: Add database connection check when implemented
        database_connected = True  # Placeholder
        
        # Determine overall status
        if model_loaded and database_connected:
            status = "healthy"
        elif model_loaded or database_connected:
            status = "degraded"
        else:
            status = "unhealthy"
        
        uptime = time.time() - _start_time
        
        response = HealthResponse(
            status=status,
            version=settings.APP_VERSION,
            timestamp=datetime.utcnow(),
            services={
                "api": "healthy",
                "model": "healthy" if model_loaded else "unhealthy",
                "database": "healthy" if database_connected else "unhealthy"
            },
            model_loaded=model_loaded,
            database_connected=database_connected,
            uptime_seconds=uptime
        )
        
        logger.debug(f"Health check: {status}")
        return response
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            version=settings.APP_VERSION,
            timestamp=datetime.utcnow(),
            services={"api": "unhealthy"},
            model_loaded=False,
            database_connected=False
        )


@router.get("/ready")
async def readiness_check():
    """
    Kubernetes-style readiness probe
    Returns 200 only when service is fully ready to accept traffic
    """
    model = get_model_inference()
    
    if not model.is_loaded():
        return {"ready": False, "reason": "Model not loaded"}
    
    return {"ready": True}


@router.get("/device")
async def device_info():
    """
    Get compute device information.
    
    Returns details about GPU/CPU usage and why a particular mode is active.
    Useful for debugging GPU issues.
    """
    try:
        model = get_model_inference()
        
        # Get device info if available
        if hasattr(model, 'get_device_info'):
            device_info = model.get_device_info()
        else:
            device_info = {"device_mode": "unknown", "using_gpu": False}
        
        return {
            "model_loaded": model.is_loaded(),
            "device": device_info,
            "environment": {
                "CUDA_VISIBLE_DEVICES": os.environ.get('CUDA_VISIBLE_DEVICES', 'not set'),
                "TF_XLA_FLAGS": os.environ.get('TF_XLA_FLAGS', 'not set'),
                "TF_DISABLE_XLA": os.environ.get('TF_DISABLE_XLA', 'not set'),
                "CLINICALVISION_FORCE_CPU": os.environ.get('CLINICALVISION_FORCE_CPU', 'not set'),
            },
            "gpu_fix_instructions": {
                "issue": "CUDA version mismatch between driver and TensorFlow",
                "solutions": [
                    "Update NVIDIA driver to match TensorFlow's CUDA version",
                    "Reinstall TensorFlow with pip install tensorflow==X.X.X",
                    "Install matching CUDA toolkit",
                    "Continue using CPU mode (reliable but slower)"
                ],
                "to_try_gpu": "Set CLINICALVISION_FORCE_CPU=false and restart server"
            }
        }
    except Exception as e:
        return {"error": str(e), "model_loaded": False}


@router.get("/live")
async def liveness_check():
    """
    Kubernetes-style liveness probe
    Returns 200 if application is alive (even if not ready)
    """
    return {"alive": True}
