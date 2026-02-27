"""
Unit tests for feedback endpoints
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_submit_valid_feedback():
    """Test feedback submission with valid data"""
    feedback_data = {
        "case_id": "test_case_001",
        "radiologist_id": "RAD_12345",
        "ai_prediction": "malignant",
        "radiologist_diagnosis": "benign",
        "agreement_score": "disagree",
        "feedback_notes": "Test feedback",
        "time_to_review_seconds": 120
    }
    
    response = client.post("/feedback/", json=feedback_data)
    
    assert response.status_code == 201
    
    data = response.json()
    assert "feedback_id" in data
    assert data["case_id"] == "test_case_001"
    assert data["status"] == "recorded"


def test_submit_minimal_feedback():
    """Test feedback with only required fields"""
    feedback_data = {
        "case_id": "test_case_002",
        "ai_prediction": "benign",
        "radiologist_diagnosis": "benign",
        "agreement_score": "agree"
    }
    
    response = client.post("/feedback/", json=feedback_data)
    
    assert response.status_code == 201


def test_submit_invalid_feedback():
    """Test feedback with invalid data"""
    feedback_data = {
        "case_id": "test_case_003",
        # Missing required fields
    }
    
    response = client.post("/feedback/", json=feedback_data)
    
    assert response.status_code == 422
