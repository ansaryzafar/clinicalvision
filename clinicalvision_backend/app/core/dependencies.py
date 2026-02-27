"""
Authentication and Authorization Dependencies
FastAPI dependencies for JWT validation and role-based access control (RBAC)
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.db.session import get_db
from app.db.models.user import User, UserRole
from app.services.auth_service import AuthService, InvalidTokenException, TokenExpiredException, UserNotFoundException, InactiveUserException

logger = logging.getLogger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """
    Dependency to get AuthService instance
    
    Args:
        db: Database session
        
    Returns:
        AuthService: Authentication service instance
    """
    return AuthService(db)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer token credentials
        auth_service: Authentication service
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    try:
        user = auth_service.get_current_user(token)
        return user
        
    except TokenExpiredException:
        logger.warning("Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except InvalidTokenException:
        logger.warning("Invalid token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except UserNotFoundException:
        logger.warning("User not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except InactiveUserException:
        logger.warning("Inactive user")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Active user
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return current_user


# ==================== Role-Based Access Control (RBAC) ====================

class RoleChecker:
    """
    Dependency class for role-based access control
    
    Usage:
        @app.get("/admin", dependencies=[Depends(RoleChecker(["admin"]))])
    """
    
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [role.lower() for role in allowed_roles]
    
    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        """
        Check if current user has required role
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            User: User if authorized
            
        Raises:
            HTTPException: If user lacks required role
        """
        user_role = current_user.role.value.lower()
        
        if user_role not in self.allowed_roles:
            logger.warning(
                f"Access denied: User {current_user.email} (role: {user_role}) "
                f"attempted to access resource requiring roles: {self.allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(self.allowed_roles)}"
            )
        
        logger.info(f"Access granted: User {current_user.email} (role: {user_role})")
        return current_user


# ==================== Convenience Dependencies ====================

async def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Require admin role
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: User if admin
        
    Raises:
        HTTPException: If not admin
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_radiologist(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Require radiologist role
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: User if radiologist
        
    Raises:
        HTTPException: If not radiologist
    """
    if current_user.role != UserRole.RADIOLOGIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Radiologist access required"
        )
    return current_user


async def require_radiologist_or_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Require radiologist or admin role
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: User if radiologist or admin
        
    Raises:
        HTTPException: If neither radiologist nor admin
    """
    if current_user.role not in [UserRole.RADIOLOGIST, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Radiologist or admin access required"
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise
    
    Useful for endpoints that have optional authentication
    
    Args:
        credentials: HTTP Bearer token credentials (optional)
        auth_service: Authentication service
        
    Returns:
        Optional[User]: Current user if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        user = auth_service.get_current_user(credentials.credentials)
        return user
    except Exception:
        return None


def check_organization_access(user: User, organization_id: str) -> None:
    """
    Check if user has access to specific organization
    
    Args:
        user: Current user
        organization_id: Organization UUID to check access for
        
    Raises:
        HTTPException: If user doesn't have access to organization
    """
    # Admins have access to all organizations
    if user.role == UserRole.ADMIN:
        return
    
    # Other users can only access their own organization
    if str(user.organization_id) != organization_id:
        logger.warning(
            f"Organization access denied: User {user.email} "
            f"(org: {user.organization_id}) attempted to access org: {organization_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this organization is not permitted"
        )


def check_resource_ownership(user: User, resource_owner_id: str) -> None:
    """
    Check if user owns a resource or is an admin
    
    Args:
        user: Current user
        resource_owner_id: UUID of resource owner
        
    Raises:
        HTTPException: If user doesn't own resource and isn't admin
    """
    if user.role == UserRole.ADMIN:
        return
    
    if str(user.id) != resource_owner_id:
        logger.warning(
            f"Resource access denied: User {user.email} "
            f"attempted to access resource owned by {resource_owner_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this resource is not permitted"
        )
