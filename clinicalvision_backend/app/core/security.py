"""
JWT Token Management and Password Hashing
Provides secure authentication utilities for the ClinicalVision AI platform
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Password hashing context using bcrypt
# Truncate password to 72 bytes for bcrypt compatibility
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__default_rounds=12,
    bcrypt__truncate_error=False  # Truncate instead of error
)


class SecurityException(Exception):
    """Base exception for security-related errors"""
    pass


class TokenExpiredException(SecurityException):
    """Raised when a token has expired"""
    pass


class InvalidTokenException(SecurityException):
    """Raised when a token is invalid"""
    pass


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password
    
    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to compare against
        
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a plain password using bcrypt
    
    Args:
        password: The plain text password to hash
        
    Returns:
        str: The hashed password
    """
    return pwd_context.hash(password)


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Dictionary of claims to encode in the token
        expires_delta: Optional expiration time delta
        
    Returns:
        str: Encoded JWT token
        
    Example:
        >>> token = create_access_token({"sub": "user@example.com", "role": "radiologist"})
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    logger.info(f"Created access token for subject: {data.get('sub')}")
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT refresh token with longer expiration
    
    Args:
        data: Dictionary of claims to encode in the token
        expires_delta: Optional expiration time delta (default: 7 days)
        
    Returns:
        str: Encoded JWT refresh token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Refresh tokens last 7 days by default
        expire = datetime.now(timezone.utc) + timedelta(days=7)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    logger.info(f"Created refresh token for subject: {data.get('sub')}")
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token
    
    Args:
        token: The JWT token to decode
        
    Returns:
        Dict[str, Any]: Decoded token payload
        
    Raises:
        TokenExpiredException: If the token has expired
        InvalidTokenException: If the token is invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise TokenExpiredException("Token has expired")
        
    except JWTError as e:
        logger.warning(f"Invalid token: {str(e)}")
        raise InvalidTokenException("Invalid token")


def verify_token_type(payload: Dict[str, Any], expected_type: str) -> bool:
    """
    Verify that a token is of the expected type
    
    Args:
        payload: Decoded token payload
        expected_type: Expected token type ("access" or "refresh")
        
    Returns:
        bool: True if token type matches
    """
    token_type = payload.get("type")
    if token_type != expected_type:
        logger.warning(f"Token type mismatch: expected {expected_type}, got {token_type}")
        return False
    return True


def extract_user_email(token: str) -> Optional[str]:
    """
    Extract user email from a JWT token
    
    Args:
        token: The JWT token
        
    Returns:
        Optional[str]: User email if valid, None otherwise
    """
    try:
        payload = decode_token(token)
        email: str = payload.get("sub")
        return email
    except SecurityException:
        return None


def create_token_pair(user_email: str, user_role: str, user_id: str) -> Dict[str, str]:
    """
    Create both access and refresh tokens for a user
    
    Args:
        user_email: User's email address
        user_role: User's role (for RBAC)
        user_id: User's UUID
        
    Returns:
        Dict containing access_token and refresh_token
    """
    token_data = {
        "sub": user_email,
        "role": user_role,
        "user_id": user_id
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": user_email, "user_id": user_id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength for security compliance
    
    Args:
        password: The password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    # Check for special characters
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character"
    
    return True, None
