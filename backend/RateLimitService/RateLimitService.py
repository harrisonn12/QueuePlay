import time
import logging
from typing import Dict, Optional, Tuple
from commons.adapters.RedisAdapter import RedisAdapter

logger = logging.getLogger(__name__)

class RateLimitService:
    """
    Rate Limiting Service for QueuePlay Anti-Abuse Protection
    
    Implements the following limits as per security strategy:
    - API requests: 5 per minute per user
    - Question generation: 50 per day per user  
    - Token generation: 10 per 5 minutes per IP
    - Login attempts: 5 per minute per IP
    """
    
    def __init__(self, redis_adapter: RedisAdapter):
        self.redis = redis_adapter
        
        # Rate limit configurations
        self.limits = {
            "api_requests": {"count": 50, "window": 60},  # 50 per minute for general API calls
            "word_validation": {"count": 200, "window": 60},  # Higher limit for word validation (games need more)
            "question_generation": {"count": 50, "window": 86400},  # 50 per day
            "token_generation": {"count": 100, "window": 300},  # TEMPORARILY INCREASED: 100 per 5 minutes for development
            "login_attempts": {"count": 5, "window": 60},  # 5 per minute
        }
    
    async def check_rate_limit(self, 
                             limit_type: str, 
                             identifier: str, 
                             cost: int = 1) -> Tuple[bool, Dict[str, int]]:
        """
        Check if request is within rate limit.
        
        Args:
            limit_type: Type of limit to check (api_requests, question_generation, etc.)
            identifier: User ID or IP address
            cost: Cost of this request (default 1)
            
        Returns:
            Tuple of (is_allowed, limit_info)
            limit_info contains: remaining, reset_time, limit
        """
        if limit_type not in self.limits:
            logger.error(f"Unknown rate limit type: {limit_type}")
            return False, {}
            
        config = self.limits[limit_type]
        window = config["window"]
        limit = config["count"]
        
        # Create Redis key with time window
        current_window = int(time.time()) // window
        key = f"rate_limit:{limit_type}:{identifier}:{current_window}"
        
        # Get current count
        # if same time window (changes based on window size of different limits)
        current_count = await self.redis.get(key) or 0
        current_count = int(current_count)
        
        # Check if adding this request would exceed limit
        new_count = current_count + cost
        is_allowed = new_count <= limit
        
        if is_allowed:
            # Increment counter and set expiry
            await self.redis.set(key, new_count, ex=window)
            remaining = limit - new_count
        else:
            remaining = 0
            
        # Calculate reset time, used in HTTP headers
        # used in middleware and tells frontend when rate limit resets
        # frontend can use this to show a countdown timer ("try again in x seconds")
        reset_time = (current_window + 1) * window
        
        limit_info = {
            "remaining": remaining,
            "reset_time": reset_time,
            "limit": limit,
            "current": new_count if is_allowed else current_count
        }
        
        if not is_allowed:
            logger.warning(f"Rate limit exceeded for {limit_type} by {identifier}: {current_count}/{limit}")
        
        return is_allowed, limit_info
    
    async def check_api_request_limit(self, user_id: str) -> Tuple[bool, Dict[str, int]]:
        """Check API request rate limit for a user."""
        return await self.check_rate_limit("api_requests", user_id)
    
    async def check_question_generation_limit(self, user_id: str) -> Tuple[bool, Dict[str, int]]:
        """Check question generation daily limit for a user."""
        return await self.check_rate_limit("question_generation", user_id)
    
    async def check_token_generation_limit(self, ip_address: str) -> Tuple[bool, Dict[str, int]]:
        """Check token generation rate limit for an IP address."""
        return await self.check_rate_limit("token_generation", ip_address)
    
    async def check_login_attempt_limit(self, ip_address: str) -> Tuple[bool, Dict[str, int]]:
        """Check login attempt rate limit for an IP address."""
        return await self.check_rate_limit("login_attempts", ip_address)
    
    async def check_word_validation_limit(self, user_id: str) -> Tuple[bool, Dict[str, int]]:
        """Check word validation rate limit for a user (higher limit for games)."""
        return await self.check_rate_limit("word_validation", user_id)
    
    async def get_user_usage_stats(self, user_id: str) -> Dict[str, Dict[str, int]]:
        """
        Get current usage statistics for a user across all limit types.
        Useful for monitoring and displaying to users.
        """
        stats = {}
        current_time = int(time.time())
        
        for limit_type, config in self.limits.items():
            if limit_type in ["token_generation", "login_attempts"]:
                continue  # These are IP-based, not user-based
                
            window = config["window"]
            limit = config["count"]
            current_window = current_time // window
            key = f"rate_limit:{limit_type}:{user_id}:{current_window}"
            
            current_count = await self.redis.get(key) or 0
            current_count = int(current_count)
            
            reset_time = (current_window + 1) * window
            
            stats[limit_type] = {
                "used": current_count,
                "limit": limit,
                "remaining": max(0, limit - current_count),
                "reset_time": reset_time
            }
        
        return stats
    
    