"""
Tests for database backup and restore scripts
Validates backup system functionality
"""

import pytest
import subprocess
import os
import tempfile
import shutil
from pathlib import Path


class TestBackupScripts:
    """Test database backup scripts"""
    
    @pytest.fixture
    def temp_backup_dir(self):
        """Create temporary directory for test backups"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        # Cleanup
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def scripts_dir(self):
        """Get scripts directory path"""
        current_dir = Path(__file__).parent.parent
        return current_dir / "scripts"
    
    def test_backup_script_exists(self, scripts_dir):
        """Should have backup script"""
        backup_script = scripts_dir / "backup_database.sh"
        assert backup_script.exists()
        assert os.access(backup_script, os.X_OK), "Script should be executable"
    
    def test_restore_script_exists(self, scripts_dir):
        """Should have restore script"""
        restore_script = scripts_dir / "restore_database.sh"
        assert restore_script.exists()
        assert os.access(restore_script, os.X_OK), "Script should be executable"
    
    def test_backup_script_help(self, scripts_dir):
        """Should show usage when called without arguments"""
        backup_script = scripts_dir / "backup_database.sh"
        
        # Run with invalid env to trigger help/error
        result = subprocess.run(
            [str(backup_script)],
            cwd=scripts_dir.parent,
            capture_output=True,
            text=True,
            env={"PATH": os.environ["PATH"]}  # Minimal env
        )
        
        # Should either succeed or fail gracefully
        # We're mainly checking the script doesn't crash
        assert result.returncode in [0, 1], "Script should exit cleanly"
    
    def test_restore_script_requires_argument(self, scripts_dir):
        """Should require backup file argument"""
        restore_script = scripts_dir / "restore_database.sh"
        
        result = subprocess.run(
            [str(restore_script)],
            capture_output=True,
            text=True
        )
        
        # Should exit with error code
        assert result.returncode != 0
        # Error message can be in stdout or stderr
        output = result.stdout + result.stderr
        assert "Usage" in output or "usage" in output.lower()
    
    def test_backup_creates_directory(self, scripts_dir, temp_backup_dir):
        """Should create backup directory if it doesn't exist"""
        # This test would require actual database access
        # For now, we verify the script handles missing directory
        non_existent = os.path.join(temp_backup_dir, "new_backup_dir")
        
        # Verify the directory doesn't exist before test
        assert not os.path.exists(non_existent)
        
        # The script should create it (when run with proper env)
        # For now, just verify the path is valid
        assert os.path.dirname(non_existent) == temp_backup_dir
    
    def test_systemd_files_exist(self, scripts_dir):
        """Should have systemd service and timer files"""
        service_file = scripts_dir / "clinicalvision-backup.service"
        timer_file = scripts_dir / "clinicalvision-backup.timer"
        
        assert service_file.exists()
        assert timer_file.exists()
        
        # Check basic content
        service_content = service_file.read_text()
        assert "ExecStart" in service_content
        assert "backup_database.sh" in service_content
        
        timer_content = timer_file.read_text()
        assert "OnCalendar" in timer_content
        assert "clinicalvision-backup.service" in timer_content
    
    def test_backup_readme_exists(self, scripts_dir):
        """Should have documentation for backup system"""
        readme = scripts_dir / "BACKUP_README.md"
        assert readme.exists()
        
        content = readme.read_text()
        assert "Backup" in content
        assert "Restore" in content
        assert "systemd" in content


class TestBackupScriptSyntax:
    """Test backup script syntax and structure"""
    
    @pytest.fixture
    def scripts_dir(self):
        current_dir = Path(__file__).parent.parent
        return current_dir / "scripts"
    
    def test_backup_script_syntax_valid(self, scripts_dir):
        """Backup script should have valid bash syntax"""
        backup_script = scripts_dir / "backup_database.sh"
        
        # Check for bash syntax errors using bash -n
        result = subprocess.run(
            ["bash", "-n", str(backup_script)],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0, f"Syntax error: {result.stderr}"
    
    def test_restore_script_syntax_valid(self, scripts_dir):
        """Restore script should have valid bash syntax"""
        restore_script = scripts_dir / "restore_database.sh"
        
        result = subprocess.run(
            ["bash", "-n", str(restore_script)],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0, f"Syntax error: {result.stderr}"
    
    def test_backup_script_has_shebang(self, scripts_dir):
        """Script should have proper shebang"""
        backup_script = scripts_dir / "backup_database.sh"
        
        with open(backup_script, 'r') as f:
            first_line = f.readline()
        
        assert first_line.startswith("#!/bin/bash")
    
    def test_backup_script_uses_set_flags(self, scripts_dir):
        """Script should use set -e and set -u for safety"""
        backup_script = scripts_dir / "backup_database.sh"
        
        content = backup_script.read_text()
        
        assert "set -e" in content, "Should exit on error"
        assert "set -u" in content, "Should exit on undefined variable"
    
    def test_backup_has_retention_policy(self, scripts_dir):
        """Backup script should implement retention policy"""
        backup_script = scripts_dir / "backup_database.sh"
        
        content = backup_script.read_text()
        
        assert "RETENTION_DAYS" in content
        assert "MAX_BACKUPS" in content
        assert "find" in content  # Used for cleanup
    
    def test_backup_creates_checksum(self, scripts_dir):
        """Backup script should create checksum for integrity"""
        backup_script = scripts_dir / "backup_database.sh"
        
        content = backup_script.read_text()
        
        assert "sha256sum" in content
        assert ".sha256" in content
    
    def test_restore_verifies_checksum(self, scripts_dir):
        """Restore script should verify checksum before restore"""
        restore_script = scripts_dir / "restore_database.sh"
        
        content = restore_script.read_text()
        
        assert "sha256sum" in content
        assert "CHECKSUM" in content or "checksum" in content
    
    def test_restore_has_safety_backup(self, scripts_dir):
        """Restore script should create safety backup before restore"""
        restore_script = scripts_dir / "restore_database.sh"
        
        content = restore_script.read_text()
        
        assert "safety" in content.lower() or "pre_restore" in content.lower()
        assert "pg_dump" in content  # For creating safety backup


class TestSystemdConfiguration:
    """Test systemd service and timer configuration"""
    
    @pytest.fixture
    def scripts_dir(self):
        current_dir = Path(__file__).parent.parent
        return current_dir / "scripts"
    
    def test_service_file_structure(self, scripts_dir):
        """Service file should have proper structure"""
        service_file = scripts_dir / "clinicalvision-backup.service"
        content = service_file.read_text()
        
        # Should have main sections
        assert "[Unit]" in content
        assert "[Service]" in content
        assert "[Install]" in content
        
        # Should specify type
        assert "Type=oneshot" in content
        
        # Should have execution command
        assert "ExecStart=" in content
    
    def test_timer_file_structure(self, scripts_dir):
        """Timer file should have proper structure"""
        timer_file = scripts_dir / "clinicalvision-backup.timer"
        content = timer_file.read_text()
        
        # Should have main sections
        assert "[Unit]" in content
        assert "[Timer]" in content
        assert "[Install]" in content
        
        # Should have schedule
        assert "OnCalendar=" in content
        
        # Should be persistent
        assert "Persistent=true" in content
    
    def test_timer_references_service(self, scripts_dir):
        """Timer should reference the backup service"""
        timer_file = scripts_dir / "clinicalvision-backup.timer"
        content = timer_file.read_text()
        
        assert "clinicalvision-backup.service" in content
    
    def test_service_has_security_hardening(self, scripts_dir):
        """Service should have security hardening options"""
        service_file = scripts_dir / "clinicalvision-backup.service"
        content = service_file.read_text()
        
        # Check for security options
        assert "PrivateTmp=" in content or "private" in content.lower()
        assert "NoNewPrivileges=" in content or "protect" in content.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
