"""
Configuration management using Pydantic Settings
Loads configuration from environment variables with validation
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator, field_validator
from typing import Optional, List, Union, Any
import os
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    Provides type validation and default values
    """
    
    # Application
    APP_NAME: str = "ClinicalVision AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "postgresql://clinicalvision:password@localhost:5432/clinicalvision_db"
    
    # Security & JWT
    SECRET_KEY: str = "your-secret-key-change-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """
        Validate that SECRET_KEY is not the default value in production
        This is a critical security check
        """
        default_keys = [
            "your-secret-key-change-in-production-use-openssl-rand-hex-32",
            "changeme",
            "secret",
            "default",
        ]
        
        # Get environment from values being validated
        environment = info.data.get('ENVIRONMENT', 'development')
        
        # In production, reject default/weak keys
        if environment == "production":
            if v.lower() in [k.lower() for k in default_keys]:
                raise ValueError(
                    "🔴 CRITICAL SECURITY ERROR: Cannot use default SECRET_KEY in production! "
                    "Generate a secure key with: openssl rand -hex 32"
                )
            if len(v) < 32:
                raise ValueError(
                    "🔴 CRITICAL SECURITY ERROR: SECRET_KEY must be at least 32 characters in production! "
                    "Generate a secure key with: openssl rand -hex 32"
                )
        else:
            # In development, warn but allow
            if v.lower() in [k.lower() for k in default_keys]:
                logger.warning(
                    "⚠️  WARNING: Using default SECRET_KEY in development. "
                    "This is OK for development but NEVER use this in production!"
                )
        
        return v
    
    @field_validator('DATABASE_URL')
    @classmethod
    def validate_database_url(cls, v: str, info) -> str:
        """
        Validate DATABASE_URL is not using default credentials in production
        """
        environment = info.data.get('ENVIRONMENT', 'development')
        
        default_passwords = ["password", "changeme", "secret", "default", "postgres"]
        
        if environment == "production":
            for pwd in default_passwords:
                if f":{pwd}@" in v.lower():
                    raise ValueError(
                        "🔴 CRITICAL SECURITY ERROR: Cannot use default DATABASE_URL password in production! "
                        "Set a strong database password in your environment variables."
                    )
        else:
            for pwd in default_passwords:
                if f":{pwd}@" in v.lower():
                    logger.warning(
                        "⚠️  WARNING: Using default database password in development."
                    )
                    break
        
        return v
    
    # Password Policy
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    # Model Configuration
    USE_MOCK_MODEL: bool = True
    MODEL_PATH: str = "models/best_model.pth"
    MODEL_VERSION: str = "v12_production"
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB for DICOM files
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".dcm"}
    
    # Storage Configuration
    MAX_IMAGE_SIZE: int = 50 * 1024 * 1024  # 50MB for images
    MAX_DICOM_SIZE: int = 500 * 1024 * 1024  # 500MB for DICOM
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # CORS Configuration (can be overridden via CORS_ORIGINS env var)
    CORS_ORIGINS: Optional[str] = None  # Comma-separated list of allowed origins
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Allow extra env vars for email, redis, etc.
    )
    
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        """
        CORS origins for the API
        - In production: Use CORS_ORIGINS env var (comma-separated)
        - In development: Allow common frontend dev servers
        """
        # If CORS_ORIGINS is set, use it (production mode)
        if self.CORS_ORIGINS:
            # Parse comma-separated origins, strip whitespace
            origins = [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]
            if origins:
                return origins
        
        # Development defaults - common frontend dev servers
        if self.ENVIRONMENT != "production":
            return [
                "http://localhost:3000",    # React default
                "http://localhost:3001",    # React alternate (Docker)
                "http://localhost:5173",    # Vite default
                "http://localhost:8080",    # Vue CLI default
                "http://localhost:4200",    # Angular default
                "http://localhost:8000",    # Backend dev
                "http://localhost:8001",    # Backend Docker
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:8080",
                "http://127.0.0.1:4200",
            ]
        
        # Production without CORS_ORIGINS set - strict (only same-origin)
        logger.warning(
            "⚠️  CORS_ORIGINS not set in production! "
            "Set CORS_ORIGINS environment variable to allow frontend access."
        )
        return []
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create upload directory if it doesn't exist
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)


# Global settings instance
settings = Settings()
