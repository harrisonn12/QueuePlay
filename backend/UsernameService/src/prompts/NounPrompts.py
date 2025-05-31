"""
Prompt templates for generating nouns for usernames
"""

class NounPrompts:
    
    @staticmethod
    def get_noun_generation_prompt() -> str:
        return """Generate a single, family-friendly noun that would work well in a username.

Requirements:
- Must be appropriate for all ages
- Should be a concrete noun (animals, objects, nature, etc.)
- Maximum 12 characters long
- Should sound good when combined with an adjective (like "BrilliantPenguin")
- Prefer animals, nature elements, or cool objects
- Avoid people names, brands, or potentially controversial topics

Examples of good nouns: Penguin, Eagle, Phoenix, Tiger, Dragon, Storm, Thunder, Comet, Crystal, Falcon

Return only the noun, nothing else. Capitalize the first letter."""

    @staticmethod
    def get_system_message() -> str:
        return """You are a creative username generator assistant. Your job is to generate appropriate, 
family-friendly nouns that would work well in usernames. Focus on animals, nature elements, 
and interesting objects that sound modern and appealing.""" 