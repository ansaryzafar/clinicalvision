"""
Tests for rate limiting functionality
Ensures API endpoints are protected against abuse
"""

import pytest
import time
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestRateLimiting:
    """Test rate limiting on critical endpoints"""
    
    def test_login_rate_limit(self):
        """Should rate limit login attempts (5 per minute)"""
        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        
        # Make 5 requests (should be allowed)
        for i in range(5):
            response = client.post("/api/v1/auth/login", json=login_data)
            # May fail with 401 (invalid credentials) but shouldn't be rate limited yet
            assert response.status_code in [401, 500]  # 500 if no DB
        
        # 6th request should be rate limited
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 429
        assert "rate_limit" in response.json().get("error", "").lower() or \
               "too many" in response.text.lower()
    
    def test_register_rate_limit(self):
        """Should rate limit registration attempts (3 per hour)"""
        register_data = {
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
            "organization_id": "00000000-0000-0000-0000-000000000000"
        }
        
        # Make 3 requests
        for i in range(3):
            response = client.post("/api/v1/auth/register", json=register_data)
            # May fail with 400/404 but shouldn't be rate limited yet
            assert response.status_code in [400, 404, 500]
        
        # 4th request should be rate limited
        response = client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 429
    
    def test_rate_limit_headers_included(self):
        """Should include rate limit information in response after rate limit"""
        login_data = {"email": "test@example.com", "password": "test"}
        
        # Make requests until rate limited
        for i in range(6):
            response = client.post("/api/v1/auth/login", json=login_data)
        
        # Last response should be rate limited with 429 status
        assert response.status_code == 429
        assert "rate_limit_exceeded" in response.json().get("error", "")
    
    def test_rate_limit_error_message(self):
        """Should return user-friendly error message"""
        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        
        # Exhaust rate limit
        for i in range(6):
            response = client.post("/api/v1/auth/login", json=login_data)
        
        # Check error message
        assert response.status_code == 429
        data = response.json()
        assert "error" in data or "detail" in data
        # Should have user-friendly message
        message = str(data).lower()
        assert any(word in message for word in ["too many", "rate limit", "try again"])


class TestRateLimitBypass:
    """Test that certain endpoints are not rate limited"""
    
    def test_health_check_not_rate_limited(self):
        """Health check should not be rate limited"""
        # Make many requests to health endpoint
        for i in range(200):
            response = client.get("/health/")
            assert response.status_code == 200
    
    def test_docs_not_rate_limited(self):
        """Documentation endpoints should not be rate limited"""
        for i in range(50):
            response = client.get("/docs")
            assert response.status_code == 200


class TestRateLimitConfiguration:
    """Test rate limit configuration"""
    
    def test_rate_limit_values(self):
        """Verify rate limit configurations are sensible"""
        from app.core.rate_limit import RATE_LIMITS
        
        # Login should be strict (prevent brute force)
        assert "login" in RATE_LIMITS
        assert int(RATE_LIMITS["login"].split("/")[0]) <= 10
        
        # Register should be very strict
        assert "register" in RATE_LIMITS
        assert "hour" in RATE_LIMITS["register"]
        
        # Upload should be moderate
        assert "upload" in RATE_LIMITS
        
        # Inference should be moderate (compute-intensive)
        assert "inference" in RATE_LIMITS


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
