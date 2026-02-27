"""add_materialized_views

Revision ID: 19898720d33b
Revises: a4786542fcb3
Create Date: 2026-01-08 16:01:25.419221

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '19898720d33b'
down_revision: Union[str, Sequence[str], None] = 'a4786542fcb3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create materialized views for analytics."""
    
    # 1. AI Performance by Organization
    op.execute("""
        CREATE MATERIALIZED VIEW mv_ai_performance_by_org AS
        SELECT 
            o.id as organization_id,
            o.name as organization_name,
            COUNT(DISTINCT a.id) as total_analyses,
            COUNT(DISTINCT f.id) as reviewed_count,
            ROUND(100.0 * SUM(CASE WHEN f.is_correct THEN 1 ELSE 0 END)::numeric / 
                  NULLIF(COUNT(f.id), 0), 2) as accuracy_pct,
            ROUND(AVG(a.confidence_score)::numeric, 4) as avg_confidence,
            ROUND(AVG(a.uncertainty_score)::numeric, 4) as avg_uncertainty,
            SUM(CASE WHEN a.prediction_class = 'BENIGN' THEN 1 ELSE 0 END) as benign_count,
            SUM(CASE WHEN a.prediction_class = 'MALIGNANT' THEN 1 ELSE 0 END) as malignant_count,
            NOW() as last_refreshed
        FROM organizations o
        JOIN studies s ON s.organization_id = o.id
        JOIN images i ON i.study_id = s.id
        JOIN analyses a ON a.image_id = i.id
        LEFT JOIN feedback f ON f.analysis_id = a.id
        WHERE o.is_deleted = FALSE 
          AND s.is_deleted = FALSE
          AND i.is_deleted = FALSE
          AND a.is_deleted = FALSE
        GROUP BY o.id, o.name;
        
        CREATE INDEX ON mv_ai_performance_by_org (organization_id);
        CREATE INDEX ON mv_ai_performance_by_org (total_analyses DESC);
    """)
    
    # 2. Radiologist Statistics and Performance
    op.execute("""
        CREATE MATERIALIZED VIEW mv_radiologist_stats AS
        SELECT 
            u.id as radiologist_id,
            u.first_name || ' ' || u.last_name as radiologist_name,
            u.specialization,
            u.organization_id,
            o.name as organization_name,
            COUNT(f.id) as reviews_count,
            SUM(CASE WHEN f.feedback_type = 'AGREEMENT' THEN 1 ELSE 0 END) as agreements,
            SUM(CASE WHEN f.feedback_type = 'CORRECTION' THEN 1 ELSE 0 END) as corrections,
            ROUND(AVG(f.radiologist_confidence)::numeric, 2) as avg_confidence,
            ROUND(100.0 * SUM(CASE WHEN f.is_correct THEN 1 ELSE 0 END)::numeric / 
                  NULLIF(COUNT(f.id), 0), 2) as agreement_rate_pct,
            NOW() as last_refreshed
        FROM users u
        JOIN organizations o ON o.id = u.organization_id
        LEFT JOIN feedback f ON f.radiologist_id = u.id
        WHERE u.role = 'RADIOLOGIST'
          AND u.is_deleted = FALSE
        GROUP BY u.id, u.first_name, u.last_name, u.specialization, u.organization_id, o.name;
        
        CREATE INDEX ON mv_radiologist_stats (radiologist_id);
        CREATE INDEX ON mv_radiologist_stats (organization_id);
        CREATE INDEX ON mv_radiologist_stats (reviews_count DESC);
    """)
    
    # 3. Monthly Temporal Trends
    op.execute("""
        CREATE MATERIALIZED VIEW mv_monthly_trends AS
        SELECT 
            DATE_TRUNC('month', s.study_date) as month,
            s.organization_id,
            o.name as organization_name,
            COUNT(DISTINCT s.id) as studies_count,
            COUNT(DISTINCT i.id) as images_count,
            COUNT(DISTINCT a.id) as analyses_count,
            SUM(CASE WHEN a.prediction_class = 'MALIGNANT' THEN 1 ELSE 0 END) as malignant_predictions,
            SUM(CASE WHEN a.prediction_class = 'BENIGN' THEN 1 ELSE 0 END) as benign_predictions,
            ROUND(AVG(a.confidence_score)::numeric, 4) as avg_confidence,
            COUNT(DISTINCT f.id) as feedback_count,
            NOW() as last_refreshed
        FROM studies s
        JOIN organizations o ON o.id = s.organization_id
        JOIN images i ON i.study_id = s.id
        JOIN analyses a ON a.image_id = i.id
        LEFT JOIN feedback f ON f.analysis_id = a.id
        WHERE s.is_deleted = FALSE
          AND i.is_deleted = FALSE
          AND a.is_deleted = FALSE
        GROUP BY DATE_TRUNC('month', s.study_date), s.organization_id, o.name;
        
        CREATE INDEX ON mv_monthly_trends (month DESC);
        CREATE INDEX ON mv_monthly_trends (organization_id, month DESC);
    """)
    
    # 4. BI-RADS Distribution Analysis
    op.execute("""
        CREATE MATERIALIZED VIEW mv_birads_distribution AS
        SELECT 
            a.birads_category,
            a.prediction_class,
            COUNT(*) as count,
            ROUND(AVG(a.confidence_score)::numeric, 4) as avg_confidence,
            COUNT(DISTINCT f.id) as reviewed_count,
            ROUND(100.0 * SUM(CASE WHEN f.is_correct THEN 1 ELSE 0 END)::numeric / 
                  NULLIF(COUNT(f.id), 0), 2) as accuracy_when_reviewed_pct,
            NOW() as last_refreshed
        FROM analyses a
        LEFT JOIN feedback f ON f.analysis_id = a.id
        WHERE a.is_deleted = FALSE
          AND a.status = 'COMPLETED'
        GROUP BY a.birads_category, a.prediction_class;
        
        CREATE INDEX ON mv_birads_distribution (birads_category);
        CREATE INDEX ON mv_birads_distribution (prediction_class);
    """)
    
    # 5. Model Version Performance Comparison
    op.execute("""
        CREATE MATERIALIZED VIEW mv_model_performance AS
        SELECT 
            a.model_version,
            a.model_name,
            COUNT(*) as total_predictions,
            SUM(CASE WHEN a.prediction_class = 'MALIGNANT' THEN 1 ELSE 0 END) as malignant_count,
            SUM(CASE WHEN a.prediction_class = 'BENIGN' THEN 1 ELSE 0 END) as benign_count,
            ROUND(AVG(a.confidence_score)::numeric, 4) as avg_confidence,
            ROUND(AVG(a.uncertainty_score)::numeric, 4) as avg_uncertainty,
            ROUND(AVG(a.processing_time_ms)::numeric, 2) as avg_processing_time_ms,
            COUNT(DISTINCT f.id) as feedback_count,
            ROUND(100.0 * SUM(CASE WHEN f.is_correct THEN 1 ELSE 0 END)::numeric / 
                  NULLIF(COUNT(f.id), 0), 2) as accuracy_pct,
            NOW() as last_refreshed
        FROM analyses a
        LEFT JOIN feedback f ON f.analysis_id = a.id
        WHERE a.is_deleted = FALSE
          AND a.status = 'COMPLETED'
        GROUP BY a.model_version, a.model_name;
        
        CREATE INDEX ON mv_model_performance (model_version);
        CREATE INDEX ON mv_model_performance (total_predictions DESC);
    """)


def downgrade() -> None:
    """Remove materialized views."""
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_model_performance")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_birads_distribution")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_monthly_trends")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_radiologist_stats")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_ai_performance_by_org")
