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
    
    Each service is checked independently so a single failure
    (e.g. model weights missing) does not mask other healthy services.
    """
    
    uptime = time.time() - _start_time
    
    # --- 1. API is healthy if we reach this handler ---
    api_status = "healthy"
    
    # --- 2. Database connectivity (real check) ---
    try:
        from app.db.session import check_db_connection
        database_connected = check_db_connection()
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        database_connected = False
    
    # --- 3. Model availability (isolated from API/DB) ---
    model_loaded = False
    model_version_str = settings.MODEL_VERSION
    try:
        from app.models.inference import get_model_inference
        model = get_model_inference()
        model_loaded = model.is_loaded()
        model_version_str = getattr(model, 'model_version', settings.MODEL_VERSION)
    except Exception as e:
        # Model files missing or TF not available – this is expected
        # on production VMs without GPU / model weights
        logger.info(f"Model not available: {e}")
        model_loaded = False
    
    # --- 4. Determine overall status ---
    if api_status == "healthy" and database_connected and model_loaded:
        status = "healthy"
    elif api_status == "healthy" and database_connected:
        # API + DB work, only model is unavailable → degraded
        status = "degraded"
    elif api_status == "healthy":
        # API works but DB is down
        status = "degraded"
    else:
        status = "unhealthy"
    
    response = HealthResponse(
        status=status,
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow(),
        services={
            "api": api_status,
            "model": "healthy" if model_loaded else "unavailable",
            "database": "healthy" if database_connected else "unhealthy"
        },
        model_loaded=model_loaded,
        database_connected=database_connected,
        uptime_seconds=uptime,
        model_version=model_version_str
    )
    
    logger.debug(f"Health check: {status} (api={api_status}, db={database_connected}, model={model_loaded})")
    return response


@router.get("/ready")
async def readiness_check():
    """
    Kubernetes-style readiness probe
    Returns 200 only when service is fully ready to accept traffic
    """
    try:
        from app.models.inference import get_model_inference
        model = get_model_inference()
        if not model.is_loaded():
            return {"ready": False, "reason": "Model not loaded"}
        return {"ready": True}
    except Exception as e:
        return {"ready": False, "reason": f"Model unavailable: {e}"}


@router.get("/device")
async def device_info():
    """
    Get compute device information.
    
    Returns details about GPU/CPU usage and why a particular mode is active.
    Useful for debugging GPU issues.
    """
    try:
        from app.models.inference import get_model_inference
        model = get_model_inference()
        
        # Get device info if available
        if hasattr(model, 'get_device_info'):
            dev_info = model.get_device_info()
        else:
            dev_info = {"device_mode": "unknown", "using_gpu": False}
        
        return {
            "model_loaded": model.is_loaded(),
            "device": dev_info,
            "environment": {
                "CUDA_VISIBLE_DEVICES": os.environ.get('CUDA_VISIBLE_DEVICES', 'not set'),
                "TF_XLA_FLAGS": os.environ.get('TF_XLA_FLAGS', 'not set'),
                "TF_DISABLE_XLA": os.environ.get('TF_DISABLE_XLA', 'not set'),
                "CLINICALVISION_FORCE_CPU": os.environ.get('CLINICALVISION_FORCE_CPU', 'not set'),
            },
        }
    except Exception as e:
        return {
            "error": str(e),
            "model_loaded": False,
            "environment": {
                "CUDA_VISIBLE_DEVICES": os.environ.get('CUDA_VISIBLE_DEVICES', 'not set'),
                "CLINICALVISION_FORCE_CPU": os.environ.get('CLINICALVISION_FORCE_CPU', 'not set'),
            },
        }


@router.get("/live")
async def liveness_check():
    """
    Kubernetes-style liveness probe
    Returns 200 if application is alive (even if not ready)
    """
    return {"alive": True}
