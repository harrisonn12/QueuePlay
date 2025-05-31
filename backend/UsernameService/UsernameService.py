import logging
import re
from typing import Dict, Any
from backend.commons.adapters.ChatGptAdapter import ChatGptAdapter
from .src.UsernameGenerator import UsernameGenerator
from .src.UsernameModerator import UsernameModerator
from .src.UsernameValidator import UsernameValidator

logger = logging.getLogger(__name__)


class UsernameService:
    """
    Username service with no business logic - delegates to src components.
    """
    
    def __init__(self, chat_gpt_adapter: ChatGptAdapter):
        self.username_generator = UsernameGenerator(chat_gpt_adapter)
        self.username_moderator = UsernameModerator(chat_gpt_adapter)
        self.username_validator = UsernameValidator()
        logger.info("UsernameService initialized successfully")
    
    def generate_username(self) -> Dict[str, Any]:
        """Generate a safe username with validation and moderation."""
        for attempt in range(5):
            try:
                username = self.username_generator.generate_username_with_fallback()
                
                # Use our validation method consistently
                validation_result = self.validate_username(username)
                if validation_result["valid"]:
                    logger.info(f"Generated username: {username}")
                    return {"username": username, "success": True}
                    
            except Exception as e:
                logger.warning(f"Generation attempt {attempt + 1} failed: {e}")
                continue
        
        logger.error("Failed to generate username after 5 attempts")
        return {"username": None, "success": False, "error": "Generation failed"}
    
    def validate_username(self, username: str) -> Dict[str, Any]:
        """Validate username with format checking and moderation."""
        try:
            # Format validation
            if not self.username_validator.is_valid(username):
                return {"valid": False, "errors": ["Invalid format or length"]}
            
            # Content safety check
            if not self._is_safe_content(username):
                return {"valid": False, "errors": ["Content not appropriate"]}
            
            return {"valid": True}
            
        except Exception as e:
            logger.error(f"Validation failed for '{username}': {e}")
            return {"valid": False, "errors": ["Validation failed"]}
    
    def _is_safe_content(self, username: str) -> bool:
        """Check content safety using AI moderation."""
        try:
            return self.username_moderator.moderate_username(username)
        except Exception:
            return False  # Conservative - if moderation fails, reject 