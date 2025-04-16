import json
import uuid
import logging
import asyncio
import time
from backend.GameService.games.GameFactory import GameFactory
from backend.LobbyService.LobbyService import LobbyService
from backend.LobbyService.src.QRCodeGenerator import QRCodeGenerator
from backend.configuration.AppConfig import AppConfig
from backend.configuration.RedisConfig import RedisKeyPrefix, RedisChannelPrefix
from backend.MessageService.MessageService import MessageService
from backend.commons.enums.Stage import Stage

logger = logging.getLogger(__name__)

class GameService:
    def __init__(self, redis=None):
        self.redis = redis
        self.games = {}  # Local cache of active games
        self.appConfig = AppConfig(Stage.DEVO)
        self.qrCodeGenerator = QRCodeGenerator(self.appConfig)
        self.lobbyService = LobbyService(self.qrCodeGenerator)
        self.gameFactory = GameFactory(redis)
        self.cleanupTask = None
        self.messageService = None # Will be set by the server
        
        # Game cleanup settings
        self.gameCleanupInterval = 300  # 5 minutes
        self.inactiveGameTimeout = 3600  # 1 hour
        
        logger.info("GameService initialized")
    
    async def start(self):
        """Start background tasks"""
        # Start the game factory
        await self.gameFactory.start()
        
        # Start the game cleanup task
        self.cleanupTask = asyncio.create_task(self.cleanupInactiveGames())
        
        logger.info("GameService started")
        return self
    
    async def stop(self):
        """Stop background tasks"""
        # Stop the game factory
        await self.gameFactory.stop()
        
        # Cancel the cleanup task
        if self.cleanupTask:
            self.cleanupTask.cancel()
            try:
                await self.cleanupTask
            except asyncio.CancelledError:
                pass
        
        logger.info("GameService stopped")
    
    async def handleGameEvent(self, channel, message):
        """
        Handle game events from other servers via MessageService
        
        Args:
            channel: The channel the message was received on
            message: The message data (usually a dict)
        """
        try:
            # Check if this is an event message (has event field)
            if isinstance(message, dict) and "event" in message and "data" in message:
                event_type = message["event"]
                data = message["data"]
                gameId = data.get("gameId")
                
                # Handle game events
                if event_type == "game:updated" and gameId and gameId not in self.games:
                    # A game was updated on another server, load it if needed
                    logger.debug(f"Game {gameId} updated on another server")
                    # We could optionally load the game here if needed
                
                elif event_type == "game:deleted" and gameId and gameId in self.games:
                    # A game was deleted on another server, remove from local cache
                    del self.games[gameId]
                    logger.info(f"Game {gameId} removed from local cache (deleted on another server)")
                
                elif event_type == "game:expired" and gameId and gameId in self.games:
                    # A game expired on another server, remove from local cache
                    del self.games[gameId]
                    logger.info(f"Game {gameId} removed from local cache (expired on another server)")
            
            # Legacy format support (for backwards compatibility)
            elif isinstance(message, dict) and "event" in message:
                event = message.get("event")
                gameId = message.get("gameId")
                
                # Handle game events
                if event == "game:updated" and gameId and gameId not in self.games:
                    logger.debug(f"Game {gameId} updated on another server (legacy format)")
                
                elif event == "game:deleted" and gameId and gameId in self.games:
                    del self.games[gameId]
                    logger.info(f"Game {gameId} removed from local cache (deleted on another server, legacy format)")
                
                elif event == "game:expired" and gameId and gameId in self.games:
                    del self.games[gameId]
                    logger.info(f"Game {gameId} removed from local cache (expired on another server, legacy format)")
        
        except Exception as e:
            logger.error(f"Error handling game event: {e}")
    
    async def cleanupInactiveGames(self):
        """Periodically clean up inactive games from local cache"""
        try:
            while True:
                now = int(time.time())
                toRemove = []
                
                # Check each game in the local cache
                for gameId, game in self.games.items():
                    # If the game has a lastActive timestamp and has been inactive
                    if hasattr(game.gameState, 'updatedAt') and now - game.gameState.updatedAt > self.inactiveGameTimeout:
                        toRemove.append(gameId)
                
                # Remove inactive games
                for gameId in toRemove:
                    try:
                        await self.endGame(gameId, "Game expired due to inactivity")
                        
                        # Publish game expired event
                        if self.messageService:
                            await self.messageService.publish_event(
                                "game:expired", 
                                {
                                    "gameId": gameId,
                                    "reason": "inactivity"
                                }
                            )
                    except Exception as e:
                        logger.error(f"Error ending inactive game {gameId}: {e}")
                
                if toRemove:
                    logger.info(f"Cleaned up {len(toRemove)} inactive games")
                
                # Sleep until next cleanup
                await asyncio.sleep(self.gameCleanupInterval)
        
        except asyncio.CancelledError:
            logger.info("Game cleanup task cancelled")
            raise
        
        except Exception as e:
            logger.error(f"Error in game cleanup task: {e}")
            # Restart the task after a brief delay
            await asyncio.sleep(5)
            self.cleanupTask = asyncio.create_task(self.cleanupInactiveGames())
    
    async def getGame(self, gameId):
        """Get a game by ID, loading from Redis if necessary"""
        # Check local cache first
        if gameId in self.games:
            return self.games[gameId]
        
        # If not in cache and Redis is available, try to load from Redis
        if self.redis:
            game = await self.gameFactory.loadGame(gameId)
            if game:
                # Add to local cache
                self.games[gameId] = game
                return game
        
        return None
    
    async def endGame(self, gameId, reason="Game ended"):
        """End a game and clean up resources"""
        game = await self.getGame(gameId)
        if game:
            # Use the sendToClient function that will be passed to endGame
            async def dummySendToClient(clientId, message):
                logger.warning(f"Cannot send message to {clientId} during cleanup: {message}")
            
            # End the game
            await game.endGame(dummySendToClient, reason)
            
            # Remove from local cache
            if gameId in self.games:
                del self.games[gameId]
            
            # Publish game ended event
            if self.messageService:
                await self.messageService.publish_event(
                    "game:deleted", 
                    {
                        "gameId": gameId,
                        "reason": reason
                    }
                )
            
            logger.info(f"Game {gameId} ended: {reason}")
            return True
        
        return False
    
    async def initializeGame(self, data, websocket, clientId, sendToClient):
        """Initialize a new game"""
        try:
            gameId = data.get("gameId", str(uuid.uuid4()))
            gameType = data.get("gameType", "trivia")
            
            # Create the game
            game = self.gameFactory.createGame(gameType, gameId, clientId)
            
            # Add to local cache
            self.games[gameId] = game
            
            # Generate QR code for joining
            qrCodeData = self.lobbyService.generateLobbyQRCode(gameId)
            
            # Send initialization confirmation
            await sendToClient(clientId, {
                "action": "gameInitialized",
                "gameId": gameId,
                "clientId": clientId,
                "role": "host",
                "qrCodeData": qrCodeData
            })
            
            # Save game state
            await game.saveState()
            
            # Publish game created event
            if self.messageService:
                await self.messageService.publish_event(
                    "game:created", 
                    {
                        "gameId": gameId,
                        "gameType": gameType,
                        "hostId": clientId
                    }
                )
            
            logger.info(f"{gameType} game {gameId} initialized by host {clientId}")
        
        except ValueError as e:
            logger.error(f"Error initializing game: {e}")
            await sendToClient(clientId, {
                "action": "error",
                "message": str(e)
            })
        
        except Exception as e:
            logger.error(f"Unexpected error initializing game: {e}")
            await sendToClient(clientId, {
                "action": "error",
                "message": f"Internal error: {str(e)}"
            })
    
    async def joinGame(self, data, websocket, clientId, sendToClient):
        """Join an existing game"""
        try:
            gameId = data.get("gameId")
            
            # Get or load the game
            game = await self.getGame(gameId)
            
            if game:
                # Join the game
                await game.joinGame(clientId, websocket, sendToClient)
                logger.info(f"Player {clientId} joined game {gameId}")
            else:
                logger.warning(f"Player {clientId} attempted to join non-existent game {gameId}")
                await sendToClient(clientId, {
                    "action": "error",
                    "message": "Game not found"
                })
        
        except Exception as e:
            logger.error(f"Error joining game: {e}")
            await sendToClient(clientId, {
                "action": "error",
                "message": f"Error joining game: {str(e)}"
            })
    
    async def startGame(self, data, websocket, clientId, sendToClient):
        """Start a game"""
        try:
            gameId = data.get("gameId")
            
            # Get or load the game
            game = await self.getGame(gameId)
            
            if game and game.hostId == clientId:
                # Start the game
                await game.startGame(sendToClient)
                logger.info(f"Game {gameId} started by host {clientId}")
            else:
                reason = "Game not found" if not game else "Not the host"
                logger.warning(f"Cannot start game {gameId} - {reason}")
                await sendToClient(clientId, {
                    "action": "error",
                    "message": f"Cannot start game - {reason}"
                })
        
        except Exception as e:
            logger.error(f"Error starting game: {e}")
            await sendToClient(clientId, {
                "action": "error",
                "message": f"Error starting game: {str(e)}"
            })
    
    async def submitAnswer(self, data, websocket, clientId, sendToClient):
        """Submit an answer for a game question"""
        try:
            gameId = data.get("gameId")
            questionIndex = data.get("questionIndex")
            answerIndex = data.get("answerIndex")
            
            # Get or load the game
            game = await self.getGame(gameId)
            
            if game and clientId in game.clients:
                # Submit the answer
                await game.submitAnswer(clientId, questionIndex, answerIndex, sendToClient)
                logger.info(f"Player {clientId} submitted answer {answerIndex} for question {questionIndex} in game {gameId}")
            else:
                reason = "Game not found" if not game else "Not a player in this game"
                logger.warning(f"Cannot submit answer - {reason}")
                await sendToClient(clientId, {
                    "action": "error",
                    "message": f"Cannot submit answer - {reason}"
                })
        
        except Exception as e:
            logger.error(f"Error submitting answer: {e}")
            await sendToClient(clientId, {
                "action": "error",
                "message": f"Error submitting answer: {str(e)}"
            })
    
    async def nextQuestion(self, data, websocket, clientId, sendToClient):
        """Advance to the next question"""
        try:
            gameId = data.get("gameId")
            
            # Get or load the game
            game = await self.getGame(gameId)
            
            if game and game.hostId == clientId:
                # Advance to next question
                await game.nextQuestion(sendToClient)
                logger.info(f"Moving to next question in game {gameId}")
            else:
                reason = "Game not found" if not game else "Not the host"
                logger.warning(f"Cannot advance question - {reason}")
                await sendToClient(clientId, {
                    "action": "error",
                    "message": f"Cannot advance question - {reason}"
                })
        
        except Exception as e:
            logger.error(f"Error advancing to next question: {e}")
            await sendToClient(clientId, {
                "action": "error",
                "message": f"Error advancing to next question: {str(e)}"
            }) 