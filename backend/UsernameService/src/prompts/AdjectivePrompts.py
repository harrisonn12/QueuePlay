"""
Prompt templates for generating adjectives for usernames
"""

class AdjectivePrompts:
    
    @staticmethod
    def get_adjective_generation_prompt() -> str:
        return """Generate a single, family-friendly adjective that would work well in a username. 

Requirements:
- Must be positive and appropriate for all ages
- Should be interesting and creative but not too obscure
- Maximum 12 characters long
- Should sound good when combined with a noun (like "BrilliantPenguin")
- Avoid overly common words like "good", "nice", "cool"

Examples of good adjectives: Brilliant, Majestic, Swift, Clever, Radiant, Bold, Graceful, Mighty

Return only the adjective, nothing else. Capitalize the first letter."""

    @staticmethod
    def get_system_message() -> str:
        return """You are a creative username generator assistant. Your job is to generate appropriate, 
family-friendly adjectives that would work well in usernames. Focus on positive, energetic words 
that sound modern and appealing.""" 