"""
Auth0 Integration Service
Enterprise-grade authentication using Auth0 for HIPAA-compliant medical applications
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import httpx
import logging
from jose import jwt, JWTError
from functools import lru_cache
import json

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


# ==================== Configuration ====================

class Auth0Settings(BaseSettings):
    """Auth0 configuration settings"""
    
    AUTH0_DOMAIN: str = Field(default="", description="Auth0 domain (e.g., yourapp.auth0.com)")
    AUTH0_CLIENT_ID: str = Field(default="", description="Auth0 application client ID")
    AUTH0_CLIENT_SECRET: str = Field(default="", description="Auth0 application client secret")
    AUTH0_AUDIENCE: str = Field(default="", description="Auth0 API audience/identifier")
    AUTH0_ALGORITHMS: list = Field(default=["RS256"], description="Supported JWT algorithms")
    AUTH0_ENABLED: bool = Field(default=False, description="Enable Auth0 authentication")
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_auth0_settings() -> Auth0Settings:
    """Get cached Auth0 settings"""
    return Auth0Settings()


# ==================== Schemas ====================

class Auth0User(BaseModel):
    """Auth0 user profile"""
    sub: str  # Auth0 user ID
    email: str
    email_verified: bool = False
    name: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    picture: Optional[str] = None
    locale: Optional[str] = None
    updated_at: Optional[str] = None
    
    # Custom claims for medical application
    organization_id: Optional[str] = None
    role: Optional[str] = None
    license_number: Optional[str] = None
    specialization: Optional[str] = None


class Auth0TokenResponse(BaseModel):
    """Auth0 token response"""
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    id_token: Optional[str] = None
    scope: Optional[str] = None


class Auth0Credentials(BaseModel):
    """Credentials for Auth0 Resource Owner Password Grant"""
    username: str
    password: str
    scope: str = "openid profile email"


# ==================== Auth0 Service ====================

class Auth0Service:
    """
    Auth0 authentication service for enterprise-grade authentication.
    
    Features:
    - JWT token validation with JWKS
    - User profile management
    - Machine-to-machine authentication
    - Role-based access control
    - Multi-tenant organization support
    """
    
    def __init__(self, settings: Optional[Auth0Settings] = None):
        self.settings = settings or get_auth0_settings()
        self._jwks_cache: Optional[Dict] = None
        self._jwks_expires: Optional[datetime] = None
        self._http_client: Optional[httpx.AsyncClient] = None
    
    @property
    def is_enabled(self) -> bool:
        """Check if Auth0 is properly configured and enabled"""
        return (
            self.settings.AUTH0_ENABLED and
            bool(self.settings.AUTH0_DOMAIN) and
            bool(self.settings.AUTH0_CLIENT_ID)
        )
    
    @property
    def issuer(self) -> str:
        """Get Auth0 issuer URL"""
        return f"https://{self.settings.AUTH0_DOMAIN}/"
    
    @property
    def jwks_url(self) -> str:
        """Get JWKS endpoint URL"""
        return f"https://{self.settings.AUTH0_DOMAIN}/.well-known/jwks.json"
    
    @property
    def token_url(self) -> str:
        """Get token endpoint URL"""
        return f"https://{self.settings.AUTH0_DOMAIN}/oauth/token"
    
    @property
    def userinfo_url(self) -> str:
        """Get userinfo endpoint URL"""
        return f"https://{self.settings.AUTH0_DOMAIN}/userinfo"
    
    @property
    def authorize_url(self) -> str:
        """Get authorize endpoint URL"""
        return f"https://{self.settings.AUTH0_DOMAIN}/authorize"
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=10.0)
        return self._http_client
    
    async def close(self):
        """Close HTTP client"""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
    
    async def get_jwks(self) -> Dict:
        """
        Fetch and cache JWKS (JSON Web Key Set) from Auth0.
        
        Returns:
            Dict containing the JWKS
        """
        # Check if cache is still valid
        if (
            self._jwks_cache is not None and
            self._jwks_expires is not None and
            datetime.utcnow() < self._jwks_expires
        ):
            return self._jwks_cache
        
        try:
            client = await self._get_http_client()
            response = await client.get(self.jwks_url)
            response.raise_for_status()
            
            self._jwks_cache = response.json()
            self._jwks_expires = datetime.utcnow() + timedelta(hours=6)
            
            logger.info("JWKS cache refreshed from Auth0")
            return self._jwks_cache
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch JWKS from Auth0: {e}")
            raise Auth0Error(f"Failed to fetch JWKS: {e}")
    
    def _get_signing_key(self, jwks: Dict, token: str) -> str:
        """
        Get the signing key for a token from JWKS.
        
        Args:
            jwks: JSON Web Key Set
            token: JWT token
            
        Returns:
            RSA public key in PEM format
        """
        try:
            unverified_header = jwt.get_unverified_header(token)
        except JWTError as e:
            raise Auth0Error(f"Invalid token header: {e}")
        
        kid = unverified_header.get("kid")
        if not kid:
            raise Auth0Error("Token header missing 'kid'")
        
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return self._jwk_to_pem(key)
        
        raise Auth0Error(f"Unable to find signing key for kid: {kid}")
    
    def _jwk_to_pem(self, jwk: Dict) -> Dict:
        """
        Convert JWK to a format usable by python-jose.
        
        Args:
            jwk: JSON Web Key
            
        Returns:
            Key in format for jwt.decode()
        """
        return jwk  # python-jose can use JWK directly
    
    async def validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate an Auth0 JWT access token.
        
        Args:
            token: JWT access token
            
        Returns:
            Dict containing validated token payload
            
        Raises:
            Auth0Error: If token validation fails
        """
        if not self.is_enabled:
            raise Auth0Error("Auth0 is not enabled")
        
        try:
            jwks = await self.get_jwks()
            signing_key = self._get_signing_key(jwks, token)
            
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=self.settings.AUTH0_ALGORITHMS,
                audience=self.settings.AUTH0_AUDIENCE,
                issuer=self.issuer
            )
            
            return payload
            
        except JWTError as e:
            logger.warning(f"JWT validation failed: {e}")
            raise Auth0Error(f"Token validation failed: {e}")
    
    async def get_user_info(self, access_token: str) -> Auth0User:
        """
        Get user profile from Auth0 userinfo endpoint.
        
        Args:
            access_token: Valid Auth0 access token
            
        Returns:
            Auth0User with user profile information
        """
        try:
            client = await self._get_http_client()
            response = await client.get(
                self.userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            
            user_data = response.json()
            
            # Extract custom claims
            custom_claims = user_data.get("https://clinicalvision.ai/claims", {})
            
            return Auth0User(
                sub=user_data["sub"],
                email=user_data.get("email", ""),
                email_verified=user_data.get("email_verified", False),
                name=user_data.get("name"),
                given_name=user_data.get("given_name"),
                family_name=user_data.get("family_name"),
                picture=user_data.get("picture"),
                locale=user_data.get("locale"),
                updated_at=user_data.get("updated_at"),
                organization_id=custom_claims.get("organization_id"),
                role=custom_claims.get("role"),
                license_number=custom_claims.get("license_number"),
                specialization=custom_claims.get("specialization")
            )
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get user info from Auth0: {e}")
            raise Auth0Error(f"Failed to get user info: {e}")
    
    async def exchange_code_for_tokens(
        self,
        code: str,
        redirect_uri: str
    ) -> Auth0TokenResponse:
        """
        Exchange authorization code for tokens (Authorization Code Flow).
        
        Args:
            code: Authorization code from Auth0
            redirect_uri: Callback URL used in authorization request
            
        Returns:
            Auth0TokenResponse with tokens
        """
        try:
            client = await self._get_http_client()
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "client_id": self.settings.AUTH0_CLIENT_ID,
                    "client_secret": self.settings.AUTH0_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri
                }
            )
            response.raise_for_status()
            
            token_data = response.json()
            return Auth0TokenResponse(**token_data)
            
        except httpx.HTTPError as e:
            logger.error(f"Token exchange failed: {e}")
            raise Auth0Error(f"Token exchange failed: {e}")
    
    async def refresh_tokens(self, refresh_token: str) -> Auth0TokenResponse:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Auth0TokenResponse with new tokens
        """
        try:
            client = await self._get_http_client()
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "refresh_token",
                    "client_id": self.settings.AUTH0_CLIENT_ID,
                    "client_secret": self.settings.AUTH0_CLIENT_SECRET,
                    "refresh_token": refresh_token
                }
            )
            response.raise_for_status()
            
            token_data = response.json()
            return Auth0TokenResponse(**token_data)
            
        except httpx.HTTPError as e:
            logger.error(f"Token refresh failed: {e}")
            raise Auth0Error(f"Token refresh failed: {e}")
    
    async def get_machine_token(self) -> Auth0TokenResponse:
        """
        Get machine-to-machine access token (Client Credentials Flow).
        Used for backend service authentication.
        
        Returns:
            Auth0TokenResponse with access token
        """
        try:
            client = await self._get_http_client()
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.settings.AUTH0_CLIENT_ID,
                    "client_secret": self.settings.AUTH0_CLIENT_SECRET,
                    "audience": self.settings.AUTH0_AUDIENCE
                }
            )
            response.raise_for_status()
            
            token_data = response.json()
            return Auth0TokenResponse(**token_data)
            
        except httpx.HTTPError as e:
            logger.error(f"Machine token request failed: {e}")
            raise Auth0Error(f"Machine token request failed: {e}")
    
    def get_authorization_url(
        self,
        redirect_uri: str,
        state: str,
        scope: str = "openid profile email",
        connection: Optional[str] = None
    ) -> str:
        """
        Generate Auth0 authorization URL for OAuth flow.
        
        Args:
            redirect_uri: Callback URL
            state: CSRF protection state
            scope: OAuth scopes
            connection: Auth0 connection to use (optional)
            
        Returns:
            Authorization URL
        """
        params = {
            "response_type": "code",
            "client_id": self.settings.AUTH0_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": scope,
            "state": state,
            "audience": self.settings.AUTH0_AUDIENCE
        }
        
        if connection:
            params["connection"] = connection
        
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.authorize_url}?{query_string}"
    
    def get_logout_url(self, return_to: str) -> str:
        """
        Generate Auth0 logout URL.
        
        Args:
            return_to: URL to redirect to after logout
            
        Returns:
            Logout URL
        """
        return (
            f"https://{self.settings.AUTH0_DOMAIN}/v2/logout"
            f"?client_id={self.settings.AUTH0_CLIENT_ID}"
            f"&returnTo={return_to}"
        )


# ==================== Exception Classes ====================

class Auth0Error(Exception):
    """Base exception for Auth0 errors"""
    pass


class Auth0TokenValidationError(Auth0Error):
    """Token validation failed"""
    pass


class Auth0ConfigurationError(Auth0Error):
    """Auth0 configuration error"""
    pass


# ==================== Dependency Injection ====================

def get_auth0_service() -> Auth0Service:
    """
    Dependency injection for Auth0 service.
    
    Usage:
        @router.get("/protected")
        async def protected_route(
            auth0: Auth0Service = Depends(get_auth0_service)
        ):
            ...
    """
    return Auth0Service()


async def get_current_auth0_user(
    authorization: str,
    auth0_service: Auth0Service
) -> Auth0User:
    """
    Get current user from Auth0 token.
    
    Args:
        authorization: Authorization header value
        auth0_service: Auth0 service instance
        
    Returns:
        Auth0User profile
        
    Raises:
        Auth0Error: If authentication fails
    """
    if not authorization.startswith("Bearer "):
        raise Auth0Error("Invalid authorization header format")
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    # Validate token
    payload = await auth0_service.validate_token(token)
    
    # Get user info
    user = await auth0_service.get_user_info(token)
    
    return user
