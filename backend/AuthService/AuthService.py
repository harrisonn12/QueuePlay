import jwt
import uuid
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from commons.adapters.RedisAdapter import RedisAdapter

logger = logging.getLogger(__name__)

class AuthService:
    """
    JWT Authentication Service for QueuePlay
    
    Handles session-based token generation with the following security features:
    - 15-minute JWT token expiry
        - JWT token (client-side) used for API authentication 
    - Session-based token management (httpOnly cookies)
        - Session (server-side) is created after user logs in with OAuth provider
        - Users have to log in again with OAuth provider to get a new session after 24 hours.
    - Token rotation and refresh
    - Anti-abuse rate limiting integration
    """
    
    def __init__(self, redis_adapter: RedisAdapter, jwt_secret: str):
        self.redis = redis_adapter
        self.jwt_secret = jwt_secret
        self.token_expiry_minutes = 15
        self.guest_token_expiry_minutes = 30
        self.session_expiry_hours = 24 
        
    async def create_session(self, user_id: str, metadata: Dict[str, Any] = None) -> str:
        """
        Create a secure session for a user.
        Need session because generates new token with same session each 15 minutes.
        Returns session_id for httpOnly cookie storage.
        """
        session_id = str(uuid.uuid4())
        session_data = {
            "user_id": user_id,
            "created_at": int(time.time()),
            "metadata": metadata or {},
            "active": True
        }
        
        # Store session in Redis with expiry
        session_key = f"session:{session_id}"
        await self.redis.set(
            session_key, 
            session_data,
            ex=self.session_expiry_hours * 3600
        )
        
        logger.info(f"Created session {session_id} for user {user_id}")
        return session_id
    
    async def generate_jwt_token(self, session_id: str) -> Optional[str]:
        """
        Generate JWT token from valid session.
        This is called by the frontend using the session cookie.
        Returns JWT token for API authentication.

        Flow:
        - user logs in -> session_id is created and stored in redis
        - user makes request to /auth/token -> session_id is validated and JWT token is created
        - frontend uses JWT token for API calls
        """
        # look up session in redis using session_id from cookie
        # this is for validation of session_id in jwt token
        session_key = f"session:{session_id}"
        session_data = await self.redis.get(session_key)
        if not session_data or not session_data.get("active"):
            logger.warning(f"Invalid or inactive session: {session_id}")
            return None
        
        #If session is valid, create JWT token
        # Create JWT payload
        now = datetime.utcnow()
        payload = {
            "user_id": session_data["user_id"],
            "session_id": session_id,
            "iat": now,
            "exp": now + timedelta(minutes=self.token_expiry_minutes),
            "type": "access_token"
        }
        
        # Generate JWT token
        token = jwt.encode(payload, self.jwt_secret, algorithm="HS256")
        
        logger.info(f"Generated JWT token for user {session_data['user_id']}")
        return token
    
    async def validate_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate JWT token and return payload if valid.
        Used by protected endpoints (via auth_middleware) 
        used on every protected API call to verify JWT token is valid.
        """
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            
            # Verify session is still active
            session_id = payload.get("session_id")
            if session_id:
                session_key = f"session:{session_id}"
                session_data = await self.redis.get(session_key)
                if not session_data or not session_data.get("active"):
                    logger.warning(f"Token references inactive session: {session_id}")
                    return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.info("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
    
    async def invalidate_session(self, session_id: str) -> bool:
        """
        Invalidate a session (logout).
        """
        session_key = f"session:{session_id}"
        deleted = await self.redis.delete(session_key)

        if deleted:
            logger.info(f"Invalidated session {session_id}")
            return True
        return False    
    
    async def create_guest_jwt_token(self, user_id: str, game_id: str, player_name: str = None, metadata: Dict[str, Any] = None) -> str:
        """
        Create a limited-scope JWT token for guest players.
        No session required - direct token generation with 30-minute expiry.
        Used for players who join games without full authentication.
        """
        now = datetime.utcnow()
        payload = {
            "user_id": user_id,
            "game_id": game_id,
            "player_name": player_name,
            "iat": now,
            "exp": now + timedelta(minutes=self.guest_token_expiry_minutes),  # 30-minute expiry for guests
            "type": "guest",
            "metadata": metadata or {}
        }
        
        # Generate JWT token
        token = jwt.encode(payload, self.jwt_secret, algorithm="HS256")
        
        logger.info(f"Generated guest JWT token for user {user_id} in game {game_id}")
        return token
    