"""
Authentication Service
Business logic for user authentication, registration, and session management
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, Tuple
from datetime import datetime, timezone
import logging
import uuid

from app.db.models.user import User, UserRole
from app.core.security import (
    verify_password,
    get_password_hash,
    create_token_pair,
    decode_token,
    verify_token_type,
    TokenExpiredException,
    InvalidTokenException
)
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    UserResponse,
    LoginResponse,
    TokenResponse,
    UserUpdateRequest
)

logger = logging.getLogger(__name__)


# ==================== Custom Exceptions ====================

class AuthenticationException(Exception):
    """Base exception for authentication errors"""
    pass


class InvalidCredentialsException(AuthenticationException):
    """Raised when credentials are invalid"""
    pass


class UserAlreadyExistsException(AuthenticationException):
    """Raised when attempting to register a duplicate user"""
    pass


class UserNotFoundException(AuthenticationException):
    """Raised when user is not found"""
    pass


class InactiveUserException(AuthenticationException):
    """Raised when user account is inactive"""
    pass


class EmailNotVerifiedException(AuthenticationException):
    """Raised when email is not verified and verification is required"""
    pass


class UnauthorizedException(AuthenticationException):
    """Raised when user lacks required permissions"""
    pass


# ==================== Authentication Service ====================

class AuthService:
    """Service for handling authentication and user management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _user_to_response(self, user: User) -> UserResponse:
        """Convert User model to UserResponse schema"""
        return UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            full_name=user.full_name,
            role=user.role.value,
            organization_id=str(user.organization_id),
            license_number=user.license_number,
            specialization=user.specialization,
            is_active=user.is_active,
            email_verified=user.email_verified,
            two_factor_enabled=user.two_factor_enabled,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    
    def register_user(self, request: RegisterRequest) -> UserResponse:
        """
        Register a new user
        
        Args:
            request: User registration data
            
        Returns:
            UserResponse: Created user information
            
        Raises:
            UserAlreadyExistsException: If email already exists
        """
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == request.email).first()
        if existing_user:
            logger.warning(f"Registration failed: Email already exists - {request.email}")
            raise UserAlreadyExistsException(f"User with email {request.email} already exists")
        
        # Get or create organization
        from app.db.models.organization import Organization
        
        if request.organization_id:
            # Validate provided organization exists
            organization = self.db.query(Organization).filter(
                Organization.id == uuid.UUID(request.organization_id)
            ).first()
            if not organization:
                logger.warning(f"Registration failed: Organization not found - {request.organization_id}")
                raise ValueError(f"Organization {request.organization_id} not found")
            org_id = organization.id
        else:
            # Get or create default organization for self-registration
            default_org_name = "Self-Registered Users"
            organization = self.db.query(Organization).filter(
                Organization.name == default_org_name
            ).first()
            
            if not organization:
                # Create default organization
                organization = Organization(
                    name=default_org_name,
                    is_active=True
                )
                self.db.add(organization)
                self.db.flush()  # Get the ID without committing
                logger.info(f"Created default organization: {default_org_name}")
            
            org_id = organization.id
        
        # Hash password
        hashed_password = get_password_hash(request.password)
        
        # Create new user
        new_user = User(
            email=request.email,
            hashed_password=hashed_password,
            first_name=request.first_name,
            last_name=request.last_name,
            role=UserRole[request.role.value.upper()],
            organization_id=org_id,
            license_number=request.license_number,
            specialization=request.specialization,
            is_active=True,
            email_verified=False,  # Require email verification
            two_factor_enabled=False
        )
        
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        
        logger.info(f"New user registered: {new_user.email} (ID: {new_user.id})")
        
        return self._user_to_response(new_user)
    
    def authenticate_user(self, request: LoginRequest) -> Tuple[User, TokenResponse]:
        """
        Authenticate user and generate tokens
        
        Args:
            request: Login credentials
            
        Returns:
            Tuple[User, TokenResponse]: Authenticated user and tokens
            
        Raises:
            InvalidCredentialsException: If credentials are invalid
            InactiveUserException: If user account is inactive
        """
        # Find user by email
        user = self.db.query(User).filter(User.email == request.email).first()
        
        if not user:
            logger.warning(f"Login failed: User not found - {request.email}")
            raise InvalidCredentialsException("Invalid email or password")
        
        # Verify password
        if not verify_password(request.password, user.hashed_password):
            logger.warning(f"Login failed: Invalid password - {request.email}")
            raise InvalidCredentialsException("Invalid email or password")
        
        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login failed: User inactive - {request.email}")
            raise InactiveUserException("User account is inactive")
        
        # Update last login
        user.last_login = datetime.now(timezone.utc).isoformat()
        self.db.commit()
        
        # Generate tokens
        tokens = create_token_pair(
            user_email=user.email,
            user_role=user.role.value,
            user_id=str(user.id)
        )
        
        token_response = TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=1800  # 30 minutes
        )
        
        logger.info(f"User logged in: {user.email} (ID: {user.id})")
        
        return user, token_response
    
    def login(self, request: LoginRequest) -> LoginResponse:
        """
        Complete login flow with user info and tokens
        
        Args:
            request: Login credentials
            
        Returns:
            LoginResponse: User info and authentication tokens
        """
        user, token_response = self.authenticate_user(request)
        user_response = self._user_to_response(user)
        
        return LoginResponse(
            access_token=token_response.access_token,
            refresh_token=token_response.refresh_token,
            token_type=token_response.token_type,
            expires_in=token_response.expires_in,
            user=user_response
        )
    
    def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """
        Generate new access token using refresh token
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            TokenResponse: New access and refresh tokens
            
        Raises:
            InvalidTokenException: If refresh token is invalid
            TokenExpiredException: If refresh token has expired
        """
        try:
            # Decode and validate refresh token
            payload = decode_token(refresh_token)
            
            # Verify token type
            if not verify_token_type(payload, "refresh"):
                raise InvalidTokenException("Invalid token type")
            
            # Extract user info
            user_email = payload.get("sub")
            user_id = payload.get("user_id")
            
            if not user_email or not user_id:
                raise InvalidTokenException("Invalid token payload")
            
            # Find user
            user = self.db.query(User).filter(User.id == uuid.UUID(user_id)).first()
            if not user:
                raise UserNotFoundException(f"User {user_id} not found")
            
            if not user.is_active:
                raise InactiveUserException("User account is inactive")
            
            # Generate new token pair
            tokens = create_token_pair(
                user_email=user.email,
                user_role=user.role.value,
                user_id=str(user.id)
            )
            
            logger.info(f"Token refreshed for user: {user.email}")
            
            return TokenResponse(
                access_token=tokens["access_token"],
                refresh_token=tokens["refresh_token"],
                token_type=tokens["token_type"],
                expires_in=1800
            )
            
        except (TokenExpiredException, InvalidTokenException) as e:
            logger.warning(f"Token refresh failed: {str(e)}")
            raise
    
    def get_current_user(self, token: str) -> User:
        """
        Get current user from access token
        
        Args:
            token: JWT access token
            
        Returns:
            User: Current authenticated user
            
        Raises:
            InvalidTokenException: If token is invalid
            UserNotFoundException: If user not found
        """
        try:
            # Decode token
            payload = decode_token(token)
            
            # Verify token type
            if not verify_token_type(payload, "access"):
                raise InvalidTokenException("Invalid token type")
            
            # Extract user info
            user_id = payload.get("user_id")
            if not user_id:
                raise InvalidTokenException("Invalid token payload")
            
            # Find user
            user = self.db.query(User).filter(User.id == uuid.UUID(user_id)).first()
            if not user:
                raise UserNotFoundException(f"User {user_id} not found")
            
            if not user.is_active:
                raise InactiveUserException("User account is inactive")
            
            return user
            
        except (TokenExpiredException, InvalidTokenException) as e:
            logger.warning(f"Get current user failed: {str(e)}")
            raise
    
    def get_user_by_id(self, user_id: str) -> User:
        """
        Get user by ID
        
        Args:
            user_id: User UUID
            
        Returns:
            User: User object
            
        Raises:
            UserNotFoundException: If user not found
        """
        user = self.db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            raise UserNotFoundException(f"User {user_id} not found")
        return user
    
    def update_user(self, user_id: str, request: UserUpdateRequest) -> UserResponse:
        """
        Update user information
        
        Args:
            user_id: User UUID
            request: Update data
            
        Returns:
            UserResponse: Updated user information
            
        Raises:
            UserNotFoundException: If user not found
        """
        user = self.get_user_by_id(user_id)
        
        # Update fields if provided
        if request.first_name is not None:
            user.first_name = request.first_name
        if request.last_name is not None:
            user.last_name = request.last_name
        if request.license_number is not None:
            user.license_number = request.license_number
        if request.specialization is not None:
            user.specialization = request.specialization
        
        user.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(user)
        
        logger.info(f"User updated: {user.email} (ID: {user.id})")
        
        return self._user_to_response(user)
    
    def change_password(self, user_id: str, current_password: str, new_password: str) -> None:
        """
        Change user password
        
        Args:
            user_id: User UUID
            current_password: Current password
            new_password: New password
            
        Raises:
            UserNotFoundException: If user not found
            InvalidCredentialsException: If current password is incorrect
        """
        user = self.get_user_by_id(user_id)
        
        # Verify current password
        if not verify_password(current_password, user.hashed_password):
            raise InvalidCredentialsException("Current password is incorrect")
        
        # Update password
        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        
        logger.info(f"Password changed for user: {user.email} (ID: {user.id})")
    
    def deactivate_user(self, user_id: str) -> None:
        """
        Deactivate user account
        
        Args:
            user_id: User UUID
            
        Raises:
            UserNotFoundException: If user not found
        """
        user = self.get_user_by_id(user_id)
        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        
        logger.info(f"User deactivated: {user.email} (ID: {user.id})")
    
    def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        role: Optional[str] = None,
        organization_id: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[list[User], int]:
        """
        List users with optional filters
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            role: Filter by role
            organization_id: Filter by organization
            is_active: Filter by active status
            
        Returns:
            Tuple[list[User], int]: List of users and total count
        """
        query = self.db.query(User)
        
        # Apply filters
        if role:
            query = query.filter(User.role == UserRole[role.upper()])
        if organization_id:
            query = query.filter(User.organization_id == uuid.UUID(organization_id))
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        users = query.offset(skip).limit(limit).all()
        
        return users, total
