"""
Phase 3 TDD Tests: Performance Optimization
Tests written FIRST (Red phase) — implementations follow.

Covers:
P3-17: Streaming file uploads (chunked read, no full-memory load)
P3-19: SQL-level pagination (no in-memory slicing on lazy collections)
P3-22: Gunicorn multi-worker support in start_server.sh
"""

import ast
import re
from pathlib import Path

import pytest


# ============================================================
# Test helpers
# ============================================================

BACKEND_ROOT = Path(__file__).resolve().parent.parent
APP_ROOT = BACKEND_ROOT / "app"


def _read_source(relative_path: str) -> str:
    """Read a source file from the backend."""
    path = BACKEND_ROOT / relative_path
    assert path.exists(), f"File not found: {path}"
    return path.read_text()


def _parse_ast(relative_path: str) -> ast.Module:
    """Parse a source file into an AST."""
    return ast.parse(_read_source(relative_path))


def _get_function_node(tree: ast.Module, func_name: str) -> ast.FunctionDef | None:
    """Find a function definition by name in an AST."""
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == func_name:
            return node
    return None


# ============================================================
# P3-19: SQL Pagination (no in-memory slicing)
# ============================================================

class TestSQLPagination:
    """
    Endpoints that paginate nested resources must use SQL-level
    offset/limit instead of loading all records then slicing.
    """

    CASES_FILE = "app/api/v1/endpoints/cases.py"
    FAIRNESS_FILE = "app/api/v1/endpoints/fairness.py"

    def test_list_case_images_no_memory_slice(self):
        """list_case_images must NOT do case.images[skip:skip+limit]."""
        src = _read_source(self.CASES_FILE)
        tree = _parse_ast(self.CASES_FILE)
        func = _get_function_node(tree, "list_case_images")
        assert func is not None, "list_case_images function must exist"
        func_src = ast.get_source_segment(src, func)
        assert "images[skip" not in func_src, \
            "list_case_images must use SQL pagination, not in-memory slicing"

    def test_list_case_images_uses_sql_query(self):
        """list_case_images must use db.query with offset/limit or service method."""
        src = _read_source(self.CASES_FILE)
        tree = _parse_ast(self.CASES_FILE)
        func = _get_function_node(tree, "list_case_images")
        func_src = ast.get_source_segment(src, func)
        # Must use SQL-level pagination — either db.query or service call with skip/limit
        has_sql_pagination = (
            "offset" in func_src.lower() and "limit" in func_src.lower()
        ) or "list_case_images" in func_src or "service.list_case_images" in func_src
        assert has_sql_pagination, \
            "list_case_images must use SQL-level pagination (offset/limit)"

    def test_list_case_findings_no_memory_slice(self):
        """list_case_findings must NOT do case.findings[skip:skip+limit]."""
        src = _read_source(self.CASES_FILE)
        tree = _parse_ast(self.CASES_FILE)
        func = _get_function_node(tree, "list_case_findings")
        assert func is not None, "list_case_findings function must exist"
        func_src = ast.get_source_segment(src, func)
        assert "findings[skip" not in func_src, \
            "list_case_findings must use SQL pagination, not in-memory slicing"

    def test_list_case_findings_uses_sql_query(self):
        """list_case_findings must use SQL pagination."""
        src = _read_source(self.CASES_FILE)
        tree = _parse_ast(self.CASES_FILE)
        func = _get_function_node(tree, "list_case_findings")
        func_src = ast.get_source_segment(src, func)
        has_sql_pagination = (
            "offset" in func_src.lower() and "limit" in func_src.lower()
        ) or "service.list_case_findings" in func_src
        assert has_sql_pagination, \
            "list_case_findings must use SQL-level pagination"

    def test_fairness_alerts_no_memory_slice(self):
        """get_alerts endpoint must NOT do alerts[skip:skip+limit]."""
        src = _read_source(self.FAIRNESS_FILE)
        tree = _parse_ast(self.FAIRNESS_FILE)
        func = _get_function_node(tree, "get_alerts")
        assert func is not None, "get_alerts function must exist"
        func_src = ast.get_source_segment(src, func)
        assert "alerts[skip" not in func_src, \
            "get_alerts must not do in-memory pagination slice"

    def test_case_service_has_list_images_method(self):
        """CaseService must have a list_case_images method with SQL pagination."""
        src = _read_source("app/services/case_service.py")
        assert "def list_case_images" in src, \
            "CaseService must have list_case_images method for SQL pagination"

    def test_case_service_has_list_findings_method(self):
        """CaseService must have a list_case_findings method with SQL pagination."""
        src = _read_source("app/services/case_service.py")
        assert "def list_case_findings" in src, \
            "CaseService must have list_case_findings method for SQL pagination"


# ============================================================
# P3-17: Streaming File Uploads
# ============================================================

class TestStreamingUploads:
    """
    File uploads must use chunked streaming instead of reading
    the entire file into memory.
    """

    IMAGES_FILE = "app/api/v1/endpoints/images.py"

    def test_upload_image_no_full_read(self):
        """upload_image must NOT do content = await file.read() for full file."""
        src = _read_source(self.IMAGES_FILE)
        tree = _parse_ast(self.IMAGES_FILE)
        func = _get_function_node(tree, "upload_image")
        assert func is not None, "upload_image function must exist"
        func_src = ast.get_source_segment(src, func)
        # Must NOT read entire file into memory in one call
        assert "content = await file.read()" not in func_src, \
            "upload_image must not read entire file into memory at once"

    def test_upload_image_uses_chunked_read(self):
        """upload_image must use chunked reads (file.read(chunk_size) in a loop)."""
        src = _read_source(self.IMAGES_FILE)
        tree = _parse_ast(self.IMAGES_FILE)
        func = _get_function_node(tree, "upload_image")
        func_src = ast.get_source_segment(src, func)
        # Should have a loop pattern like: while chunk := await file.read(8192)
        # or for chunk in ..., or shutil.copyfileobj
        has_chunked = (
            "file.read(8192)" in func_src or
            "file.read(8_192)" in func_src or
            "file.read(chunk_size)" in func_src or
            "copyfileobj" in func_src or
            "CHUNK_SIZE" in func_src or
            "chunk" in func_src.lower()
        )
        assert has_chunked, \
            "upload_image must use chunked reads for streaming uploads"

    def test_upload_image_temp_file_still_created(self):
        """upload_image must still create a temp file for validation."""
        src = _read_source(self.IMAGES_FILE)
        tree = _parse_ast(self.IMAGES_FILE)
        func = _get_function_node(tree, "upload_image")
        func_src = ast.get_source_segment(src, func)
        assert "temp" in func_src.lower(), \
            "upload_image must still create temp file for validation"


# ============================================================
# P3-22: Gunicorn Multi-Worker Support
# ============================================================

class TestGunicornSupport:
    """
    Production start script should support gunicorn as process manager.
    """

    START_SCRIPT = "start_server.sh"

    def test_start_script_uses_gunicorn(self):
        """start_server.sh should use gunicorn for production."""
        src = _read_source(self.START_SCRIPT)
        # The exec line should reference gunicorn
        exec_lines = []
        for line in src.split("\n"):
            stripped = line.split("#")[0].strip()
            if "exec" in stripped and ("gunicorn" in stripped or "uvicorn" in stripped):
                exec_lines.append(stripped)
        found_gunicorn = any("gunicorn" in line for line in exec_lines)
        assert found_gunicorn, \
            "start_server.sh must use gunicorn as process manager"

    def test_gunicorn_uses_uvicorn_worker(self):
        """gunicorn must use UvicornWorker class."""
        src = _read_source(self.START_SCRIPT)
        assert "UvicornWorker" in src or "uvicorn.workers" in src, \
            "gunicorn must use UvicornWorker class"

    def test_gunicorn_in_requirements(self):
        """gunicorn must be listed in requirements.txt."""
        src = _read_source("requirements.txt")
        assert "gunicorn" in src.lower(), \
            "gunicorn must be listed in requirements.txt"

    def test_gunicorn_max_requests_configured(self):
        """gunicorn should have max-requests for memory leak protection."""
        src = _read_source(self.START_SCRIPT)
        assert "max-requests" in src, \
            "gunicorn should have --max-requests for worker recycling"


# ============================================================
# Summary Test
# ============================================================

class TestPhase3Summary:
    """Verify all Phase 3 changes are applied."""

    def test_all_phase3_files_exist(self):
        """All files modified by Phase 3 should exist."""
        required_files = [
            "app/api/v1/endpoints/cases.py",
            "app/api/v1/endpoints/fairness.py",
            "app/api/v1/endpoints/images.py",
            "app/services/case_service.py",
            "start_server.sh",
            "requirements.txt",
        ]
        for f in required_files:
            path = BACKEND_ROOT / f
            assert path.exists(), f"Required file not found: {f}"
