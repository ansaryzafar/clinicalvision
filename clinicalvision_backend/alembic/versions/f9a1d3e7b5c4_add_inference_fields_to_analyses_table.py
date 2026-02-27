"""Add inference fields to analyses table

Revision ID: f9a1d3e7b5c4
Revises: c240aaf312d5
Create Date: 2026-01-12 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f9a1d3e7b5c4'
down_revision = 'c240aaf312d5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new fields for uncertainty quantification
    op.add_column('analyses', sa.Column('malignant_probability', sa.Float(), nullable=True))
    op.add_column('analyses', sa.Column('benign_probability', sa.Float(), nullable=True))
    op.add_column('analyses', sa.Column('risk_level', sa.String(length=50), nullable=True))
    op.add_column('analyses', sa.Column('epistemic_uncertainty', sa.Float(), nullable=True))
    op.add_column('analyses', sa.Column('aleatoric_uncertainty', sa.Float(), nullable=True))
    op.add_column('analyses', sa.Column('predictive_entropy', sa.Float(), nullable=True))
    op.add_column('analyses', sa.Column('mutual_information', sa.Float(), nullable=True))
    op.add_column('analyses', sa.Column('requires_human_review', sa.Boolean(), nullable=True, default=False))
    
    # Add new explainability fields
    op.add_column('analyses', sa.Column('attention_map', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('analyses', sa.Column('suspicious_regions', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('analyses', sa.Column('clinical_narrative', sa.String(length=2000), nullable=True))
    op.add_column('analyses', sa.Column('confidence_explanation', sa.String(length=1000), nullable=True))
    
    # Add new processing metadata fields
    op.add_column('analyses', sa.Column('inference_time_ms', sa.Float(), nullable=True))
    op.add_column('analyses', sa.Column('processing_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    # Create index for risk_level
    op.create_index(op.f('ix_analyses_risk_level'), 'analyses', ['risk_level'], unique=False)


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_analyses_risk_level'), table_name='analyses')
    
    # Remove added columns
    op.drop_column('analyses', 'processing_metadata')
    op.drop_column('analyses', 'inference_time_ms')
    op.drop_column('analyses', 'confidence_explanation')
    op.drop_column('analyses', 'clinical_narrative')
    op.drop_column('analyses', 'suspicious_regions')
    op.drop_column('analyses', 'attention_map')
    op.drop_column('analyses', 'requires_human_review')
    op.drop_column('analyses', 'mutual_information')
    op.drop_column('analyses', 'predictive_entropy')
    op.drop_column('analyses', 'aleatoric_uncertainty')
    op.drop_column('analyses', 'epistemic_uncertainty')
    op.drop_column('analyses', 'risk_level')
    op.drop_column('analyses', 'benign_probability')
    op.drop_column('analyses', 'malignant_probability')
