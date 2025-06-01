import json
import uuid
import logging
import asyncio
import time
import websockets
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from websockets.connection import State

# Removed LobbyService and QuestionService imports
# from backend.LobbyService.LobbyService import LobbyService
from MessageService.MessageService import MessageService
# from backend.QuestionService.QuestionService import QuestionService

logger = logging.getLogger(__name__)

class ConnectionService:
    '''
    Handles WebSocket connections and message relaying via MessageService (Redis Pub/Sub).
    Manages client connections *local to this server instance*.
    Acts as a pure relay, interpreting only minimal actions like 'identify'.

    Responsibilities:
    - Manage WebSocket connection lifecycle (connect, disconnect).
    - Assign temporary IDs until client identification.
    - Handle client identification and subscribe to appropriate Pub/Sub channels.
    - Relay subsequent messages to Pub/Sub channels (broadcast or to_host).
    - Handle disconnection cleanup (unsubscribe from Pub/Sub).
    '''
    def __init__(self):
        # Remove dependencies on LobbyService and QuestionService
        self.redis = None # Keep if direct Redis needed, but plan aims to minimize
        # self.lobbyService = None
        self.messageService: MessageService = None # Injected by MultiplayerServer
        # self.questionService = None

        # Stores websockets for clients connected to THIS server instance
        self.localConnections = {} # {clientId: websocket}
        # Store basic state associated with the *local connection*
        # This is NOT the authoritative game state, just info needed for routing
        self.connectionState = {} # {clientId: {"gameId": str, "isHost": bool}}

        # Generate a unique ID for this server instance
        self.serverId = str(uuid.getnode())[-8:]

        logger.info(f"Simplified ConnectionService initialized with server ID {self.serverId}")

    async def start(self):
        """Start simplified ConnectionService."""
        # Remove checks for LobbyService
        # if not self.lobbyService:
        #     logger.error("LobbyService not set in ConnectionService!")
        #     raise ValueError("LobbyService is required")
        if not self.messageService:
            logger.error("MessageService not set in ConnectionService!")
            raise ValueError("MessageService is required")

        logger.info("Simplified ConnectionService started")
        return self

    # Stop method might be needed later for graceful resource cleanup
    # async def stop(self):
    #     logger.info("Simplified ConnectionService stopped")
    #     pass

    async def handleConnection(self, websocket):
        """
        Handle a new WebSocket connection: identify and relay messages.
        """
        # 1. Assign temporary ID and store connection
        temp_client_id = f"temp_{uuid.uuid4()}"
        self.localConnections[temp_client_id] = websocket

        # State variables for this specific connection handler instance
        client_id = temp_client_id
        game_id = None
        is_host = None # Role is unknown until identified
        is_identified = False

        logger.info(f"Client connected with temporary ID {temp_client_id}. Waiting for identification.")

        try:
            # 2. Process messages: Identify first, then relay
            async for message in websocket:
                try:
                    data = json.loads(message)
                    action = data.get("action")

                    # --- Simplified Message Handling --- #

                    # A. Handle Identification
                    if action == "identify" and not is_identified:
                        identified_client_id = data.get("clientId")
                        identified_game_id = data.get("gameId")
                        identified_role = data.get("role") # Expecting "host" or "player"

                        if not identified_client_id or not identified_game_id or identified_role not in ["host", "player"]:
                            logger.warning(f"Invalid identify message from {temp_client_id}: {data}")
                            await self.sendToClient(temp_client_id, {"action": "error", "message": "Invalid identification data."}, websocket)
                            continue # Keep listening for a valid identify

                        logger.info(f"Identifying connection {temp_client_id} as client {identified_client_id} for game {identified_game_id} with role {identified_role}")

                        # --- Update Connection State --- #
                        client_id = identified_client_id
                        game_id = identified_game_id
                        is_host = (identified_role == "host")
                        is_identified = True

                        # Re-associate websocket with the correct client_id
                        # Remove temp ID entry first
                        self.localConnections.pop(temp_client_id, None)
                        # Close any existing connection for this actual client_id (e.g., reconnect)
                        if client_id in self.localConnections:
                            logger.warning(f"Closing existing connection for identified client {client_id}")
                            existing_ws = self.localConnections.pop(client_id, None)
                            if existing_ws and existing_ws != websocket and not existing_ws.closed:
                                asyncio.create_task(existing_ws.close(1008, "Replaced by new connection"))
                        # Store the new websocket under the actual client ID
                        self.localConnections[client_id] = websocket
                        # Store basic routing info
                        self.connectionState[client_id] = {"gameId": game_id, "isHost": is_host}

                        # --- Subscribe to Pub/Sub Channels --- #
                        broadcast_channel = f"game:{game_id}:broadcast"
                        await self.messageService.subscribe_client(client_id, broadcast_channel, websocket)
                        if is_host:
                            host_channel = f"game:{game_id}:to_host"
                            await self.messageService.subscribe_client(client_id, host_channel, websocket)

                        # --- Acknowledge Identification --- #
                        await self.sendToClient(client_id, {"action": "identified", "success": True}, websocket)
                        logger.info(f"Client {client_id} successfully identified and subscribed to channels for game {game_id}.")

                        # --- Notify Host (if applicable) --- #
                        # The plan relies on the client sending a separate message
                        # (e.g., joinGame event) *after* identifying, which gets relayed.
                        # This keeps the server simpler.
                        # Alternatively, we could publish playerJoined here, but let's stick to the plan.

                    # B. Handle Unidentified Client Messages
                    elif not is_identified:
                        logger.warning(f"Received action '{action}' from unidentified client {temp_client_id}. Ignoring until identified.")
                        # Optionally send an error message
                        await self.sendToClient(temp_client_id, {"action": "error", "message": "Please identify first."}, websocket)
                        continue

                    # C. Handle Identified Client Messages (Relay)
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

                    # --- Removed all game-specific action handlers --- #
                    # (initializeGame, joinGame, reconnect [replaced by identify], startGame,
                    #  submitAnswer, questionResult, nextQuestion, gameFinished,
                    #  finishGame, resolveTie, leaveGame [handled by client message relay])

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
            # Note: Game ending logic (if host disconnects) is now implicitly
            # handled by the host client NOT sending heartbeats or the server detecting
            # the disconnect and broadcasting gameEnded (see finally block).
            # Player disconnects are handled by the host receiving playerLeft messages.
        except Exception as e:
            error_client_id = client_id # Use the last known ID
            logger.error(f"Error in connection handler for client {error_client_id}: {e}", exc_info=True)
        finally:
            # 4. Cleanup Connection
            final_client_id = client_id # Use the actual client_id if identified, otherwise temp_id
            logger.info(f"Cleaning up connection for client {final_client_id}. Server: {self.serverId}")

            # Remove from local tracking
            self.localConnections.pop(final_client_id, None)
            self.connectionState.pop(final_client_id, None)
            # Ensure temp ID is also removed if identification never happened
            if final_client_id == temp_client_id:
                 self.localConnections.pop(temp_client_id, None)

            # Unsubscribe the client (actual or temp) from all Pub/Sub channels
            await self.messageService.unsubscribe_client_from_all(final_client_id)

            # --- Server-Side Host Disconnect Handling --- #
            # If the disconnected client was identified as a host for a game,
            # the server should broadcast a generic GameEnded message.
            # This is the server's *only* remaining game-state-related action.
            if is_identified and is_host and game_id:
                logger.warning(f"Host {final_client_id} for game {game_id} disconnected. Broadcasting GameEnded.")
                game_ended_channel = f"game:{game_id}:broadcast"
                try:
                    await self.messageService.publish_raw(game_ended_channel, json.dumps({
                        "action": "gameEnded",
                        "reason": "Host disconnected",
                        "gameId": game_id
                    }))
                    logger.info(f"Broadcasted gameEnded for game {game_id} due to host disconnection.")
                    # Note: Lobby deletion is now handled by the host client or potentially TTLs/API cleanup
                except Exception as pub_e:
                    logger.error(f"Failed to publish gameEnded for game {game_id} after host disconnect: {pub_e}")
            # --- End Server-Side Host Disconnect --- #
            # Note: Player disconnects are implicitly handled by the host client no longer receiving messages / receiving playerLeft.

            logger.info(f"Finished cleanup for client {final_client_id}.")

    # --- Helper Methods --- #

    async def sendToClient(self, client_id, message, websocket=None):
        """Send a JSON message to a specific client connected to this server instance."""
        # Find the WebSocket connection using the provided client_id
        ws = websocket or self.localConnections.get(client_id)
        if ws and ws.state == State.OPEN:
            try:
                await ws.send(json.dumps(message))
                # logger.debug(f"Sent to {client_id}: {message}")
            except Exception as e:
                logger.error(f"Failed to send message to client {client_id}: {e}")
                # Consider removing connection if send fails persistently
                # self.localConnections.pop(client_id, None)
                # self.connectionState.pop(client_id, None)
                # await self.messageService.unsubscribe_client_from_all(client_id)
        else:
            # logger.warning(f"Attempted to send message to disconnected or unknown client {client_id}")
            pass
