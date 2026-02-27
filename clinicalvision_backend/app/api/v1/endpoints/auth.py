"""
Authentication and User Management Endpoints
RESTful API for user authentication, registration, and profile management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from starlette.responses import Response
from sqlalchemy.orm import Session
import logging

from app.db.session import get_db
from app.db.models.user import User
from app.core.rate_limit import limiter, get_rate_limit
from app.services.auth_service import (
    AuthService,
    InvalidCredentialsException,
    UserAlreadyExistsException,
    UserNotFoundException,
    InactiveUserException,
    InvalidTokenException,
    TokenExpiredException
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
    TokenRefreshRequest,
    TokenResponse,
    PasswordChangeRequest,
    MessageResponse,
    UserUpdateRequest,
    UserListResponse
)
from app.core.dependencies import (
    get_current_active_user,
    require_admin,
    check_resource_ownership,
    get_auth_service
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth")


# ==================== Authentication Endpoints ==

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="""
    Register a new user account with email and password.
    
    **Requirements:**
    - Unique email address
    - Password: min 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character
    - Valid organization ID
    
    **Returns:**
    - User information (excluding password)
    - Account is created with `is_active=True` but `email_verified=False`
    
    **Rate Limit:** 3 registrations per hour per IP
    """,
    responses={
        201: {"description": "User successfully registered"},
        400: {"description": "Invalid input or user already exists"},
        404: {"description": "Organization not found"},
        429: {"description": "Too many registration attempts"}
    }
)
@limiter.limit(get_rate_limit("register"))
def register(
    request_obj: RegisterRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    """Register a new user"""
    try:
        user = auth_service.register_user(request_obj)
        logger.info(f"User registered successfully: {request_obj.email}")
        return user
        
    except UserAlreadyExistsException:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in or use a different email."
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again later."
        )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="User login",
    description="""
    Authenticate user and receive JWT tokens.
    
    **Returns:**
    - `access_token`: Short-lived token for API requests (30 minutes)
    - `refresh_token`: Long-lived token for refreshing access (7 days)
    - User profile information
    
    **Authentication:**
    - Include `access_token` in `Authorization: Bearer <token>` header for subsequent requests
    
    **Rate Limit:** 5 login attempts per minute per IP (prevents brute force attacks)
    """,
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Invalid credentials or inactive account"},
        429: {"description": "Too many login attempts. Please try again later."}
    }
)
@limiter.limit(get_rate_limit("login"))
def login(
    request_obj: LoginRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service)
) -> LoginResponse:
    """Login and receive JWT tokens"""
    try:
        login_response = auth_service.login(request_obj)
        logger.info(f"User logged in: {request_obj.email}")
        return login_response
        
    except InvalidCredentialsException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except InactiveUserException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Please contact your administrator.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login. Please try again."
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="""
    Use a refresh token to obtain new access and refresh tokens.
    
    **Use case:**
    - When access token expires (30 minutes), use refresh token to get new tokens
    - Refresh tokens are valid for 7 days
    
    **Returns:**
    - New `access_token` (30 minutes validity)
    - New `refresh_token` (7 days validity)
    """,
    responses={
        200: {"description": "Token refreshed successfully"},
        401: {"description": "Invalid or expired refresh token"}
    }
)
def refresh_token(
    request: TokenRefreshRequest,
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """Refresh access token using refresh token"""
    try:
        response = auth_service.refresh_access_token(request.refresh_token)
        logger.info("Token refreshed successfully")
        return response
        
    except (InvalidTokenException, TokenExpiredException) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except InactiveUserException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="""
    Get profile information for the currently authenticated user.
    
    **Authentication Required:**
    - Include `Authorization: Bearer <access_token>` header
    
    **Returns:**
    - Complete user profile information
    """,
    responses={
        200: {"description": "User profile retrieved"},
        401: {"description": "Not authenticated"}
    }
)
def get_me(
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    """Get current user profile"""
    return auth_service._user_to_response(current_user)


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
    description="""
    Update profile information for the currently authenticated user.
    
    **Updatable fields:**
    - first_name
    - last_name
    - license_number
    - specialization
    
    **Note:** Email, role, and organization cannot be changed via this endpoint
    """,
    responses={
        200: {"description": "Profile updated successfully"},
        401: {"description": "Not authenticated"}
    }
)
def update_me(
    request: UserUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    """Update current user profile"""
    try:
        user = auth_service.update_user(str(current_user.id), request)
        logger.info(f"User profile updated: {current_user.email}")
        return user
        
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile update failed"
        )


@router.post(
    "/me/change-password",
    response_model=MessageResponse,
    summary="Change password",
    description="""
    Change password for the currently authenticated user.
    
    **Requirements:**
    - Current password must be correct
    - New password: min 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character
    
    **Security:**
    - All active sessions will remain valid
    - Consider implementing session invalidation on password change
    """,
    responses={
        200: {"description": "Password changed successfully"},
        400: {"description": "Invalid current password or weak new password"},
        401: {"description": "Not authenticated"}
    }
)
def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> MessageResponse:
    """Change user password"""
    try:
        auth_service.change_password(
            str(current_user.id),
            request.current_password,
            request.new_password
        )
        logger.info(f"Password changed: {current_user.email}")
        return MessageResponse(message="Password changed successfully")
        
    except InvalidCredentialsException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Password change error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


# ==================== User Management Endpoints (Admin) ====================

@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List users (Admin)",
    description="""
    List all users with optional filters.
    
    **Admin only endpoint**
    
    **Filters:**
    - `role`: Filter by user role (admin, radiologist, technician, viewer)
    - `organization_id`: Filter by organization UUID
    - `is_active`: Filter by active status
    - `skip`: Pagination offset (default: 0)
    - `limit`: Items per page (default: 20, max: 100)
    """,
    responses={
        200: {"description": "Users list retrieved"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized (admin only)"}
    }
)
def list_users(
    skip: int = 0,
    limit: int = 20,
    role: str = None,
    organization_id: str = None,
    is_active: bool = None,
    _: User = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserListResponse:
    """List users (admin only)"""
    try:
        # Enforce max limit
        limit = min(limit, 100)
        
        users, total = auth_service.list_users(
            skip=skip,
            limit=limit,
            role=role,
            organization_id=organization_id,
            is_active=is_active
        )
        
        user_responses = [auth_service._user_to_response(user) for user in users]
        
        return UserListResponse(
            users=user_responses,
            total=total,
            page=(skip // limit) + 1,
            page_size=limit
        )
        
    except Exception as e:
        logger.error(f"List users error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )


@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID (Admin)",
    description="""
    Get detailed information about a specific user.
    
    **Admin only endpoint**
    """,
    responses={
        200: {"description": "User retrieved"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized (admin only)"},
        404: {"description": "User not found"}
    }
)
def get_user(
    user_id: str,
    _: User = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    """Get user by ID (admin only)"""
    try:
        user = auth_service.get_user_by_id(user_id)
        return auth_service._user_to_response(user)
        
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user"
        )


@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Update user (Admin)",
    description="""
    Update any user's profile information.
    
    **Admin only endpoint**
    """,
    responses={
        200: {"description": "User updated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized (admin only)"},
        404: {"description": "User not found"}
    }
)
def update_user(
    user_id: str,
    request: UserUpdateRequest,
    _: User = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    """Update user (admin only)"""
    try:
        user = auth_service.update_user(user_id, request)
        logger.info(f"User updated by admin: {user_id}")
        return user
        
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )


@router.delete(
    "/users/{user_id}",
    response_model=MessageResponse,
    summary="Deactivate user (Admin)",
    description="""
    Deactivate a user account.
    
    **Admin only endpoint**
    
    **Note:** This sets `is_active=False`, it does not delete the user from the database.
    """,
    responses={
        200: {"description": "User deactivated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized (admin only)"},
        404: {"description": "User not found"}
    }
)
def deactivate_user(
    user_id: str,
    _: User = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service)
) -> MessageResponse:
    """Deactivate user (admin only)"""
    try:
        auth_service.deactivate_user(user_id)
        logger.info(f"User deactivated by admin: {user_id}")
        return MessageResponse(message="User deactivated successfully")
        
    except UserNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Deactivate user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user"
        )


# ==================== Health Check ====================

@router.get(
    "/health",
    response_model=MessageResponse,
    summary="Authentication service health check",
    description="Check if the authentication service is operational"
)
def health_check() -> MessageResponse:
    """Health check endpoint"""
    return MessageResponse(message="Authentication service is healthy")
