"""
Email Service
Handles email sending for verification, password reset, and notifications
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import secrets
import hashlib
from functools import lru_cache

from pydantic import BaseModel, Field, EmailStr
from pydantic_settings import BaseSettings
from jinja2 import Template

logger = logging.getLogger(__name__)


# ==================== Configuration ====================

class EmailSettings(BaseSettings):
    """Email configuration settings"""
    
    SMTP_HOST: str = Field(default="localhost", description="SMTP server host")
    SMTP_PORT: int = Field(default=587, description="SMTP server port")
    SMTP_USER: str = Field(default="", description="SMTP username")
    SMTP_PASSWORD: str = Field(default="", description="SMTP password")
    SMTP_TLS: bool = Field(default=True, description="Use TLS")
    SMTP_SSL: bool = Field(default=False, description="Use SSL")
    
    EMAIL_FROM: str = Field(default="noreply@clinicalvision.ai", description="From email address")
    EMAIL_FROM_NAME: str = Field(default="ClinicalVision AI", description="From name")
    
    EMAIL_ENABLED: bool = Field(default=False, description="Enable email sending")
    EMAIL_TEMPLATES_DIR: str = Field(default="templates/email", description="Email templates directory")
    
    # Token settings
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = Field(default=24, description="Email verification token expiry")
    PASSWORD_RESET_EXPIRE_HOURS: int = Field(default=1, description="Password reset token expiry")
    
    # Application URLs
    APP_URL: str = Field(default="http://localhost:3000", description="Frontend application URL")
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_email_settings() -> EmailSettings:
    """Get cached email settings"""
    return EmailSettings()


# ==================== Schemas ====================

class EmailMessage(BaseModel):
    """Email message structure"""
    to: str
    subject: str
    body_html: str
    body_text: Optional[str] = None


class VerificationToken(BaseModel):
    """Email verification token"""
    token: str
    email: str
    expires_at: datetime
    token_type: str = "email_verification"


class PasswordResetToken(BaseModel):
    """Password reset token"""
    token: str
    email: str
    expires_at: datetime
    token_type: str = "password_reset"


# ==================== Email Templates ====================

EMAIL_VERIFICATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - ClinicalVision AI</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0277BD 0%, #00ACC1 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .button { display: inline-block; background: #0277BD; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 ClinicalVision AI</h1>
            <p>Professional Breast Cancer Detection Platform</p>
        </div>
        <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello {{ first_name }},</p>
            <p>Thank you for registering with ClinicalVision AI. To complete your registration and access the platform, please verify your email address by clicking the button below:</p>
            
            <p style="text-align: center;">
                <a href="{{ verification_url }}" class="button">Verify Email Address</a>
            </p>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0277BD;">{{ verification_url }}</p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in {{ expire_hours }} hours. If you did not create an account, please ignore this email.
            </div>
            
            <p>Once verified, you'll have access to:</p>
            <ul>
                <li>AI-powered mammography analysis</li>
                <li>DICOM image management</li>
                <li>Clinical reporting tools</li>
                <li>Collaborative workflows</li>
            </ul>
        </div>
        <div class="footer">
            <p>ClinicalVision AI - Professional Medical Imaging Platform</p>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; {{ year }} ClinicalVision AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

PASSWORD_RESET_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - ClinicalVision AI</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0277BD 0%, #00ACC1 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .button { display: inline-block; background: #d32f2f; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .warning { background: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 15px 0; }
        .info { background: #e3f2fd; border-left: 4px solid #0277BD; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
            <p>ClinicalVision AI</p>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello {{ first_name }},</p>
            <p>We received a request to reset your password for your ClinicalVision AI account. Click the button below to set a new password:</p>
            
            <p style="text-align: center;">
                <a href="{{ reset_url }}" class="button">Reset Password</a>
            </p>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0277BD;">{{ reset_url }}</p>
            
            <div class="warning">
                <strong>🔒 Security Alert:</strong> This link will expire in {{ expire_hours }} hour(s). If you did not request a password reset, please secure your account immediately and contact support.
            </div>
            
            <div class="info">
                <strong>Password Requirements:</strong>
                <ul style="margin: 5px 0;">
                    <li>At least 8 characters</li>
                    <li>One uppercase letter</li>
                    <li>One lowercase letter</li>
                    <li>One number</li>
                    <li>One special character</li>
                </ul>
            </div>
            
            <p>For security reasons, this password reset link can only be used once.</p>
        </div>
        <div class="footer">
            <p>ClinicalVision AI - Professional Medical Imaging Platform</p>
            <p>If you did not request this password reset, please contact our support team.</p>
            <p>&copy; {{ year }} ClinicalVision AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

WELCOME_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ClinicalVision AI</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0277BD 0%, #00ACC1 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .button { display: inline-block; background: #0277BD; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .feature { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to ClinicalVision AI!</h1>
            <p>Your account has been verified</p>
        </div>
        <div class="content">
            <h2>Hello {{ first_name }},</h2>
            <p>Your email has been verified and your ClinicalVision AI account is now active. You're ready to start using our AI-powered breast cancer detection platform.</p>
            
            <p style="text-align: center;">
                <a href="{{ login_url }}" class="button">Go to Dashboard</a>
            </p>
            
            <h3>Getting Started</h3>
            
            <div class="feature">
                <strong>📤 Upload Mammograms</strong>
                <p>Upload DICOM or standard image files for AI analysis.</p>
            </div>
            
            <div class="feature">
                <strong>🔬 AI Analysis</strong>
                <p>Our AI model will analyze images and provide risk assessments.</p>
            </div>
            
            <div class="feature">
                <strong>📋 Generate Reports</strong>
                <p>Create professional clinical reports with findings and recommendations.</p>
            </div>
            
            <p>If you have any questions, our support team is here to help.</p>
        </div>
        <div class="footer">
            <p>ClinicalVision AI - Professional Medical Imaging Platform</p>
            <p>&copy; {{ year }} ClinicalVision AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


# ==================== Email Service ====================

class EmailService:
    """
    Email service for sending transactional emails.
    
    Supports:
    - Email verification
    - Password reset
    - Welcome emails
    - Custom notifications
    """
    
    def __init__(self, settings: Optional[EmailSettings] = None):
        self.settings = settings or get_email_settings()
        # Import and use Redis-backed token storage
        try:
            from app.services.token_storage import get_token_storage, TokenStorage
            self._token_storage_service: Optional[Any] = get_token_storage()
        except ImportError:
            self._token_storage_service = None
        self._token_storage: Dict[str, Dict[str, Any]] = {}  # Fallback in-memory storage
    
    @property
    def is_enabled(self) -> bool:
        """Check if email service is enabled and configured"""
        return (
            self.settings.EMAIL_ENABLED and
            bool(self.settings.SMTP_HOST) and
            bool(self.settings.SMTP_USER)
        )
    
    def _render_template(self, template_str: str, context: Dict[str, Any]) -> str:
        """Render Jinja2 template with context"""
        template = Template(template_str)
        context['year'] = datetime.now().year
        return template.render(**context)
    
    def _send_email(self, message: EmailMessage) -> bool:
        """
        Send email via SMTP.
        
        Args:
            message: Email message to send
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.is_enabled:
            logger.warning("Email service is not enabled. Email not sent.")
            # Log the email for development
            logger.info(f"[DEV] Would send email to {message.to}: {message.subject}")
            return True  # Return True in dev mode to not break flows
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = message.subject
            msg['From'] = f"{self.settings.EMAIL_FROM_NAME} <{self.settings.EMAIL_FROM}>"
            msg['To'] = message.to
            
            # Attach plain text version if available
            if message.body_text:
                msg.attach(MIMEText(message.body_text, 'plain'))
            
            # Attach HTML version
            msg.attach(MIMEText(message.body_html, 'html'))
            
            # Connect to SMTP server
            if self.settings.SMTP_SSL:
                server = smtplib.SMTP_SSL(self.settings.SMTP_HOST, self.settings.SMTP_PORT)
            else:
                server = smtplib.SMTP(self.settings.SMTP_HOST, self.settings.SMTP_PORT)
                if self.settings.SMTP_TLS:
                    server.starttls()
            
            # Login and send
            if self.settings.SMTP_USER and self.settings.SMTP_PASSWORD:
                server.login(self.settings.SMTP_USER, self.settings.SMTP_PASSWORD)
            
            server.sendmail(self.settings.EMAIL_FROM, message.to, msg.as_string())
            server.quit()
            
            logger.info(f"Email sent successfully to {message.to}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {message.to}: {e}")
            return False
    
    def _generate_token(self) -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    def _hash_token(self, token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _store_token(self, hashed: str, data: Dict[str, Any], ttl_hours: int) -> None:
        """Store token using Redis if available, fallback to memory"""
        if self._token_storage_service:
            self._token_storage_service.store_token(
                hashed, data, ttl_seconds=ttl_hours * 3600
            )
        else:
            self._token_storage[hashed] = data
    
    def _get_token(self, hashed: str) -> Optional[Dict[str, Any]]:
        """Get token from Redis if available, fallback to memory"""
        if self._token_storage_service:
            return self._token_storage_service.get_token(hashed)
        return self._token_storage.get(hashed)
    
    def _mark_token_used(self, hashed: str) -> None:
        """Mark token as used"""
        if self._token_storage_service:
            self._token_storage_service.mark_token_used(hashed)
        elif hashed in self._token_storage:
            self._token_storage[hashed]['used'] = True
    
    def create_verification_token(self, email: str, user_id: str) -> str:
        """
        Create email verification token.
        
        Args:
            email: User's email address
            user_id: User's ID
            
        Returns:
            Verification token
        """
        token = self._generate_token()
        hashed = self._hash_token(token)
        
        expires_at = datetime.utcnow() + timedelta(
            hours=self.settings.EMAIL_VERIFICATION_EXPIRE_HOURS
        )
        
        # Store token using Redis or memory
        token_data = {
            'email': email,
            'user_id': user_id,
            'expires_at': expires_at,
            'type': 'email_verification',
            'used': False
        }
        self._store_token(hashed, token_data, self.settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
        
        logger.info(f"Created verification token for {email}")
        return token
    
    def verify_email_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify email verification token.
        
        Args:
            token: Verification token
            
        Returns:
            Token data if valid, None otherwise
        """
        hashed = self._hash_token(token)
        token_data = self._get_token(hashed)
        
        if not token_data:
            logger.warning("Verification token not found")
            return None
        
        if token_data.get('used'):
            logger.warning("Verification token already used")
            return None
        
        if datetime.utcnow() > token_data.get('expires_at', datetime.min):
            logger.warning("Verification token expired")
            return None
        
        # Mark as used
        self._mark_token_used(hashed)
        
        return token_data
    
    def create_password_reset_token(self, email: str, user_id: str) -> str:
        """
        Create password reset token.
        
        Args:
            email: User's email address
            user_id: User's ID
            
        Returns:
            Reset token
        """
        token = self._generate_token()
        hashed = self._hash_token(token)
        
        
        expires_at = datetime.utcnow() + timedelta(
            hours=self.settings.PASSWORD_RESET_EXPIRE_HOURS
        )
        
        # Note: Invalidating existing tokens would require Redis scan
        # For now, we just create a new token - old tokens will expire
        
        # Store token using Redis or memory
        token_data = {
            'email': email,
            'user_id': user_id,
            'expires_at': expires_at,
            'type': 'password_reset',
            'used': False
        }
        self._store_token(hashed, token_data, self.settings.PASSWORD_RESET_EXPIRE_HOURS)
        
        logger.info(f"Created password reset token for {email}")
        return token
    
    def verify_reset_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify password reset token.
        
        Args:
            token: Reset token
            
        Returns:
            Token data if valid, None otherwise
        """
        hashed = self._hash_token(token)
        token_data = self._get_token(hashed)
        
        if not token_data:
            logger.warning("Reset token not found")
            return None
        
        if token_data.get('type') != 'password_reset':
            logger.warning("Invalid token type")
            return None
        
        if token_data.get('used'):
            logger.warning("Reset token already used")
            return None
        
        if datetime.utcnow() > token_data.get('expires_at', datetime.min):
            logger.warning("Reset token expired")
            return None
        
        return token_data
    
    def invalidate_reset_token(self, token: str) -> bool:
        """
        Invalidate a reset token after use.
        
        Args:
            token: Reset token
            
        Returns:
            True if invalidated successfully
        """
        hashed = self._hash_token(token)
        self._mark_token_used(hashed)
        return True
    
    def send_verification_email(
        self,
        email: str,
        first_name: str,
        token: str
    ) -> bool:
        """
        Send email verification email.
        
        Args:
            email: Recipient email
            first_name: User's first name
            token: Verification token
            
        Returns:
            True if sent successfully
        """
        verification_url = f"{self.settings.APP_URL}/verify-email?token={token}"
        
        html_content = self._render_template(EMAIL_VERIFICATION_TEMPLATE, {
            'first_name': first_name,
            'verification_url': verification_url,
            'expire_hours': self.settings.EMAIL_VERIFICATION_EXPIRE_HOURS
        })
        
        message = EmailMessage(
            to=email,
            subject="Verify Your Email - ClinicalVision AI",
            body_html=html_content
        )
        
        return self._send_email(message)
    
    def send_password_reset_email(
        self,
        email: str,
        first_name: str,
        token: str
    ) -> bool:
        """
        Send password reset email.
        
        Args:
            email: Recipient email
            first_name: User's first name
            token: Reset token
            
        Returns:
            True if sent successfully
        """
        reset_url = f"{self.settings.APP_URL}/reset-password?token={token}"
        
        html_content = self._render_template(PASSWORD_RESET_TEMPLATE, {
            'first_name': first_name,
            'reset_url': reset_url,
            'expire_hours': self.settings.PASSWORD_RESET_EXPIRE_HOURS
        })
        
        message = EmailMessage(
            to=email,
            subject="Reset Your Password - ClinicalVision AI",
            body_html=html_content
        )
        
        return self._send_email(message)
    
    def send_welcome_email(
        self,
        email: str,
        first_name: str
    ) -> bool:
        """
        Send welcome email after verification.
        
        Args:
            email: Recipient email
            first_name: User's first name
            
        Returns:
            True if sent successfully
        """
        login_url = f"{self.settings.APP_URL}/login"
        
        html_content = self._render_template(WELCOME_EMAIL_TEMPLATE, {
            'first_name': first_name,
            'login_url': login_url
        })
        
        message = EmailMessage(
            to=email,
            subject="Welcome to ClinicalVision AI! 🎉",
            body_html=html_content
        )
        
        return self._send_email(message)


# ==================== Dependency Injection ====================

# Singleton instance for token storage persistence
_email_service_instance: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """
    Get email service instance.
    
    Uses singleton pattern to persist token storage.
    """
    global _email_service_instance
    if _email_service_instance is None:
        _email_service_instance = EmailService()
    return _email_service_instance
