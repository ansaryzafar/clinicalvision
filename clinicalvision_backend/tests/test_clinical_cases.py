"""
TDD Test Suite — Clinical Case Management API (Phase B)

These tests define the expected behavior for the case management system.
Written BEFORE implementation (Red → Green → Refactor).

Test Categories:
  1. DB Model tests — ClinicalCase, CaseImage, CaseFinding creation & relationships
  2. Schema validation tests — Pydantic request/response validation
  3. Service layer tests — Business logic (CRUD, workflow transitions, case numbers)
  4. API endpoint tests — HTTP contract (status codes, auth, payloads)

Run:
    cd clinicalvision_backend
    conda activate clinicalvision_backend
    pytest tests/test_clinical_cases.py -v --tb=short
"""

import pytest
import uuid
from datetime import date, datetime, timezone
from unittest.mock import MagicMock, patch, PropertyMock
from typing import List, Optional

# ---------------------------------------------------------------------------
# We'll import from modules that DON'T EXIST YET.
# During the RED phase, these imports will fail — that's expected.
# We wrap them so the test file can at least be collected by pytest
# even if the modules haven't been created yet.
# ---------------------------------------------------------------------------

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_db():
    """Lightweight mock DB session for unit tests."""
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    db.query = MagicMock()
    db.flush = MagicMock()
    return db


@pytest.fixture
def sample_user_id():
    return uuid.uuid4()


@pytest.fixture
def sample_case_id():
    return uuid.uuid4()


@pytest.fixture
def sample_case_create_data():
    """Minimal valid case creation payload."""
    return {
        "patient_mrn": "MRN-001234",
        "patient_first_name": "Jane",
        "patient_last_name": "Doe",
        "patient_dob": "1975-06-15",
        "patient_sex": "F",
        "clinical_history": {
            "clinicalIndication": "Screening mammogram",
            "familyHistoryBreastCancer": False,
            "personalHistoryBreastCancer": False,
            "previousBiopsy": False,
            "comparisonAvailable": False,
        },
    }


@pytest.fixture
def sample_case_update_data():
    """Partial update payload."""
    return {
        "patient_first_name": "Janet",
        "clinical_history": {
            "clinicalIndication": "Diagnostic - palpable mass",
            "familyHistoryBreastCancer": True,
            "personalHistoryBreastCancer": False,
            "previousBiopsy": False,
            "comparisonAvailable": False,
        },
    }


@pytest.fixture
def sample_image_data():
    """Case image creation payload."""
    return {
        "filename": "RCC_001.dcm",
        "view_type": "CC",
        "laterality": "R",
        "file_size": 15_000_000,
        "mime_type": "application/dicom",
    }


@pytest.fixture
def sample_finding_data():
    """Case finding creation payload."""
    return {
        "finding_type": "mass",
        "laterality": "R",
        "description": "Irregular spiculated mass in upper outer quadrant",
        "location": {"clock_position": "10", "quadrant": "upper_outer", "depth": "middle"},
        "size": {"length_mm": 15.0, "width_mm": 12.0},
        "ai_confidence": 0.87,
        "ai_generated": True,
    }


# ============================================================================
# 1. DB MODEL TESTS
# ============================================================================

class TestClinicalCaseModel:
    """Test the ClinicalCase SQLAlchemy model definition."""

    def test_model_can_be_imported(self):
        """Model module must be importable."""
        from app.db.models.clinical_case import ClinicalCase, CaseImage, CaseFinding
        assert ClinicalCase is not None
        assert CaseImage is not None
        assert CaseFinding is not None

    def test_clinical_case_has_required_columns(self):
        """ClinicalCase must have all required columns."""
        from app.db.models.clinical_case import ClinicalCase
        required = [
            "id", "case_number", "created_by",
            "patient_mrn", "patient_first_name", "patient_last_name",
            "patient_dob", "patient_sex",
            "clinical_history",
            "workflow_current_step", "workflow_status",
            "workflow_completed_steps", "workflow_locked",
            "birads_assessment", "report_content",
            "signed_by", "signed_at", "signature_hash",
            "created_at", "updated_at", "is_deleted",
        ]
        columns = {c.name for c in ClinicalCase.__table__.columns}
        for col in required:
            assert col in columns, f"Missing column: {col}"

    def test_clinical_case_tablename(self):
        from app.db.models.clinical_case import ClinicalCase
        assert ClinicalCase.__tablename__ == "clinical_cases"

    def test_case_image_has_required_columns(self):
        from app.db.models.clinical_case import CaseImage
        required = [
            "id", "case_id", "filename", "view_type", "laterality",
            "upload_status", "file_size", "mime_type",
            "analysis_result", "analyzed_at",
        ]
        columns = {c.name for c in CaseImage.__table__.columns}
        for col in required:
            assert col in columns, f"Missing column: {col}"

    def test_case_image_tablename(self):
        from app.db.models.clinical_case import CaseImage
        assert CaseImage.__tablename__ == "case_images"

    def test_case_finding_has_required_columns(self):
        from app.db.models.clinical_case import CaseFinding
        required = [
            "id", "case_id", "finding_type", "laterality",
            "description", "location", "size",
            "ai_confidence", "ai_generated",
            "radiologist_confirmed", "radiologist_notes",
        ]
        columns = {c.name for c in CaseFinding.__table__.columns}
        for col in required:
            assert col in columns, f"Missing column: {col}"

    def test_case_finding_tablename(self):
        from app.db.models.clinical_case import CaseFinding
        assert CaseFinding.__tablename__ == "case_findings"

    def test_clinical_case_inherits_base_model(self):
        """Must inherit from BaseModel (UUID PK, timestamps, soft delete)."""
        from app.db.models.clinical_case import ClinicalCase
        from app.db.base import BaseModel
        assert issubclass(ClinicalCase, BaseModel)

    def test_case_image_inherits_base_model(self):
        from app.db.models.clinical_case import CaseImage
        from app.db.base import BaseModel
        assert issubclass(CaseImage, BaseModel)

    def test_case_finding_inherits_base_model(self):
        from app.db.models.clinical_case import CaseFinding
        from app.db.base import BaseModel
        assert issubclass(CaseFinding, BaseModel)

    def test_workflow_status_enum_exists(self):
        from app.db.models.clinical_case import CaseWorkflowStatus
        assert hasattr(CaseWorkflowStatus, "DRAFT")
        assert hasattr(CaseWorkflowStatus, "IN_PROGRESS")
        assert hasattr(CaseWorkflowStatus, "PENDING_REVIEW")
        assert hasattr(CaseWorkflowStatus, "COMPLETED")
        assert hasattr(CaseWorkflowStatus, "FINALIZED")

    def test_workflow_step_enum_exists(self):
        from app.db.models.clinical_case import CaseWorkflowStep
        assert hasattr(CaseWorkflowStep, "PATIENT_REGISTRATION")
        assert hasattr(CaseWorkflowStep, "CLINICAL_HISTORY")
        assert hasattr(CaseWorkflowStep, "IMAGE_UPLOAD")
        assert hasattr(CaseWorkflowStep, "BATCH_AI_ANALYSIS")
        assert hasattr(CaseWorkflowStep, "BIRADS_ASSESSMENT")
        assert hasattr(CaseWorkflowStep, "REPORT_GENERATION")
        assert hasattr(CaseWorkflowStep, "FINALIZE")
        assert hasattr(CaseWorkflowStep, "DIGITAL_SIGNATURE")


# ============================================================================
# 2. PYDANTIC SCHEMA TESTS
# ============================================================================

class TestCaseSchemas:
    """Test Pydantic schemas for request/response validation."""

    def test_schemas_importable(self):
        from app.schemas.clinical_case import (
            CaseCreate, CaseUpdate, CaseFinalize,
            CaseResponse, CaseListResponse,
            CaseImageResponse, CaseFindingResponse,
            WorkflowAdvance,
        )

    def test_case_create_accepts_valid_data(self, sample_case_create_data):
        from app.schemas.clinical_case import CaseCreate
        schema = CaseCreate(**sample_case_create_data)
        assert schema.patient_mrn == "MRN-001234"
        assert schema.patient_first_name == "Jane"
        assert schema.patient_sex == "F"

    def test_case_create_allows_minimal_data(self):
        """Case can be created with no patient data (filled later)."""
        from app.schemas.clinical_case import CaseCreate
        schema = CaseCreate()
        assert schema.patient_mrn is None

    def test_case_create_rejects_invalid_sex(self):
        from app.schemas.clinical_case import CaseCreate
        with pytest.raises(Exception):  # ValidationError
            CaseCreate(patient_sex="X")  # Only M, F, O allowed

    def test_case_update_partial(self, sample_case_update_data):
        from app.schemas.clinical_case import CaseUpdate
        schema = CaseUpdate(**sample_case_update_data)
        assert schema.patient_first_name == "Janet"
        assert schema.patient_last_name is None  # not provided = None

    def test_case_response_includes_nested_images(self):
        from app.schemas.clinical_case import CaseResponse
        data = {
            "id": str(uuid.uuid4()),
            "case_number": "CV-2026-000001",
            "patient_mrn": "MRN-001",
            "patient_first_name": "Jane",
            "patient_last_name": "Doe",
            "patient_dob": "1975-06-15",
            "patient_sex": "F",
            "clinical_history": {},
            "workflow_current_step": "patient_registration",
            "workflow_status": "draft",
            "workflow_completed_steps": [],
            "workflow_locked": False,
            "birads_assessment": None,
            "report_content": None,
            "signed_at": None,
            "signature_hash": None,
            "images": [],
            "findings": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        resp = CaseResponse(**data)
        assert resp.case_number == "CV-2026-000001"
        assert resp.images == []
        assert resp.findings == []

    def test_case_list_response_is_lightweight(self):
        """List response should NOT include images/findings."""
        from app.schemas.clinical_case import CaseListResponse
        data = {
            "id": str(uuid.uuid4()),
            "case_number": "CV-2026-000002",
            "patient_mrn": "MRN-002",
            "patient_first_name": "John",
            "patient_last_name": "Smith",
            "workflow_current_step": "image_upload",
            "workflow_status": "in_progress",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        resp = CaseListResponse(**data)
        assert resp.case_number == "CV-2026-000002"
        # Must NOT have images/findings attributes
        assert not hasattr(resp, "images") or "images" not in resp.model_fields

    def test_workflow_advance_schema(self):
        from app.schemas.clinical_case import WorkflowAdvance
        schema = WorkflowAdvance(target_step="clinical_history")
        assert schema.target_step == "clinical_history"

    def test_case_finalize_schema(self):
        from app.schemas.clinical_case import CaseFinalize
        schema = CaseFinalize(signature_hash="sha256:abc123")
        assert schema.signature_hash == "sha256:abc123"

    def test_case_image_response_schema(self, sample_image_data):
        from app.schemas.clinical_case import CaseImageResponse
        data = {
            "id": str(uuid.uuid4()),
            **sample_image_data,
            "upload_status": "ready",
            "analysis_result": None,
            "analyzed_at": None,
        }
        resp = CaseImageResponse(**data)
        assert resp.view_type == "CC"
        assert resp.laterality == "R"

    def test_case_finding_response_schema(self, sample_finding_data):
        from app.schemas.clinical_case import CaseFindingResponse
        data = {
            "id": str(uuid.uuid4()),
            **sample_finding_data,
            "radiologist_confirmed": False,
        }
        resp = CaseFindingResponse(**data)
        assert resp.finding_type == "mass"
        assert resp.ai_confidence == 0.87


# ============================================================================
# 3. SERVICE LAYER TESTS
# ============================================================================

class TestCaseService:
    """Test business logic in the case service layer."""

    def test_service_importable(self):
        from app.services.case_service import CaseService

    def test_generate_case_number_format(self, mock_db):
        """Case number must follow CV-YYYY-NNNNNN format."""
        from app.services.case_service import CaseService
        service = CaseService(mock_db)
        # Mock the count query to return 0 (first case of the year)
        mock_db.query.return_value.filter.return_value.count.return_value = 0
        case_number = service.generate_case_number()
        year = datetime.now().year
        assert case_number.startswith(f"CV-{year}-")
        assert len(case_number) == 14  # CV-2026-000001

    def test_generate_case_number_increments(self, mock_db):
        from app.services.case_service import CaseService
        service = CaseService(mock_db)
        mock_db.query.return_value.filter.return_value.count.return_value = 42
        case_number = service.generate_case_number()
        assert case_number.endswith("000043")

    def test_create_case_returns_case(self, mock_db, sample_user_id, sample_case_create_data):
        from app.services.case_service import CaseService
        from app.schemas.clinical_case import CaseCreate
        service = CaseService(mock_db)
        # Mock case number generation
        mock_db.query.return_value.filter.return_value.count.return_value = 0

        create_data = CaseCreate(**sample_case_create_data)
        case = service.create_case(user_id=sample_user_id, data=create_data)

        assert case is not None
        assert case.patient_mrn == "MRN-001234"
        assert case.patient_first_name == "Jane"
        assert case.workflow_status == "draft"
        assert case.workflow_current_step == "patient_registration"
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_create_case_sets_creator(self, mock_db, sample_user_id):
        from app.services.case_service import CaseService
        from app.schemas.clinical_case import CaseCreate
        service = CaseService(mock_db)
        mock_db.query.return_value.filter.return_value.count.return_value = 0

        case = service.create_case(user_id=sample_user_id, data=CaseCreate())
        assert case.created_by == sample_user_id

    def test_get_case_found(self, mock_db, sample_case_id):
        from app.services.case_service import CaseService
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        result = service.get_case(sample_case_id)
        assert result.id == sample_case_id

    def test_get_case_not_found_raises(self, mock_db):
        from app.services.case_service import CaseService, CaseNotFoundException
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = None

        service = CaseService(mock_db)
        with pytest.raises(CaseNotFoundException):
            service.get_case(uuid.uuid4())

    def test_list_cases_filters_by_user(self, mock_db, sample_user_id):
        from app.services.case_service import CaseService
        mock_db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []

        service = CaseService(mock_db)
        result = service.list_cases(user_id=sample_user_id)
        assert isinstance(result, list)

    def test_update_case_merges_fields(self, mock_db, sample_case_id, sample_case_update_data):
        from app.services.case_service import CaseService
        from app.schemas.clinical_case import CaseUpdate
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_case.workflow_locked = False
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        update_data = CaseUpdate(**sample_case_update_data)
        result = service.update_case(case_id=sample_case_id, data=update_data)
        mock_db.commit.assert_called_once()

    def test_update_locked_case_raises(self, mock_db, sample_case_id):
        """Cannot update a finalized (locked) case."""
        from app.services.case_service import CaseService, CaseLockedError
        from app.schemas.clinical_case import CaseUpdate
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_case.workflow_locked = True
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        with pytest.raises(CaseLockedError):
            service.update_case(case_id=sample_case_id, data=CaseUpdate(patient_first_name="X"))

    def test_soft_delete_case(self, mock_db, sample_case_id):
        from app.services.case_service import CaseService
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        result = service.delete_case(sample_case_id)
        assert result is True
        assert mock_case.is_deleted is True
        mock_db.commit.assert_called_once()

    def test_advance_workflow_valid(self, mock_db, sample_case_id):
        """Advancing from patient_registration → clinical_history should succeed."""
        from app.services.case_service import CaseService
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_case.workflow_locked = False
        mock_case.workflow_current_step = "patient_registration"
        mock_case.workflow_completed_steps = []
        mock_case.workflow_status = "draft"
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        result = service.advance_workflow(case_id=sample_case_id, target_step="clinical_history")
        mock_db.commit.assert_called_once()

    def test_advance_workflow_locked_raises(self, mock_db, sample_case_id):
        from app.services.case_service import CaseService, CaseLockedError
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_case.workflow_locked = True
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        with pytest.raises(CaseLockedError):
            service.advance_workflow(case_id=sample_case_id, target_step="clinical_history")

    def test_advance_workflow_skip_step_raises(self, mock_db, sample_case_id):
        """Cannot skip ahead: patient_registration → birads_assessment must fail."""
        from app.services.case_service import CaseService, InvalidWorkflowTransitionError
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_case.workflow_locked = False
        mock_case.workflow_current_step = "patient_registration"
        mock_case.workflow_completed_steps = []
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        with pytest.raises(InvalidWorkflowTransitionError):
            service.advance_workflow(case_id=sample_case_id, target_step="birads_assessment")

    def test_finalize_case_sets_locked(self, mock_db, sample_case_id, sample_user_id):
        from app.services.case_service import CaseService
        from app.schemas.clinical_case import CaseFinalize
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_case.workflow_locked = False
        mock_case.workflow_current_step = "digital_signature"
        mock_case.workflow_status = "completed"
        mock_case.workflow_completed_steps = [
            "patient_registration", "clinical_history", "image_upload",
            "image_verification", "batch_ai_analysis", "findings_review",
            "measurements", "annotations", "birads_assessment",
            "report_generation", "finalize",
        ]
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        finalize_data = CaseFinalize(signature_hash="sha256:abc123")
        result = service.finalize_case(
            case_id=sample_case_id, user_id=sample_user_id, data=finalize_data
        )
        assert mock_case.workflow_locked is True
        assert mock_case.signed_by == sample_user_id
        mock_db.commit.assert_called_once()

    def test_add_image_to_case(self, mock_db, sample_case_id, sample_image_data):
        from app.services.case_service import CaseService
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_case.workflow_locked = False
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        image = service.add_image_to_case(case_id=sample_case_id, image_data=sample_image_data)
        assert image is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_add_finding_to_case(self, mock_db, sample_case_id, sample_finding_data):
        from app.services.case_service import CaseService
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.id = sample_case_id
        mock_case.is_deleted = False
        mock_case.workflow_locked = False
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        finding = service.add_finding_to_case(case_id=sample_case_id, finding_data=sample_finding_data)
        assert finding is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()


# ============================================================================
# 4. API ENDPOINT TESTS
# ============================================================================

class TestCaseAPIEndpoints:
    """Test HTTP endpoints for case management."""

    @pytest.fixture
    def mock_user(self):
        """Create a mock authenticated user."""
        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = "radiologist@nhs.net"
        user.role = "radiologist"
        user.is_active = True
        user.organization_id = uuid.uuid4()
        return user

    @pytest.fixture
    def mock_case_service(self):
        """Mock the CaseService."""
        return MagicMock()

    @pytest.fixture
    def authenticated_client(self, mock_user):
        """FastAPI TestClient with mocked authentication."""
        from fastapi.testclient import TestClient
        from app.core.dependencies import get_current_active_user
        from app.db.session import get_db

        # Import app last to pick up any route registrations
        from main import app

        # Override auth dependency to return our mock user
        app.dependency_overrides[get_current_active_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: MagicMock()

        client = TestClient(app)
        yield client

        # Cleanup
        app.dependency_overrides.clear()

    def test_cases_router_is_registered(self, authenticated_client):
        """The /api/v1/cases/ endpoint should be reachable (not 404)."""
        response = authenticated_client.get("/api/v1/cases/")
        # Should be 200 or 500 (if service fails) but NOT 404
        assert response.status_code != 404, "Cases router not registered"

    def test_create_case_endpoint(self, authenticated_client, sample_case_create_data, mock_user):
        """POST /api/v1/cases/ should create a case."""
        with patch("app.api.v1.endpoints.cases.get_case_service") as mock_svc_fn:
            mock_svc = MagicMock()
            mock_case = MagicMock()
            mock_case.id = uuid.uuid4()
            mock_case.case_number = "CV-2026-000001"
            mock_case.patient_mrn = "MRN-001234"
            mock_case.patient_first_name = "Jane"
            mock_case.patient_last_name = "Doe"
            mock_case.patient_dob = date(1975, 6, 15)
            mock_case.patient_sex = "F"
            mock_case.clinical_history = sample_case_create_data["clinical_history"]
            mock_case.workflow_current_step = "patient_registration"
            mock_case.workflow_status = "draft"
            mock_case.workflow_completed_steps = []
            mock_case.workflow_locked = False
            mock_case.birads_assessment = None
            mock_case.report_content = None
            mock_case.signed_at = None
            mock_case.signature_hash = None
            mock_case.images = []
            mock_case.findings = []
            mock_case.created_at = datetime.now(timezone.utc)
            mock_case.updated_at = datetime.now(timezone.utc)
            mock_svc.create_case.return_value = mock_case
            mock_svc_fn.return_value = mock_svc

            response = authenticated_client.post(
                "/api/v1/cases/",
                json=sample_case_create_data,
            )
            assert response.status_code in (200, 201)
            data = response.json()
            assert "case_number" in data
            assert data["patient_mrn"] == "MRN-001234"

    def test_list_cases_endpoint(self, authenticated_client, mock_user):
        """GET /api/v1/cases/ should return a list."""
        with patch("app.api.v1.endpoints.cases.get_case_service") as mock_svc_fn:
            mock_svc = MagicMock()
            mock_svc.list_cases.return_value = []
            mock_svc_fn.return_value = mock_svc

            response = authenticated_client.get("/api/v1/cases/")
            assert response.status_code == 200
            assert isinstance(response.json(), list)

    def test_get_case_endpoint(self, authenticated_client, mock_user):
        """GET /api/v1/cases/{id} should return a single case."""
        case_id = uuid.uuid4()
        with patch("app.api.v1.endpoints.cases.get_case_service") as mock_svc_fn:
            mock_svc = MagicMock()
            mock_case = MagicMock()
            mock_case.id = case_id
            mock_case.case_number = "CV-2026-000001"
            mock_case.patient_mrn = "MRN-001"
            mock_case.patient_first_name = "Jane"
            mock_case.patient_last_name = "Doe"
            mock_case.patient_dob = date(1975, 6, 15)
            mock_case.patient_sex = "F"
            mock_case.clinical_history = {}
            mock_case.workflow_current_step = "patient_registration"
            mock_case.workflow_status = "draft"
            mock_case.workflow_completed_steps = []
            mock_case.workflow_locked = False
            mock_case.birads_assessment = None
            mock_case.report_content = None
            mock_case.signed_at = None
            mock_case.signature_hash = None
            mock_case.images = []
            mock_case.findings = []
            mock_case.created_at = datetime.now(timezone.utc)
            mock_case.updated_at = datetime.now(timezone.utc)
            mock_svc.get_case.return_value = mock_case
            mock_svc_fn.return_value = mock_svc

            response = authenticated_client.get(f"/api/v1/cases/{case_id}")
            assert response.status_code == 200
            assert response.json()["case_number"] == "CV-2026-000001"

    def test_get_case_not_found(self, authenticated_client):
        """GET /api/v1/cases/{id} should return 404 for nonexistent case."""
        from app.services.case_service import CaseNotFoundException
        case_id = uuid.uuid4()
        with patch("app.api.v1.endpoints.cases.get_case_service") as mock_svc_fn:
            mock_svc = MagicMock()
            mock_svc.get_case.side_effect = CaseNotFoundException(f"Case {case_id} not found")
            mock_svc_fn.return_value = mock_svc

            response = authenticated_client.get(f"/api/v1/cases/{case_id}")
            assert response.status_code == 404

    def test_update_case_endpoint(self, authenticated_client, sample_case_update_data):
        """PATCH /api/v1/cases/{id} should update fields."""
        case_id = uuid.uuid4()
        with patch("app.api.v1.endpoints.cases.get_case_service") as mock_svc_fn:
            mock_svc = MagicMock()
            mock_case = MagicMock()
            mock_case.id = case_id
            mock_case.case_number = "CV-2026-000001"
            mock_case.patient_mrn = "MRN-001"
            mock_case.patient_first_name = "Janet"
            mock_case.patient_last_name = "Doe"
            mock_case.patient_dob = date(1975, 6, 15)
            mock_case.patient_sex = "F"
            mock_case.clinical_history = sample_case_update_data["clinical_history"]
            mock_case.workflow_current_step = "patient_registration"
            mock_case.workflow_status = "draft"
            mock_case.workflow_completed_steps = []
            mock_case.workflow_locked = False
            mock_case.birads_assessment = None
            mock_case.report_content = None
            mock_case.signed_at = None
            mock_case.signature_hash = None
            mock_case.images = []
            mock_case.findings = []
            mock_case.created_at = datetime.now(timezone.utc)
            mock_case.updated_at = datetime.now(timezone.utc)
            mock_svc.update_case.return_value = mock_case
            mock_svc_fn.return_value = mock_svc

            response = authenticated_client.patch(
                f"/api/v1/cases/{case_id}",
                json=sample_case_update_data,
            )
            assert response.status_code == 200
            assert response.json()["patient_first_name"] == "Janet"

    def test_delete_case_endpoint(self, authenticated_client):
        """DELETE /api/v1/cases/{id} should soft-delete."""
        case_id = uuid.uuid4()
        with patch("app.api.v1.endpoints.cases.get_case_service") as mock_svc_fn:
            mock_svc = MagicMock()
            mock_svc.delete_case.return_value = True
            mock_svc_fn.return_value = mock_svc

            response = authenticated_client.delete(f"/api/v1/cases/{case_id}")
            assert response.status_code in (200, 204)

    def test_advance_workflow_endpoint(self, authenticated_client):
        """PATCH /api/v1/cases/{id}/workflow should advance step."""
        case_id = uuid.uuid4()
        with patch("app.api.v1.endpoints.cases.get_case_service") as mock_svc_fn:
            mock_svc = MagicMock()
            mock_case = MagicMock()
            mock_case.id = case_id
            mock_case.case_number = "CV-2026-000001"
            mock_case.patient_mrn = None
            mock_case.patient_first_name = None
            mock_case.patient_last_name = None
            mock_case.patient_dob = None
            mock_case.patient_sex = None
            mock_case.clinical_history = {}
            mock_case.workflow_current_step = "clinical_history"
            mock_case.workflow_status = "in_progress"
            mock_case.workflow_completed_steps = ["patient_registration"]
            mock_case.workflow_locked = False
            mock_case.birads_assessment = None
            mock_case.report_content = None
            mock_case.signed_at = None
            mock_case.signature_hash = None
            mock_case.images = []
            mock_case.findings = []
            mock_case.created_at = datetime.now(timezone.utc)
            mock_case.updated_at = datetime.now(timezone.utc)
            mock_svc.advance_workflow.return_value = mock_case
            mock_svc_fn.return_value = mock_svc

            response = authenticated_client.patch(
                f"/api/v1/cases/{case_id}/workflow",
                json={"target_step": "clinical_history"},
            )
            assert response.status_code == 200
            assert response.json()["workflow_current_step"] == "clinical_history"

    def test_finalize_case_endpoint(self, authenticated_client, mock_user):
        """POST /api/v1/cases/{id}/finalize should lock the case."""
        case_id = uuid.uuid4()
        with patch("app.api.v1.endpoints.cases.get_case_service") as mock_svc_fn:
            mock_svc = MagicMock()
            mock_case = MagicMock()
            mock_case.id = case_id
            mock_case.case_number = "CV-2026-000001"
            mock_case.patient_mrn = "MRN-001"
            mock_case.patient_first_name = "Jane"
            mock_case.patient_last_name = "Doe"
            mock_case.patient_dob = date(1975, 6, 15)
            mock_case.patient_sex = "F"
            mock_case.clinical_history = {}
            mock_case.workflow_current_step = "digital_signature"
            mock_case.workflow_status = "finalized"
            mock_case.workflow_completed_steps = ["patient_registration", "clinical_history"]
            mock_case.workflow_locked = True
            mock_case.birads_assessment = None
            mock_case.report_content = "Final report text"
            mock_case.signed_at = datetime.now(timezone.utc)
            mock_case.signature_hash = "sha256:abc123"
            mock_case.images = []
            mock_case.findings = []
            mock_case.created_at = datetime.now(timezone.utc)
            mock_case.updated_at = datetime.now(timezone.utc)
            mock_svc.finalize_case.return_value = mock_case
            mock_svc_fn.return_value = mock_svc

            response = authenticated_client.post(
                f"/api/v1/cases/{case_id}/finalize",
                json={"signature_hash": "sha256:abc123"},
            )
            assert response.status_code == 200
            assert response.json()["workflow_locked"] is True


# ============================================================================
# 5. WORKFLOW TRANSITION RULES TESTS
# ============================================================================

class TestWorkflowTransitions:
    """Test the 12-step workflow state machine rules."""

    STEP_ORDER = [
        "patient_registration",
        "clinical_history",
        "image_upload",
        "image_verification",
        "batch_ai_analysis",
        "findings_review",
        "measurements",
        "annotations",
        "birads_assessment",
        "report_generation",
        "finalize",
        "digital_signature",
    ]

    def test_valid_forward_sequential_transitions(self, mock_db):
        """Each step should be able to advance to the next step."""
        from app.services.case_service import CaseService
        from app.db.models.clinical_case import ClinicalCase

        service = CaseService(mock_db)

        for i in range(len(self.STEP_ORDER) - 1):
            current = self.STEP_ORDER[i]
            next_step = self.STEP_ORDER[i + 1]

            mock_case = MagicMock(spec=ClinicalCase)
            mock_case.is_deleted = False
            mock_case.workflow_locked = False
            mock_case.workflow_current_step = current
            mock_case.workflow_completed_steps = self.STEP_ORDER[:i]
            mock_case.workflow_status = "in_progress" if i > 0 else "draft"
            mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case
            mock_db.commit.reset_mock()

            result = service.advance_workflow(case_id=uuid.uuid4(), target_step=next_step)
            mock_db.commit.assert_called_once()

    def test_backward_navigation_to_completed_step(self, mock_db):
        """Should be able to go back to a completed step."""
        from app.services.case_service import CaseService
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.is_deleted = False
        mock_case.workflow_locked = False
        mock_case.workflow_current_step = "birads_assessment"
        mock_case.workflow_completed_steps = [
            "patient_registration", "clinical_history", "image_upload",
            "image_verification", "batch_ai_analysis", "findings_review",
            "measurements", "annotations",
        ]
        mock_case.workflow_status = "in_progress"
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        result = service.advance_workflow(case_id=uuid.uuid4(), target_step="image_upload")
        mock_db.commit.assert_called_once()

    def test_cannot_skip_forward(self, mock_db):
        """Cannot jump from step 0 to step 8."""
        from app.services.case_service import CaseService, InvalidWorkflowTransitionError
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.is_deleted = False
        mock_case.workflow_locked = False
        mock_case.workflow_current_step = "patient_registration"
        mock_case.workflow_completed_steps = []
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        with pytest.raises(InvalidWorkflowTransitionError):
            service.advance_workflow(case_id=uuid.uuid4(), target_step="birads_assessment")

    def test_finalized_case_cannot_advance(self, mock_db):
        """Locked cases reject all transitions."""
        from app.services.case_service import CaseService, CaseLockedError
        from app.db.models.clinical_case import ClinicalCase

        mock_case = MagicMock(spec=ClinicalCase)
        mock_case.is_deleted = False
        mock_case.workflow_locked = True
        mock_db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_case

        service = CaseService(mock_db)
        with pytest.raises(CaseLockedError):
            service.advance_workflow(case_id=uuid.uuid4(), target_step="clinical_history")
