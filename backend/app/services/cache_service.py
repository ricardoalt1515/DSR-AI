"""
Cache service using Redis for storing job status and temporary data.
"""

import json
from typing import Any, Optional
import structlog
import redis.asyncio as aioredis

from app.core.config import settings

logger = structlog.get_logger(__name__)


class CacheService:
    """
    Service for caching data in Redis.
    Handles job status, temporary data, and session management.
    """
    
    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
    
    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self._redis = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            # Test connection
            await self._redis.ping()
            logger.info("✅ Redis connected successfully")
        except Exception as e:
            logger.error(f"❌ Error connecting to Redis: {e}")
            self._redis = None
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            logger.info("Redis connection closed")
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set a value in cache.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (optional)
            
        Returns:
            True if successful, False otherwise
        """
        if not self._redis:
            logger.warning("Redis not connected")
            return False
        
        try:
            # Serialize value to JSON
            json_value = json.dumps(value, default=str)
            
            if ttl:
                await self._redis.setex(key, ttl, json_value)
            else:
                await self._redis.set(key, json_value)
            
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value (deserialized from JSON) or None
        """
        if not self._redis:
            logger.warning("Redis not connected")
            return None
        
        try:
            value = await self._redis.get(key)
            if value is None:
                return None
            
            # Deserialize from JSON
            return json.loads(value)
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None
    
    async def delete(self, key: str) -> bool:
        """
        Delete a key from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if deleted, False otherwise
        """
        if not self._redis:
            logger.warning("Redis not connected")
            return False
        
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """
        Check if a key exists in cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if exists, False otherwise
        """
        if not self._redis:
            return False
        
        try:
            return await self._redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Error checking cache key {key}: {e}")
            return False
    
    async def set_job_status(
        self,
        job_id: str,
        status: str,
        progress: int,
        current_step: str,
        result: Optional[dict] = None,
        error: Optional[str] = None,
        ttl: int = 3600,
    ) -> bool:
        """
        Set job status in cache.
        
        Args:
            job_id: Job identifier
            status: Job status (queued, processing, completed, failed)
            progress: Progress percentage (0-100)
            current_step: Current processing step description
            result: Job result data (when completed)
            error: Error message (when failed)
            ttl: Time to live in seconds (default 1 hour)
            
        Returns:
            True if successful, False otherwise
        """
        job_data = {
            "job_id": job_id,
            "status": status,
            "progress": progress,
            "current_step": current_step,
        }
        
        if result:
            job_data["result"] = result
        if error:
            job_data["error"] = error
        
        return await self.set(f"job:{job_id}", job_data, ttl=ttl)
    
    async def get_job_status(self, job_id: str) -> Optional[dict]:
        """
        Get job status from cache.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Job status data or None
        """
        return await self.get(f"job:{job_id}")


# Global cache service instance
cache_service = CacheService()
