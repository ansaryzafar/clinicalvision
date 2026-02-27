"""
Prometheus Metrics for ClinicalVision AI
Collects and exposes application metrics
"""

from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

# Application Info
app_info = Info('clinicalvision', 'ClinicalVision AI Application')
app_info.info({
    'version': '1.0.0',
    'environment': 'development'
})

# Request Metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0)
)

http_requests_in_progress = Gauge(
    'http_requests_in_progress',
    'Number of HTTP requests in progress',
    ['method', 'endpoint']
)

# Model Inference Metrics
model_inference_total = Counter(
    'model_inference_total',
    'Total model inference requests',
    ['model_type', 'status']
)

model_inference_duration_seconds = Histogram(
    'model_inference_duration_seconds',
    'Model inference latency',
    ['model_type'],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0)
)

# Database Metrics
database_connections = Gauge(
    'database_connections',
    'Number of active database connections'
)

database_query_duration_seconds = Histogram(
    'database_query_duration_seconds',
    'Database query latency',
    ['operation'],
    buckets=(0.001, 0.01, 0.05, 0.1, 0.5, 1.0)
)

# File Upload Metrics
file_uploads_total = Counter(
    'file_uploads_total',
    'Total file uploads',
    ['file_type', 'status']
)

file_upload_size_bytes = Histogram(
    'file_upload_size_bytes',
    'File upload size distribution',
    ['file_type'],
    buckets=(1024, 10240, 102400, 1048576, 10485760, 52428800)  # 1KB to 50MB
)

# Authentication Metrics
auth_requests_total = Counter(
    'auth_requests_total',
    'Total authentication requests',
    ['action', 'status']
)

active_users = Gauge(
    'active_users',
    'Number of currently active users'
)

# Error Metrics
errors_total = Counter(
    'errors_total',
    'Total errors',
    ['error_type', 'endpoint']
)

rate_limit_exceeded_total = Counter(
    'rate_limit_exceeded_total',
    'Total rate limit exceeded events',
    ['endpoint']
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    Middleware to collect HTTP request metrics
    """
    
    async def dispatch(self, request: Request, call_next):
        """Collect metrics for each request"""
        
        # Skip metrics endpoint itself
        if request.url.path == "/metrics":
            return await call_next(request)
        
        method = request.method
        endpoint = request.url.path
        
        # Track in-progress requests
        http_requests_in_progress.labels(method=method, endpoint=endpoint).inc()
        
        # Track request duration
        start_time = time.time()
        
        try:
            response = await call_next(request)
            status = response.status_code
            
            # Record successful request
            duration = time.time() - start_time
            http_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status=status
            ).inc()
            
            http_request_duration_seconds.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
            
            return response
            
        except Exception as e:
            # Record error
            duration = time.time() - start_time
            
            errors_total.labels(
                error_type=type(e).__name__,
                endpoint=endpoint
            ).inc()
            
            http_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status=500
            ).inc()
            
            http_request_duration_seconds.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
            
            raise
            
        finally:
            # Decrement in-progress counter
            http_requests_in_progress.labels(method=method, endpoint=endpoint).dec()


def get_metrics() -> Response:
    """
    Return Prometheus metrics in text format
    """
    metrics = generate_latest()
    return FastAPIResponse(
        content=metrics,
        media_type=CONTENT_TYPE_LATEST
    )


def track_model_inference(model_type: str, duration: float, success: bool):
    """
    Track model inference metrics
    
    Args:
        model_type: Type of model used (e.g., 'ensemble', 'single')
        duration: Inference duration in seconds
        success: Whether inference was successful
    """
    status = "success" if success else "failure"
    model_inference_total.labels(model_type=model_type, status=status).inc()
    model_inference_duration_seconds.labels(model_type=model_type).observe(duration)


def track_file_upload(file_type: str, size_bytes: int, success: bool):
    """
    Track file upload metrics
    
    Args:
        file_type: Type of file (e.g., 'jpg', 'dcm')
        size_bytes: File size in bytes
        success: Whether upload was successful
    """
    status = "success" if success else "failure"
    file_uploads_total.labels(file_type=file_type, status=status).inc()
    file_upload_size_bytes.labels(file_type=file_type).observe(size_bytes)


def track_auth_request(action: str, success: bool):
    """
    Track authentication metrics
    
    Args:
        action: Authentication action ('login', 'register', 'refresh')
        success: Whether action was successful
    """
    status = "success" if success else "failure"
    auth_requests_total.labels(action=action, status=status).inc()


def track_rate_limit_exceeded(endpoint: str):
    """
    Track rate limit exceeded events
    
    Args:
        endpoint: Endpoint where rate limit was exceeded
    """
    rate_limit_exceeded_total.labels(endpoint=endpoint).inc()


def track_database_query(operation: str, duration: float):
    """
    Track database query metrics
    
    Args:
        operation: Type of database operation ('select', 'insert', 'update', 'delete')
        duration: Query duration in seconds
    """
    database_query_duration_seconds.labels(operation=operation).observe(duration)


def set_active_users(count: int):
    """
    Set the number of active users
    
    Args:
        count: Number of active users
    """
    active_users.set(count)


def set_database_connections(count: int):
    """
    Set the number of active database connections
    
    Args:
        count: Number of active connections
    """
    database_connections.set(count)


logger.info("Prometheus metrics initialized")
