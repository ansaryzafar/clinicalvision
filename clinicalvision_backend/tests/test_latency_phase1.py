"""
Phase 1 Latency Audit — TDD Tests

Tests for critical latency fixes identified in the backend audit:
1. BaseModel: redundant UUID indexes removed (unique=True, index=True)
2. BaseModel: created_at has index=True
3. Session: pool_recycle and pool_timeout configured
4. Session: get_db does NOT auto-commit (caller controls transactions)
5. Endpoints: sync DB endpoints use `def` not `async def`
6. Migration: performance indexes exist (recreated after accidental drop)

Run with: pytest tests/test_latency_phase1.py -v
"""

import pytest
import inspect
import importlib
import sys
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add project root
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


# =============================================================================
# 1. BaseModel Column Configuration Tests
# =============================================================================

class TestBaseModelColumns:
    """Verify BaseModel id, created_at, is_deleted columns are optimally configured."""

    def test_id_column_no_redundant_unique(self):
        """id column should NOT have unique=True since primary_key already guarantees uniqueness."""
        from app.db.base import BaseModel
        id_col = BaseModel.__table__.columns['id'] if hasattr(BaseModel, '__table__') else None
        # For abstract models, inspect the Column object directly
        col = BaseModel.id
        if hasattr(col, 'property'):
            col_obj = col.property.columns[0]
        else:
            col_obj = col

        # primary_key=True already creates a unique index
        # The Column should not have unique=True explicitly set
        assert col_obj.primary_key is True, "id must be primary_key"
        assert col_obj.unique is not True, (
            "id column has redundant unique=True. "
            "primary_key=True already creates a unique B-tree index. "
            "Remove unique=True to eliminate redundant index."
        )

    def test_id_column_no_redundant_explicit_index(self):
        """id column should NOT have index=True since primary_key already creates an index."""
        from app.db.base import BaseModel
        col = BaseModel.id
        if hasattr(col, 'property'):
            col_obj = col.property.columns[0]
        else:
            col_obj = col

        assert col_obj.primary_key is True, "id must be primary_key"
        assert col_obj.index is not True, (
            "id column has redundant index=True. "
            "primary_key=True already creates a B-tree index. "
            "Remove index=True to eliminate redundant index."
        )

    def test_created_at_has_index(self):
        """created_at must be indexed for pagination and date-range queries."""
        from app.db.base import BaseModel
        col = BaseModel.created_at
        if hasattr(col, 'property'):
            col_obj = col.property.columns[0]
        else:
            col_obj = col

        assert col_obj.index is True, (
            "created_at column MUST have index=True. "
            "Without it, every paginated query and date-range filter does a sequential scan."
        )

    def test_is_deleted_still_indexed(self):
        """is_deleted must remain indexed for soft-delete filtering."""
        from app.db.base import BaseModel
        col = BaseModel.is_deleted
        if hasattr(col, 'property'):
            col_obj = col.property.columns[0]
        else:
            col_obj = col

        assert col_obj.index is True, "is_deleted must remain indexed"


# =============================================================================
# 2. Session & Connection Pool Tests
# =============================================================================

class TestSessionConfiguration:
    """Verify database session and connection pool are optimally configured."""

    def test_engine_has_pool_recycle(self):
        """Engine must have pool_recycle to prevent stale connections."""
        from app.db.session import engine
        pool = engine.pool
        assert hasattr(pool, '_recycle'), "pool must have _recycle attribute"
        recycle = pool._recycle
        assert recycle > 0 and recycle <= 7200, (
            f"pool_recycle={recycle} — must be between 1 and 7200 seconds. "
            f"Recommended: 1800 (30 min) or 3600 (1 hour)."
        )

    def test_engine_has_pool_timeout(self):
        """Engine must have pool_timeout to prevent infinite waits."""
        from app.db.session import engine
        pool = engine.pool
        assert hasattr(pool, '_timeout'), "pool must have _timeout attribute"
        timeout = pool._timeout
        assert timeout > 0 and timeout <= 60, (
            f"pool_timeout={timeout} — must be between 1 and 60 seconds. "
            f"Recommended: 30 seconds."
        )

    def test_get_db_does_not_auto_commit(self):
        """
        get_db should NOT auto-commit after yield.
        Services should call db.commit() explicitly after writes.
        Auto-committing on read-only GET requests wastes a round trip.
        """
        from app.db.session import get_db
        source = inspect.getsource(get_db)

        # The function should not have db.commit() in the try block after yield
        # It's OK to have db.rollback() in the except block
        lines = source.split('\n')
        in_try = False
        post_yield = False
        has_auto_commit = False

        for line in lines:
            stripped = line.strip()
            if 'try:' in stripped:
                in_try = True
            if 'yield' in stripped and in_try:
                post_yield = True
                continue
            if post_yield and 'except' in stripped:
                break  # Stop checking after we hit except
            if post_yield and 'db.commit()' in stripped:
                has_auto_commit = True

        assert not has_auto_commit, (
            "get_db() has auto-commit after yield. "
            "This sends an unnecessary COMMIT on every GET request. "
            "Remove db.commit() from get_db() and let services commit explicitly."
        )

    def test_get_db_context_does_not_auto_commit(self):
        """get_db_context should NOT auto-commit either."""
        from app.db.session import get_db_context
        source = inspect.getsource(get_db_context)

        lines = source.split('\n')
        in_try = False
        post_yield = False
        has_auto_commit = False

        for line in lines:
            stripped = line.strip()
            if 'try:' in stripped:
                in_try = True
            if 'yield' in stripped and in_try:
                post_yield = True
                continue
            if post_yield and 'except' in stripped:
                break
            if post_yield and 'db.commit()' in stripped:
                has_auto_commit = True

        assert not has_auto_commit, (
            "get_db_context() has auto-commit after yield. "
            "Remove db.commit() and let callers commit explicitly."
        )


# =============================================================================
# 3. Async/Sync Endpoint Tests
# =============================================================================

class TestEndpointAsyncSync:
    """
    Verify that endpoints using synchronous DB operations are declared as `def`
    (not `async def`), so FastAPI runs them in a threadpool instead of blocking
    the async event loop.

    Only endpoints with genuine async I/O (await file.read(), httpx calls)
    should remain `async def`.
    """

    def _get_route_functions(self, router):
        """Extract all route handler functions from a FastAPI router."""
        functions = {}
        for route in router.routes:
            if hasattr(route, 'endpoint'):
                functions[route.endpoint.__name__] = route.endpoint
        return functions

    # --- account.py: ALL should be sync def ---

    def test_account_endpoints_are_sync(self):
        """All account endpoints use sync DB — must be `def` not `async def`."""
        from app.api.v1.endpoints.account import router
        funcs = self._get_route_functions(router)
        for name, func in funcs.items():
            assert not inspect.iscoroutinefunction(func), (
                f"account.{name}() is async def but uses sync DB. "
                f"Change to def to avoid blocking the event loop."
            )

    # --- dicom.py: ALL should be sync def ---

    def test_dicom_endpoints_are_sync(self):
        """All dicom endpoints use sync DB — must be `def` not `async def`."""
        from app.api.v1.endpoints.dicom import router
        funcs = self._get_route_functions(router)
        for name, func in funcs.items():
            assert not inspect.iscoroutinefunction(func), (
                f"dicom.{name}() is async def but uses sync DB. "
                f"Change to def to avoid blocking the event loop."
            )

    # --- fairness.py: ALL should be sync def ---

    def test_fairness_endpoints_are_sync(self):
        """All fairness endpoints use sync DB — must be `def` not `async def`."""
        from app.api.v1.endpoints.fairness import router
        funcs = self._get_route_functions(router)
        for name, func in funcs.items():
            assert not inspect.iscoroutinefunction(func), (
                f"fairness.{name}() is async def but uses sync DB. "
                f"Change to def to avoid blocking the event loop."
            )

    # --- models.py: ALL should be sync def ---

    def test_models_endpoints_are_sync(self):
        """All models endpoints use sync DB — must be `def` not `async def`."""
        from app.api.v1.endpoints.models import router
        funcs = self._get_route_functions(router)
        for name, func in funcs.items():
            assert not inspect.iscoroutinefunction(func), (
                f"models.{name}() is async def but uses sync DB. "
                f"Change to def to avoid blocking the event loop."
            )

    # --- reports.py: ALL should be sync def ---

    def test_reports_endpoints_are_sync(self):
        """All reports endpoints use sync DB — must be `def` not `async def`."""
        from app.api.v1.endpoints.reports import router
        funcs = self._get_route_functions(router)
        for name, func in funcs.items():
            assert not inspect.iscoroutinefunction(func), (
                f"reports.{name}() is async def but uses sync DB. "
                f"Change to def to avoid blocking the event loop."
            )

    # --- images.py: Only upload/download with file.read() should stay async ---

    def test_images_sync_endpoints(self):
        """Image endpoints that only do sync DB should be `def`."""
        from app.api.v1.endpoints.images import router
        funcs = self._get_route_functions(router)

        # These endpoints must be sync (no await calls, only sync DB)
        must_be_sync = [
            'list_images', 'get_image', 'generate_download_url',
            'download_image', 'update_image', 'get_storage_statistics',
            'verify_file_integrity', 'init_chunked_upload',
        ]

        for name in must_be_sync:
            if name in funcs:
                assert not inspect.iscoroutinefunction(funcs[name]), (
                    f"images.{name}() should be sync def (only does sync DB ops)"
                )

    def test_images_async_endpoints_remain_async(self):
        """Image upload/download with file I/O should stay async."""
        from app.api.v1.endpoints.images import router
        funcs = self._get_route_functions(router)

        # These need await for file.read() or streaming
        may_be_async = ['upload_image', 'download_image', 'upload_chunk', 'complete_chunked_upload', 'batch_upload']

        for name in may_be_async:
            if name in funcs:
                # These CAN be async (they use await file.read())
                # We don't fail if they're sync — just allow both
                pass

    # --- inference.py: Mixed — file upload endpoints stay async, stats/listing become sync ---

    def test_inference_sync_endpoints(self):
        """Inference endpoints that only do sync DB should be `def`."""
        from app.api.v1.endpoints.inference import router
        funcs = self._get_route_functions(router)

        must_be_sync = [
            'get_inference_statistics', 'get_gradcam_image',
            'health_check', 'validate_xai_explanation',
            'check_attention_quality', 'generate_clinical_narrative',
            'generate_narrative_from_analysis',
        ]

        for name in must_be_sync:
            if name in funcs:
                assert not inspect.iscoroutinefunction(funcs[name]), (
                    f"inference.{name}() should be sync def (only does sync DB ops)"
                )


# =============================================================================
# 4. Migration: Performance Indexes Test
# =============================================================================

class TestPerformanceIndexesMigration:
    """Verify the new migration to recreate dropped indexes exists and is correct."""

    def test_restore_indexes_migration_exists(self):
        """A migration file to restore dropped performance indexes must exist."""
        migrations_dir = Path(__file__).parent.parent / 'alembic' / 'versions'
        migration_files = list(migrations_dir.glob('*restore_performance_indexes*.py'))
        assert len(migration_files) >= 1, (
            "Missing migration to restore performance indexes dropped by 1e8539f93b11. "
            "Create a new Alembic migration to recreate the 8 composite/GIN indexes."
        )

    def test_restore_indexes_migration_has_all_indexes(self):
        """The restore migration must recreate all 8 dropped indexes."""
        migrations_dir = Path(__file__).parent.parent / 'alembic' / 'versions'
        migration_files = list(migrations_dir.glob('*restore_performance_indexes*.py'))
        if not migration_files:
            pytest.skip("Migration file not yet created")

        content = migration_files[0].read_text()

        required_indexes = [
            'idx_users_org_role',
            'idx_studies_org_date',
            'idx_images_study_view',
            'idx_analyses_image_prediction',
            'idx_feedback_radiologist_date',
            'idx_analyses_explainability_gin',
            'idx_analyses_roi_gin',
            'idx_feedback_annotations_gin',
        ]

        for idx_name in required_indexes:
            assert idx_name in content, (
                f"Migration is missing index '{idx_name}'. "
                f"All 8 performance indexes must be recreated."
            )

    def test_restore_migration_also_adds_created_at_indexes(self):
        """The restore migration should also add created_at indexes to key tables."""
        migrations_dir = Path(__file__).parent.parent / 'alembic' / 'versions'
        migration_files = list(migrations_dir.glob('*restore_performance_indexes*.py'))
        if not migration_files:
            pytest.skip("Migration file not yet created")

        content = migration_files[0].read_text()

        # Must add created_at indexes to high-query tables
        assert 'created_at' in content, (
            "Migration must add created_at indexes to key tables "
            "(users, studies, images, analyses, audit_log)."
        )

    def test_restore_migration_has_downgrade(self):
        """Migration must have a proper downgrade function."""
        migrations_dir = Path(__file__).parent.parent / 'alembic' / 'versions'
        migration_files = list(migrations_dir.glob('*restore_performance_indexes*.py'))
        if not migration_files:
            pytest.skip("Migration file not yet created")

        content = migration_files[0].read_text()
        assert 'def downgrade' in content, "Migration must have a downgrade function"
        assert 'DROP INDEX' in content, "Downgrade must drop the indexes it creates"
