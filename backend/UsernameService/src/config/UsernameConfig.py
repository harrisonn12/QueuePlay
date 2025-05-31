"""
Configuration constants for Username Generator Service
"""

class UsernameConfig:
    # Username constraints
    MIN_USERNAME_LENGTH = 3
    MAX_USERNAME_LENGTH = 20
    
    # Generation settings
    MAX_GENERATION_ATTEMPTS = 5
    MAX_MODERATION_RETRIES = 3
    
    # API timeouts (seconds)
    GENERATION_TIMEOUT = 10
    MODERATION_TIMEOUT = 5
    
    # Fallback word lists (in case API fails)
    FALLBACK_ADJECTIVES = [
        "Amazing", "Bright", "Creative", "Daring", "Epic", "Fantastic", 
        "Glorious", "Happy", "Incredible", "Joyful", "Kind", "Lovely",
        "Magnificent", "Noble", "Outstanding", "Perfect", "Quick", "Radiant",
        "Stellar", "Tremendous", "Ultimate", "Vibrant", "Wonderful", "Zestful"
    ]
    
    FALLBACK_NOUNS = [
        "Eagle", "Falcon", "Penguin", "Dolphin", "Tiger", "Panda",
        "Phoenix", "Dragon", "Butterfly", "Cheetah", "Elephant", "Giraffe",
        "Kangaroo", "Leopard", "Mongoose", "Octopus", "Panther", "Raccoon",
        "Sparrow", "Turtle", "Unicorn", "Viper", "Whale", "Zebra"
    ]
    
    # Blacklisted words (additional safety layer)
    BLACKLISTED_WORDS = [
        # Add any specific words you want to block
        # This serves as a backup to AI moderation
    ] 