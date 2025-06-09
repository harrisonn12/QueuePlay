import json
import uuid
import logging
import time
import jwt
import os
import websockets
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from typing import Optional, Dict, Any

from MessageService.MessageService import MessageService

logger = logging.getLogger(__name__)

class ConnectionService:
    '''
    Handles WebSocket connections and message relaying via MessageService (Redis Pub/Sub).
    Manages client connections *local to this server instance*.
    Acts as a pure relay with JWT authentication, interpreting only minimal actions like 'identify'.

    Responsibilities:
    - Manage WebSocket connection lifecycle (connect, disconnect).
    - Authenticate WebSocket connections using JWT tokens.
    - Assign temporary IDs until client identification.
    - Handle client identification and subscribe to appropriate Pub/Sub channels.
    - Relay subsequent messages to Pub/Sub channels (broadcast or to_host).
    - Handle disconnection cleanup (unsubscribe from Pub/Sub).
    '''
    def __init__(self):
        self.messageService: MessageService = None # Injected by MultiplayerServer

        # Stores websockets for clients connected to THIS server instance
        self.localConnections = {} # {clientId: websocket}
        # Store basic state associated with the *local connection*
        # This is NOT the authoritative game state, just info needed for routing
        self.connectionState = {} # {clientId: {"gameId": str, "isHost": bool, "authenticated": bool}}

        # JWT secret from environment
        self.jwt_secret = os.environ.get("JWT_SECRET")
        if not self.jwt_secret:
            logger.warning("JWT_SECRET not found in environment, using fallback for development")
            self.jwt_secret = "dev-fallback-secret-not-secure"

        # Generate a unique ID for this server instance
        self.serverId = str(uuid.getnode())[-8:]

        logger.info(f"ConnectionService initialized with JWT authentication, server ID {self.serverId}")

    async def start(self):
        """Start ConnectionService with authentication."""
        if not self.messageService:
            logger.error("MessageService not set in ConnectionService!")
            raise ValueError("MessageService is required")

        logger.info("ConnectionService started with security features")
        return self

    def validate_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate JWT token for WebSocket authentication.
        Returns payload if valid, None if invalid.
        """
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            
            # Check if token is expired
            exp = payload.get("exp")
            if exp and time.time() > exp:
                logger.info("JWT token expired")
                return None
                
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.info("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None

    async def handleConnection(self, websocket):
        """
        Handle a new WebSocket connection: JWT authentication required, then identify and relay messages.
        All connections (hosts and players) must provide valid JWT tokens.
        """
        # 1. Assign temporary ID and store connection
        temp_client_id = f"temp_{uuid.uuid4()}"
        self.localConnections[temp_client_id] = websocket

        # State variables for this specific connection handler instance
        client_id = temp_client_id
        game_id = None
        is_host = None # Role is unknown until identified
        is_identified = False
        is_authenticated = False
        user_id = None
        payload = None  # Store JWT payload for later use

        logger.info(f"Client connected with temporary ID {temp_client_id}. Waiting for JWT authentication (required).")

        try:
            # 2. Process messages: Authentication REQUIRED, then identify, then relay
            async for message in websocket:
                try:
                    data = json.loads(message)
                    action = data.get("action")

                    # --- Authentication Step (REQUIRED) --- #
                    if action == "authenticate" and not is_authenticated:
                        token = data.get("token")
                        if not token:
                            logger.warning(f"Authentication attempt without token from {temp_client_id}")
                            await self.sendToClient(temp_client_id, {"action": "error", "message": "JWT token required for WebSocket connection."}, websocket)
                            continue

                        # Validate JWT token
                        token_payload = self.validate_jwt_token(token)
                        if not token_payload:
                            logger.warning(f"Invalid token from {temp_client_id}")
                            await self.sendToClient(temp_client_id, {"action": "error", "message": "Invalid or expired JWT token."}, websocket)
                            continue

                        # Extract user info from token
                        user_id = token_payload.get("user_id")
                        if not user_id:
                            logger.warning(f"Token missing user_id from {temp_client_id}")
                            await self.sendToClient(temp_client_id, {"action": "error", "message": "Invalid token payload."}, websocket)
                            continue

                        # Store payload for later use
                        payload = token_payload
                        is_authenticated = True
                        logger.info(f"Client {temp_client_id} authenticated as user {user_id}")
                        
                        # Acknowledge authentication
                        await self.sendToClient(temp_client_id, {"action": "authenticated", "success": True}, websocket)
                        continue

                    # --- Identification Step (Requires Authentication) --- #
                    elif action == "identify" and not is_identified:
                        if not is_authenticated:
                            await self.sendToClient(temp_client_id, {"action": "error", "message": "Must authenticate with JWT token before identification."}, websocket)
                            continue
                        
                        game_id = data.get("gameId")
                        role = data.get("role", "player")  # Default to player
                        player_name = data.get("playerName")
                        phone_number = data.get("phoneNumber")
                        
                        if not game_id:
                            await self.sendToClient(temp_client_id, {"action": "error", "message": "gameId is required for identification."}, websocket)
                            continue

                        # For guest tokens, validate they're for the correct game
                        token_type = payload.get("type", "access_token")
                        if token_type == "guest":
                            token_game_id = payload.get("game_id")
                            if token_game_id != game_id:
                                await self.sendToClient(temp_client_id, {"action": "error", "message": "JWT token not valid for this game."}, websocket)
                                continue
                        
                        # Generate a proper client ID based on authentication
                        client_id = f"auth_{user_id}_{uuid.uuid4().hex[:8]}"

                        # Update local connection tracking
                        del self.localConnections[temp_client_id]  # Remove temp ID
                        self.localConnections[client_id] = websocket  # Add real ID
                        
                        # Store connection state (simplified)
                        is_host = (role == "host")
                        self.connectionState[client_id] = {
                            "gameId": game_id,
                            "isHost": is_host,
                            "authenticated": is_authenticated,
                            "playerName": player_name,
                            "phoneNumber": phone_number,
                            "tokenType": token_type,
                            "userId": user_id
                        }
                        
                        is_identified = True
                        logger.info(f"Client identified: {client_id} in game {game_id} as {'host' if is_host else 'player'} (token type: {token_type})")
                        
                        # Subscribe to game channels
                        broadcast_channel = f"game:{game_id}:broadcast"
                        await self.messageService.subscribe_client(client_id, broadcast_channel, websocket)
                        
                        if is_host:
                            host_channel = f"game:{game_id}:to_host"
                            await self.messageService.subscribe_client(client_id, host_channel, websocket)
                        
                        # Notify about successful identification
                        await self.sendToClient(client_id, {
                            "action": "identified", 
                            "clientId": client_id,
                            "gameId": game_id,
                            "role": role,
                            "authenticated": is_authenticated,
                            "tokenType": token_type
                        }, websocket)
                        continue

                    # --- Require Authentication and Identification for All Other Actions --- #
                    elif not is_authenticated:
                        logger.warning(f"Unauthenticated action '{action}' from {temp_client_id}. JWT authentication required.")
                        await self.sendToClient(temp_client_id, {"action": "error", "message": "Must authenticate with JWT token first."}, websocket)
                        continue
                    elif not is_identified:
                        logger.warning(f"Unidentified action '{action}' from {temp_client_id}. Identification required.")
                        await self.sendToClient(temp_client_id, {"action": "error", "message": "Please identify first with gameId and role."}, websocket)
                        continue

                    # --- Handle Authenticated Client Messages (Relay) --- #
                    else:
                        # Add sender context before relaying
                        data_to_publish = data.copy()
                        data_to_publish["senderId"] = client_id
                        message_to_publish = json.dumps(data_to_publish)
                        target_channel = None

                        # Determine target channel based on role stored during identify
                        if is_host:
                            # Message from host -> broadcast channel
                            target_channel = f"game:{game_id}:broadcast"
                            # logger.debug(f"Host {client_id} broadcasting action '{action}' to {target_channel}")
                        else:
                            # Message from player -> to_host channel
                            target_channel = f"game:{game_id}:to_host"
                            # logger.debug(f"Player {client_id} sending action '{action}' to {target_channel}")

                        # Publish the raw message via MessageService
                        if target_channel:
                            await self.messageService.publish_raw(target_channel, message_to_publish)
                        else:
                            # Should not happen if identified correctly
                             logger.error(f"Cannot determine target channel for client {client_id} in game {game_id} with role {is_host}")

                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received from client {client_id or temp_client_id}")
                    await self.sendToClient(client_id or temp_client_id, {"action": "error", "message": "Invalid JSON"}, websocket)
                except Exception as e:
                    logger.error(f"Error processing message from client {client_id or temp_client_id}: {e}", exc_info=True)
                    try:
                        await self.sendToClient(client_id or temp_client_id, {"action": "error", "message": "Internal server error"}, websocket)
                    except Exception:
                        pass # Websocket might already be closed

        # 3. Handle Disconnection
        except (ConnectionClosedOK, ConnectionClosedError) as e:
            disconnected_client_id = client_id # Use the last known ID (actual or temp)
            logger.info(f"Client {disconnected_client_id} disconnected ({type(e).__name__}). Server: {self.serverId}")
        except Exception as e:
            error_client_id = client_id # Use the last known ID
            logger.error(f"Error in connection handler for client {error_client_id}: {e}", exc_info=True)
        finally:
            # 4. Cleanup Connection
            final_client_id = client_id # Use the last known ID (actual or temp)
            logger.info(f"Cleaning up connection for client {final_client_id}")

            # Unsubscribe from message service
            if self.messageService and final_client_id:
                try:
                    await self.messageService.unsubscribe_client_from_all(final_client_id)
                except Exception as e:
                    logger.error(f"Error unsubscribing client {final_client_id}: {e}")

            # Remove from local connections
            self.localConnections.pop(final_client_id, None)
            self.localConnections.pop(temp_client_id, None)  # Clean up temp ID if still exists

            # Remove connection state
            if final_client_id in self.connectionState:
                connection_info = self.connectionState.pop(final_client_id)
                
                # If this was a host disconnecting, notify players
                if connection_info.get("isHost") and connection_info.get("gameId"):
                    try:
                        game_id = connection_info["gameId"]
                        broadcast_channel = f"game:{game_id}:broadcast"
                        disconnect_message = {
                            "action": "gameEnded",
                            "reason": "Host disconnected",
                            "senderId": "server"
                        }
                        await self.messageService.publish_raw(broadcast_channel, json.dumps(disconnect_message))
                        logger.info(f"Notified players that host {final_client_id} disconnected from game {game_id}")
                    except Exception as e:
                        logger.error(f"Error notifying players of host disconnect: {e}")

            logger.info(f"Connection cleanup completed for client {final_client_id}")

    # --- Helper Methods --- #

    async def sendToClient(self, client_id, message, websocket=None):
        """
        Send a message to a specific client.
        
        Args:
            client_id: ID of the client to send to
            message: Message dict to send (will be JSON encoded)
            websocket: Optional specific websocket to use (for temp connections)
        """
        try:
            # Use provided websocket or look up from connections
            target_ws = websocket or self.localConnections.get(client_id)
            
            if target_ws:
                # Check if websocket is still open using proper attribute
                try:
                    if hasattr(target_ws, 'close_code') and target_ws.close_code is not None:
                        # Connection is closed
                        logger.warning(f"Cannot send message to client {client_id}: connection is closed")
                        return
                    
                    message_str = json.dumps(message)
                    await target_ws.send(message_str)
                    logger.debug(f"Sent message to client {client_id}: {message.get('action', 'unknown')}")
                except websockets.exceptions.ConnectionClosed:
                    logger.warning(f"Cannot send message to client {client_id}: connection closed during send")
                    # Remove the client from our connections if send failed
                    self.localConnections.pop(client_id, None)
            else:
                logger.warning(f"Cannot send message to client {client_id}: connection not found")
                
        except Exception as e:
            logger.error(f"Error sending message to client {client_id}: {e}")
            # Remove the client from our connections if send failed
            self.localConnections.pop(client_id, None)
