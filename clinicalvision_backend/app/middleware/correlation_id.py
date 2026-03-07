"""
Request Correlation ID Middleware

Assigns a unique UUID4 to every incoming request, making it possible
to trace a single request across all log entries, downstream services,
and the response headers returned to the client.

Usage:
    app.add_middleware(CorrelationIdMiddleware)

The correlation ID is:
  - Generated from the incoming ``X-Request-ID`` header (if present),
    or a new UUID4 is created.
  - Stored in a ``contextvars.ContextVar`` so loggers anywhere in
    the call-stack can include it automatically.
  - Echoed back in the ``X-Request-ID`` response header.
"""

import uuid
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# ContextVar accessible from any coroutine in the same async context
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Inject / propagate a unique correlation ID per request."""

    async def dispatch(self, request: Request, call_next):
        # Prefer client-supplied ID; otherwise generate a new one
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # Store in context for downstream logging
        token = correlation_id_ctx.set(request_id)

        try:
            response = await call_next(request)
        finally:
            correlation_id_ctx.reset(token)

        # Always echo the ID back to the caller
        response.headers["X-Request-ID"] = request_id
        return response
