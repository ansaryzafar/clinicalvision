"""
Rate Limiting Middleware
Protects against brute force attacks and DDoS
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from typing import Callable
import logging
import os

logger = logging.getLogger(__name__)

# Use Redis in production if REDIS_URL is set, otherwise in-memory
_storage_uri = os.environ.get("REDIS_URL", "memory://")
if _storage_uri != "memory://":
    logger.info(f"Rate limiter using Redis storage: {_storage_uri}")
else:
    logger.warning(
        "⚠️  Rate limiter using in-memory storage. "
        "Set REDIS_URL env var for production (distributed rate limiting)."
    )

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Default: 100 requests per minute
    storage_uri=_storage_uri,
    headers_enabled=True,  # Include rate limit headers in response
)

def get_limiter() -> Limiter:
    """Get rate limiter instance"""
    return limiter


# Rate limit configurations for different endpoints
RATE_LIMITS = {
    # Authentication endpoints - strict limits to prevent brute force
    "login": "5/minute",  # Max 5 login attempts per minute
    "register": "3/hour",  # Max 3 registrations per hour
    "refresh_token": "10/minute",
    
    # Image upload - moderate limits
    "upload": "20/hour",  # Max 20 uploads per hour per user
    
    # AI inference - moderate limits (compute-intensive)
    "inference": "50/hour",  # Max 50 predictions per hour
    
    # General API - generous limits
    "api": "200/minute",
}


def get_rate_limit(endpoint_type: str) -> str:
    """Get rate limit for specific endpoint type"""
    return RATE_LIMITS.get(endpoint_type, "100/minute")


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors
    Returns user-friendly error message
    """
    logger.warning(
        f"Rate limit exceeded for {get_remote_address(request)} "
        f"on {request.url.path}"
    )
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
            "detail": str(exc.detail),
            "retry_after": exc.detail.split("Retry after ")[1] if "Retry after" in exc.detail else None
        }
    )
