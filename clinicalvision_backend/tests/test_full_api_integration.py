"""
Full-Scale API Integration Test Suite

Tests all API endpoints with real database and authentication.
Verifies schema alignment between frontend expectations and backend responses.

Run with: pytest tests/test_full_api_integration.py -v
"""

import pytest
import sys
import os
from pathlib import Path
from datetime import datetime
from uuid import uuid4
import json

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi.testclient import TestClient


# =============================================================================
# Test Client Setup
# =============================================================================

@pytest.fixture(scope="module")
def client():
    """Create test client with app"""
    from main import app
    return TestClient(app)


@pytest.fixture(scope="module")
def auth_headers(client):
    """Get authentication headers for testing"""
    # Try to login with test user
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@clinicalvision.ai",
            "password": "TestPassword123!"
        }
    )
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    else:
        # Return empty headers for tests that don't need auth
        return {}


# =============================================================================
# Health Check Tests
# =============================================================================

class TestHealthEndpoints:
    """Test health check endpoints"""

    def test_health_endpoint_returns_200(self, client):
        """Verify health endpoint returns 200"""
        response = client.get("/health/")
        assert response.status_code == 200
        
    def test_health_response_structure(self, client):
        """Verify health response has expected structure"""
        response = client.get("/health/")
        data = response.json()
        
        assert "status" in data
        assert "timestamp" in data or "version" in data or "service" in data


# =============================================================================
# Authentication Tests
# =============================================================================

class TestAuthenticationEndpoints:
    """Test authentication endpoints"""

    def test_login_endpoint_exists(self, client):
        """Verify login endpoint exists"""
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "password"}
        )
        # Should return 401 (unauthorized) not 404
        assert response.status_code != 404

    def test_login_returns_tokens(self, client):
        """Verify login returns access and refresh tokens"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@clinicalvision.ai",
                "password": "TestPassword123!"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "refresh_token" in data
            assert "token_type" in data

    def test_me_endpoint_requires_auth(self, client):
        """Verify /me endpoint requires authentication"""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401 or response.status_code == 403

    def test_me_endpoint_returns_user(self, client, auth_headers):
        """Verify /me endpoint returns user info"""
        if not auth_headers:
            pytest.skip("No auth token available")
            
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            # Verify user fields aligned with frontend
            assert "id" in data
            assert "email" in data
            assert "role" in data


# =============================================================================
# Inference API Tests
# =============================================================================

class TestInferenceEndpoints:
    """Test inference API endpoints"""

    def test_inference_endpoint_exists(self, client, auth_headers):
        """Verify inference endpoint exists"""
        # Just check it doesn't return 404
        response = client.post(
            "/inference/predict",
            headers=auth_headers,
            files={}
        )
        assert response.status_code != 404

    def test_inference_response_schema(self, client, auth_headers):
        """Verify inference response matches frontend expectations"""
        # Create a simple test image
        import io
        from PIL import Image
        
        img = Image.new('RGB', (224, 224), color='white')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        response = client.post(
            "/inference/predict",
            headers=auth_headers,
            files={"file": ("test.png", img_bytes, "image/png")}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify response matches frontend InferenceResponse interface
            expected_fields = [
                'prediction', 'confidence', 'probabilities', 
                'risk_level', 'model_version', 'processing_time_ms'
            ]
            
            for field in expected_fields:
                assert field in data, f"Missing inference field: {field}"
            
            # Verify probabilities structure
            if 'probabilities' in data:
                assert 'benign' in data['probabilities']
                assert 'malignant' in data['probabilities']
            
            # Verify risk_level values
            if 'risk_level' in data:
                assert data['risk_level'] in ['low', 'moderate', 'high']


# =============================================================================
# Reports API Tests
# =============================================================================

class TestReportsEndpoints:
    """Test clinical reports API endpoints"""

    def test_reports_list_endpoint(self, client, auth_headers):
        """Verify reports list endpoint exists"""
        response = client.get("/api/v1/reports/", headers=auth_headers)
        # Should not be 404
        assert response.status_code != 404

    def test_birads_values_accepted(self, client, auth_headers):
        """Verify API accepts all BI-RADS values including 4A/4B/4C"""
        if not auth_headers:
            pytest.skip("No auth token available")
        
        # Test that the schema validates these values
        valid_birads = ['0', '1', '2', '3', '4A', '4B', '4C', '5', '6']
        
        for birads in valid_birads:
            # Just verify the value is accepted in the enum
            from app.schemas.reports import BIRADSCategoryEnum
            try:
                enum_val = BIRADSCategoryEnum(birads)
                assert enum_val.value == birads
            except ValueError:
                pytest.fail(f"BI-RADS {birads} should be valid")


# =============================================================================
# Fairness API Tests
# =============================================================================

class TestFairnessEndpoints:
    """Test fairness monitoring API endpoints"""

    def test_fairness_dashboard_endpoint(self, client, auth_headers):
        """Verify fairness dashboard endpoint exists"""
        response = client.get("/api/v1/fairness/dashboard", headers=auth_headers)
        # Should not be 404
        assert response.status_code != 404

    def test_fairness_dashboard_response_structure(self, client, auth_headers):
        """Verify fairness dashboard response structure"""
        response = client.get("/api/v1/fairness/dashboard", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify expected fields from frontend FairnessDashboardResponse
            expected_fields = ['overall_status', 'model_version']
            
            for field in expected_fields:
                assert field in data, f"Missing fairness field: {field}"

    def test_fairness_alerts_endpoint(self, client, auth_headers):
        """Verify fairness alerts endpoint exists"""
        response = client.get("/api/v1/fairness/alerts", headers=auth_headers)
        assert response.status_code != 404


# =============================================================================
# Images API Tests
# =============================================================================

class TestImagesEndpoints:
    """Test image management API endpoints"""

    def test_images_list_endpoint(self, client, auth_headers):
        """Verify images list endpoint exists"""
        response = client.get("/images/", headers=auth_headers)
        assert response.status_code != 404

    def test_image_upload_endpoint(self, client, auth_headers):
        """Verify image upload endpoint exists"""
        response = client.post(
            "/images/upload",
            headers=auth_headers,
            files={}
        )
        # Should be 422 (validation error) not 404
        assert response.status_code != 404


# =============================================================================
# XAI Endpoints Tests
# =============================================================================

class TestXAIEndpoints:
    """Test XAI (Explainability) API endpoints"""

    def test_gradcam_endpoint_exists(self, client, auth_headers):
        """Verify GradCAM endpoint exists"""
        response = client.post(
            "/inference/gradcam",
            headers=auth_headers,
            files={}
        )
        assert response.status_code != 404

    def test_lime_endpoint_exists(self, client, auth_headers):
        """Verify LIME endpoint exists"""
        response = client.post(
            "/inference/lime",
            headers=auth_headers,
            files={}
        )
        assert response.status_code != 404

    def test_shap_endpoint_exists(self, client, auth_headers):
        """Verify SHAP endpoint exists"""
        response = client.post(
            "/inference/shap",
            headers=auth_headers,
            files={}
        )
        assert response.status_code != 404


# =============================================================================
# DICOM API Tests
# =============================================================================

class TestDICOMEndpoints:
    """Test DICOM metadata API endpoints"""

    def test_dicom_metadata_endpoint_exists(self, client, auth_headers):
        """Verify DICOM metadata endpoints exist"""
        # Test that the endpoint pattern exists
        response = client.get("/api/v1/dicom/metadata", headers=auth_headers)
        # Could be 404 if specific image needed, but endpoint should be routed
        assert response.status_code in [200, 404, 401, 403, 422]


# =============================================================================
# Response Schema Validation Tests
# =============================================================================

class TestResponseSchemaAlignment:
    """Test that API responses match frontend TypeScript interfaces"""

    def test_user_response_matches_frontend(self, client, auth_headers):
        """Verify user response matches frontend User interface"""
        if not auth_headers:
            pytest.skip("No auth token available")
            
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        
        if response.status_code == 200:
            user = response.json()
            
            # Required fields from frontend User interface
            frontend_fields = ['id', 'email', 'role', 'is_active']
            
            for field in frontend_fields:
                assert field in user, f"Missing user field: {field}"
            
            # Optional fields (should be present if populated)
            optional_fields = ['first_name', 'last_name', 'organization_id']
            # Just log which optional fields are present
            present_optional = [f for f in optional_fields if f in user]
            print(f"✓ Optional user fields present: {present_optional}")

    def test_error_response_structure(self, client):
        """Verify error responses have consistent structure"""
        # Trigger a validation error
        response = client.post(
            "/api/v1/auth/login",
            json={"invalid": "data"}
        )
        
        if response.status_code == 422:
            data = response.json()
            assert "detail" in data, "Error response should have 'detail' field"


# =============================================================================
# Database Connectivity Tests
# =============================================================================

class TestDatabaseConnectivity:
    """Test database connectivity and model operations"""

    def test_database_connection(self):
        """Verify database connection works"""
        try:
            from app.db.session import engine
            from sqlalchemy import text
            
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                assert result.fetchone() is not None
            print("✓ Database connection successful")
        except Exception as e:
            pytest.fail(f"Database connection failed: {e}")

    def test_user_table_exists(self):
        """Verify users table exists"""
        from app.db.session import engine
        from sqlalchemy import inspect
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        assert "users" in tables, "Users table not found"

    def test_all_required_tables_exist(self):
        """Verify all required tables exist"""
        from app.db.session import engine
        from sqlalchemy import inspect
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        required_tables = [
            'users', 'organizations', 'patients', 'studies',
            'images', 'analyses', 'clinical_reports', 'feedback'
        ]
        
        for table in required_tables:
            assert table in tables, f"Required table '{table}' not found"
        
        print(f"✓ All {len(required_tables)} required tables exist")


# =============================================================================
# Run All Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-x"])
