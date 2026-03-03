"""
Unit tests for analysis endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from PIL import Image
import io
import uuid
from main import app
from app.core.dependencies import get_current_active_user


def _make_mock_user():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.email = "test@clinicalvision.ai"
    user.role = "radiologist"
    user.is_active = True
    user.organization_id = uuid.uuid4()
    return user


@pytest.fixture(autouse=True)
def _override_auth():
    """Set auth override before each test; restore after."""
    mock_user = _make_mock_user()
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    yield
    app.dependency_overrides.pop(get_current_active_user, None)


client = TestClient(app)


def create_test_image(size=(224, 224), mode='L'):
    """Create a test image for upload"""
    img = Image.new(mode, size, color=128)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf


def test_analyze_valid_image():
    """Test analysis with valid image"""
    img_buf = create_test_image()
    
    response = client.post(
        "/analyze/",
        files={"file": ("test.png", img_buf, "image/png")}
    )
    
    assert response.status_code == 200
    
    data = response.json()
    assert "metadata" in data
    assert "prediction" in data
    assert "uncertainty" in data
    assert "explanation" in data
    
    # Validate prediction structure
    pred = data["prediction"]
    assert pred["prediction"] in ["benign", "malignant"]
    assert 0 <= pred["confidence"] <= 1
    assert "probabilities" in pred


def test_analyze_invalid_file_type():
    """Test analysis with invalid file type"""
    response = client.post(
        "/analyze/",
        files={"file": ("test.txt", b"not an image", "text/plain")}
    )
    
    assert response.status_code == 400


def test_analyze_missing_file():
    """Test analysis without file"""
    response = client.post("/analyze/")
    
    assert response.status_code == 422  # Unprocessable entity
