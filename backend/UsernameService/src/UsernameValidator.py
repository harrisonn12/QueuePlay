import re


class UsernameValidator:
    """Simple format and length validation for usernames."""
    
    def is_valid(self, username: str) -> bool:
        """Check if username has valid format (AdjectiveNoun) and length (3-20)."""
        return (username and 
                3 <= len(username) <= 20 and
                bool(re.match(r'^[A-Z][a-z]+[A-Z][a-z]+$', username))) 