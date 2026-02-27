"""
Unit tests for health check endpoints
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    """Test basic health endpoint"""
    response = client.get("/health/")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "model_loaded" in data


def test_readiness_check():
    """Test readiness probe"""
    response = client.get("/health/ready")
    assert response.status_code == 200
    
    data = response.json()
    assert "ready" in data


def test_liveness_check():
    """Test liveness probe"""
    response = client.get("/health/live")
    assert response.status_code == 200
    
    data = response.json()
    assert data["alive"] is True


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert "name" in data
    assert "version" in data
    assert "endpoints" in data
