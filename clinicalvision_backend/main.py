"""
ClinicalVision AI Backend
FastAPI application for breast cancer detection system

Production-grade API with:
- AI model inference (mock and real)
- Uncertainty quantification
- Explainable AI outputs
- Radiologist feedback collection
- Comprehensive monitoring
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import logger
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.monitoring.metrics import PrometheusMiddleware, get_metrics
from app.api.routes import health, analysis, feedback
from app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan management
    Handles startup and shutdown tasks
    """
    # Startup
    logger.info("=" * 60)
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Model mode: {'MOCK' if settings.USE_MOCK_MODEL else 'REAL'}")
    logger.info("=" * 60)
    
    # Ensure upload directory exists
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production-grade API for AI-powered breast cancer detection. "
        "Provides classification, uncertainty quantification, and explainable AI outputs."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    # OpenAPI Security Documentation
    swagger_ui_parameters={
        "persistAuthorization": True,
    },
    # Security scheme for Bearer token authentication
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication and authorization operations"
        },
        {
            "name": "Clinical Reports",
            "description": "Clinical report management with BI-RADS compliance"
        },
        {
            "name": "DICOM Metadata",
            "description": "DICOM metadata operations and querying"
        },
        {
            "name": "Model Versions",
            "description": "AI model version management and monitoring"
        },
        {
            "name": "Health",
            "description": "Health check and system status endpoints"
        }
    ]
)

# Add security scheme to OpenAPI documentation
# This enables the "Authorize" button in Swagger UI
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    from fastapi.openapi.utils import get_openapi
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add security scheme for JWT Bearer token
    openapi_schema["components"]["securitySchemes"] = {
        "HTTPBearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT access token from the /api/v1/auth/login endpoint"
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Add Prometheus metrics collection
app.add_middleware(PrometheusMiddleware)

# Add security headers and HTTPS enforcement
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware - allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gzip compression for large responses (attention maps)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Catch-all exception handler to prevent information leakage
    Returns generic error in production, detailed in development
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": str(exc),
                "type": type(exc).__name__
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": "An unexpected error occurred. Please contact support."
            }
        )


# Register routers
app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(feedback.router)

# Prometheus metrics endpoint
@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Prometheus metrics endpoint"""
    return get_metrics()

# Include API v1 endpoints
app.include_router(api_router)


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """
    API root endpoint
    Provides basic information and available endpoints
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "analyze": "POST /analyze/",
            "feedback": "POST /feedback/",
            "health": "GET /health/"
        }
    }


# Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
