"""
Database Query Utilities for ClinicalVision

Provides tools for query optimization, performance analysis, and common query patterns.
"""

from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import time
import json

from app.db.session import SessionLocal
from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.models.patient import Patient
from app.db.models.study import Study
from app.db.models.image import Image
from app.db.models.analysis import Analysis
from app.db.models.feedback import Feedback
from app.db.models.audit_log import AuditLog


class QueryOptimizer:
    """Tools for analyzing and optimizing database queries."""
    
    @staticmethod
    def explain_query(db: Session, query_str: str, analyze: bool = True) -> Dict[str, Any]:
        """
        Run EXPLAIN ANALYZE on a query to understand performance.
        
        Args:
            db: Database session
            query_str: SQL query string
            analyze: If True, actually executes query for timing (default: True)
        
        Returns:
            Dictionary with query plan and execution stats
        """
        explain_cmd = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query_str}" if analyze else f"EXPLAIN (FORMAT JSON) {query_str}"
        
        result = db.execute(text(explain_cmd))
        plan = result.fetchone()[0]
        
        return {
            "query": query_str,
            "plan": plan,
            "execution_time_ms": plan[0].get("Execution Time", 0) if analyze else None,
            "planning_time_ms": plan[0].get("Planning Time", 0) if analyze else None,
            "total_cost": plan[0]["Plan"]["Total Cost"]
        }
    
    @staticmethod
    def benchmark_query(db: Session, query_callable, iterations: int = 10) -> Dict[str, Any]:
        """
        Benchmark a query by running it multiple times.
        
        Args:
            db: Database session
            query_callable: Function that executes the query
            iterations: Number of times to run (default: 10)
        
        Returns:
            Dictionary with timing statistics
        """
        times = []
        
        for _ in range(iterations):
            start = time.time()
            query_callable()
            end = time.time()
            times.append((end - start) * 1000)  # Convert to ms
            
            # Clear SQLAlchemy query cache between runs
            db.expire_all()
        
        return {
            "iterations": iterations,
            "min_ms": min(times),
            "max_ms": max(times),
            "avg_ms": sum(times) / len(times),
            "median_ms": sorted(times)[len(times) // 2],
            "total_ms": sum(times)
        }
    
    @staticmethod
    def find_missing_indexes(db: Session, min_seq_scans: int = 100) -> List[Dict[str, Any]]:
        """
        Find tables with many sequential scans that might benefit from indexes.
        
        Args:
            db: Database session
            min_seq_scans: Minimum sequential scans to report (default: 100)
        
        Returns:
            List of tables with high sequential scan counts
        """
        query = text("""
            SELECT 
                schemaname,
                tablename,
                seq_scan,
                seq_tup_read,
                idx_scan,
                CASE 
                    WHEN seq_scan > 0 
                    THEN round((100.0 * idx_scan / (seq_scan + idx_scan))::numeric, 2)
                    ELSE 0
                END AS index_usage_pct
            FROM pg_stat_user_tables
            WHERE seq_scan > :min_scans
            ORDER BY seq_scan DESC
        """)
        
        result = db.execute(query, {"min_scans": min_seq_scans})
        return [dict(row._mapping) for row in result]
    
    @staticmethod
    def get_table_sizes(db: Session) -> List[Dict[str, Any]]:
        """Get size information for all tables."""
        query = text("""
            SELECT 
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
                pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                              pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
                pg_total_relation_size(schemaname||'.'||tablename) AS bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY bytes DESC
        """)
        
        result = db.execute(query)
        return [dict(row._mapping) for row in result]
    
    @staticmethod
    def get_index_usage(db: Session) -> List[Dict[str, Any]]:
        """Get usage statistics for all indexes."""
        query = text("""
            SELECT 
                pui.schemaname,
                pui.relname as tablename,
                pui.indexrelname as indexname,
                pui.idx_scan,
                pui.idx_tup_read,
                pui.idx_tup_fetch,
                pg_size_pretty(pg_relation_size(pui.indexrelid)) AS index_size
            FROM pg_stat_user_indexes pui
            WHERE pui.schemaname = 'public'
            ORDER BY pui.idx_scan DESC
        """)
        
        result = db.execute(query)
        return [dict(row._mapping) for row in result]


class CommonQueries:
    """Pre-built optimized queries for common use cases."""
    
    @staticmethod
    def get_ai_performance_by_org(db: Session, org_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get AI model performance metrics by organization.
        
        Args:
            db: Database session
            org_id: Optional organization ID to filter by
        
        Returns:
            List of performance metrics per organization
        """
        query = """
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
                SUM(CASE WHEN a.prediction_class = 'MALIGNANT' THEN 1 ELSE 0 END) as malignant_count
            FROM organizations o
            JOIN studies s ON s.organization_id = o.id
            JOIN images i ON i.study_id = s.id
            JOIN analyses a ON a.image_id = i.id
            LEFT JOIN feedback f ON f.analysis_id = a.id
            WHERE o.is_deleted = FALSE 
              AND s.is_deleted = FALSE
              AND i.is_deleted = FALSE
              AND a.is_deleted = FALSE
        """
        
        if org_id:
            query += " AND o.id = :org_id"
        
        query += """
            GROUP BY o.id, o.name
            ORDER BY total_analyses DESC
        """
        
        result = db.execute(text(query), {"org_id": org_id} if org_id else {})
        return [dict(row._mapping) for row in result]
    
    @staticmethod
    def get_radiologist_workload(db: Session, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get radiologist workload and performance over specified days.
        
        Args:
            db: Database session
            days: Number of days to look back (default: 30)
        
        Returns:
            List of radiologist statistics
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        query = text("""
            SELECT 
                u.id as radiologist_id,
                u.first_name || ' ' || u.last_name as radiologist_name,
                u.specialization,
                o.name as organization_name,
                COUNT(f.id) as reviews_count,
                SUM(CASE WHEN f.feedback_type = 'AGREEMENT' THEN 1 ELSE 0 END) as agreements,
                SUM(CASE WHEN f.feedback_type = 'CORRECTION' THEN 1 ELSE 0 END) as corrections,
                ROUND(AVG(f.radiologist_confidence)::numeric, 2) as avg_confidence,
                ROUND(100.0 * SUM(CASE WHEN f.is_correct THEN 1 ELSE 0 END)::numeric / 
                      NULLIF(COUNT(f.id), 0), 2) as agreement_rate_pct
            FROM users u
            JOIN organizations o ON o.id = u.organization_id
            LEFT JOIN feedback f ON f.radiologist_id = u.id AND f.created_at >= :cutoff_date
            WHERE u.role = 'RADIOLOGIST'
              AND u.is_deleted = FALSE
            GROUP BY u.id, u.first_name, u.last_name, u.specialization, o.name
            ORDER BY reviews_count DESC
        """)
        
        result = db.execute(query, {"cutoff_date": cutoff_date})
        return [dict(row._mapping) for row in result]
    
    @staticmethod
    def get_high_risk_cases(db: Session, confidence_threshold: float = 0.7, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get high-risk cases (malignant predictions with sufficient confidence).
        
        Args:
            db: Database session
            confidence_threshold: Minimum confidence score (default: 0.7)
            limit: Maximum results to return (default: 50)
        
        Returns:
            List of high-risk cases needing review
        """
        query = text("""
            SELECT 
                a.id as analysis_id,
                p.patient_identifier_hash,
                s.accession_number,
                s.study_date,
                i.view_type,
                i.laterality,
                a.prediction_class,
                a.confidence_score,
                a.birads_category,
                f.id IS NOT NULL as has_radiologist_review,
                f.is_correct as ai_was_correct,
                f.actual_diagnosis,
                o.name as organization_name
            FROM analyses a
            JOIN images i ON i.id = a.image_id
            JOIN studies s ON s.id = i.study_id
            JOIN patients p ON p.id = s.patient_id
            JOIN organizations o ON o.id = s.organization_id
            LEFT JOIN feedback f ON f.analysis_id = a.id
            WHERE a.prediction_class = 'MALIGNANT'
              AND a.confidence_score >= :confidence_threshold
              AND a.status = 'COMPLETED'
              AND a.is_deleted = FALSE
            ORDER BY a.confidence_score DESC, s.study_date DESC
            LIMIT :limit
        """)
        
        result = db.execute(query, {"confidence_threshold": confidence_threshold, "limit": limit})
        return [dict(row._mapping) for row in result]
    
    @staticmethod
    def get_temporal_trends(db: Session, months: int = 12) -> List[Dict[str, Any]]:
        """
        Get temporal trends in studies, predictions, and reviews.
        
        Args:
            db: Database session
            months: Number of months to analyze (default: 12)
        
        Returns:
            Monthly statistics
        """
        cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
        
        query = text("""
            SELECT 
                DATE_TRUNC('month', s.study_date) as month,
                COUNT(DISTINCT s.id) as studies_count,
                COUNT(DISTINCT i.id) as images_count,
                COUNT(DISTINCT a.id) as analyses_count,
                SUM(CASE WHEN a.prediction_class = 'MALIGNANT' THEN 1 ELSE 0 END) as malignant_predictions,
                SUM(CASE WHEN a.prediction_class = 'BENIGN' THEN 1 ELSE 0 END) as benign_predictions,
                ROUND(AVG(a.confidence_score)::numeric, 4) as avg_confidence,
                COUNT(DISTINCT f.id) as feedback_count
            FROM studies s
            JOIN images i ON i.study_id = s.id
            JOIN analyses a ON a.image_id = i.id
            LEFT JOIN feedback f ON f.analysis_id = a.id
            WHERE s.study_date >= :cutoff_date
              AND s.is_deleted = FALSE
            GROUP BY DATE_TRUNC('month', s.study_date)
            ORDER BY month DESC
        """)
        
        result = db.execute(query, {"cutoff_date": cutoff_date})
        return [dict(row._mapping) for row in result]
    
    @staticmethod
    def search_jsonb_explainability(db: Session, search_term: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search within JSONB explainability data for specific features.
        
        Args:
            db: Database session
            search_term: Term to search for in explainability data
            limit: Maximum results (default: 20)
        
        Returns:
            Analyses matching the search term
        """
        query = text("""
            SELECT 
                a.id as analysis_id,
                i.view_type,
                i.laterality,
                a.prediction_class,
                a.confidence_score,
                a.explainability_data
            FROM analyses a
            JOIN images i ON i.id = a.image_id
            WHERE a.explainability_data::text ILIKE :search_pattern
              AND a.is_deleted = FALSE
            LIMIT :limit
        """)
        
        result = db.execute(query, {"search_pattern": f"%{search_term}%", "limit": limit})
        return [dict(row._mapping) for row in result]


def print_query_plan(plan_dict: Dict[str, Any]) -> None:
    """Pretty print an EXPLAIN ANALYZE result."""
    print("\n" + "=" * 80)
    print("QUERY PLAN ANALYSIS")
    print("=" * 80)
    print(f"\nQuery: {plan_dict['query'][:100]}...")
    print(f"\nExecution Time: {plan_dict['execution_time_ms']:.2f} ms")
    print(f"Planning Time: {plan_dict['planning_time_ms']:.2f} ms")
    print(f"Total Cost: {plan_dict['total_cost']:.2f}")
    print(f"\nFull Plan:")
    print(json.dumps(plan_dict['plan'], indent=2))
    print("=" * 80 + "\n")


# Example usage
if __name__ == "__main__":
    db = SessionLocal()
    
    try:
        print("🔍 Database Query Utilities Demo\n")
        
        # 1. AI Performance by Organization
        print("📊 AI Performance by Organization:")
        print("-" * 80)
        perf_data = CommonQueries.get_ai_performance_by_org(db)
        for row in perf_data[:3]:
            print(f"\n{row['organization_name']}:")
            print(f"  Total Analyses: {row['total_analyses']}")
            print(f"  Reviewed: {row['reviewed_count']}")
            print(f"  Accuracy: {row['accuracy_pct']}%")
            print(f"  Avg Confidence: {row['avg_confidence']}")
            print(f"  Benign: {row['benign_count']} | Malignant: {row['malignant_count']}")
        
        # 2. Table Sizes
        print("\n\n💾 Table Sizes:")
        print("-" * 80)
        sizes = QueryOptimizer.get_table_sizes(db)
        for table in sizes[:5]:
            print(f"{table['tablename']:20} | Total: {table['total_size']:10} | Table: {table['table_size']:10} | Indexes: {table['indexes_size']:10}")
        
        # 3. Index Usage
        print("\n\n📇 Top 10 Most Used Indexes:")
        print("-" * 80)
        indexes = QueryOptimizer.get_index_usage(db)
        for idx in indexes[:10]:
            print(f"{idx['indexname']:40} | Scans: {idx['idx_scan']:6} | Size: {idx['index_size']:10}")
        
        print("\n✅ Query utilities working correctly!")
        
    finally:
        db.close()
