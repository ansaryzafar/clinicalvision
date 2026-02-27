"""
API routes initialization
Registers all endpoint routers
"""

from app.api.routes import health, analysis, feedback

__all__ = ["health", "analysis", "feedback"]
