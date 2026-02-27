"""
Token Storage Service
Redis-backed token storage for email verification and password reset tokens
"""

import logging
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib
import secrets

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache

logger = logging.getLogger(__name__)


class RedisSettings(BaseSettings):
    """Redis configuration settings"""
    
    REDIS_HOST: str = Field(default="redis", description="Redis host")
    REDIS_PORT: int = Field(default=6379, description="Redis port")
    REDIS_PASSWORD: str = Field(default="", description="Redis password")
    REDIS_DB: int = Field(default=0, description="Redis database number")
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_redis_settings() -> RedisSettings:
    """Get cached Redis settings"""
    return RedisSettings()


class TokenStorage:
    """
    Token storage service with Redis backend.
    
    Falls back to in-memory storage if Redis is unavailable.
    This ensures the application works in development without Redis.
    """
    
    def __init__(self):
        self.settings = get_redis_settings()
        self._redis_client = None
        self._memory_storage: Dict[str, str] = {}  # Fallback storage
        self._use_redis = False
        self._init_redis()
    
    def _init_redis(self) -> None:
        """Initialize Redis connection"""
        try:
            import redis
            
            self._redis_client = redis.Redis(
                host=self.settings.REDIS_HOST,
                port=self.settings.REDIS_PORT,
                password=self.settings.REDIS_PASSWORD if self.settings.REDIS_PASSWORD else None,
                db=self.settings.REDIS_DB,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            
            # Test connection
            self._redis_client.ping()
            self._use_redis = True
            logger.info("Redis token storage initialized successfully")
            
        except ImportError:
            logger.warning("redis package not installed, using in-memory storage")
            self._use_redis = False
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}, using in-memory storage")
            self._use_redis = False
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _serialize(self, data: Dict[str, Any]) -> str:
        """Serialize data for storage"""
        # Convert datetime objects to ISO strings
        serialized = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                serialized[key] = value.isoformat()
            else:
                serialized[key] = value
        return json.dumps(serialized)
    
    def _deserialize(self, data: str) -> Dict[str, Any]:
        """Deserialize data from storage"""
        parsed = json.loads(data)
        # Convert ISO strings back to datetime
        if 'expires_at' in parsed:
            parsed['expires_at'] = datetime.fromisoformat(parsed['expires_at'])
        if 'created_at' in parsed:
            parsed['created_at'] = datetime.fromisoformat(parsed['created_at'])
        return parsed
    
    def store_token(
        self,
        token_hash: str,
        data: Dict[str, Any],
        ttl_seconds: int = 86400  # 24 hours default
    ) -> bool:
        """
        Store a token with associated data.
        
        Args:
            token_hash: Hashed token (use hash_token() first)
            data: Token data to store
            ttl_seconds: Time-to-live in seconds
            
        Returns:
            True if stored successfully
        """
        try:
            # Add timestamp if not present
            if 'created_at' not in data:
                data['created_at'] = datetime.utcnow()
            
            serialized = self._serialize(data)
            key = f"token:{token_hash}"
            
            if self._use_redis and self._redis_client:
                self._redis_client.setex(key, ttl_seconds, serialized)
            else:
                self._memory_storage[key] = serialized
            
            logger.debug(f"Token stored: {key[:20]}...")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store token: {e}")
            return False
    
    def get_token(self, token_hash: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve token data.
        
        Args:
            token_hash: Hashed token
            
        Returns:
            Token data if found and valid, None otherwise
        """
        try:
            key = f"token:{token_hash}"
            
            if self._use_redis and self._redis_client:
                data = self._redis_client.get(key)
            else:
                data = self._memory_storage.get(key)
            
            if not data:
                return None
            
            return self._deserialize(data)
            
        except Exception as e:
            logger.error(f"Failed to get token: {e}")
            return None
    
    def invalidate_token(self, token_hash: str) -> bool:
        """
        Delete a token (invalidate it).
        
        Args:
            token_hash: Hashed token
            
        Returns:
            True if deleted successfully
        """
        try:
            key = f"token:{token_hash}"
            
            if self._use_redis and self._redis_client:
                self._redis_client.delete(key)
            else:
                self._memory_storage.pop(key, None)
            
            logger.debug(f"Token invalidated: {key[:20]}...")
            return True
            
        except Exception as e:
            logger.error(f"Failed to invalidate token: {e}")
            return False
    
    def mark_token_used(self, token_hash: str) -> bool:
        """
        Mark a token as used (but don't delete it).
        
        Args:
            token_hash: Hashed token
            
        Returns:
            True if marked successfully
        """
        try:
            data = self.get_token(token_hash)
            if not data:
                return False
            
            data['used'] = True
            data['used_at'] = datetime.utcnow()
            
            key = f"token:{token_hash}"
            serialized = self._serialize(data)
            
            if self._use_redis and self._redis_client:
                # Keep the remaining TTL
                ttl = self._redis_client.ttl(key)
                if ttl > 0:
                    self._redis_client.setex(key, ttl, serialized)
                else:
                    self._redis_client.set(key, serialized)
            else:
                self._memory_storage[key] = serialized
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to mark token as used: {e}")
            return False
    
    def cleanup_expired(self) -> int:
        """
        Clean up expired tokens from in-memory storage.
        (Redis handles this automatically with TTL)
        
        Returns:
            Number of tokens cleaned up
        """
        if self._use_redis:
            # Redis handles TTL automatically
            return 0
        
        count = 0
        now = datetime.utcnow()
        
        for key in list(self._memory_storage.keys()):
            try:
                data = self._deserialize(self._memory_storage[key])
                if 'expires_at' in data and data['expires_at'] < now:
                    del self._memory_storage[key]
                    count += 1
            except Exception:
                continue
        
        if count > 0:
            logger.info(f"Cleaned up {count} expired tokens")
        
        return count
    
    def invalidate_user_tokens(self, user_id: str, token_type: str) -> int:
        """
        Invalidate all tokens of a specific type for a user.
        
        Note: This requires scanning, which is expensive in Redis.
        Consider using a separate index for production.
        
        Args:
            user_id: User ID
            token_type: Token type to invalidate
            
        Returns:
            Number of tokens invalidated
        """
        if self._use_redis and self._redis_client:
            # For Redis, we'd need SCAN which is expensive
            # In production, maintain a separate index
            logger.warning("User token invalidation not fully implemented for Redis")
            return 0
        
        count = 0
        for key in list(self._memory_storage.keys()):
            try:
                data = self._deserialize(self._memory_storage[key])
                if data.get('user_id') == user_id and data.get('type') == token_type:
                    del self._memory_storage[key]
                    count += 1
            except Exception:
                continue
        
        return count
    
    @property
    def is_redis_connected(self) -> bool:
        """Check if Redis is connected"""
        return self._use_redis and self._redis_client is not None


# Singleton instance
_token_storage: Optional[TokenStorage] = None


def get_token_storage() -> TokenStorage:
    """Get the token storage instance"""
    global _token_storage
    if _token_storage is None:
        _token_storage = TokenStorage()
    return _token_storage
