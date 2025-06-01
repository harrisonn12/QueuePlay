import logging
import random
from commons.adapters.ChatGptAdapter import ChatGptAdapter
from .prompts.AdjectivePrompts import AdjectivePrompts
from .prompts.NounPrompts import NounPrompts
from .config.UsernameConfig import UsernameConfig

logger = logging.getLogger(__name__)


class UsernameGenerator:
    """
    Core logic for generating adjective-noun username combinations.
    """

    def __init__(self, chat_gpt_adapter: ChatGptAdapter):
        """
        Initialize the generator with ChatGPT adapter.

        Args:
            chat_gpt_adapter: Configured ChatGptAdapter instance
        """
        self.chat_gpt_adapter = chat_gpt_adapter
        self.config = UsernameConfig()

    def generate_username_with_fallback(self) -> str:
        """Generate a username, with automatic fallback if API fails."""
        try:
            # Try API generation
            adjective = self._generate_word(
                AdjectivePrompts.get_adjective_generation_prompt(),
                AdjectivePrompts.get_system_message()
            )
            noun = self._generate_word(
                NounPrompts.get_noun_generation_prompt(),
                NounPrompts.get_system_message()
            )
            username = f"{adjective}{noun}"
            logger.info(f"Generated username: {username}")
            return username

        except Exception as e:
            # Fallback to predefined lists
            logger.warning(f"API failed, using fallback: {e}")
            adjective = random.choice(self.config.FALLBACK_ADJECTIVES)
            noun = random.choice(self.config.FALLBACK_NOUNS)
            username = f"{adjective}{noun}"
            logger.info(f"Generated fallback username: {username}")
            return username

    def _generate_word(self, prompt: str, system_message: str) -> str:
        """Generate and clean a single word using the API."""
        word = self.chat_gpt_adapter.generateText(prompt, system_message)
        word = word.strip().split()[0].capitalize()
        word = ''.join(char for char in word if char.isalpha())
        if not word:
            raise ValueError("Generated word is empty")
        return word
