import time
import logging
from typing import Optional, Dict, Any, Callable
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from AuthService.AuthService import AuthService
from RateLimitService.RateLimitService import RateLimitService

logger = logging.getLogger(__name__)

# HTTP Bearer token extraction 
#It looks for, checks, and extracts the token for you from the Authorization header.
# The authorization header is a standard way to pass authentication information in HTTP requests.
# Ex : Authorization: Bearer <token>. (just extracts the token)
security = HTTPBearer(auto_error=False)

class AuthMiddleware:
    """
    Authentication middleware for QueuePlay API endpoints.
    
    Provides JWT validation, rate limiting, and security headers.
    """
    
    def __init__(self, auth_service: AuthService, rate_limit_service: RateLimitService):
        self.auth_service = auth_service
        self.rate_limit_service = rate_limit_service
    
    async def get_current_user(self, 
                              request: Request,
                              credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
        """
        Extract and validate JWT token from request.
        Used as FastAPI dependency for protected endpoints.
        """
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Validate JWT token
        payload = await self.auth_service.validate_jwt_token(credentials.credentials)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check API request rate limit
        user_id = payload.get("user_id")
        client_ip = self.get_client_ip(request)
        
        is_allowed, limit_info = await self.rate_limit_service.check_api_request_limit(user_id)
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="API request rate limit exceeded",
                headers={ # tells frontend about rate limiting status
                    "X-RateLimit-Limit": str(limit_info.get("limit", 0)), # max requests per time window
                    "X-RateLimit-Remaining": str(limit_info.get("remaining", 0)), # requests remaining
                    "X-RateLimit-Reset": str(limit_info.get("reset_time", 0)), # when time window resets
                    "Retry-After": str(max(1, limit_info.get("reset_time", 0) - int(time.time()))) # time to wait before next request
                }
            )
        
        # Add rate limit headers to response
        request.state.rate_limit_headers = {
            "X-RateLimit-Limit": str(limit_info.get("limit", 0)),
            "X-RateLimit-Remaining": str(limit_info.get("remaining", 0)),
            "X-RateLimit-Reset": str(limit_info.get("reset_time", 0))
        }
        
        # Add user info to request state
        #request module gives you full access to the incoming HTTP request
        #like a sticky note on the request. not changing the request itself. 
        # we have this because we dont want to pass user_id to every endpoint.
        request.state.user = payload
        request.state.client_ip = client_ip
        
        return payload
    
    
    def get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request, handling reverse proxies.
        Its for identifying the user's IP address.
        Used for ip based rate limiting.
        """
        # Check for forwarded headers (common with load balancers/proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection IP
        return request.client.host if request.client else "unknown"
    
    async def validate_cors_and_referer(self, request: Request) -> bool:
        """
        Validate CORS and referer headers for additional security.
        Returns True if request is allowed, False otherwise.
        """
        # Get request origin and referer
        origin = request.headers.get("Origin")
        referer = request.headers.get("Referer")
        
        # In development, allow localhost origins
        allowed_origins = [
            "http://localhost:5173",
            "http://localhost:3000", 
            "http://localhost:80",
            "http://localhost"
        ]
        
        # In production, add your actual domain
        # allowed_origins.append("https://your-domain.com")
        
        # Check origin
        if origin and origin not in allowed_origins:
            logger.warning(f"Blocked request from unauthorized origin: {origin}")
            return False
        
        # Check referer for API requests (not for CORS preflight)
        if request.method != "OPTIONS" and referer:
            referer_valid = any(referer.startswith(allowed) for allowed in allowed_origins)
            if not referer_valid:
                logger.warning(f"Blocked request with invalid referer: {referer}")
                return False
        
        return True
    
    async def check_question_generation_limit(self, user_id: str) -> Dict[str, int]:
        """
        Check question generation rate limit specifically.
        Used for the costly OpenAI API calls.
        """
        is_allowed, limit_info = await self.rate_limit_service.check_question_generation_limit(user_id)
        
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Question generation daily limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(limit_info.get("limit", 0)),
                    "X-RateLimit-Remaining": str(limit_info.get("remaining", 0)),
                    "X-RateLimit-Reset": str(limit_info.get("reset_time", 0)),
                    "Retry-After": str(max(1, limit_info.get("reset_time", 0) - int(time.time())))
                }
            )
        
        return limit_info


def create_auth_dependencies(auth_service: AuthService, rate_limit_service: RateLimitService):
    """
    Factory function to create auth dependencies with injected services.
    Used in main.py to create auth dependencies.
    """
    middleware = AuthMiddleware(auth_service, rate_limit_service)
    
    return {
        "get_current_user": middleware.get_current_user,
        "check_question_generation_limit": middleware.check_question_generation_limit,
        "validate_cors_and_referer": middleware.validate_cors_and_referer,
        "middleware": middleware
    } 