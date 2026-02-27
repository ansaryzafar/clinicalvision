"""
Tests for security configuration validation
Ensures critical security settings are properly validated
"""

import pytest
from pydantic import ValidationError
from app.core.config import Settings


class TestSecretKeyValidation:
    """Test SECRET_KEY security validation"""
    
    def test_default_secret_key_rejected_in_production(self):
        """Should reject default SECRET_KEY in production"""
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY="your-secret-key-change-in-production-use-openssl-rand-hex-32"
            )
        
        error_msg = str(exc_info.value)
        assert "CRITICAL SECURITY ERROR" in error_msg
        assert "default SECRET_KEY" in error_msg
    
    def test_short_secret_key_rejected_in_production(self):
        """Should reject short SECRET_KEY in production"""
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY="short"
            )
        
        error_msg = str(exc_info.value)
        assert "at least 32 characters" in error_msg
    
    def test_weak_secret_keys_rejected_in_production(self):
        """Should reject common weak SECRET_KEYs in production"""
        weak_keys = ["changeme", "secret", "default", "password"]
        
        for weak_key in weak_keys:
            with pytest.raises(ValidationError) as exc_info:
                Settings(
                    ENVIRONMENT="production",
                    SECRET_KEY=weak_key
                )
            
            error_msg = str(exc_info.value)
            assert "CRITICAL SECURITY ERROR" in error_msg
    
    def test_secure_secret_key_accepted_in_production(self):
        """Should accept secure SECRET_KEY in production"""
        secure_key = "a" * 64  # 64 character key
        settings = Settings(
            ENVIRONMENT="production",
            SECRET_KEY=secure_key,
            DATABASE_URL="postgresql://test:test@localhost:5432/test"
        )
        
        assert settings.SECRET_KEY == secure_key
        assert settings.ENVIRONMENT == "production"
    
    def test_default_secret_key_allowed_in_development(self):
        """Should allow default SECRET_KEY in development (with warning)"""
        settings = Settings(
            ENVIRONMENT="development",
            SECRET_KEY="your-secret-key-change-in-production-use-openssl-rand-hex-32"
        )
        
        assert settings.ENVIRONMENT == "development"
        # Should not raise an error, just log a warning
    
    def test_secret_key_case_insensitive_check(self):
        """Should reject default keys regardless of case"""
        with pytest.raises(ValidationError):
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY="CHANGEME"  # Uppercase version of weak key
            )


class TestEnvironmentConfiguration:
    """Test environment-specific configuration"""
    
    def test_development_environment_defaults(self):
        """Should use safe defaults for development"""
        settings = Settings(ENVIRONMENT="development")
        
        assert settings.ENVIRONMENT == "development"
        # DEBUG can be True or False in development (configured via .env)
        assert isinstance(settings.DEBUG, bool)
    
    def test_production_environment_security(self):
        """Production should have strict security requirements"""
        # This should fail without a proper SECRET_KEY
        with pytest.raises(ValidationError):
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY="short"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
