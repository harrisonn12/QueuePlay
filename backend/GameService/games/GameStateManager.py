import logging
import time
import asyncio
from backend.commons.adapters.RedisAdapter import RedisAdapter
from backend.configuration.RedisConfig import RedisKeyPrefix, RedisChannelPrefix
from backend.GameService.games.GameState import GameState

logger = logging.getLogger(__name__)

class GameStateManager:
    """
    Manages game state persistence in Redis, including saving, loading,
    and cleaning up game states.
    """
    
    def __init__(self, redis):
        self.redis = redis
        self.cleanupTask = None
        self.gameCleanupInterval = 3600  # 1 hour
        self.gameExpiration = 86400  # 24 hours
    
    async def start(self):
        """Start background cleanup task"""
        self.cleanupTask = asyncio.create_task(self.cleanupStaleGames())
        logger.info("Game state cleanup task started")
        return self
    
    async def stop(self):
        """Stop background cleanup task"""
        if self.cleanupTask:
            self.cleanupTask.cancel()
            try:
                await self.cleanupTask
            except asyncio.CancelledError:
                pass
            logger.info("Game state cleanup task stopped")
    
    async def saveGameState(self, gameState):
        """Save game state to Redis"""
        try:
            gameId = gameState.gameId
            if not gameId:
                logger.error("Cannot save game state without gameId")
                return False
            
            # Game state key
            gameKey = f"{RedisKeyPrefix.GAME.value}:{gameId}"
            
            # Save the game state with expiration
            await self.redis.set(gameKey, gameState.toDict(), ex=self.gameExpiration)
            
            # Publish game state update event
            await self.redis.publish(
                f"{RedisChannelPrefix.GAME.value}:all",
                {
                    "event": "game:updated",
                    "gameId": gameId,
                    "timestamp": int(time.time())
                }
            )
            
            logger.debug(f"Game state saved for game {gameId}")
            return True
        
        except Exception as e:
            logger.error(f"Error saving game state: {e}")
            return False
    
    async def loadGameState(self, gameId):
        """Load game state from Redis"""
        try:
            if not gameId:
                logger.error("Cannot load game state without gameId")
                return None
            
            # Game state key
            gameKey = f"{RedisKeyPrefix.GAME.value}:{gameId}"
            
            # Load the game state
            gameData = await self.redis.get(gameKey)
            if not gameData:
                logger.debug(f"No game state found for game {gameId}")
                return None
            
            # Create game state from data
            gameState = GameState.fromDict(gameData)
            logger.debug(f"Game state loaded for game {gameId}")
            
            return gameState
        
        except Exception as e:
            logger.error(f"Error loading game state: {e}")
            return None
    
    async def deleteGameState(self, gameId):
        """Delete game state from Redis"""
        try:
            if not gameId:
                logger.error("Cannot delete game state without gameId")
                return False
            
            # Game state key
            gameKey = f"{RedisKeyPrefix.GAME.value}:{gameId}"
            
            # Delete the game state
            deleted = await self.redis.delete(gameKey)
            
            if deleted:
                # Publish game state deleted event
                await self.redis.publish(
                    f"{RedisChannelPrefix.GAME.value}:all",
                    {
                        "event": "game:deleted",
                        "gameId": gameId,
                        "timestamp": int(time.time())
                    }
                )
                
                logger.info(f"Game state deleted for game {gameId}")
                return True
            else:
                logger.debug(f"Game state not found for deletion: {gameId}")
                return False
        
        except Exception as e:
            logger.error(f"Error deleting game state: {e}")
            return False
    
    async def listGames(self, pattern="*", limit=100):
        """List games matching pattern, up to limit"""
        try:
            # Game state keys
            prefix = f"{RedisKeyPrefix.GAME.value}:"
            gameKeys = await self.redis.keys(f"{prefix}{pattern}")
            
            # Limit the number of games
            gameKeys = gameKeys[:limit]
            
            # Extract game IDs from keys
            gameIds = []
            for key in gameKeys:
                if isinstance(key, str) and key.startswith(prefix):
                    gameId = key[len(prefix):]
                    gameIds.append(gameId)
            
            logger.debug(f"Listed {len(gameIds)} games")
            return gameIds
        
        except Exception as e:
            logger.error(f"Error listing games: {e}")
            return []
    
    async def cleanupStaleGames(self):
        """Periodically clean up stale games"""
        try:
            while True:
                logger.debug("Running game state cleanup")
                
                # List all games
                gameKeys = await self.redis.keys(f"{RedisKeyPrefix.GAME.value}:*")
                
                # Batch process games
                cleaned = 0
                for gameKey in gameKeys:
                    try:
                        # Get the game state
                        gameData = await self.redis.get(gameKey)
                        if not gameData:
                            continue
                        
                        # Check if the game is stale
                        updatedAt = gameData.get("updatedAt", 0)
                        if int(time.time()) - updatedAt > self.gameExpiration:
                            # Delete the game state
                            await self.redis.delete(gameKey)
                            
                            # Extract game ID from key
                            gameId = gameKey[len(f"{RedisKeyPrefix.GAME.value}:")+1:]
                            
                            # Publish game state deleted event
                            await self.redis.publish(
                                f"{RedisChannelPrefix.GAME.value}:all",
                                {
                                    "event": "game:expired",
                                    "gameId": gameId,
                                    "timestamp": int(time.time())
                                }
                            )
                            
                            cleaned += 1
                    except Exception as e:
                        logger.error(f"Error cleaning up game {gameKey}: {e}")
                
                if cleaned > 0:
                    logger.info(f"Cleaned up {cleaned} stale games")
                
                # Sleep for the cleanup interval
                await asyncio.sleep(self.gameCleanupInterval)
        
        except asyncio.CancelledError:
            logger.info("Game state cleanup task cancelled")
            raise
        
        except Exception as e:
            logger.error(f"Error in game state cleanup task: {e}")
            # Restart the task after a brief delay
            await asyncio.sleep(5)
            self.cleanupTask = asyncio.create_task(self.cleanupStaleGames())