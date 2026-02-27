"""
Authentication Schemas
Pydantic models for authentication, authorization, and user management
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum

from app.db.models.user import UserRole


class UserRoleEnum(str, Enum):
    """User roles for RBAC - matches database UserRole"""
    ADMIN = "admin"
    RADIOLOGIST = "radiologist"
    TECHNICIAN = "technician"
    VIEWER = "viewer"


# ==================== Authentication Requests ====================

class LoginRequest(BaseModel):
    """Login request with email and password"""
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=1, description="User's password")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "radiologist@hospital.com",
                "password": "SecurePass123!"
            }
        }
    }


class RegisterRequest(BaseModel):
    """User registration request"""
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password (min 8 characters)")
    first_name: str = Field(..., min_length=1, max_length=100, description="User's first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="User's last name")
    role: UserRoleEnum = Field(default=UserRoleEnum.VIEWER, description="User's role")
    organization_id: Optional[str] = Field(None, description="Organization UUID (optional - will use default org for self-registration)")
    
    # Optional medical credentials
    license_number: Optional[str] = Field(None, max_length=100, description="Medical license number")
    specialization: Optional[str] = Field(None, max_length=255, description="Medical specialization")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(c in special_chars for c in v):
            raise ValueError("Password must contain at least one special character")
        
        return v
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "new.radiologist@hospital.com",
                "password": "SecurePass123!",
                "first_name": "Jane",
                "last_name": "Smith",
                "role": "radiologist",
                "license_number": "MD12345",
                "specialization": "Breast Imaging"
            }
        }
    }


class TokenRefreshRequest(BaseModel):
    """Request to refresh access token using refresh token"""
    refresh_token: str = Field(..., description="Valid refresh token")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }
    }


class PasswordChangeRequest(BaseModel):
    """Request to change user password"""
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(c in special_chars for c in v):
            raise ValueError("Password must contain at least one special character")
        
        return v
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "current_password": "OldPass123!",
                "new_password": "NewSecurePass456!"
            }
        }
    }


# ==================== Authentication Responses ====================

class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(default=1800, description="Token expiration in seconds (30 minutes)")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800
            }
        }
    }


class UserResponse(BaseModel):
    """User information response"""
    id: str = Field(..., description="User UUID")
    email: str = Field(..., description="User's email address")
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    full_name: str = Field(..., description="User's full name")
    role: UserRoleEnum = Field(..., description="User's role")
    organization_id: str = Field(..., description="Organization UUID")
    
    # Optional fields
    license_number: Optional[str] = Field(None, description="Medical license number")
    specialization: Optional[str] = Field(None, description="Medical specialization")
    
    # Status
    is_active: bool = Field(..., description="Whether user account is active")
    email_verified: bool = Field(..., description="Whether email is verified")
    two_factor_enabled: bool = Field(..., description="Whether 2FA is enabled")
    last_login: Optional[str] = Field(None, description="Last login timestamp")
    
    # Timestamps
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "radiologist@hospital.com",
                "first_name": "John",
                "last_name": "Doe",
                "full_name": "John Doe",
                "role": "radiologist",
                "organization_id": "987e6543-e21b-12d3-a456-426614174000",
                "license_number": "MD12345",
                "specialization": "Breast Imaging",
                "is_active": True,
                "email_verified": True,
                "two_factor_enabled": False,
                "last_login": "2026-01-08T10:30:00",
                "created_at": "2025-01-15T08:00:00",
                "updated_at": "2026-01-08T10:30:00"
            }
        }
    }


class LoginResponse(BaseModel):
    """Response after successful login"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(default=1800, description="Token expiration in seconds")
    user: UserResponse = Field(..., description="User information")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800,
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "radiologist@hospital.com",
                    "first_name": "John",
                    "last_name": "Doe",
                    "full_name": "John Doe",
                    "role": "radiologist",
                    "organization_id": "987e6543-e21b-12d3-a456-426614174000",
                    "is_active": True,
                    "email_verified": True,
                    "two_factor_enabled": False,
                    "created_at": "2025-01-15T08:00:00",
                    "updated_at": "2026-01-08T10:30:00"
                }
            }
        }
    }


class MessageResponse(BaseModel):
    """Simple message response"""
    message: str = Field(..., description="Response message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Operation completed successfully"
            }
        }
    }


# ==================== User Management ====================

class UserUpdateRequest(BaseModel):
    """Request to update user information"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    license_number: Optional[str] = Field(None, max_length=100)
    specialization: Optional[str] = Field(None, max_length=255)
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "first_name": "Jane",
                "last_name": "Smith",
                "license_number": "MD67890",
                "specialization": "Mammography"
            }
        }
    }


class UserListResponse(BaseModel):
    """Paginated list of users"""
    users: list[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "users": [],
                "total": 50,
                "page": 1,
                "page_size": 20
            }
        }
    }
