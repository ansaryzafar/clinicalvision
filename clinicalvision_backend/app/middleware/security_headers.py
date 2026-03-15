"""
Security Headers Middleware
Adds security headers and enforces HTTPS in production
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, RedirectResponse
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers and enforce HTTPS
    
    Security Headers Added:
    - Strict-Transport-Security (HSTS): Enforce HTTPS for 1 year
    - X-Content-Type-Options: Prevent MIME type sniffing
    - X-Frame-Options: Prevent clickjacking
    - X-XSS-Protection: Enable XSS filter (legacy browsers)
    - Content-Security-Policy: Restrict resource loading
    - Referrer-Policy: Control referrer information
    - Permissions-Policy: Control browser features
    """
    
    async def dispatch(self, request: Request, call_next):
        """Process request and add security headers"""
        
        # Paths that should NEVER be redirected — they are always proxied
        # through nginx which handles SSL termination
        EXEMPT_PREFIXES = ("/health", "/api/", "/inference/", "/docs", "/openapi.json")
        path = request.url.path
        
        # HTTPS Enforcement in Production (non-exempt paths only)
        if settings.ENVIRONMENT == "production" and not settings.DEBUG:
            if not any(path.startswith(p) for p in EXEMPT_PREFIXES):
                # Check if request is HTTP (not HTTPS)
                # Also check X-Forwarded-Proto header set by reverse proxy (nginx)
                forwarded_proto = request.headers.get("X-Forwarded-Proto", "")
                is_https = (
                    request.url.scheme == "https"
                    or forwarded_proto.lower() == "https"
                )
                if not is_https:
                    # Redirect to HTTPS (use 307 to prevent caching issues)
                    url = request.url.replace(scheme="https")
                    logger.info(f"Redirecting HTTP to HTTPS: {request.url} -> {url}")
                    return RedirectResponse(url=str(url), status_code=307)
        
        # Process the request
        response = await call_next(request)
        
        # Add security headers to response
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy
        if settings.ENVIRONMENT == "production":
            csp_directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: blob:",
                "font-src 'self' data: https://fonts.gstatic.com",
                "connect-src 'self' https://clinicalvision.ai https://www.clinicalvision.ai",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ]
        else:
            csp_directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob:",
                "font-src 'self' data:",
                "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:*",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ]
        
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # Permissions Policy (formerly Feature-Policy)
        permissions_policy = [
            "geolocation=()",
            "microphone=()",
            "camera=()",
            "payment=()",
            "usb=()",
            "magnetometer=()",
            "gyroscope=()",
            "accelerometer=()"
        ]
        response.headers["Permissions-Policy"] = ", ".join(permissions_policy)
        
        return response


def add_security_headers(response: Response) -> Response:
    """
    Helper function to add security headers to a response
    Can be used for individual routes if needed
    """
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response


def is_secure_request(request: Request) -> bool:
    """
    Check if request is using HTTPS or is from local development
    """
    # In development, allow HTTP
    if settings.DEBUG:
        return True
    
    # Check if HTTPS
    if request.url.scheme == "https":
        return True
    
    # Check for reverse proxy headers
    forwarded_proto = request.headers.get("X-Forwarded-Proto", "")
    if forwarded_proto.lower() == "https":
        return True
    
    return False


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """
    Simplified middleware that only handles HTTPS redirection
    Use this if you want to add security headers separately
    """
    
    async def dispatch(self, request: Request, call_next):
        """Redirect HTTP to HTTPS in production"""
        
        # Skip redirect in development or if already HTTPS
        if settings.DEBUG or request.url.scheme == "https":
            return await call_next(request)
        
        # Check for reverse proxy headers
        forwarded_proto = request.headers.get("X-Forwarded-Proto", "")
        if forwarded_proto.lower() == "https":
            return await call_next(request)
        
        # In production, redirect HTTP to HTTPS
        if settings.ENVIRONMENT == "production":
            url = request.url.replace(scheme="https")
            logger.warning(f"Insecure HTTP request detected, redirecting to HTTPS: {url}")
            return RedirectResponse(url=str(url), status_code=301)
        
        return await call_next(request)
