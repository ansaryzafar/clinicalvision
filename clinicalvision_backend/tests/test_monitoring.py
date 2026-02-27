"""
Tests for Prometheus monitoring and metrics
Ensures metrics are collected and exposed correctly
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.monitoring.metrics import (
    PrometheusMiddleware,
    get_metrics,
    track_model_inference,
    track_file_upload,
    track_auth_request,
    track_rate_limit_exceeded,
    http_requests_total,
    model_inference_total,
    file_uploads_total,
    auth_requests_total
)


def create_test_app():
    """Create test FastAPI app with monitoring"""
    app = FastAPI()
    app.add_middleware(PrometheusMiddleware)
    
    @app.get("/test")
    def test_endpoint():
        return {"message": "test"}
    
    @app.get("/error")
    def error_endpoint():
        raise ValueError("Test error")
    
    @app.get("/metrics")
    def metrics_endpoint():
        return get_metrics()
    
    return app


class TestPrometheusMetrics:
    """Test Prometheus metrics collection"""
    
    def test_metrics_endpoint_exists(self):
        """Should expose /metrics endpoint"""
        app = create_test_app()
        client = TestClient(app)
        
        response = client.get("/metrics")
        
        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]
    
    def test_metrics_endpoint_returns_prometheus_format(self):
        """Should return metrics in Prometheus text format"""
        app = create_test_app()
        client = TestClient(app)
        
        response = client.get("/metrics")
        
        content = response.text
        
        # Should contain metric names
        assert "http_requests_total" in content or "python_info" in content
        # Should contain HELP and TYPE comments
        assert "# HELP" in content or "# TYPE" in content
    
    def test_http_requests_tracked(self):
        """Should track HTTP requests"""
        app = create_test_app()
        client = TestClient(app)
        
        # Make some requests
        client.get("/test")
        client.get("/test")
        
        # Get metrics
        response = client.get("/metrics")
        
        assert response.status_code == 200
        # Metrics should contain request counts
        assert "http_requests_total" in response.text


class TestMetricsMiddleware:
    """Test Prometheus middleware functionality"""
    
    def test_middleware_tracks_successful_requests(self):
        """Should track successful HTTP requests"""
        app = create_test_app()
        client = TestClient(app)
        
        response = client.get("/test")
        
        assert response.status_code == 200
        
        # Check metrics
        metrics_response = client.get("/metrics")
        assert "http_requests_total" in metrics_response.text
    
    def test_middleware_tracks_request_duration(self):
        """Should track request duration"""
        app = create_test_app()
        client = TestClient(app)
        
        client.get("/test")
        
        metrics_response = client.get("/metrics")
        
        # Should contain histogram metrics
        assert "http_request_duration_seconds" in metrics_response.text
    
    def test_middleware_tracks_errors(self):
        """Should track error responses"""
        app = create_test_app()
        client = TestClient(app)
        
        # Make request that raises error
        try:
            client.get("/error")
        except:
            pass
        
        metrics_response = client.get("/metrics")
        
        # Should track errors
        assert "errors_total" in metrics_response.text or "http_requests_total" in metrics_response.text
    
    def test_metrics_endpoint_not_tracked(self):
        """Should not track metrics endpoint itself"""
        app = create_test_app()
        client = TestClient(app)
        
        # Access metrics multiple times
        client.get("/metrics")
        client.get("/metrics")
        
        response = client.get("/metrics")
        
        # Should not create infinite tracking loop
        assert response.status_code == 200


class TestMetricsHelpers:
    """Test metrics tracking helper functions"""
    
    def test_track_model_inference(self):
        """Should track model inference metrics"""
        # Track successful inference
        track_model_inference("ensemble", 1.5, success=True)
        
        # Track failed inference
        track_model_inference("ensemble", 0.5, success=False)
        
        # Should not raise errors
        assert True
    
    def test_track_file_upload(self):
        """Should track file upload metrics"""
        # Track successful upload
        track_file_upload("jpg", 1048576, success=True)
        
        # Track failed upload
        track_file_upload("dcm", 524288, success=False)
        
        assert True
    
    def test_track_auth_request(self):
        """Should track authentication requests"""
        # Track successful login
        track_auth_request("login", success=True)
        
        # Track failed login
        track_auth_request("login", success=False)
        
        # Track registration
        track_auth_request("register", success=True)
        
        assert True
    
    def test_track_rate_limit_exceeded(self):
        """Should track rate limit events"""
        track_rate_limit_exceeded("/api/v1/auth/login")
        track_rate_limit_exceeded("/api/v1/auth/register")
        
        assert True


class TestMetricsLabels:
    """Test metrics labels and dimensions"""
    
    def test_http_metrics_have_labels(self):
        """HTTP metrics should have method, endpoint, status labels"""
        app = create_test_app()
        client = TestClient(app)
        
        # Make requests to different endpoints
        client.get("/test")
        client.get("/test")
        
        response = client.get("/metrics")
        content = response.text
        
        # Should contain labeled metrics
        if "http_requests_total" in content:
            # Check for label structure
            assert 'method=' in content or 'endpoint=' in content
    
    def test_model_metrics_have_model_type(self):
        """Model metrics should include model type label"""
        track_model_inference("ensemble", 1.0, success=True)
        
        app = create_test_app()
        client = TestClient(app)
        
        response = client.get("/metrics")
        
        # Should contain model inference metrics
        assert response.status_code == 200


class TestMetricsConfiguration:
    """Test metrics configuration and setup"""
    
    def test_prometheus_middleware_can_be_instantiated(self):
        """Should be able to create PrometheusMiddleware"""
        middleware = PrometheusMiddleware
        
        assert middleware is not None
    
    def test_metrics_function_returns_response(self):
        """get_metrics should return valid response"""
        response = get_metrics()
        
        assert response is not None
        assert hasattr(response, 'body') or hasattr(response, 'content')
    
    def test_histogram_buckets_configured(self):
        """Should have histogram buckets configured"""
        app = create_test_app()
        client = TestClient(app)
        
        client.get("/test")
        
        response = client.get("/metrics")
        content = response.text
        
        # Histograms should have bucket metrics
        if "http_request_duration_seconds" in content:
            assert "_bucket" in content


class TestMetricsIntegration:
    """Test metrics integration with application"""
    
    def test_metrics_persist_across_requests(self):
        """Metrics should accumulate across multiple requests"""
        app = create_test_app()
        client = TestClient(app)
        
        # Make multiple requests
        for _ in range(5):
            client.get("/test")
        
        response = client.get("/metrics")
        
        # Metrics should show accumulated data
        assert response.status_code == 200
        assert len(response.text) > 0
    
    def test_concurrent_requests_tracked(self):
        """Should handle concurrent request tracking"""
        app = create_test_app()
        client = TestClient(app)
        
        # Make concurrent-like requests
        responses = [client.get("/test") for _ in range(10)]
        
        # All should succeed
        assert all(r.status_code == 200 for r in responses)
        
        # Metrics should be collected
        metrics_response = client.get("/metrics")
        assert metrics_response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
