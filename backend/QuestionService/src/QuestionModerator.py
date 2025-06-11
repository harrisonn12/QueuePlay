import logging
from commons.adapters.ChatGptAdapter import ChatGptAdapter

logger = logging.getLogger(__name__)


class QuestionModerator:
    """Content moderation for questions and answers using OpenAI."""

    def __init__(self, chat_gpt_adapter: ChatGptAdapter):
        self.chat_gpt_adapter = chat_gpt_adapter
        logger.info("QuestionModerator initialized")

    def moderate_question_set(self, question_set: dict) -> bool:
        """
        Check if question set content is safe using OpenAI moderation.
        Optimized to use fewer API calls by combining content.

        Args:
            question_set: The question set dictionary to moderate

        Returns:
            bool: True if safe, False if any content is flagged
        """
        try:
            logger.debug(f"Moderating question set for topic: {question_set.get('topic', 'Unknown')}")
            
            # Combine all text content into one string for single moderation call
            all_content = []
            
            for question_data in question_set.get('questions', []):
                # Add question text
                question_text = question_data.get('question', '').strip()
                if question_text:
                    all_content.append(f"Q: {question_text}")
                
                # Add all options
                for i, option in enumerate(question_data.get('options', [])):
                    option_text = str(option).strip()
                    if option_text:
                        all_content.append(f"Option {i+1}: {option_text}")
            
            if not all_content:
                logger.debug("No text content to moderate")
                return True
            
            # Combine all content with separators for single moderation call
            combined_content = " | ".join(all_content)
            
            # Single moderation call for all content
            is_safe = self._moderate_single_text(combined_content)
            
            if is_safe:
                logger.debug("Question set passed moderation")
            else:
                logger.warning("Question set failed moderation")
            
            return is_safe

        except Exception as e:
            logger.error(f"Moderation failed for question set: {e}")
            return False  # Conservative: if moderation fails, consider unsafe

    def _moderate_single_text(self, text: str) -> bool:
        """
        Moderate a single piece of text.

        Args:
            text: The text to moderate

        Returns:
            bool: True if safe, False if flagged
        """
        try:
            if not text or not text.strip():
                return True  # Empty text is safe
            
            moderation_response = self.chat_gpt_adapter.moderateContent(text)
            is_safe = not moderation_response.get('flagged', True)

            if not is_safe:
                flagged_categories = [cat for cat, flagged in moderation_response.get('categories', {}).items() if flagged]
                logger.warning(f"Content flagged for: {flagged_categories}")

            return is_safe

        except Exception as e:
            logger.error(f"Text moderation failed: {e}")
            return False  # Conservative: if moderation fails, consider unsafe 