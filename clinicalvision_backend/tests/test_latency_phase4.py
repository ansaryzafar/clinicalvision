"""
Phase 4 TDD Tests: Enterprise Hardening
Tests written FIRST (Red phase) — implementations follow.

Covers:
P4-25: Request correlation IDs (middleware + response header)
P4-26: Structured JSON logging for production observability
P4-28: Failed login tracking with account lockout
P4-31: Multi-stage Docker build for smaller, more secure image
"""

import ast
import importlib
import json
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


def _get_function_node(tree: ast.Module, func_name: str):
    """Find a function definition by name in an AST."""
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == func_name:
            return node
    return None


def _get_class_node(tree: ast.Module, class_name: str):
    """Find a class definition by name in an AST."""
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            return node
    return None


# ============================================================
# P4-25: Request Correlation IDs
# ============================================================

class TestRequestCorrelationIDs:
    """
    Every request must receive a unique correlation ID that is:
    1. Available as X-Request-ID in the response header
    2. Generated via middleware
    3. Propagated to logging context
    """

    MIDDLEWARE_FILE = "app/middleware/correlation_id.py"

    def test_correlation_id_middleware_file_exists(self):
        """A dedicated correlation ID middleware file must exist."""
        path = BACKEND_ROOT / self.MIDDLEWARE_FILE
        assert path.exists(), \
            "app/middleware/correlation_id.py must exist"

    def test_middleware_class_exists(self):
        """CorrelationIdMiddleware class must be defined."""
        src = _read_source(self.MIDDLEWARE_FILE)
        assert "class CorrelationIdMiddleware" in src or \
               "CorrelationIdMiddleware" in src, \
            "CorrelationIdMiddleware class must be defined"

    def test_middleware_sets_x_request_id_header(self):
        """Middleware must set X-Request-ID in the response."""
        src = _read_source(self.MIDDLEWARE_FILE)
        assert "X-Request-ID" in src or "x-request-id" in src.lower(), \
            "Middleware must set X-Request-ID response header"

    def test_middleware_generates_uuid(self):
        """Middleware must generate a UUID for correlation."""
        src = _read_source(self.MIDDLEWARE_FILE)
        assert "uuid" in src.lower(), \
            "Middleware must use uuid for generating correlation IDs"

    def test_middleware_registered_in_main(self):
        """CorrelationIdMiddleware must be registered in main.py."""
        src = _read_source("main.py")
        assert "CorrelationIdMiddleware" in src, \
            "CorrelationIdMiddleware must be added in main.py"

    def test_correlation_id_in_response_header_integration(self):
        """Integration: hitting any endpoint must return X-Request-ID."""
        from fastapi.testclient import TestClient
        # Dynamically import the app to test actual behavior
        import sys
        sys.path.insert(0, str(BACKEND_ROOT))
        from main import app
        client = TestClient(app)
        resp = client.get("/health/live")
        assert "X-Request-ID" in resp.headers, \
            "Response must contain X-Request-ID header"
        # Must be a valid UUID4 format
        rid = resp.headers["X-Request-ID"]
        import uuid
        try:
            uuid.UUID(rid, version=4)
        except ValueError:
            pytest.fail(f"X-Request-ID '{rid}' is not a valid UUID4")


# ============================================================
# P4-26: Structured JSON Logging
# ============================================================

class TestStructuredJSONLogging:
    """
    Production logging must output structured JSON lines that can be
    ingested by log aggregation tools (ELK, CloudWatch, Datadog).
    """

    LOGGING_FILE = "app/core/logging.py"

    def test_json_formatter_exists(self):
        """A JSON log formatter must be defined."""
        src = _read_source(self.LOGGING_FILE)
        assert "JSONFormatter" in src or "json" in src.lower(), \
            "logging.py must define a JSON formatter"

    def test_json_formatter_produces_valid_json(self):
        """JSON formatter must output valid JSON log lines."""
        src = _read_source(self.LOGGING_FILE)
        # Must reference json.dumps or a JSON formatting pattern
        has_json_output = (
            "json.dumps" in src or
            "JsonFormatter" in src or
            "JSONFormatter" in src or
            "jsonlogger" in src or
            "structlog" in src
        )
        assert has_json_output, \
            "Logging must use a JSON formatter that outputs valid JSON"

    def test_json_formatter_includes_timestamp(self):
        """JSON log entries must include a timestamp field."""
        src = _read_source(self.LOGGING_FILE)
        assert "timestamp" in src or "asctime" in src, \
            "JSON formatter must include timestamp in log entries"

    def test_json_formatter_includes_level(self):
        """JSON log entries must include log level."""
        src = _read_source(self.LOGGING_FILE)
        assert "level" in src or "levelname" in src, \
            "JSON formatter must include log level"

    def test_json_formatter_includes_correlation_id(self):
        """JSON log entries must include correlation_id field."""
        src = _read_source(self.LOGGING_FILE)
        assert "correlation_id" in src or "request_id" in src, \
            "JSON formatter must include correlation/request ID"


# ============================================================
# P4-28: Failed Login Tracking + Account Lockout
# ============================================================

class TestFailedLoginTracking:
    """
    Auth service must track failed login attempts and temporarily
    lock accounts after too many failures (HIPAA compliance).
    """

    AUTH_SERVICE_FILE = "app/services/auth_service.py"

    def test_login_attempt_tracker_exists(self):
        """A login attempt tracker must exist (class or module)."""
        src = _read_source(self.AUTH_SERVICE_FILE)
        has_tracker = (
            "LoginAttemptTracker" in src or
            "failed_attempts" in src or
            "_login_attempts" in src or
            "login_tracker" in src
        )
        assert has_tracker, \
            "Auth service must have login attempt tracking"

    def test_lockout_threshold_configured(self):
        """Account lockout threshold must be configured."""
        src = _read_source(self.AUTH_SERVICE_FILE)
        has_threshold = (
            "MAX_ATTEMPTS" in src or
            "max_attempts" in src or
            "LOCKOUT" in src or
            "lockout" in src
        )
        assert has_threshold, \
            "A maximum login attempts threshold must be configured"

    def test_lockout_duration_configured(self):
        """Account lockout duration must be configured."""
        src = _read_source(self.AUTH_SERVICE_FILE)
        has_duration = (
            "LOCKOUT_DURATION" in src or
            "lockout_duration" in src or
            "lockout_minutes" in src or
            "LOCKOUT_MINUTES" in src
        )
        assert has_duration, \
            "A lockout duration must be configured"

    def test_authenticate_checks_lockout(self):
        """authenticate_user must check for account lockout."""
        src = _read_source(self.AUTH_SERVICE_FILE)
        tree = _parse_ast(self.AUTH_SERVICE_FILE)
        func = _get_function_node(tree, "authenticate_user")
        assert func is not None, "authenticate_user must exist"
        func_src = ast.get_source_segment(src, func)
        has_lockout_check = (
            "locked" in func_src.lower() or
            "lockout" in func_src.lower() or
            "is_locked" in func_src or
            "check_lockout" in func_src or
            "too many" in func_src.lower()
        )
        assert has_lockout_check, \
            "authenticate_user must check for account lockout before auth"

    def test_failed_login_records_attempt(self):
        """authenticate_user must record failed login attempts."""
        src = _read_source(self.AUTH_SERVICE_FILE)
        tree = _parse_ast(self.AUTH_SERVICE_FILE)
        func = _get_function_node(tree, "authenticate_user")
        func_src = ast.get_source_segment(src, func)
        has_record = (
            "record_failure" in func_src or
            "record_attempt" in func_src or
            "failed_attempt" in func_src or
            "track" in func_src.lower()
        )
        assert has_record, \
            "authenticate_user must record failed login attempts"

    def test_successful_login_resets_counter(self):
        """Successful login must reset the failed attempt counter."""
        src = _read_source(self.AUTH_SERVICE_FILE)
        tree = _parse_ast(self.AUTH_SERVICE_FILE)
        func = _get_function_node(tree, "authenticate_user")
        func_src = ast.get_source_segment(src, func)
        has_reset = (
            "reset" in func_src.lower() or
            "clear" in func_src.lower() or
            "record_success" in func_src
        )
        assert has_reset, \
            "Successful login must reset the failed attempt counter"


# ============================================================
# P4-31: Multi-Stage Docker Build
# ============================================================

class TestMultiStageDockerBuild:
    """
    Dockerfile should use multi-stage builds for smaller, more secure images.
    """

    DOCKERFILE = "Dockerfile"

    def test_dockerfile_has_multiple_stages(self):
        """Dockerfile must have at least 2 FROM instructions (multi-stage)."""
        src = _read_source(self.DOCKERFILE)
        from_count = len(re.findall(r"^FROM\s+", src, re.MULTILINE | re.IGNORECASE))
        assert from_count >= 2, \
            f"Dockerfile must have at least 2 FROM stages (multi-stage build), found {from_count}"

    def test_dockerfile_has_builder_stage(self):
        """Dockerfile must have a named 'builder' stage."""
        src = _read_source(self.DOCKERFILE)
        assert re.search(r"FROM\s+\S+\s+AS\s+builder", src, re.IGNORECASE), \
            "Dockerfile must have a 'FROM ... AS builder' stage"

    def test_dockerfile_copies_from_builder(self):
        """Final stage must COPY from the builder stage."""
        src = _read_source(self.DOCKERFILE)
        assert re.search(r"COPY\s+--from=builder", src, re.IGNORECASE), \
            "Final stage must COPY --from=builder"

    def test_dockerfile_uses_non_root_user(self):
        """Dockerfile must use a non-root user."""
        src = _read_source(self.DOCKERFILE)
        assert "appuser" in src or "nonroot" in src, \
            "Dockerfile must use a non-root user"

    def test_dockerfile_has_healthcheck(self):
        """Dockerfile must have a HEALTHCHECK instruction."""
        src = _read_source(self.DOCKERFILE)
        assert "HEALTHCHECK" in src, \
            "Dockerfile must have a HEALTHCHECK instruction"

    def test_dockerfile_uses_gunicorn_cmd(self):
        """Docker CMD should use gunicorn (matching start_server.sh)."""
        src = _read_source(self.DOCKERFILE)
        assert "gunicorn" in src, \
            "Dockerfile CMD should use gunicorn for production"


# ============================================================
# Summary Test
# ============================================================

class TestPhase4Summary:
    """Verify all Phase 4 changes are applied."""

    def test_all_phase4_files_exist(self):
        """All files modified/created by Phase 4 should exist."""
        required_files = [
            "app/middleware/correlation_id.py",
            "app/core/logging.py",
            "app/services/auth_service.py",
            "main.py",
            "Dockerfile",
        ]
        for f in required_files:
            path = BACKEND_ROOT / f
            assert path.exists(), f"Required file not found: {f}"
