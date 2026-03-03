"""
TDD Tests for Demo Case Seeding — Phase 3 Backend Seeding

Tests the seed_demo_cases module that populates the database with
the 3 curated demo clinical cases. Uses SQLite in-memory for test
isolation (no real PostgreSQL required).

Key contracts tested:
  1. seed_demo_cases() creates exactly 3 ClinicalCase records
  2. Each case has the correct patient demographics
  3. Each case has the correct number of CaseImage records
  4. Image records have correct view_type and laterality
  5. Clinical history is populated as JSONB
  6. Workflow starts at patient_registration / DRAFT
  7. Seeding is idempotent (safe to run multiple times)
  8. Case numbers follow CV-YYYY-NNNNNN format

Usage:
    cd clinicalvision_backend
    python -m pytest tests/test_seed_demo_cases.py -v --tb=short
"""

import re
import uuid
from datetime import date, datetime
from typing import Generator

import pytest
from sqlalchemy import create_engine, event, JSON
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Session, sessionmaker

# ============================================================================
# SQLite compatibility — compile PostgreSQL types for SQLite DDL
# Must be registered BEFORE create_all() is called.
# ============================================================================

@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(element, compiler, **kw):
    """JSONB → JSON for SQLite. Python-level serialisation inherited from JSON."""
    return "JSON"


@compiles(PG_UUID, "sqlite")
def _compile_uuid_sqlite(element, compiler, **kw):
    """UUID → CHAR(32) for SQLite. process_bind/result_value still works."""
    return "CHAR(32)"


# ============================================================================
# Module-level setup — import all models so Base.metadata has every table,
# then import the seeder module under test.
# ============================================================================

import app.db.models  # noqa: F401  — registers all tables with Base.metadata

from app.db.session import Base
from app.db.models.clinical_case import (
    CaseImage,
    CaseFinding,
    CaseWorkflowStatus,
    CaseWorkflowStep,
    ClinicalCase,
)
from app.db.models.user import User, UserRole
from app.db.models.organization import Organization

# Import the seeder module under test
from scripts.seed_demo_cases import (
    DEMO_CASE_SPECS,
    seed_demo_cases,
    create_demo_user,
    build_clinical_history_json,
)


# ============================================================================
# Constants — must match the demo data package specs
# ============================================================================

EXPECTED_CASES = {
    "DEMO-001": {
        "patient_first_name": "Jane",
        "patient_last_name": "Thompson",
        "patient_sex": "F",
        "image_count": 4,
        "expected_pathology": "BENIGN",
        "difficulty": "Easy",
    },
    "DEMO-002": {
        "patient_first_name": "Maria",
        "patient_last_name": "Chen",
        "patient_sex": "F",
        "image_count": 6,
        "expected_pathology": "MALIGNANT",
        "difficulty": "Intermediate",
    },
    "DEMO-003": {
        "patient_first_name": "Sarah",
        "patient_last_name": "Williams",
        "patient_sex": "F",
        "image_count": 2,
        "expected_pathology": "MALIGNANT",
        "difficulty": "Advanced",
    },
}

TOTAL_IMAGES = 12  # 4 + 6 + 2
CASE_NUMBER_PATTERN = re.compile(r"^CV-\d{4}-\d{6}$")


# ============================================================================
# Fixtures — in-memory SQLite database with all tables
# ============================================================================

@pytest.fixture(scope="function")
def db_engine():
    """Create an in-memory SQLite engine with all tables."""
    engine = create_engine("sqlite:///:memory:")

    # SQLite FK enforcement
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator[Session, None, None]:
    """Provide a transactional test session."""
    TestSession = sessionmaker(bind=db_engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def demo_user(db_session: Session) -> User:
    """Create a demo user for case ownership."""
    user = create_demo_user(db_session)
    return user


@pytest.fixture
def seeded_db(db_session: Session, demo_user: User):
    """Run the seeder and return the session with seeded data."""
    seed_demo_cases(db_session, demo_user.id)
    return db_session


# ============================================================================
# Tests — Module Exports
# ============================================================================

class TestModuleExports:
    """Verify the seeder module exports the expected functions and constants."""

    def test_demo_case_specs_is_a_list(self):
        assert isinstance(DEMO_CASE_SPECS, list)

    def test_demo_case_specs_has_3_entries(self):
        assert len(DEMO_CASE_SPECS) == 3

    def test_seed_demo_cases_is_callable(self):
        assert callable(seed_demo_cases)

    def test_create_demo_user_is_callable(self):
        assert callable(create_demo_user)

    def test_build_clinical_history_json_is_callable(self):
        assert callable(build_clinical_history_json)


# ============================================================================
# Tests — Demo User Creation
# ============================================================================

class TestDemoUserCreation:
    """Verify demo user creation for case ownership."""

    def test_creates_user_in_db(self, db_session: Session):
        user = create_demo_user(db_session)
        assert user is not None
        assert user.id is not None

    def test_user_has_correct_email(self, db_session: Session):
        user = create_demo_user(db_session)
        assert user.email == "demo@clinicalvision.ai"

    def test_user_has_radiologist_role(self, db_session: Session):
        user = create_demo_user(db_session)
        assert user.role == UserRole.RADIOLOGIST

    def test_user_is_active(self, db_session: Session):
        user = create_demo_user(db_session)
        assert user.is_active is True

    def test_idempotent_returns_existing_user(self, db_session: Session):
        user1 = create_demo_user(db_session)
        user2 = create_demo_user(db_session)
        assert user1.id == user2.id


# ============================================================================
# Tests — Case Creation
# ============================================================================

class TestCaseCreation:
    """Verify correct ClinicalCase records are created."""

    def test_creates_exactly_3_cases(self, seeded_db: Session):
        count = seeded_db.query(ClinicalCase).count()
        assert count == 3

    def test_cases_have_unique_case_numbers(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        numbers = [c.case_number for c in cases]
        assert len(set(numbers)) == 3

    def test_case_numbers_follow_pattern(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert CASE_NUMBER_PATTERN.match(case.case_number), \
                f"Case number '{case.case_number}' doesn't match CV-YYYY-NNNNNN"

    def test_cases_are_not_deleted(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert case.is_deleted is False

    def test_cases_have_backend_id_matching_demo_id(self, seeded_db: Session):
        """backend_id stores the DEMO-NNN identifier for lookup."""
        cases = seeded_db.query(ClinicalCase).all()
        backend_ids = {c.backend_id for c in cases}
        assert backend_ids == {"DEMO-001", "DEMO-002", "DEMO-003"}


# ============================================================================
# Tests — Patient Demographics
# ============================================================================

class TestPatientDemographics:
    """Verify patient data is correctly populated on each case."""

    def test_demo_001_patient_info(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-001").first()
        assert case.patient_mrn == "DEMO-001"
        assert case.patient_first_name == "Jane"
        assert case.patient_last_name == "Thompson"
        assert case.patient_sex == "F"

    def test_demo_002_patient_info(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-002").first()
        assert case.patient_mrn == "DEMO-002"
        assert case.patient_first_name == "Maria"
        assert case.patient_last_name == "Chen"
        assert case.patient_sex == "F"

    def test_demo_003_patient_info(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-003").first()
        assert case.patient_mrn == "DEMO-003"
        assert case.patient_first_name == "Sarah"
        assert case.patient_last_name == "Williams"
        assert case.patient_sex == "F"

    def test_all_cases_have_date_of_birth(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert case.patient_dob is not None
            assert isinstance(case.patient_dob, date)


# ============================================================================
# Tests — Clinical History
# ============================================================================

class TestClinicalHistory:
    """Verify clinical history JSONB is populated correctly."""

    def test_clinical_history_is_dict(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert isinstance(case.clinical_history, dict)

    def test_clinical_history_has_indication(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert "indication" in case.clinical_history

    def test_clinical_history_has_brca_status(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert "brcaStatus" in case.clinical_history

    def test_demo_001_is_routine_screening(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-001").first()
        assert "screening" in case.clinical_history["indication"].lower()

    def test_demo_002_has_palpable_mass(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-002").first()
        assert "palpable" in case.clinical_history["indication"].lower()

    def test_demo_003_has_calcification_history(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-003").first()
        assert "calcif" in case.clinical_history["indication"].lower()

    def test_build_clinical_history_returns_dict(self):
        result = build_clinical_history_json(
            indication="Test indication",
            prior_studies="None",
            brca_status="Negative",
            family_history="None",
            symptoms="None",
        )
        assert isinstance(result, dict)
        assert result["indication"] == "Test indication"
        assert result["brcaStatus"] == "Negative"


# ============================================================================
# Tests — Case Images
# ============================================================================

class TestCaseImages:
    """Verify CaseImage records match the demo data package specs."""

    def test_total_image_count(self, seeded_db: Session):
        count = seeded_db.query(CaseImage).count()
        assert count == TOTAL_IMAGES

    def test_demo_001_has_4_images(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-001").first()
        assert len(case.images) == 4

    def test_demo_002_has_6_images(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-002").first()
        assert len(case.images) == 6

    def test_demo_003_has_2_images(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-003").first()
        assert len(case.images) == 2

    def test_image_filenames_match_demo_pattern(self, seeded_db: Session):
        images = seeded_db.query(CaseImage).all()
        pattern = re.compile(r"^DEMO-\d{3}_(RIGHT|LEFT)_(CC|MLO|SPOT|MAG)\.(png|dcm)$")
        for img in images:
            assert pattern.match(img.filename), \
                f"Filename '{img.filename}' doesn't match expected pattern"

    def test_image_view_types_are_valid(self, seeded_db: Session):
        images = seeded_db.query(CaseImage).all()
        valid_views = {"CC", "MLO", "SPOT", "MAG"}
        for img in images:
            assert img.view_type in valid_views, \
                f"Invalid view_type: {img.view_type}"

    def test_image_lateralities_are_valid(self, seeded_db: Session):
        images = seeded_db.query(CaseImage).all()
        for img in images:
            assert img.laterality in ("R", "L"), \
                f"Invalid laterality: {img.laterality}"

    def test_demo_001_has_bilateral_views(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-001").first()
        lateralities = {img.laterality for img in case.images}
        assert lateralities == {"R", "L"}

    def test_demo_002_has_spot_and_mag(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-002").first()
        views = {img.view_type for img in case.images}
        assert "SPOT" in views
        assert "MAG" in views

    def test_demo_003_is_left_only(self, seeded_db: Session):
        case = seeded_db.query(ClinicalCase).filter_by(backend_id="DEMO-003").first()
        lateralities = {img.laterality for img in case.images}
        assert lateralities == {"L"}

    def test_images_have_completed_upload_status(self, seeded_db: Session):
        images = seeded_db.query(CaseImage).all()
        for img in images:
            assert img.upload_status == "completed"


# ============================================================================
# Tests — Workflow State
# ============================================================================

class TestWorkflowState:
    """Verify workflow is initialized correctly for demo cases."""

    def test_cases_start_at_patient_registration(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert case.workflow_current_step == CaseWorkflowStep.PATIENT_REGISTRATION.value

    def test_cases_are_in_draft_status(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert case.workflow_status == CaseWorkflowStatus.DRAFT.value

    def test_cases_are_not_locked(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert case.workflow_locked is False

    def test_completed_steps_is_empty_list(self, seeded_db: Session):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert case.workflow_completed_steps == [] or case.workflow_completed_steps is None


# ============================================================================
# Tests — Idempotency
# ============================================================================

class TestIdempotency:
    """Verify seeding is safe to run multiple times."""

    def test_double_seed_creates_same_number_of_cases(self, db_session: Session, demo_user: User):
        seed_demo_cases(db_session, demo_user.id)
        seed_demo_cases(db_session, demo_user.id)
        count = db_session.query(ClinicalCase).count()
        assert count == 3

    def test_double_seed_creates_same_number_of_images(self, db_session: Session, demo_user: User):
        seed_demo_cases(db_session, demo_user.id)
        seed_demo_cases(db_session, demo_user.id)
        count = db_session.query(CaseImage).count()
        assert count == TOTAL_IMAGES

    def test_triple_seed_is_stable(self, db_session: Session, demo_user: User):
        seed_demo_cases(db_session, demo_user.id)
        seed_demo_cases(db_session, demo_user.id)
        seed_demo_cases(db_session, demo_user.id)
        count = db_session.query(ClinicalCase).count()
        assert count == 3


# ============================================================================
# Tests — Case Ownership
# ============================================================================

class TestCaseOwnership:
    """Verify cases are owned by the demo user."""

    def test_all_cases_created_by_demo_user(self, seeded_db: Session, demo_user: User):
        cases = seeded_db.query(ClinicalCase).all()
        for case in cases:
            assert case.created_by == demo_user.id
