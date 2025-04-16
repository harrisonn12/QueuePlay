import logging
from backend.GameService.games.TriviaGame import TriviaGame
from backend.GameService.games.GameStateManager import GameStateManager
from backend.QuestionService.QuestionService import QuestionService
from backend.QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from backend.commons.adapters.ChatGptAdapter import ChatGptAdapter

logger = logging.getLogger(__name__)

class GameFactory:
    '''
    FLOW: 
    1. Client connects and sends a message like {"action": "initializeGame", ...}
    2. ConnectionService routes this to game_service.initializeGame()
    3. Inside that method, GameFactory is used to create the game:
        game = self.gameFactory.createGame(gameType, gameId, clientId)

    Services are initialized at startup, but games are created only when client requests them by GameFactory .
    '''
    def __init__(self, redis=None):
        self.chatGptAdapter = ChatGptAdapter()
        self.questionAnswerSetGenerator = QuestionAnswerSetGenerator(self.chatGptAdapter)
        self.questionService = QuestionService(self.chatGptAdapter, self.questionAnswerSetGenerator)
        self.gameStateManager = None
        
        # Initialize game state manager if Redis is provided
        if redis:
            self.gameStateManager = GameStateManager(redis)
            logger.info("GameFactory initialized with Redis-backed game state")
        else:
            logger.warning("GameFactory initialized without Redis. Game states will not be persisted.")
    
    async def start(self):
        """Start background tasks like game state cleanup"""
        if self.gameStateManager:
            await self.gameStateManager.start()
        return self
    
    async def stop(self):
        """Stop background tasks"""
        if self.gameStateManager:
            await self.gameStateManager.stop()
    
    def createGame(self, gameType, gameId, hostId):
        """Create a new game of the specified type"""
        if gameType == "trivia":
            logger.info(f"Creating trivia game {gameId} with host {hostId}")
            return TriviaGame(gameId, hostId, self.questionService, self.gameStateManager)
        else:
            logger.error(f"Unknown game type: {gameType}")
            raise ValueError(f"Unknown game type: {gameType}")
    
    async def loadGame(self, gameId):
        """Load an existing game from Redis"""
        if not self.gameStateManager:
            logger.warning("Cannot load game without Redis")
            return None
        
        # Get game state
        gameState = await self.gameStateManager.loadGameState(gameId)
        if not gameState:
            logger.warning(f"No game state found for game {gameId}")
            return None
        
        # Create appropriate game type
        # For now assuming all games are trivia games
        game = TriviaGame(gameId, gameState.hostId, self.questionService, self.gameStateManager)
        game.gameState = gameState
        
        logger.info(f"Game {gameId} loaded from Redis")
        return game
