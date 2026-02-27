"""
Auth0 API Endpoints
OAuth 2.0 authentication endpoints for Auth0 integration
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from typing import Optional
import secrets
import logging

from app.services.auth0_service import (
    Auth0Service,
    Auth0User,
    Auth0TokenResponse,
    Auth0Error,
    get_auth0_service
)
from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth0", tags=["Auth0 Authentication"])


# ==================== Schemas ====================

class Auth0LoginInitResponse(BaseModel):
    """Response for login initialization"""
    authorization_url: str
    state: str


class Auth0CallbackRequest(BaseModel):
    """Callback request with authorization code"""
    code: str
    state: str


class Auth0TokenRefreshRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str


class Auth0StatusResponse(BaseModel):
    """Auth0 status response"""
    enabled: bool
    domain: Optional[str] = None
    client_id: Optional[str] = None


# ==================== Endpoints ====================

@router.get("/status", response_model=Auth0StatusResponse)
async def get_auth0_status(
    auth0: Auth0Service = Depends(get_auth0_service)
):
    """
    Check Auth0 configuration status.
    
    Returns whether Auth0 is enabled and basic configuration info.
    """
    return Auth0StatusResponse(
        enabled=auth0.is_enabled,
        domain=auth0.settings.AUTH0_DOMAIN if auth0.is_enabled else None,
        client_id=auth0.settings.AUTH0_CLIENT_ID if auth0.is_enabled else None
    )


@router.get("/login", response_model=Auth0LoginInitResponse)
async def initiate_auth0_login(
    request: Request,
    redirect_uri: Optional[str] = Query(
        None,
        description="Callback URL after Auth0 login"
    ),
    connection: Optional[str] = Query(
        None,
        description="Auth0 connection to use (e.g., 'google-oauth2', 'github')"
    ),
    auth0: Auth0Service = Depends(get_auth0_service)
):
    """
    Initiate Auth0 login flow.
    
    Returns the authorization URL to redirect the user to Auth0.
    The state parameter is used for CSRF protection.
    """
    if not auth0.is_enabled:
        raise HTTPException(
            status_code=503,
            detail="Auth0 authentication is not enabled"
        )
    
    # Generate CSRF state
    state = secrets.token_urlsafe(32)
    
    # Default redirect URI to the callback endpoint
    if not redirect_uri:
        redirect_uri = str(request.url_for("auth0_callback"))
    
    # Generate authorization URL
    auth_url = auth0.get_authorization_url(
        redirect_uri=redirect_uri,
        state=state,
        connection=connection
    )
    
    logger.info(f"Auth0 login initiated with state: {state[:8]}...")
    
    return Auth0LoginInitResponse(
        authorization_url=auth_url,
        state=state
    )


@router.get("/callback")
async def auth0_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    auth0: Auth0Service = Depends(get_auth0_service)
):
    """
    Handle Auth0 OAuth callback.
    
    This endpoint receives the authorization code from Auth0
    and exchanges it for tokens.
    """
    if not auth0.is_enabled:
        raise HTTPException(
            status_code=503,
            detail="Auth0 authentication is not enabled"
        )
    
    # Handle error from Auth0
    if error:
        logger.warning(f"Auth0 callback error: {error} - {error_description}")
        raise HTTPException(
            status_code=400,
            detail=f"Auth0 error: {error_description or error}"
        )
    
    if not code:
        raise HTTPException(
            status_code=400,
            detail="Missing authorization code"
        )
    
    try:
        # Get the redirect URI that was used
        redirect_uri = str(request.url_for("auth0_callback"))
        
        # Exchange code for tokens
        tokens = await auth0.exchange_code_for_tokens(
            code=code,
            redirect_uri=redirect_uri
        )
        
        # Get user info
        user = await auth0.get_user_info(tokens.access_token)
        
        logger.info(f"Auth0 login successful for user: {user.email}")
        
        # Return tokens and user info
        return {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
            "token_type": tokens.token_type,
            "expires_in": tokens.expires_in,
            "user": {
                "id": user.sub,
                "email": user.email,
                "email_verified": user.email_verified,
                "name": user.name,
                "given_name": user.given_name,
                "family_name": user.family_name,
                "picture": user.picture,
                "organization_id": user.organization_id,
                "role": user.role
            }
        }
        
    except Auth0Error as e:
        logger.error(f"Auth0 callback failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh", response_model=Auth0TokenResponse)
async def refresh_auth0_token(
    request: Auth0TokenRefreshRequest,
    auth0: Auth0Service = Depends(get_auth0_service)
):
    """
    Refresh Auth0 access token using refresh token.
    """
    if not auth0.is_enabled:
        raise HTTPException(
            status_code=503,
            detail="Auth0 authentication is not enabled"
        )
    
    try:
        tokens = await auth0.refresh_tokens(request.refresh_token)
        logger.info("Auth0 token refreshed successfully")
        return tokens
        
    except Auth0Error as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/userinfo")
async def get_auth0_user_info(
    request: Request,
    auth0: Auth0Service = Depends(get_auth0_service)
):
    """
    Get current user info from Auth0.
    
    Requires a valid Auth0 access token in the Authorization header.
    """
    if not auth0.is_enabled:
        raise HTTPException(
            status_code=503,
            detail="Auth0 authentication is not enabled"
        )
    
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization[7:]
    
    try:
        # Validate token first
        payload = await auth0.validate_token(token)
        
        # Get user info
        user = await auth0.get_user_info(token)
        
        return {
            "id": user.sub,
            "email": user.email,
            "email_verified": user.email_verified,
            "name": user.name,
            "given_name": user.given_name,
            "family_name": user.family_name,
            "picture": user.picture,
            "organization_id": user.organization_id,
            "role": user.role,
            "license_number": user.license_number,
            "specialization": user.specialization
        }
        
    except Auth0Error as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/logout")
async def auth0_logout(
    return_to: str = Query(
        ...,
        description="URL to redirect to after logout"
    ),
    auth0: Auth0Service = Depends(get_auth0_service)
):
    """
    Logout from Auth0 and redirect.
    
    This endpoint returns a redirect to the Auth0 logout URL.
    """
    if not auth0.is_enabled:
        raise HTTPException(
            status_code=503,
            detail="Auth0 authentication is not enabled"
        )
    
    logout_url = auth0.get_logout_url(return_to=return_to)
    
    logger.info("Auth0 logout initiated")
    
    return RedirectResponse(url=logout_url)


@router.post("/validate")
async def validate_auth0_token(
    request: Request,
    auth0: Auth0Service = Depends(get_auth0_service)
):
    """
    Validate an Auth0 access token.
    
    Returns the token payload if valid.
    """
    if not auth0.is_enabled:
        raise HTTPException(
            status_code=503,
            detail="Auth0 authentication is not enabled"
        )
    
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization[7:]
    
    try:
        payload = await auth0.validate_token(token)
        return {
            "valid": True,
            "payload": payload
        }
        
    except Auth0Error as e:
        raise HTTPException(status_code=401, detail=str(e))


# ==================== Middleware Support ====================

async def verify_auth0_token(request: Request) -> Optional[Auth0User]:
    """
    Middleware-compatible token verification.
    
    Can be used as a dependency to protect routes with Auth0 authentication.
    Falls back to local JWT if Auth0 is not enabled.
    
    Usage:
        @router.get("/protected")
        async def protected_route(
            user: Auth0User = Depends(verify_auth0_token)
        ):
            ...
    """
    auth0 = get_auth0_service()
    
    if not auth0.is_enabled:
        return None  # Fall back to local auth
    
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization[7:]
    
    try:
        # Validate token
        await auth0.validate_token(token)
        
        # Get user info
        user = await auth0.get_user_info(token)
        return user
        
    except Auth0Error:
        return None
