import logging
import requests
import time
from typing import Dict, List, Optional, Tuple
from commons.adapters.ChatGptAdapter import ChatGptAdapter

class WordValidationService:
    """
    Service for validating words against categories using:

    """
    
    def __init__(self, chatgpt_adapter: ChatGptAdapter):
        self.chatgpt_adapter = chatgpt_adapter
        self.cache: Dict[str, bool] = {}  # Cache for validated word-category pairs
        # Rate limiting for external APIs
        self.last_chatgpt_call = 0
        self.chatgpt_rate_limit = 1.0  # 1 second between calls
        
        logging.info("WordValidationService initialized")
    
    def validate_word(self, word: str, category: str) -> Tuple[bool, str, str]:
        """
        Validate if a word belongs to a category.
        
        Args:
            word: The word to validate
            category: The category to check against
            
        Returns:
            Tuple of (is_valid, confidence_source, explanation)
            - is_valid: Boolean indicating if word is valid for category
            - confidence_source: "cache", "hardcoded", "chatgpt", or "fallback"
            - explanation: Human-readable explanation of the decision
        """
        try:
            if not word or not category:
                return False, "validation", "Empty word or category"
            
            # Normalize inputs
            clean_word = word.strip().lower()
            clean_category = category.strip().lower()
            cache_key = f"{clean_word}:{clean_category}"
            
            # Check cache first
            if cache_key in self.cache:
                logging.debug(f"Cache hit for '{word}' in '{category}': {self.cache[cache_key]}")
                return self.cache[cache_key], "cache", "Previously validated"
            
            # Try hardcoded validation first for common words (fastest and most reliable)
            is_valid_hardcoded = self._validate_with_hardcoded(clean_word, clean_category)
            if is_valid_hardcoded:
                self.cache[cache_key] = True
                logging.info(f"Hardcoded validation: '{word}' in '{category}' = True")
                return True, "hardcoded", "Common word validated from curated list"
            
           
            # Go straight to ChatGPT for anything not in our hardcoded list
            logging.info("using ChatGPT fallback")
            
            try:
                is_valid, explanation = self._validate_with_chatgpt(clean_word, clean_category)
                # Cache the result
                self.cache[cache_key] = is_valid
                logging.info(f"ChatGPT validation: '{word}' in '{category}' = {is_valid}")
                return is_valid, "chatgpt", explanation
            except Exception as e:
                logging.warning(f"ChatGPT validation failed: {e}")
                # If ChatGPT fails, be conservative and reject
                self.cache[cache_key] = False
                logging.info(f"Final rejection: '{word}' in '{category}' = False (ChatGPT failed)")
                return False, "no_validation", f"Could not validate through any method: {str(e)}"
            
        except Exception as e:
            logging.error(f"Validation error for '{word}' in '{category}': {e}")
            return False, "error", f"Validation failed: {str(e)}"
    
    def _validate_with_hardcoded(self, word: str, category: str) -> bool:
        """Enhanced hardcoded validation covering common words that APIs miss."""
        # Comprehensive validation data covering the most common words in each category
        validation_data = {
            'fruits': [
                'apple', 'banana', 'orange', 'grape', 'strawberry', 'mango', 'pineapple',
                'peach', 'pear', 'cherry', 'plum', 'watermelon', 'melon', 'cantaloupe',
                'kiwi', 'lemon', 'lime', 'grapefruit', 'blueberry', 'raspberry', 
                'blackberry', 'apricot', 'coconut', 'papaya', 'avocado', 'pomegranate',
                'fig', 'date', 'cranberry', 'elderberry', 'gooseberry', 'currant',
                'tangerine', 'mandarin', 'nectarine', 'persimmon', 'guava', 'lychee',
                'passion fruit', 'dragon fruit', 'rambutan', 'durian', 'jackfruit',
                'star fruit', 'kiwifruit', 'plantain', 'breadfruit', 'honeydew',
                # Additional fruits to reduce ChatGPT calls
                'kumquat', 'quince', 'crabapple', 'boysenberry', 'mulberry', 'dewberry',
                'cloudberry', 'lingonberry', 'huckleberry', 'serviceberry', 'chokeberry',
                'acai', 'goji', 'physalis', 'tamarind', 'carambola', 'soursop',
                'custard apple', 'sugar apple', 'atemoya', 'cherimoya', 'sapodilla',
                'longan', 'rambutan', 'salak', 'langsat', 'duku', 'wax apple'
            ],
            'animals': [
                # Common domestic animals
                'dog', 'cat', 'rabbit', 'hamster', 'guinea pig', 'ferret', 'chinchilla',
                'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken', 'duck', 'goose', 'turkey',
                # Common wild mammals
                'lion', 'tiger', 'leopard', 'cheetah', 'jaguar', 'puma', 'cougar', 'lynx', 'bobcat',
                'elephant', 'rhino', 'hippo', 'giraffe', 'zebra', 'buffalo', 'bison', 'yak',
                'bear', 'panda', 'koala', 'sloth', 'armadillo', 'anteater', 'pangolin',
                'wolf', 'fox', 'coyote', 'jackal', 'hyena', 'dingo',
                'deer', 'elk', 'moose', 'caribou', 'reindeer', 'antelope', 'gazelle', 'impala',
                'kangaroo', 'wallaby', 'wombat', 'tasmanian devil', 'opossum',
                'monkey', 'ape', 'gorilla', 'chimpanzee', 'orangutan', 'baboon', 'lemur',
                'raccoon', 'squirrel', 'chipmunk', 'beaver', 'porcupine', 'skunk',
                'mouse', 'rat', 'vole', 'shrew', 'mole', 'bat',
                'wolverine', 'badger', 'otter', 'weasel', 'stoat', 'mink', 'marten',
                'mongoose', 'meerkat', 'hedgehog',
                # Unique/exotic mammals
                'platypus', 'echidna', 'tapir', 'capybara', 'llama', 'alpaca', 'vicuna',
                'camel', 'dromedary', 'okapi', 'aardvark', 'numbat', 'quokka',
                # Marine mammals
                'whale', 'dolphin', 'porpoise', 'orca', 'beluga', 'narwhal', 'manatee', 'dugong',
                'seal', 'sea lion', 'walrus', 'sea otter',
                # Birds
                'bird', 'eagle', 'hawk', 'falcon', 'kestrel', 'osprey', 'buzzard',
                'owl', 'barn owl', 'screech owl', 'horned owl',
                'penguin', 'albatross', 'petrel', 'gannet', 'cormorant', 'pelican',
                'flamingo', 'stork', 'crane', 'heron', 'ibis', 'spoonbill',
                'swan', 'peacock', 'pheasant', 'quail', 'partridge',
                'ostrich', 'emu', 'cassowary', 'kiwi', 'rhea', 'roadrunner',
                'vulture', 'condor', 'caracara', 'kite', 'harrier',
                'parrot', 'macaw', 'cockatoo', 'parakeet', 'budgie', 'lovebird', 'conure',
                'toucan', 'hornbill', 'kingfisher', 'bee-eater', 'roller',
                'woodpecker', 'flicker', 'sapsucker', 'nuthatch', 'creeper',
                'cardinal', 'jay', 'magpie', 'crow', 'raven', 'jackdaw',
                'robin', 'thrush', 'blackbird', 'warbler', 'finch', 'canary', 'goldfinch',
                'sparrow', 'bunting', 'siskin', 'linnet', 'greenfinch',
                'hummingbird', 'swift', 'swallow', 'martin', 'flycatcher',
                'pigeon', 'dove', 'cuckoo', 'nightjar', 'kingbird', 'vireo',
                # Fish and marine life
                'fish', 'shark', 'ray', 'skate', 'manta ray', 'stingray', 'sawfish',
                'salmon', 'trout', 'char', 'grayling', 'pike', 'perch', 'bass',
                'tuna', 'mackerel', 'sardine', 'anchovy', 'herring', 'cod', 'haddock',
                'sole', 'flounder', 'halibut', 'turbot', 'plaice',
                'eel', 'moray', 'conger', 'lamprey', 'hagfish',
                'catfish', 'carp', 'goldfish', 'koi', 'betta', 'guppy', 'molly', 'tetra',
                'angelfish', 'clownfish', 'tang', 'wrasse', 'parrotfish', 'grouper',
                'seahorse', 'pipefish', 'filefish', 'triggerfish', 'pufferfish',
                'barracuda', 'marlin', 'swordfish', 'sailfish', 'wahoo',
                'piranha', 'cichlid', 'discus', 'oscar', 'pleco',
                # Marine invertebrates
                'octopus', 'squid', 'cuttlefish', 'nautilus',
                'lobster', 'crab', 'shrimp', 'prawn', 'krill', 'barnacle',
                'sea urchin', 'starfish', 'sea cucumber', 'sand dollar',
                'jellyfish', 'sea anemone', 'coral', 'polyp', 'hydroid',
                'sponge', 'sea slug', 'nudibranch', 'chiton', 'limpet',
                'mussel', 'clam', 'oyster', 'scallop', 'cockle', 'abalone',
                # Reptiles and amphibians
                'snake', 'python', 'boa', 'cobra', 'viper', 'adder', 'mamba', 'rattlesnake',
                'lizard', 'gecko', 'iguana', 'chameleon', 'monitor', 'skink', 'anole',
                'komodo dragon', 'bearded dragon', 'blue-tongued skink',
                'turtle', 'tortoise', 'terrapin', 'sea turtle', 'box turtle',
                'crocodile', 'alligator', 'caiman', 'gharial',
                'frog', 'toad', 'tree frog', 'poison frog', 'bullfrog',
                'salamander', 'newt', 'axolotl', 'mudpuppy', 'hellbender',
                # Insects and arthropods
                'butterfly', 'moth', 'skipper', 'swallowtail', 'monarch',
                'bee', 'bumblebee', 'honeybee', 'wasp', 'hornet', 'yellowjacket',
                'ant', 'termite', 'carpenter ant', 'fire ant', 'leafcutter ant',
                'beetle', 'ladybug', 'weevil', 'scarab', 'stag beetle', 'firefly',
                'fly', 'mosquito', 'midge', 'gnat', 'housefly', 'horsefly',
                'dragonfly', 'damselfly', 'mayfly', 'caddisfly',
                'grasshopper', 'cricket', 'katydid', 'locust', 'cicada',
                'mantis', 'stick insect', 'leaf insect', 'walkingstick',
                'aphid', 'scale insect', 'thrips', 'whitefly',
                'flea', 'louse', 'tick', 'mite', 'chigger',
                'spider', 'tarantula', 'wolf spider', 'jumping spider', 'orb weaver',
                'scorpion', 'harvestman', 'pseudoscorpion',
                'centipede', 'millipede', 'pillbug', 'sowbug',
                # Other invertebrates
                'worm', 'earthworm', 'leech', 'flatworm', 'roundworm',
                'snail', 'slug', 'conch', 'whelk', 'periwinkle'
            ],
            'colors': [
                'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white',
                'brown', 'grey', 'gray', 'violet', 'indigo', 'turquoise', 'cyan', 'magenta',
                'maroon', 'navy', 'teal', 'olive', 'lime', 'aqua', 'silver', 'gold',
                'beige', 'tan', 'coral', 'salmon', 'crimson', 'scarlet', 'burgundy',
                'emerald', 'jade', 'forest', 'mint', 'sage', 'chartreuse', 'khaki',
                'lavender', 'lilac', 'mauve', 'plum', 'orchid', 'fuchsia', 'rose',
                'peach', 'apricot', 'cream', 'ivory', 'pearl', 'platinum', 'bronze',
                'copper', 'rust', 'amber', 'honey', 'caramel', 'chocolate', 'coffee',
                'espresso', 'taupe', 'ash', 'charcoal', 'slate', 'steel', 'pewter',
                # Additional colors
                'cerulean', 'azure', 'cobalt', 'ultramarine', 'prussian', 'sapphire',
                'vermillion', 'cadmium', 'alizarin', 'carmine', 'cerise', 'magenta',
                'periwinkle', 'thistle', 'heliotrope', 'amethyst', 'violet', 'byzantium',
                'viridian', 'malachite', 'celadon', 'verdigris', 'olivine', 'lime',
                'citrine', 'aureolin', 'gamboge', 'saffron', 'ochre', 'sienna',
                'umber', 'sepia', 'bistre', 'mahogany', 'chestnut', 'russet'
            ],
            'vegetables': [
                'carrot', 'broccoli', 'spinach', 'lettuce', 'tomato', 'potato', 'onion',
                'garlic', 'pepper', 'cucumber', 'celery', 'corn', 'peas', 'beans',
                'cabbage', 'cauliflower', 'zucchini', 'squash', 'eggplant', 'mushroom',
                'asparagus', 'artichoke', 'beet', 'turnip', 'radish', 'kale', 'chard',
                'parsnip', 'rutabaga', 'leek', 'scallion', 'shallot', 'chive', 'endive',
                'arugula', 'watercress', 'collard', 'brussels sprouts', 'okra', 'fennel',
                'ginger', 'turmeric', 'horseradish', 'sweet potato', 'yam', 'plantain',
                # Additional vegetables
                'bok choy', 'napa cabbage', 'kohlrabi', 'daikon', 'jicama', 'taro',
                'cassava', 'yuca', 'parsley', 'cilantro', 'basil', 'oregano', 'thyme',
                'rosemary', 'sage', 'dill', 'mint', 'tarragon', 'chervil', 'marjoram',
                'sorrel', 'radicchio', 'escarole', 'frisee', 'mache', 'mizuna',
                'mustard greens', 'dandelion', 'purslane', 'lamb\'s quarters'
            ],
            'countries': [
                'usa', 'united states', 'america', 'canada', 'mexico', 'france', 'germany', 
                'italy', 'spain', 'portugal', 'uk', 'england', 'britain', 'scotland', 
                'wales', 'ireland', 'norway', 'sweden', 'denmark', 'finland', 'iceland',
                'russia', 'china', 'japan', 'korea', 'india', 'pakistan', 'bangladesh',
                'thailand', 'vietnam', 'malaysia', 'singapore', 'indonesia', 'philippines',
                'australia', 'new zealand', 'brazil', 'argentina', 'chile', 'peru',
                'colombia', 'venezuela', 'ecuador', 'bolivia', 'uruguay', 'paraguay',
                'egypt', 'libya', 'morocco', 'algeria', 'tunisia', 'sudan', 'ethiopia',
                'kenya', 'tanzania', 'uganda', 'nigeria', 'ghana', 'ivory coast',
                'south africa', 'zimbabwe', 'botswana', 'namibia', 'zambia', 'malawi',
                # Additional countries
                'austria', 'switzerland', 'netherlands', 'belgium', 'luxembourg', 'poland',
                'czech republic', 'slovakia', 'hungary', 'romania', 'bulgaria', 'greece',
                'turkey', 'israel', 'jordan', 'lebanon', 'syria', 'iraq', 'iran',
                'afghanistan', 'sri lanka', 'myanmar', 'cambodia', 'laos', 'nepal',
                'bhutan', 'mongolia', 'kazakhstan', 'uzbekistan', 'georgia', 'armenia'
            ],
            'sports': [
                'soccer', 'football', 'basketball', 'tennis', 'golf', 'swimming', 'running',
                'baseball', 'softball', 'hockey', 'volleyball', 'badminton', 'cricket',
                'rugby', 'boxing', 'wrestling', 'cycling', 'skiing', 'snowboarding',
                'surfing', 'gymnastics', 'track', 'marathon', 'triathlon', 'pentathlon',
                'archery', 'fencing', 'judo', 'karate', 'taekwondo', 'weightlifting',
                'rowing', 'sailing', 'canoeing', 'kayaking', 'diving', 'polo', 'lacrosse',
                'handball', 'squash', 'racquetball', 'table tennis', 'ping pong',
                'darts', 'billiards', 'pool', 'snooker', 'bowling', 'skateboarding',
                'rollerblading', 'ice skating', 'figure skating',
                # Additional sports
                'water polo', 'synchronized swimming', 'speed skating', 'curling',
                'bobsledding', 'luge', 'skeleton', 'biathlon', 'cross-country skiing',
                'alpine skiing', 'ski jumping', 'freestyle skiing', 'snowboarding',
                'rock climbing', 'bouldering', 'mountaineering', 'paragliding',
                'hang gliding', 'skydiving', 'bungee jumping', 'white water rafting'
            ],
            'food': [
                'pizza', 'pasta', 'spaghetti', 'lasagna', 'ravioli', 'bread', 'toast',
                'sandwich', 'burger', 'hot dog', 'taco', 'burrito', 'quesadilla',
                'rice', 'noodles', 'soup', 'salad', 'steak', 'chicken', 'beef', 'pork',
                'fish', 'shrimp', 'lobster', 'crab', 'bacon', 'ham', 'sausage',
                'cheese', 'milk', 'eggs', 'butter', 'yogurt', 'cereal', 'oatmeal',
                'pancakes', 'waffles', 'french toast', 'bagel', 'muffin', 'donut',
                'cake', 'pie', 'cookies', 'brownies', 'chocolate', 'ice cream',
                'fries', 'chips', 'popcorn', 'nuts', 'almonds', 'peanuts', 'cashews',
                # Additional food items
                'curry', 'stir fry', 'sushi', 'tempura', 'ramen', 'udon', 'pho',
                'paella', 'risotto', 'gnocchi', 'polenta', 'couscous', 'quinoa',
                'hummus', 'falafel', 'kebab', 'shawarma', 'gyros', 'empanadas',
                'dumplings', 'spring rolls', 'wontons', 'dim sum', 'chow mein'
            ],
            'drinks': [
                'water', 'coffee', 'tea', 'juice', 'soda', 'pop', 'cola', 'beer', 'wine',
                'milk', 'smoothie', 'shake', 'lemonade', 'cocktail', 'whiskey', 'vodka', 
                'rum', 'gin', 'brandy', 'champagne', 'coke', 'pepsi', 'sprite', 'fanta',
                'energy drink', 'sports drink', 'hot chocolate', 'cocoa', 'latte',
                'cappuccino', 'espresso', 'mocha', 'macchiato', 'americano', 'iced tea',
                'green tea', 'black tea', 'herbal tea', 'kombucha', 'punch', 'cider',
                # Additional drinks
                'matcha', 'chai', 'oolong', 'white tea', 'rooibos', 'yerba mate',
                'bubble tea', 'boba', 'frappe', 'frappuccino', 'cold brew', 'nitro coffee',
                'tequila', 'bourbon', 'scotch', 'cognac', 'aperitif', 'digestif',
                'sangria', 'mimosa', 'bellini', 'margarita', 'martini', 'manhattan'
            ],
            'movies': [
                'titanic', 'avatar', 'avengers', 'batman', 'superman', 'spiderman',
                'iron man', 'captain america', 'thor', 'hulk', 'guardians', 'frozen',
                'toy story', 'finding nemo', 'shrek', 'incredibles', 'monsters inc',
                'cars', 'up', 'wall-e', 'ratatouille', 'coco', 'moana', 'tangled',
                'brave', 'beauty and the beast', 'lion king', 'aladdin', 'mulan',
                'pocahontas', 'cinderella', 'sleeping beauty', 'star wars', 'empire strikes back',
                'return of the jedi', 'phantom menace', 'attack of the clones', 'revenge of the sith',
                'force awakens', 'last jedi', 'rise of skywalker', 'rogue one',
                'harry potter', 'lord of the rings', 'hobbit', 'matrix', 'terminator',
                'alien', 'predator', 'jurassic park', 'indiana jones', 'back to the future',
                # Additional movies
                'casablanca', 'citizen kane', 'godfather', 'pulp fiction', 'goodfellas',
                'shawshank redemption', 'forrest gump', 'gladiator', 'braveheart',
                'saving private ryan', 'schindler\'s list', 'one flew over', 'silence of the lambs'
            ]
        }
        
        # Get valid words for the category
        valid_words = validation_data.get(category.lower(), [])
        word_lower = word.lower()
        
        # Direct match
        if word_lower in valid_words:
            return True
            
        # Check for partial matches (useful for compound words)
        for valid_word in valid_words:
            if valid_word in word_lower or word_lower in valid_word:
                return True
                
        return False
    
    def _validate_with_chatgpt(self, word: str, category: str) -> Tuple[bool, str]:
        """
        Validate using ChatGPT as fallback.
        
        Returns:
            Tuple of (is_valid, explanation)
        """
        # Rate limiting
        current_time = time.time()
        if current_time - self.last_chatgpt_call < self.chatgpt_rate_limit:
            time.sleep(self.chatgpt_rate_limit - (current_time - self.last_chatgpt_call))
        self.last_chatgpt_call = time.time()
        
        # Construct prompt
        prompt = f"""Is "{word}" a valid example of the category "{category}"?

Please respond with ONLY:
- "YES: [brief reason]" if it's a valid example
- "NO: [brief reason]" if it's not a valid example

Examples:
- Is "dog" an animal? -> YES: Dogs are mammals and animals
- Is "car" an animal? -> NO: Cars are vehicles, not living creatures
- Is "apple" a fruit? -> YES: Apples are edible fruits that grow on trees
- Is "broccoli" a fruit? -> NO: Broccoli is a vegetable, not a fruit

Question: Is "{word}" a valid example of "{category}"?"""

        try:
            response = self.chatgpt_adapter.generateText(prompt)
            response_text = response.strip().upper()
            
            if response_text.startswith('YES'):
                reason = response_text[4:].strip(':').strip()
                return True, f"AI confirmed: {reason}"
            elif response_text.startswith('NO'):
                reason = response_text[3:].strip(':').strip()
                return False, f"AI rejected: {reason}"
            else:
                logging.warning(f"Unexpected ChatGPT response: {response}")
                return False, "AI gave unclear response"
                
        except Exception as e:
            logging.error(f"ChatGPT API call failed: {e}")
            raise
    
    def validate_batch(self, word_category_pairs: List[Tuple[str, str]]) -> List[Tuple[bool, str, str]]:
        """
        Validate multiple word-category pairs efficiently.
        
        Args:
            word_category_pairs: List of (word, category) tuples
            
        Returns:
            List of (is_valid, confidence_source, explanation) tuples
        """
        results = []
        for word, category in word_category_pairs:
            result = self.validate_word(word, category)
            results.append(result)
            
            # Small delay between validations to respect rate limits
            time.sleep(0.05)
        
        return results
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics for monitoring."""
        return {
            'cache_size': len(self.cache),
            'cached_valid': sum(1 for v in self.cache.values() if v),
            'cached_invalid': sum(1 for v in self.cache.values() if not v)
        }
    
    def clear_cache(self):
        """Clear the validation cache."""
        self.cache.clear()
        logging.info("Word validation cache cleared") 