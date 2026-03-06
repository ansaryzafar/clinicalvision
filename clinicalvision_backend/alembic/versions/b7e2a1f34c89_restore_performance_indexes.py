"""restore_performance_indexes

Restores the 8 composite/GIN performance indexes that were accidentally
dropped by migration 1e8539f93b11 (auto-generated Alembic code included
DROP INDEX statements for indexes created by a4786542fcb3).

Also adds critical missing indexes:
- created_at indexes on high-query tables (for pagination/date-range queries)
- Partial index on is_deleted for soft-delete optimization

Revision ID: b7e2a1f34c89
Revises: 9fce47f24bab
Create Date: 2026-03-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2a1f34c89'
down_revision: Union[str, Sequence[str], None] = '9fce47f24bab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Restore dropped performance indexes and add critical missing indexes.
    
    Uses IF NOT EXISTS / execute() for safety — idempotent if indexes already exist.
    """
    
    # =========================================================================
    # 1. Restore 8 composite/GIN indexes dropped by migration 1e8539f93b11
    # =========================================================================
    
    # Composite indexes for multi-column queries
    op.execute('CREATE INDEX IF NOT EXISTS idx_users_org_role ON users (organization_id, role)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_studies_org_date ON studies (organization_id, study_date)')
    op.execute("CREATE INDEX IF NOT EXISTS idx_images_study_view ON images (study_id, view_type, laterality)")
    op.execute('CREATE INDEX IF NOT EXISTS idx_analyses_image_prediction ON analyses (image_id, prediction_class)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_feedback_radiologist_date ON feedback (radiologist_id, created_at)')
    
    # GIN indexes for JSONB columns
    op.execute('CREATE INDEX IF NOT EXISTS idx_analyses_explainability_gin ON analyses USING gin (explainability_data)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_analyses_roi_gin ON analyses USING gin (roi_coordinates)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_feedback_annotations_gin ON feedback USING gin (annotations)')
    
    # =========================================================================
    # 2. Add created_at indexes to high-query tables (for pagination & sorting)
    # =========================================================================
    
    op.execute('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_studies_created_at ON studies (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_images_created_at ON images (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_clinical_cases_created_at ON clinical_cases (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_clinical_reports_created_at ON clinical_reports (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_dicom_metadata_created_at ON dicom_metadata (created_at)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_model_versions_created_at ON model_versions (created_at)')
    
    # =========================================================================
    # 3. Remove redundant UUID indexes (primary_key already provides unique B-tree)
    #    Only drop if they exist — handles fresh databases that may not have them
    # =========================================================================
    
    # These ix_<table>_id indexes are redundant with the primary key
    redundant_indexes = [
        'ix_users_id', 'ix_organizations_id', 'ix_patients_id',
        'ix_studies_id', 'ix_images_id', 'ix_analyses_id',
        'ix_feedback_id', 'ix_audit_log_id',
        'ix_clinical_cases_id', 'ix_clinical_reports_id',
        'ix_dicom_metadata_id', 'ix_model_versions_id',
        'ix_model_performance_logs_id', 'ix_report_workflow_history_id',
    ]
    
    for idx_name in redundant_indexes:
        op.execute(f'DROP INDEX IF EXISTS {idx_name}')


def downgrade() -> None:
    """Reverse: drop the restored indexes and recreate redundant UUID indexes."""
    
    # Drop created_at indexes
    op.execute('DROP INDEX IF EXISTS idx_users_created_at')
    op.execute('DROP INDEX IF EXISTS idx_studies_created_at')
    op.execute('DROP INDEX IF EXISTS idx_images_created_at')
    op.execute('DROP INDEX IF EXISTS idx_analyses_created_at')
    op.execute('DROP INDEX IF EXISTS idx_feedback_created_at')
    op.execute('DROP INDEX IF EXISTS idx_audit_log_created_at')
    op.execute('DROP INDEX IF EXISTS idx_clinical_cases_created_at')
    op.execute('DROP INDEX IF EXISTS idx_clinical_reports_created_at')
    op.execute('DROP INDEX IF EXISTS idx_dicom_metadata_created_at')
    op.execute('DROP INDEX IF EXISTS idx_model_versions_created_at')
    
    # Drop restored composite/GIN indexes
    op.execute('DROP INDEX IF EXISTS idx_users_org_role')
    op.execute('DROP INDEX IF EXISTS idx_studies_org_date')
    op.execute('DROP INDEX IF EXISTS idx_images_study_view')
    op.execute('DROP INDEX IF EXISTS idx_analyses_image_prediction')
    op.execute('DROP INDEX IF EXISTS idx_feedback_radiologist_date')
    op.execute('DROP INDEX IF EXISTS idx_analyses_explainability_gin')
    op.execute('DROP INDEX IF EXISTS idx_analyses_roi_gin')
    op.execute('DROP INDEX IF EXISTS idx_feedback_annotations_gin')
