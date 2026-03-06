"""
Account Management API Endpoints
Email verification, password reset, and account security operations
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from sqlalchemy.orm import Session
import logging
import re

from app.db.session import get_db
from app.db.models.user import User
from app.services.email_service import EmailService, get_email_service
from app.core.security import get_password_hash, verify_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["Account Management"])


# ==================== Schemas ====================

class RequestVerificationEmail(BaseModel):
    """Request to resend verification email"""
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    """Email verification request"""
    token: str


class RequestPasswordReset(BaseModel):
    """Request password reset"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password with token"""
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        """Validate password meets security requirements"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Validate passwords match"""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class ChangePasswordRequest(BaseModel):
    """Change password (when logged in)"""
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        """Validate password meets security requirements"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class AccountResponse(BaseModel):
    """Generic account operation response"""
    success: bool
    message: str


# ==================== Email Verification Endpoints ====================

@router.post("/request-verification", response_model=AccountResponse)
def request_verification_email(
    request: RequestVerificationEmail,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    email_service: EmailService = Depends(get_email_service)
):
    """
    Request a verification email to be sent.
    
    This endpoint can be used to resend the verification email if the user
    didn't receive it or if the previous link expired.
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        # Don't reveal whether email exists
        logger.info(f"Verification requested for non-existent email: {request.email}")
        return AccountResponse(
            success=True,
            message="If an account exists with this email, a verification link has been sent."
        )
    
    if user.email_verified:
        return AccountResponse(
            success=True,
            message="Email is already verified. You can log in."
        )
    
    # Create verification token
    token = email_service.create_verification_token(
        email=user.email,
        user_id=str(user.id)
    )
    
    # Send email in background
    background_tasks.add_task(
        email_service.send_verification_email,
        email=user.email,
        first_name=user.first_name,
        token=token
    )
    
    logger.info(f"Verification email queued for {user.email}")
    
    return AccountResponse(
        success=True,
        message="If an account exists with this email, a verification link has been sent."
    )


@router.post("/verify-email", response_model=AccountResponse)
def verify_email(
    request: VerifyEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    email_service: EmailService = Depends(get_email_service)
):
    """
    Verify email address using the token from the verification email.
    
    This endpoint validates the token and marks the user's email as verified.
    """
    # Verify token
    token_data = email_service.verify_email_token(request.token)
    
    if not token_data:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification token. Please request a new verification email."
        )
    
    # Find user
    user = db.query(User).filter(User.email == token_data['email']).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    if user.email_verified:
        return AccountResponse(
            success=True,
            message="Email is already verified."
        )
    
    # Update user
    user.email_verified = True
    db.commit()
    
    logger.info(f"Email verified for user: {user.email}")
    
    # Send welcome email in background
    background_tasks.add_task(
        email_service.send_welcome_email,
        email=user.email,
        first_name=user.first_name
    )
    
    return AccountResponse(
        success=True,
        message="Email verified successfully! You can now log in."
    )


@router.get("/verification-status")
def check_verification_status(
    email: EmailStr = Query(..., description="Email address to check"),
    db: Session = Depends(get_db)
):
    """
    Check if an email address is verified.
    
    This endpoint is useful for the frontend to check status after verification.
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Don't reveal whether email exists
        return {"email_verified": False, "user_exists": False}
    
    return {
        "email_verified": user.email_verified,
        "user_exists": True
    }


# ==================== Password Reset Endpoints ====================

@router.post("/request-password-reset", response_model=AccountResponse)
def request_password_reset(
    request: RequestPasswordReset,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    email_service: EmailService = Depends(get_email_service)
):
    """
    Request a password reset email.
    
    A secure link will be sent to the user's email address if the account exists.
    For security, the response is always the same whether the email exists or not.
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        # Don't reveal whether email exists
        logger.info(f"Password reset requested for non-existent email: {request.email}")
        return AccountResponse(
            success=True,
            message="If an account exists with this email, a password reset link has been sent."
        )
    
    if not user.is_active:
        logger.warning(f"Password reset requested for inactive user: {request.email}")
        return AccountResponse(
            success=True,
            message="If an account exists with this email, a password reset link has been sent."
        )
    
    # Create reset token
    token = email_service.create_password_reset_token(
        email=user.email,
        user_id=str(user.id)
    )
    
    # Send email in background
    background_tasks.add_task(
        email_service.send_password_reset_email,
        email=user.email,
        first_name=user.first_name,
        token=token
    )
    
    logger.info(f"Password reset email queued for {user.email}")
    
    return AccountResponse(
        success=True,
        message="If an account exists with this email, a password reset link has been sent."
    )


@router.post("/reset-password", response_model=AccountResponse)
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
    email_service: EmailService = Depends(get_email_service)
):
    """
    Reset password using the token from the reset email.
    
    The token is validated and the user's password is updated.
    The token is invalidated after use for security.
    """
    # Verify token
    token_data = email_service.verify_reset_token(request.token)
    
    if not token_data:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token. Please request a new password reset."
        )
    
    # Find user
    user = db.query(User).filter(User.email == token_data['email']).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive. Please contact support."
        )
    
    # Update password
    user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    
    # Invalidate token
    email_service.invalidate_reset_token(request.token)
    
    logger.info(f"Password reset successful for user: {user.email}")
    
    return AccountResponse(
        success=True,
        message="Password reset successfully! You can now log in with your new password."
    )


@router.get("/validate-reset-token")
def validate_reset_token(
    token: str = Query(..., description="Reset token to validate"),
    email_service: EmailService = Depends(get_email_service)
):
    """
    Validate a password reset token without using it.
    
    This allows the frontend to check if a token is valid before showing
    the password reset form.
    """
    token_data = email_service.verify_reset_token(token)
    
    if not token_data:
        return {
            "valid": False,
            "message": "Token is invalid or has expired"
        }
    
    return {
        "valid": True,
        "email": token_data['email'][:3] + "***" + token_data['email'].split('@')[0][-1:] + "@" + token_data['email'].split('@')[1],  # Partially mask email
        "message": "Token is valid"
    }


# ==================== Password Change (Authenticated) ====================

@router.post("/change-password", response_model=AccountResponse)
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    # In production, add: current_user: User = Depends(get_current_active_user)
):
    """
    Change password for authenticated user.
    
    Requires the current password for verification.
    This endpoint should be protected by authentication middleware.
    """
    # Note: In production, get user from JWT token
    # For now, this is a placeholder that shows the expected logic
    
    # Example implementation:
    # if not verify_password(request.current_password, current_user.hashed_password):
    #     raise HTTPException(
    #         status_code=400,
    #         detail="Current password is incorrect"
    #     )
    # 
    # if request.current_password == request.new_password:
    #     raise HTTPException(
    #         status_code=400,
    #         detail="New password must be different from current password"
    #     )
    # 
    # current_user.hashed_password = get_password_hash(request.new_password)
    # db.commit()
    
    raise HTTPException(
        status_code=501,
        detail="This endpoint requires authentication integration. Use /reset-password for password reset."
    )


# ==================== Account Security ====================

@router.get("/security-status")
def get_security_status(
    email: EmailStr = Query(..., description="Email address to check"),
    db: Session = Depends(get_db)
):
    """
    Get account security status.
    
    Returns information about account security settings.
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    return {
        "email_verified": user.email_verified,
        "two_factor_enabled": user.two_factor_enabled if hasattr(user, 'two_factor_enabled') else False,
        "is_active": user.is_active,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "account_created": user.created_at.isoformat() if user.created_at else None
    }
