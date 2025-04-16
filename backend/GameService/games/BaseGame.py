import json
import asyncio
import logging
import time
from backend.GameService.games.GameState import GameState

logger = logging.getLogger(__name__)

class BaseGame:
    def __init__(self, gameId, hostId, gameStateManager=None):
        self.gameId = gameId
        self.hostId = hostId
        self.clients = {hostId: "host"}
        self.gameStateManager = gameStateManager
        self.gameState = GameState(gameId, hostId)  # Pass hostId to GameState
        
        logger.info(f"Game {gameId} created with host {hostId}")
    
    async def loadState(self):
        """Load game state from Redis if available"""
        if self.gameStateManager:
            loadedState = await self.gameStateManager.loadGameState(self.gameId)
            if loadedState:
                self.gameState = loadedState
                # Update clients from loaded state if needed
                logger.info(f"Game state loaded for game {self.gameId}")
                return True
        return False
    
    async def saveState(self):
        """Save game state to Redis"""
        if self.gameStateManager:
            success = await self.gameStateManager.saveGameState(self.gameState)
            if success:
                logger.debug(f"Game state saved for game {self.gameId}")
            else:
                logger.error(f"Failed to save game state for game {self.gameId}")
            return success
        return False
    
    async def joinGame(self, clientId, websocket, sendToClient):
        """Add a client to the game"""
        # Store client role
        self.clients[clientId] = "player"  # default role
        
        # Send join confirmation to the new player
        await sendToClient(clientId, {
            "action": "gameJoined",
            "gameId": self.gameId,
            "clientId": clientId,
            "role": "player"
        })
        
        # Notify the host of the new player
        await sendToClient(self.hostId, {
            "action": "playerJoined",
            "clientId": clientId,
            "gameId": self.gameId,
            "timestamp": int(time.time())
        })
        
        # Save updated state
        await self.saveState()
        
        logger.info(f"Player {clientId} joined game {self.gameId}")
    
    async def leaveGame(self, clientId, sendToClient):
        """Remove a client from the game"""
        if clientId in self.clients:
            role = self.clients.pop(clientId)
            
            # If the host leaves, end the game
            if role == "host":
                await self.endGame(sendToClient, "Host left the game")
                return
            
            # Notify the host
            await sendToClient(self.hostId, {
                "action": "playerLeft",
                "clientId": clientId,
                "gameId": self.gameId,
                "timestamp": int(time.time())
            })
            
            # Save updated state
            await self.saveState()
            
            logger.info(f"Player {clientId} left game {self.gameId}")
    
    async def endGame(self, sendToClient, reason="Game ended"):
        """End the game and clean up resources"""
        # Notify all clients
        for clientId in list(self.clients.keys()):
            await sendToClient(clientId, {
                "action": "gameEnded",
                "gameId": self.gameId,
                "reason": reason,
                "timestamp": int(time.time())
            })
        
        # Delete game state from Redis
        if self.gameStateManager:
            await self.gameStateManager.deleteGameState(self.gameId)
        
        logger.info(f"Game {self.gameId} ended: {reason}")
    
    async def broadcast(self, message, sendToClient): 
        """Broadcast a message to all clients in this game"""
        if isinstance(message, dict):
            message = json.dumps(message)
        
        tasks = []
        for clientId in self.clients:
            tasks.append(sendToClient(clientId, message))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
            logger.debug(f"Broadcast message to {len(tasks)} clients in game {self.gameId}")

    