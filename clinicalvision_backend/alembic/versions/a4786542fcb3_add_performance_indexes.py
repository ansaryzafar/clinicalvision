"""add_performance_indexes

Revision ID: a4786542fcb3
Revises: 3757f160fd25
Create Date: 2026-01-08 00:12:25.517073

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4786542fcb3'
down_revision: Union[str, Sequence[str], None] = '3757f160fd25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add core performance indexes for complex queries."""
    
    # Composite indexes for multi-column queries
    op.create_index('idx_users_org_role', 'users', ['organization_id', 'role'])
    op.create_index('idx_studies_org_date', 'studies', ['organization_id', 'study_date'])
    op.create_index('idx_images_study_view', 'images', ['study_id', 'view_type', 'laterality'])
    op.create_index('idx_analyses_image_prediction', 'analyses', ['image_id', 'prediction_class'])
    op.create_index('idx_feedback_radiologist_date', 'feedback', ['radiologist_id', 'created_at'])
    
    # GIN indexes for JSONB columns
    op.create_index('idx_analyses_explainability_gin', 'analyses', ['explainability_data'], postgresql_using='gin')
    op.create_index('idx_analyses_roi_gin', 'analyses', ['roi_coordinates'], postgresql_using='gin')
    op.create_index('idx_feedback_annotations_gin', 'feedback', ['annotations'], postgresql_using='gin')


def downgrade() -> None:
    """Remove performance indexes."""
    # Use IF EXISTS to handle missing indexes gracefully
    op.execute('DROP INDEX IF EXISTS idx_feedback_annotations_gin')
    op.execute('DROP INDEX IF EXISTS idx_analyses_roi_gin')
    op.execute('DROP INDEX IF EXISTS idx_analyses_explainability_gin')
    op.execute('DROP INDEX IF EXISTS idx_feedback_radiologist_date')
    op.execute('DROP INDEX IF EXISTS idx_analyses_image_prediction')
    op.execute('DROP INDEX IF EXISTS idx_images_study_view')
    op.execute('DROP INDEX IF EXISTS idx_studies_org_date')
    op.execute('DROP INDEX IF EXISTS idx_users_org_role')
