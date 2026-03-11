"""
API v1 Router

Aggregates all v1 API endpoints into a single router.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import reports, dicom, models, auth, images, inference, fairness, auth0, account, cases, analytics

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, tags=["Authentication"])
api_router.include_router(auth0.router, tags=["Auth0 Authentication"])
api_router.include_router(account.router, tags=["Account Management"])
api_router.include_router(reports.router, tags=["Clinical Reports"])
api_router.include_router(cases.router, tags=["Case Management"])
api_router.include_router(dicom.router, tags=["DICOM Metadata"])
api_router.include_router(models.router, tags=["Model Versions"])
api_router.include_router(images.router, prefix="/images", tags=["Image Storage"])
api_router.include_router(inference.router, prefix="/inference", tags=["AI Inference"])
api_router.include_router(fairness.router, tags=["Fairness Monitoring"])
api_router.include_router(analytics.router, tags=["Analytics Dashboard"])

