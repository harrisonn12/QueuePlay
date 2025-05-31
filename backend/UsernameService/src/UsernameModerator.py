import logging
from backend.commons.adapters.ChatGptAdapter import ChatGptAdapter

logger = logging.getLogger(__name__)


class UsernameModerator:
    """Simple content moderation for usernames using OpenAI."""
    
    def __init__(self, chat_gpt_adapter: ChatGptAdapter):
        self.chat_gpt_adapter = chat_gpt_adapter
        logger.info("UsernameModerator initialized")
    
    def moderate_username(self, username: str) -> bool:
        """
        Check if username content is safe using OpenAI moderation.
        
        Args:
            username: The username to moderate
            
        Returns:
            bool: True if safe, False if flagged
        """
        try:
            logger.debug(f"Moderating username: '{username}'")
            moderation_response = self.chat_gpt_adapter.moderateContent(username)
            is_safe = not moderation_response.get('flagged', True)
            
            if not is_safe:
                flagged_categories = list(moderation_response.get('categories', {}).keys())
                logger.warning(f"Username '{username}' flagged for: {flagged_categories}")
            
            return is_safe
            
        except Exception as e:
            logger.error(f"Moderation failed for '{username}': {e}")
            return False  # Conservative: if moderation fails, consider unsafe 