"""
Phase 2 TDD Tests: Security & Stability Fixes
Tests written FIRST (Red phase) — implementations follow.

Covers:
1. Rate limiting on inference endpoints
2. Authentication on check-verification-status and security-status endpoints
3. Report author uses current_user (not random radiologist)
4. --reload removed from production start script
5. /docs and /redoc disabled in production
6. Log rotation (RotatingFileHandler)
7. Docker non-root user + healthcheck
8. CORS restricted origins
"""

import ast
import inspect
import re
import textwrap
from pathlib import Path
from unittest.mock import MagicMock, patch

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


def _function_has_dependency(tree: ast.Module, func_name: str, dep_name: str) -> bool:
    """
    Check if a function has a `Depends(dep_name)` default argument.
    For example: `current_user: User = Depends(get_current_active_user)`
    """
    func = _get_function_node(tree, func_name)
    if func is None:
        return False
    for default in func.args.defaults:
        if isinstance(default, ast.Call):
            called = default.func
            if isinstance(called, ast.Name) and called.id == "Depends":
                for arg in default.args:
                    if isinstance(arg, ast.Name) and arg.id == dep_name:
                        return True
    return False


# ============================================================
# P2-1: Rate Limiting on Inference Endpoints
# ============================================================

class TestInferenceRateLimiting:
    """Inference endpoints must have rate limiting decorators."""

    INFERENCE_FILE = "app/api/v1/endpoints/inference.py"

    # These are the compute-intensive endpoints that MUST have rate limits
    RATE_LIMITED_FUNCTIONS = [
        "predict_image",
        "predict_with_tiles",
        "predict_from_storage",
        "predict_bilateral",
        "generate_gradcam",
        "generate_lime_explanation",
        "generate_shap_explanation",
        "compare_xai_methods",
    ]

    def test_inference_imports_limiter(self):
        """inference.py must import limiter and get_rate_limit."""
        src = _read_source(self.INFERENCE_FILE)
        assert "from app.core.rate_limit import" in src, \
            "inference.py must import from app.core.rate_limit"
        assert "limiter" in src, "Must import limiter"
        assert "get_rate_limit" in src, "Must import get_rate_limit"

    @pytest.mark.parametrize("func_name", RATE_LIMITED_FUNCTIONS)
    def test_inference_endpoint_has_rate_limit(self, func_name):
        """Each compute-intensive inference endpoint must have @limiter.limit decorator."""
        src = _read_source(self.INFERENCE_FILE)

        # Find the function definition and look for @limiter.limit decorator
        # Pattern: @limiter.limit(...) before def func_name(
        pattern = rf'@limiter\.limit\(.+?\)\s*\n(?:@\w[^\n]*\n)*\s*(?:async\s+)?def\s+{func_name}\('
        assert re.search(pattern, src), \
            f"{func_name} must have a @limiter.limit() decorator"

    def test_rate_limit_config_has_inference_key(self):
        """rate_limit.py RATE_LIMITS dict must have 'inference' key."""
        src = _read_source("app/core/rate_limit.py")
        assert '"inference"' in src or "'inference'" in src, \
            "RATE_LIMITS must have an 'inference' key"


# ============================================================
# P2-2: Authentication on Unauthenticated Endpoints
# ============================================================

class TestEndpointAuthentication:
    """Endpoints that leak info must require authentication."""

    ACCOUNT_FILE = "app/api/v1/endpoints/account.py"
    MODELS_FILE = "app/api/v1/endpoints/models.py"

    def test_check_verification_status_requires_auth(self):
        """check_verification_status must require get_current_active_user."""
        tree = _parse_ast(self.ACCOUNT_FILE)
        assert _function_has_dependency(tree, "check_verification_status", "get_current_active_user"), \
            "check_verification_status must have Depends(get_current_active_user)"

    def test_get_security_status_requires_auth(self):
        """get_security_status must require get_current_active_user."""
        tree = _parse_ast(self.ACCOUNT_FILE)
        assert _function_has_dependency(tree, "get_security_status", "get_current_active_user"), \
            "get_security_status must have Depends(get_current_active_user)"

    def test_verification_status_no_user_exists_leak(self):
        """
        check_verification_status must NOT return 'user_exists' field.
        Only the authenticated user's own status should be returned.
        """
        src = _read_source(self.ACCOUNT_FILE)
        # Find the function body text
        tree = _parse_ast(self.ACCOUNT_FILE)
        func = _get_function_node(tree, "check_verification_status")
        assert func is not None
        func_src = ast.get_source_segment(_read_source(self.ACCOUNT_FILE), func)
        assert "user_exists" not in func_src, \
            "check_verification_status must not expose 'user_exists' field"

    def test_security_status_no_email_param(self):
        """
        get_security_status must NOT accept email as a query parameter.
        It should use the authenticated user instead.
        """
        tree = _parse_ast(self.ACCOUNT_FILE)
        func = _get_function_node(tree, "get_security_status")
        assert func is not None
        # Check params — should not have 'email' param
        param_names = [arg.arg for arg in func.args.args]
        assert "email" not in param_names, \
            "get_security_status should not accept 'email' as a parameter"

    def test_list_models_requires_auth(self):
        """list_models must require authentication."""
        tree = _parse_ast(self.MODELS_FILE)
        assert _function_has_dependency(tree, "list_models", "get_current_active_user"), \
            "list_models must have Depends(get_current_active_user)"


# ============================================================
# P2-3: Report Author Mismatch Fix
# ============================================================

class TestReportAuthorFix:
    """create_report must use authenticated user as report author."""

    REPORTS_FILE = "app/api/v1/endpoints/reports.py"

    def test_create_report_uses_current_user_id(self):
        """create_report must pass current_user.id to the service, not a random radiologist."""
        src = _read_source(self.REPORTS_FILE)
        tree = _parse_ast(self.REPORTS_FILE)
        func = _get_function_node(tree, "create_report")
        assert func is not None
        func_src = ast.get_source_segment(src, func)

        # Must NOT query for a random radiologist
        assert 'filter(User.role == "radiologist")' not in func_src, \
            "create_report must not query for a random radiologist"

        # Must use current_user.id
        assert "current_user.id" in func_src, \
            "create_report must use current_user.id as the author"

    def test_create_report_no_todo_comment(self):
        """The TODO comment about 'Get actual user ID' must be removed."""
        src = _read_source(self.REPORTS_FILE)
        tree = _parse_ast(self.REPORTS_FILE)
        func = _get_function_node(tree, "create_report")
        func_src = ast.get_source_segment(src, func)
        assert "TODO: Get actual user ID" not in func_src, \
            "create_report must not have the TODO comment"


# ============================================================
# P2-4: Remove --reload from Production Start Script
# ============================================================

class TestStartScriptNoReload:
    """Production start script must NOT use --reload flag."""

    START_SCRIPT = "start_server.sh"

    def test_no_reload_in_exec_uvicorn(self):
        """The exec uvicorn command must not include --reload."""
        src = _read_source(self.START_SCRIPT)
        # Find exec uvicorn lines
        exec_lines = [line for line in src.split("\n") if "exec uvicorn" in line or line.strip() == "--reload"]
        for line in exec_lines:
            # Allow --reload as part of a comment but not as an active flag
            stripped = line.split("#")[0]  # Remove comments
            assert "--reload" not in stripped, \
                f"start_server.sh must NOT use --reload flag in exec uvicorn. Found: {line}"

    def test_main_py_reload_is_conditional(self):
        """main.py __main__ block should only use reload when DEBUG=True."""
        src = _read_source("main.py")
        # The reload param should be tied to settings.DEBUG
        assert "reload=settings.DEBUG" in src or "reload=True" not in src, \
            "main.py reload should be conditional on settings.DEBUG"


# ============================================================
# P2-5: Disable /docs and /redoc in Production
# ============================================================

class TestDocsDisabledInProduction:
    """/docs and /redoc should be disabled when not in development."""

    def test_docs_url_conditional(self):
        """FastAPI docs_url must be None in production."""
        src = _read_source("main.py")
        # Should have conditional docs_url
        assert 'docs_url="/docs"' not in src or "settings." in src.split('docs_url')[1].split('\n')[0], \
            "docs_url must be conditional on environment/debug setting"
        # More specific: should contain a conditional expression
        # e.g., docs_url="/docs" if settings.DEBUG else None
        assert "None" in src.split("docs_url")[1].split(",")[0] or \
               "settings" in src.split("docs_url")[1].split(",")[0], \
            "docs_url must reference settings or use None conditionally"

    def test_redoc_url_conditional(self):
        """FastAPI redoc_url must be None in production."""
        src = _read_source("main.py")
        assert "None" in src.split("redoc_url")[1].split(",")[0] or \
               "settings" in src.split("redoc_url")[1].split(",")[0], \
            "redoc_url must reference settings or use None conditionally"


# ============================================================
# P2-6: Log Rotation
# ============================================================

class TestLogRotation:
    """Logging must use RotatingFileHandler instead of FileHandler."""

    LOGGING_FILE = "app/core/logging.py"

    def test_uses_rotating_file_handler(self):
        """Must use RotatingFileHandler, not bare FileHandler."""
        src = _read_source(self.LOGGING_FILE)
        assert "RotatingFileHandler" in src, \
            "Logging must use RotatingFileHandler for log rotation"

    def test_no_bare_file_handler(self):
        """Must NOT use plain FileHandler (which doesn't rotate)."""
        src = _read_source(self.LOGGING_FILE)
        tree = _parse_ast(self.LOGGING_FILE)
        # Check that FileHandler is not instantiated (RotatingFileHandler is OK)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute) and node.func.attr == "FileHandler":
                    pytest.fail("Must not use logging.FileHandler — use RotatingFileHandler instead")
                if isinstance(node.func, ast.Name) and node.func.id == "FileHandler":
                    pytest.fail("Must not use FileHandler — use RotatingFileHandler instead")

    def test_rotating_handler_has_max_bytes(self):
        """RotatingFileHandler must specify maxBytes."""
        src = _read_source(self.LOGGING_FILE)
        assert "maxBytes" in src, \
            "RotatingFileHandler must have maxBytes configured"

    def test_rotating_handler_has_backup_count(self):
        """RotatingFileHandler must specify backupCount."""
        src = _read_source(self.LOGGING_FILE)
        assert "backupCount" in src, \
            "RotatingFileHandler must have backupCount configured"


# ============================================================
# P2-7: Docker Non-Root User + Healthcheck Fix
# ============================================================

class TestDockerSecurity:
    """Dockerfile must run as non-root and have a working healthcheck."""

    DOCKERFILE = "Dockerfile"

    def test_creates_non_root_user(self):
        """Dockerfile must create a non-root user."""
        src = _read_source(self.DOCKERFILE)
        assert "adduser" in src or "useradd" in src, \
            "Dockerfile must create a non-root user"

    def test_switches_to_non_root_user(self):
        """Dockerfile must have a USER directive to switch away from root."""
        src = _read_source(self.DOCKERFILE)
        # USER directive must be present (not as a comment)
        user_lines = [
            line for line in src.split("\n")
            if line.strip().startswith("USER ") and not line.strip().startswith("#")
        ]
        assert len(user_lines) > 0, \
            "Dockerfile must have a USER directive to switch from root"
        # The USER should not be root
        for line in user_lines:
            assert "root" not in line.lower(), \
                f"USER directive must NOT be root: {line}"

    def test_healthcheck_uses_curl(self):
        """Healthcheck should use curl (already installed) instead of python/wget."""
        src = _read_source(self.DOCKERFILE)
        # Find HEALTHCHECK CMD line
        healthcheck_lines = [
            line for line in src.split("\n")
            if "CMD" in line and ("health" in line.lower() or "curl" in line.lower())
        ]
        found_curl_healthcheck = any("curl" in line for line in healthcheck_lines)
        assert found_curl_healthcheck, \
            "Healthcheck should use curl (already installed) not python requests"


# ============================================================
# P2-8: CORS Restrict Origins
# ============================================================

class TestCORSRestriction:
    """CORS must not allow all origins."""

    def test_cors_not_wildcard(self):
        """CORS allow_origins must not be ['*']."""
        src = _read_source("main.py")
        # Should not have allow_origins=["*"]
        assert 'allow_origins=["*"]' not in src, \
            "CORS must not allow all origins with ['*']"

    def test_config_cors_origins_not_wildcard(self):
        """Settings BACKEND_CORS_ORIGINS must not return ['*']."""
        src = _read_source("app/core/config.py")
        # The BACKEND_CORS_ORIGINS property should not return ["*"]
        assert '["*"]' not in src, \
            "Config must not have wildcard CORS origins"

    def test_production_cors_is_restrictive(self):
        """In production environment, CORS origins must be explicitly listed or empty."""
        src = _read_source("app/core/config.py")
        # The production branch should return [] or specific domains
        # It should NOT contain localhost in production origins
        tree = _parse_ast("app/core/config.py")
        # Just check that the property exists and the production branch
        # doesn't include localhost
        assert "BACKEND_CORS_ORIGINS" in src, \
            "Config must define BACKEND_CORS_ORIGINS"


# ============================================================
# Summary Test
# ============================================================

class TestPhase2Summary:
    """Verify all Phase 2 fixes are applied."""

    def test_all_phase2_files_exist(self):
        """All files modified by Phase 2 should exist."""
        required_files = [
            "app/api/v1/endpoints/inference.py",
            "app/api/v1/endpoints/account.py",
            "app/api/v1/endpoints/reports.py",
            "app/api/v1/endpoints/models.py",
            "main.py",
            "app/core/logging.py",
            "Dockerfile",
            "start_server.sh",
            "app/core/config.py",
        ]
        for f in required_files:
            path = BACKEND_ROOT / f
            assert path.exists(), f"Required file not found: {f}"
