import json
import uuid
import logging
import asyncio
import time
import websockets

from backend.commons.adapters.RedisAdapter import RedisAdapter
from backend.GameService.GameService import GameService
from backend.MessageService.MessageService import MessageService
from backend.configuration.RedisConfig import RedisConfig, RedisKeyPrefix, RedisChannelPrefix
from backend.commons.enums.Stage import Stage

logger = logging.getLogger(__name__)

class ConnectionService:
    '''
    handles all the routing 

    Flow of everything:
    1. The client (browser) sends a WebSocket message to the WebSocket server
    - Player clicks "Join Game" or "Submit Answer" in their browser
    - Browser sends a WebSocket message to server
    2. The WebSocket server passes it to ConnectionService.handleConnection
    - Server receives the message and sends it to ConnectionService
    - ConnectionService identifies the client and refreshes their connection
    3. ConnectionService routes it to the appropriate service method
    - Based on the "action" field (like "joinGame" or "submitAnswer")
    - The message is sent to the right method in GameService
    4. The service method processes the message and now:
    - Stores data in Redis using RedisAdapter
    - Uses MessageService instead of direct Redis pub/sub
    - MessageService publishes events to appropriate channels
    5. MessageService delivers the message to all subscribed servers
    - Other server instances receive the message through their MessageService
    - Each server's MessageService calls the appropriate handler method
    '''
    def __init__(self):
        # Redis will be set by the server
        self.redis = None
        # GameService will be set by the server
        self.gameService = None
        # MessageService will be set by the server
        self.messageService = None
        
        # Local cache of connections for faster access
        # This will be synchronized with Redis but serves as a quick lookup
        self.localConnections = {}
        
        # Connection cleanup task, runs in the background, checks for stale connections
        # and removes them from Redis and local cache
        self.cleanupTask = None
        
        # Pub/Sub listener task, runs in the background, listens for messages from other servers
        # and handles cross-server communication
        self.listenerTask = None
            
        # Action handlers map (will be set in start() after GameService is available)
        self.actionHandlers = {}
        
        # Server ID (using a portion of the node's MAC address)
        # This is a unique identifier for the server instance
        # It can be used to identify which server a client is connected to
        # We don't use random generation because that would change on each restart
        # and we want to keep the same ID for the same server instance
        # with Docker, each container has a unique MAC address
        self.serverId = str(uuid.getnode())[-8:] 
        
        logger.info(f"ConnectionService initialized with server ID {self.serverId}")
    
    async def start(self):
        """Start background tasks like connection cleanup and message listening and also connect to Redis"""
        # Check that Redis, GameService, and MessageService are properly set
        if not self.redis:
            raise ValueError("Redis adapter not set in ConnectionService")
        
        if not self.gameService:
            raise ValueError("GameService not set in ConnectionService")
            
        if not self.messageService:
            raise ValueError("MessageService not set in ConnectionService")
            
        # Start connection cleanup task
        self.cleanupTask = asyncio.create_task(self.cleanupStaleConnections())
        logger.info("Connection cleanup task started")
        
        # Update the action handlers now that we have the game service
        self.actionHandlers = {
            "initializeGame": self.gameService.initializeGame,
            "joinGame": self.gameService.joinGame,
            "startGame": self.gameService.startGame,
            "submitAnswer": self.gameService.submitAnswer,
            "nextQuestion": self.gameService.nextQuestion,
            "echo": self.handleEcho  # For testing
        }
        
        return self
    
    async def stop(self):
        """Stop all background tasks and clean up resources"""
        if self.cleanupTask:
            self.cleanupTask.cancel()
            try:
                await self.cleanupTask
            except asyncio.CancelledError:
                pass
        
        # No need to cancel listener task - it's handled by MessageService
        
        logger.info("ConnectionService stopped")
    
    async def handleConnection(self, websocket):
        """Handle a new WebSocket connection"""
        clientId = None
        try:
            # This will handle messages in a loop until the connection is closed
            async for message in websocket:
                try:
                    data = json.loads(message)
                    
                    # Handle reconnection specially
                    if data.get("action") == "reconnect":
                        clientId = data.get("clientId")
                        gameId = data.get("gameId")
                        role = data.get("role")
                        
                        if not clientId or not gameId:
                            await websocket.send(json.dumps({
                                "action": "error",
                                "message": "Missing clientId or gameId for reconnection"
                            }))
                            continue
                            
                        logger.info(f"Client {clientId} attempting to reconnect to game {gameId}")
                        
                        # Register the new connection
                        await self.registerConnection(clientId, websocket)
                        
                        # Get the game to restore state
                        game = await self.gameService.getGame(gameId)
                        
                        if game:
                            # Get game state for reconnection
                            game_state = {
                                "status": "playing" if game.gameState.active else "waiting",
                                "currentQuestionIndex": game.gameState.currentQuestionIndex,
                                "questions": game.gameState.questions,
                                "scores": game.gameState.scores,
                                "players": list(game.clients.keys()),
                                "playersWhoAnswered": list(game.gameState.playerAnswers.get(
                                    game.gameState.currentQuestionIndex, {}).keys())
                            }
                            
                            # Send reconnection confirmation with state
                            await websocket.send(json.dumps({
                                "action": "reconnected",
                                "gameId": gameId,
                                "clientId": clientId,
                                "gameState": game_state
                            }))
                            
                            # Let everyone in the game know this player reconnected
                            await game.broadcast({
                                "action": "playerReconnected",
                                "clientId": clientId,
                                "gameId": gameId,
                                "role": role
                            }, self.sendToClient)
                            
                            logger.info(f"Client {clientId} successfully reconnected to game {gameId}")
                        else:
                            # Game not found
                            await websocket.send(json.dumps({
                                "action": "error",
                                "message": "Game not found for reconnection"
                            }))
                            
                        # Refresh the connection TTL in Redis
                        await self.refreshConnection(clientId)
                        continue
                    
                    # Handle normal actions
                    # Get or generate client ID
                    clientId = data.get("clientId", str(uuid.uuid4()))
                    
                    # First connection or reconnection
                    # Registers client connection in Redis and local cache
                    await self.registerConnection(clientId, websocket)
                    
                    # Process the action
                    action = data.get("action")
                    if action in self.actionHandlers:
                        # Pass the sendToClient method instead of direct connections
                        # This allows the game to send messages to any client, regardless of which server.
                        # we need sendToClient because withoutit, gameService would need direct access to all connections across all servers
                        await self.actionHandlers[action](data, websocket, clientId, self.sendToClient)
                    else:
                        await websocket.send(json.dumps({
                            "action": "error", 
                            "message": "Unknown action"
                        }))
                    
                    # Refresh the connection TTL in Redis
                    await self.refreshConnection(clientId)
                
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received from client {clientId}")
                    await websocket.send(json.dumps({
                        "action": "error", 
                        "message": "Invalid JSON"
                    }))
                
                except Exception as e:
                    logger.error(f"Error processing message from client {clientId}: {e}")
                    await websocket.send(json.dumps({
                        "action": "error", 
                        "message": f"Internal server error: {str(e)}"
                    }))
        
        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"Client {clientId} disconnected: {e}")
        
        finally:
            if clientId:
                await self.unregisterConnection(clientId)
    
    async def registerConnection(self, clientId, websocket):
        """Register a new connection in Redis and local cache"""
        # Store in local cache for quick access
        self.localConnections[clientId] = websocket
        
        # Store in Redis with expiration
        connectionKey = f"{RedisKeyPrefix.CONNECTION.value}:{clientId}"
        
        connectionData = {
            "clientId": clientId,
            "serverId": self.serverId,
            "connected": int(time.time()),
            "lastActive": int(time.time())
        }
        
        # Store connection in Redis with 1 minute expiration
        # This will be refreshed as the client remains active
        await self.redis.set(connectionKey, connectionData, ex=60)
        
        # Publish connection event to all servers using MessageService
        await self.messageService.publish_event(
            "connection:new",
            {
                "clientId": clientId,
                "serverId": self.serverId,
                "timestamp": int(time.time())
            }
        )
        
        logger.info(f"Client {clientId} connected to server {self.serverId}")
        return clientId
    
    async def unregisterConnection(self, clientId):
        """Unregister a connection from Redis and local cache"""
        # Remove from local cache
        if clientId in self.localConnections:
            del self.localConnections[clientId]
        
        # Remove from Redis
        connectionKey = f"{RedisKeyPrefix.CONNECTION.value}:{clientId}"
        await self.redis.delete(connectionKey)
        
        # Publish disconnection event to all servers using MessageService
        await self.messageService.publish_event(
            "connection:closed",
            {
                "clientId": clientId,
                "serverId": self.serverId,
                "timestamp": int(time.time())
            }
        )
        
        logger.info(f"Client {clientId} disconnected from server {self.serverId}")
    
    async def refreshConnection(self, clientId):
        """Refresh the expiration time of a connection in Redis"""
        connectionKey = f"{RedisKeyPrefix.CONNECTION.value}:{clientId}"
        
        # Get existing data
        connectionData = await self.redis.get(connectionKey)
        if connectionData:
            # Update last active time
            connectionData["lastActive"] = int(time.time())
            
            # Reset expiration to 1 minute
            await self.redis.set(connectionKey, connectionData, ex=60)
            return True
        
        return False
    
    async def cleanupStaleConnections(self):
        """Periodically clean up stale connections"""
        try:
            while True:
                logger.debug(f"Running connection cleanup for server {self.serverId}")
                
                # Check local connections against Redis
                # If a connection is in local cache but not in Redis, it's stale
                for clientId, websocket in list(self.localConnections.items()):
                    connectionKey = f"{RedisKeyPrefix.CONNECTION.value}:{clientId}"
                    exists = await self.redis.exists(connectionKey)
                    
                    if not exists:
                        logger.info(f"Cleaning up stale connection for client {clientId}")
                        
                        # Close the WebSocket if it's still open
                        if websocket.open:
                            await websocket.close(1001, "Connection expired")
                        
                        # Remove from local cache
                        del self.localConnections[clientId]
                
                # Sleep for 30 seconds before next cleanup
                await asyncio.sleep(30)
        
        except asyncio.CancelledError:
            logger.info("Connection cleanup task cancelled")
            raise
        
        except Exception as e:
            logger.error(f"Error in connection cleanup task: {e}")
            # Restart the task after a brief delay
            await asyncio.sleep(5)
            self.cleanupTask = asyncio.create_task(self.cleanupStaleConnections())
    
# Removed listenForMessages method since we're using MessageService for pub/sub communication
    
    async def sendToClient(self, clientId, message):
        """Handles local delivery if client is connected to this server.
           Also handles cross-server routing via MessageService if client is connected to another server"""
        # Check if the client is connected to this server
        if clientId in self.localConnections:
            websocket = self.localConnections[clientId]
            if websocket.open:
                try:
                    if isinstance(message, dict):
                        message = json.dumps(message)
                    await websocket.send(message)
                    return True
                except websockets.exceptions.ConnectionClosed:
                    await self.unregisterConnection(clientId)
                    return False
                except Exception as e:
                    logger.error(f"Error sending message to client {clientId}: {e}")
                    return False
        
        # If not connected to this server, try to route via MessageService
        try:
            # Check if the client is connected to any server
            connectionKey = f"{RedisKeyPrefix.CONNECTION.value}:{clientId}"
            connectionData = await self.redis.get(connectionKey)
            
            if connectionData:
                # The client is connected to another server
                serverId = connectionData.get("serverId")
                
                # Publish the message using MessageService
                await self.messageService.publish_event(
                    "connection:message",
                    {
                        "clientId": clientId,
                        "serverId": self.serverId,
                        "message": message if isinstance(message, str) else json.dumps(message),
                        "timestamp": int(time.time())
                    }
                )
                return True
        
        except Exception as e:
            logger.error(f"Error routing message to client {clientId}: {e}")
        
        return False
    
    async def broadcast(self, clientIds, message):
        """Broadcast a message to multiple clients"""
        if isinstance(message, dict):
            message = json.dumps(message)
        
        tasks = []
        for clientId in clientIds:
            tasks.append(self.sendToClient(clientId, message))
        
        # Execute all sends in parallel
        if tasks:
            await asyncio.gather(*tasks, returnExceptions=True)
    
    async def handleConnectionEvent(self, channel, message):
        """
        Handle connection events from other servers via MessageService
        
        Args:
            channel: The channel the message was received on
            message: The message data (usually a dict)
        """
        try:
            # Check if this is an event message (has event field)
            if isinstance(message, dict) and "event" in message and "data" in message:
                event_type = message["event"]
                data = message["data"]
                source_server_id = data.get("serverId")
                client_id = data.get("clientId")
                
                # Skip messages from this server
                if source_server_id == self.serverId:
                    return
                
                logger.debug(f"Received {event_type} for client {client_id} from server {source_server_id}")
                
                # Handle connection events
                if event_type == "connection:closed" and client_id in self.localConnections:
                    # The client disconnected from another server but is connected to this one
                    # This can happen if a client reconnects to a different server
                    # We should close the connection on this server
                    websocket = self.localConnections[client_id]
                    if websocket.open:
                        await websocket.close(1001, "Connected to another server")
                        
                    # Remove from local cache
                    del self.localConnections[client_id]
                    logger.info(f"Closed duplicate connection for client {client_id}")
                
                # Handle direct messages to clients
                elif event_type == "connection:message" and client_id in self.localConnections:
                    websocket = self.localConnections[client_id]
                    if websocket.open:
                        try:
                            message_content = data.get("message", "")
                            await websocket.send(message_content)
                            logger.debug(f"Delivered message to client {client_id} from server {source_server_id}")
                        except websockets.exceptions.ConnectionClosed:
                            await self.unregisterConnection(client_id)
            
            # Legacy format support (for backwards compatibility)
            elif isinstance(message, dict) and "event" in message:
                event = message.get("event")
                client_id = message.get("clientId")
                source_server_id = message.get("serverId")
                
                # Skip messages from this server
                if source_server_id == self.serverId:
                    return
                
                logger.debug(f"Received legacy {event} for client {client_id} from server {source_server_id}")
                
                # Handle connection events
                if event == "connection:closed" and client_id in self.localConnections:
                    websocket = self.localConnections[client_id]
                    if websocket.open:
                        await websocket.close(1001, "Connected to another server")
                        
                    # Remove from local cache
                    del self.localConnections[client_id]
                    logger.info(f"Closed duplicate connection for client {client_id}")
                
                # Handle direct messages to clients
                elif event == "connection:message" and client_id in self.localConnections:
                    websocket = self.localConnections[client_id]
                    if websocket.open:
                        try:
                            message_content = message.get("message", "")
                            await websocket.send(message_content)
                            logger.debug(f"Delivered message to client {client_id} from server {source_server_id}")
                        except websockets.exceptions.ConnectionClosed:
                            await self.unregisterConnection(client_id)
        
        except Exception as e:
            logger.error(f"Error handling connection event: {e}")
    
    async def handleEcho(self, data, websocket, clientId, sendToClient):
        """Echo handler for testing"""
        try:
            # Echo the message back with server ID for load balancer testing
            response = {
                "action": "echo",
                "clientId": clientId,
                "message": data.get("message", ""),
                "serverId": self.serverId,
                "timestamp": int(time.time())
            }
            await websocket.send(json.dumps(response))
            logger.debug(f"Echoed message for client {clientId}: {data.get('message')}")
            return True
        except Exception as e:
            logger.error(f"Error in echo handler: {e}")
            return False