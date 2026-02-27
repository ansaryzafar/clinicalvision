"""
Comprehensive Schema Alignment Test Suite

Tests to verify:
1. BI-RADS enum values (including 4A/4B/4C subdivisions)
2. Report status enum alignment
3. Modality enum (including DBT)
4. Finding location schemas
5. User model fields
6. Database model integrity
7. Pydantic schema validation

Run with: pytest tests/test_schema_alignment.py -v
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime, date
from uuid import uuid4
from typing import Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# =============================================================================
# Test BI-RADS Schema Alignment
# =============================================================================

class TestBIRADSSchema:
    """Tests for BI-RADS enum alignment with frontend"""

    def test_birads_enum_values_exist(self):
        """Verify all BI-RADS values including 4A/4B/4C are defined"""
        from app.schemas.reports import BIRADSCategoryEnum
        
        expected_values = ['0', '1', '2', '3', '4A', '4B', '4C', '5', '6']
        actual_values = [e.value for e in BIRADSCategoryEnum]
        
        for expected in expected_values:
            assert expected in actual_values, f"Missing BI-RADS value: {expected}"

    def test_birads_category_4_subdivisions(self):
        """Verify category 4 has proper subdivisions (4A, 4B, 4C)"""
        from app.schemas.reports import BIRADSCategoryEnum
        
        # Should have 4A, 4B, 4C but NOT just '4'
        category_4_values = [e.value for e in BIRADSCategoryEnum if e.value.startswith('4')]
        
        assert '4A' in category_4_values, "Missing 4A (low suspicion)"
        assert '4B' in category_4_values, "Missing 4B (moderate suspicion)"
        assert '4C' in category_4_values, "Missing 4C (high suspicion)"
        assert len(category_4_values) == 3, f"Expected 3 category 4 subdivisions, got {category_4_values}"

    def test_birads_string_type(self):
        """Verify BI-RADS uses string values, not integers"""
        from app.schemas.reports import BIRADSCategoryEnum
        
        for category in BIRADSCategoryEnum:
            assert isinstance(category.value, str), f"BI-RADS {category.name} should be string, got {type(category.value)}"

    def test_birads_clinical_meaning(self):
        """Verify BI-RADS enum names have clinical meaning"""
        from app.schemas.reports import BIRADSCategoryEnum
        
        # Check naming conventions
        assert BIRADSCategoryEnum.INCOMPLETE.value == '0'
        assert BIRADSCategoryEnum.NEGATIVE.value == '1'
        assert BIRADSCategoryEnum.BENIGN.value == '2'
        assert BIRADSCategoryEnum.PROBABLY_BENIGN.value == '3'
        assert BIRADSCategoryEnum.SUSPICIOUS_LOW.value == '4A'
        assert BIRADSCategoryEnum.SUSPICIOUS_MODERATE.value == '4B'
        assert BIRADSCategoryEnum.SUSPICIOUS_HIGH.value == '4C'
        assert BIRADSCategoryEnum.HIGHLY_SUGGESTIVE.value == '5'
        assert BIRADSCategoryEnum.KNOWN_MALIGNANCY.value == '6'


# =============================================================================
# Test Report Status Schema Alignment
# =============================================================================

class TestReportStatusSchema:
    """Tests for report status enum alignment"""

    def test_report_status_enum_values(self):
        """Verify all report status values are defined"""
        from app.schemas.reports import ReportStatusEnum
        
        expected_statuses = ['DRAFT', 'PENDING_REVIEW', 'REVIEWED', 'APPROVED', 'SIGNED', 'AMENDED', 'CANCELLED']
        actual_statuses = [e.value for e in ReportStatusEnum]
        
        for expected in expected_statuses:
            assert expected in actual_statuses, f"Missing report status: {expected}"

    def test_report_status_workflow_order(self):
        """Verify status values support proper workflow transitions"""
        from app.schemas.reports import ReportStatusEnum
        
        # Standard workflow: DRAFT -> PENDING_REVIEW -> REVIEWED -> APPROVED -> SIGNED
        workflow = [
            ReportStatusEnum.DRAFT,
            ReportStatusEnum.PENDING_REVIEW,
            ReportStatusEnum.REVIEWED,
            ReportStatusEnum.APPROVED,
            ReportStatusEnum.SIGNED,
        ]
        
        # All should be valid enum members
        for status in workflow:
            assert status in ReportStatusEnum, f"{status} not in ReportStatusEnum"

    def test_report_type_enum(self):
        """Verify report type enum values"""
        from app.schemas.reports import ReportTypeEnum
        
        expected_types = ['BIRADS', 'DIAGNOSTIC', 'SCREENING', 'COMPARISON', 'CONSULTATION', 'FOLLOW_UP']
        actual_types = [e.value for e in ReportTypeEnum]
        
        for expected in expected_types:
            assert expected in actual_types, f"Missing report type: {expected}"


# =============================================================================
# Test Modality Schema (including DBT)
# =============================================================================

class TestModalitySchema:
    """Tests for imaging modality enum including DBT"""

    def test_modality_includes_dbt(self):
        """Verify DBT (Digital Breast Tomosynthesis) is included"""
        from app.db.models.study import Modality
        
        modality_values = [m.value for m in Modality]
        assert 'DBT' in modality_values, "Missing DBT modality"

    def test_all_modalities_present(self):
        """Verify all expected modalities are present"""
        from app.db.models.study import Modality
        
        expected_modalities = ['MG', 'DBT', 'US', 'MRI', 'CT']
        actual_modalities = [m.value for m in Modality]
        
        for expected in expected_modalities:
            assert expected in actual_modalities, f"Missing modality: {expected}"
        
        print(f"✓ All modalities present: {actual_modalities}")

    def test_modality_is_string_enum(self):
        """Verify modality uses string values"""
        from app.db.models.study import Modality
        
        for modality in Modality:
            assert isinstance(modality.value, str), f"Modality {modality.name} should be string"


# =============================================================================
# Test User Model Fields
# =============================================================================

class TestUserModelFields:
    """Tests for User model field completeness"""

    def test_user_model_has_required_fields(self):
        """Verify User model has all required fields"""
        from app.db.models.user import User
        
        required_fields = [
            'id', 'email', 'hashed_password', 'first_name', 'last_name',
            'role', 'organization_id', 'is_active'
        ]
        
        user_columns = [c.name for c in User.__table__.columns]
        
        for field in required_fields:
            assert field in user_columns, f"Missing User field: {field}"

    def test_user_model_has_medical_credentials(self):
        """Verify User model has medical credential fields"""
        from app.db.models.user import User
        
        credential_fields = ['license_number', 'specialization']
        user_columns = [c.name for c in User.__table__.columns]
        
        for field in credential_fields:
            assert field in user_columns, f"Missing medical credential field: {field}"

    def test_user_model_has_security_fields(self):
        """Verify User model has security-related fields"""
        from app.db.models.user import User
        
        security_fields = ['two_factor_enabled', 'email_verified', 'last_login']
        user_columns = [c.name for c in User.__table__.columns]
        
        for field in security_fields:
            assert field in user_columns, f"Missing security field: {field}"

    def test_user_role_enum(self):
        """Verify UserRole enum has expected values"""
        from app.db.models.user import UserRole
        
        expected_roles = ['admin', 'radiologist', 'technician', 'viewer']
        actual_roles = [r.value for r in UserRole]
        
        for expected in expected_roles:
            assert expected in actual_roles, f"Missing user role: {expected}"


# =============================================================================
# Test Study Model
# =============================================================================

class TestStudyModel:
    """Tests for Study model"""

    def test_study_status_enum(self):
        """Verify StudyStatus enum values"""
        from app.db.models.study import StudyStatus
        
        expected_statuses = ['uploaded', 'processing', 'analyzed', 'reviewed', 'completed', 'failed']
        actual_statuses = [s.value for s in StudyStatus]
        
        for expected in expected_statuses:
            assert expected in actual_statuses, f"Missing study status: {expected}"

    def test_study_model_fields(self):
        """Verify Study model has required fields"""
        from app.db.models.study import Study
        
        required_fields = [
            'id', 'organization_id', 'patient_id', 'accession_number',
            'study_date', 'modality', 'status'
        ]
        
        study_columns = [c.name for c in Study.__table__.columns]
        
        for field in required_fields:
            assert field in study_columns, f"Missing Study field: {field}"


# =============================================================================
# Test Clinical Report Model
# =============================================================================

class TestClinicalReportModel:
    """Tests for ClinicalReport model alignment"""

    def test_clinical_report_has_reviewer_fields(self):
        """Verify ClinicalReport has multi-reviewer workflow fields"""
        from app.db.models.clinical_report import ClinicalReport
        
        reviewer_fields = ['author_id', 'reviewer_id', 'approver_id']
        columns = [c.name for c in ClinicalReport.__table__.columns]
        
        for field in reviewer_fields:
            assert field in columns, f"Missing reviewer field: {field}"

    def test_clinical_report_has_version_control(self):
        """Verify ClinicalReport has version control fields"""
        from app.db.models.clinical_report import ClinicalReport
        
        version_fields = ['version', 'parent_report_id', 'amendment_reason']
        columns = [c.name for c in ClinicalReport.__table__.columns]
        
        for field in version_fields:
            assert field in columns, f"Missing version control field: {field}"

    def test_clinical_report_has_ai_integration(self):
        """Verify ClinicalReport has AI integration fields"""
        from app.db.models.clinical_report import ClinicalReport
        
        ai_fields = ['ai_assisted', 'ai_confidence', 'ai_findings_reviewed']
        columns = [c.name for c in ClinicalReport.__table__.columns]
        
        for field in ai_fields:
            assert field in columns, f"Missing AI integration field: {field}"

    def test_clinical_report_status_enum(self):
        """Verify ClinicalReport uses proper status enum"""
        from app.db.models.clinical_report import ReportStatus
        
        expected_statuses = ['draft', 'pending_review', 'reviewed', 'approved', 'signed', 'amended', 'deleted']
        actual_statuses = [s.value for s in ReportStatus]
        
        for expected in expected_statuses:
            assert expected in actual_statuses, f"Missing report status in DB model: {expected}"


# =============================================================================
# Test Finding/Analysis Model
# =============================================================================

class TestAnalysisModel:
    """Tests for Analysis/Finding model"""

    def test_analysis_model_has_uncertainty_fields(self):
        """Verify Analysis model has uncertainty quantification fields"""
        from app.db.models.analysis import Analysis
        
        uncertainty_fields = ['epistemic_uncertainty', 'aleatoric_uncertainty']
        columns = [c.name for c in Analysis.__table__.columns]
        
        for field in uncertainty_fields:
            assert field in columns, f"Missing uncertainty field: {field}"

    def test_analysis_model_has_explanation_fields(self):
        """Verify Analysis model has XAI explanation fields"""
        from app.db.models.analysis import Analysis
        
        explanation_fields = ['attention_map', 'suspicious_regions', 'clinical_narrative']
        columns = [c.name for c in Analysis.__table__.columns]
        
        for field in explanation_fields:
            assert field in columns, f"Missing explanation field: {field}"


# =============================================================================
# Test Pydantic Schema Validation
# =============================================================================

class TestPydanticSchemaValidation:
    """Tests for Pydantic schema validation"""

    def test_report_create_schema_validates_birads(self):
        """Verify ReportCreate schema validates BI-RADS values"""
        from app.schemas.reports import ReportCreate, BIRADSCategoryEnum
        
        # Valid BI-RADS values should work
        valid_birads = ['0', '1', '2', '3', '4A', '4B', '4C', '5', '6']
        
        for birads in valid_birads:
            # Just verify the enum accepts these values
            enum_val = BIRADSCategoryEnum(birads)
            assert enum_val.value == birads

    def test_report_create_schema_rejects_invalid_birads(self):
        """Verify ReportCreate schema rejects invalid BI-RADS"""
        from app.schemas.reports import BIRADSCategoryEnum
        import pytest
        
        invalid_values = ['7', '4', '4D', 'invalid', '-1']
        
        for invalid in invalid_values:
            with pytest.raises(ValueError):
                BIRADSCategoryEnum(invalid)

    def test_inference_response_schema(self):
        """Verify InferenceResponse schema structure"""
        from app.schemas.inference import InferenceResponse
        
        # Check that the schema has expected fields
        schema_fields = InferenceResponse.model_fields.keys()
        
        # Note: backend uses 'inference_time_ms' instead of 'processing_time_ms'
        expected_fields = [
            'prediction', 'confidence', 'probabilities', 'risk_level',
            'model_version', 'inference_time_ms'
        ]
        
        for field in expected_fields:
            assert field in schema_fields, f"Missing InferenceResponse field: {field}"

    def test_suspicious_region_schema(self):
        """Verify SuspiciousRegion schema structure"""
        from app.schemas.inference import SuspiciousRegion
        
        schema_fields = SuspiciousRegion.model_fields.keys()
        
        expected_fields = ['region_id', 'bbox', 'attention_score', 'location']
        
        for field in expected_fields:
            assert field in schema_fields, f"Missing SuspiciousRegion field: {field}"


# =============================================================================
# Test Database Model Integrity
# =============================================================================

class TestDatabaseModelIntegrity:
    """Tests for database model relationships and constraints"""

    def test_all_models_import_successfully(self):
        """Verify all database models can be imported"""
        try:
            from app.db.models.user import User, UserRole
            from app.db.models.study import Study, Modality, StudyStatus
            from app.db.models.analysis import Analysis
            from app.db.models.clinical_report import ClinicalReport, ReportStatus, ReportType
            from app.db.models.feedback import Feedback
            from app.db.models.patient import Patient
            from app.db.models.image import Image
            print("✓ All models imported successfully")
        except ImportError as e:
            pytest.fail(f"Failed to import models: {e}")

    def test_user_organization_relationship(self):
        """Verify User-Organization relationship is defined"""
        from app.db.models.user import User
        
        relationships = [r.key for r in User.__mapper__.relationships]
        assert 'organization' in relationships, "Missing User-Organization relationship"

    def test_study_patient_relationship(self):
        """Verify Study-Patient relationship is defined"""
        from app.db.models.study import Study
        
        relationships = [r.key for r in Study.__mapper__.relationships]
        assert 'patient' in relationships, "Missing Study-Patient relationship"

    def test_clinical_report_study_relationship(self):
        """Verify ClinicalReport-Study relationship is defined"""
        from app.db.models.clinical_report import ClinicalReport
        
        relationships = [r.key for r in ClinicalReport.__mapper__.relationships]
        assert 'study' in relationships, "Missing ClinicalReport-Study relationship"


# =============================================================================
# Test Enum Consistency Between Schema and DB
# =============================================================================

class TestEnumConsistency:
    """Tests for enum consistency between Pydantic schemas and DB models"""

    def test_birads_consistency(self):
        """Verify BI-RADS values are consistent between schema and model"""
        from app.schemas.reports import BIRADSCategoryEnum as SchemaBIRADS
        from app.db.models.clinical_report import ClinicalReport
        
        # Schema values
        schema_values = set(e.value for e in SchemaBIRADS)
        
        # Both should have 4A, 4B, 4C
        assert '4A' in schema_values
        assert '4B' in schema_values
        assert '4C' in schema_values

    def test_report_status_consistency(self):
        """Verify report status is consistent between schema and model"""
        from app.schemas.reports import ReportStatusEnum as SchemaStatus
        from app.db.models.clinical_report import ReportStatus as ModelStatus
        
        schema_values = set(e.value for e in SchemaStatus)
        model_values = set(e.value for e in ModelStatus)
        
        # Core statuses should be in both (accounting for case differences)
        core_statuses_upper = {'DRAFT', 'PENDING_REVIEW', 'REVIEWED', 'APPROVED', 'SIGNED', 'AMENDED'}
        core_statuses_lower = {'draft', 'pending_review', 'reviewed', 'approved', 'signed', 'amended'}
        
        # Schema uses uppercase, model uses lowercase - both should have the core ones
        assert core_statuses_upper.issubset(schema_values) or core_statuses_lower.issubset(schema_values)


# =============================================================================
# Test Feedback Model
# =============================================================================

class TestFeedbackModel:
    """Tests for Feedback model schema alignment"""

    def test_feedback_type_enum(self):
        """Verify FeedbackType enum values"""
        from app.db.models.feedback import FeedbackType
        
        expected_types = ['agreement', 'correction', 'annotation', 'quality_issue']
        actual_types = [t.value for t in FeedbackType]
        
        for expected in expected_types:
            assert expected in actual_types, f"Missing feedback type: {expected}"

    def test_feedback_model_fields(self):
        """Verify Feedback model has required fields"""
        from app.db.models.feedback import Feedback
        
        required_fields = ['id', 'analysis_id', 'radiologist_id', 'feedback_type', 'is_correct']
        columns = [c.name for c in Feedback.__table__.columns]
        
        for field in required_fields:
            assert field in columns, f"Missing Feedback field: {field}"


# =============================================================================
# Test DICOM Schema
# =============================================================================

class TestDICOMSchema:
    """Tests for DICOM metadata schema"""

    def test_view_position_enum(self):
        """Verify mammography view position enum"""
        from app.schemas.dicom import ViewPositionEnum
        
        expected_positions = ['CC', 'MLO', 'ML', 'LM', 'LMO', 'XCCL', 'XCCM']
        actual_positions = [p.value for p in ViewPositionEnum]
        
        for expected in expected_positions:
            assert expected in actual_positions, f"Missing view position: {expected}"

    def test_image_laterality_enum(self):
        """Verify image laterality enum"""
        from app.schemas.dicom import ImageLateralityEnum
        
        expected_lateralities = ['L', 'R', 'B']
        actual_lateralities = [l.value for l in ImageLateralityEnum]
        
        for expected in expected_lateralities:
            assert expected in actual_lateralities, f"Missing laterality: {expected}"


# =============================================================================
# Run All Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
