import json
import uuid
import logging
import asyncio
import time
import websockets
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from websockets.server import WebSocketServerProtocol

# Removed GameService import
# from backend.GameService.GameService import GameService
from backend.LobbyService.LobbyService import LobbyService # Added
from backend.MessageService.MessageService import MessageService
# Removed RedisConfig imports
# from backend.configuration.RedisConfig import RedisConfig, RedisKeyPrefix, RedisChannelPrefix
from backend.commons.enums.Stage import Stage
# ***** ADDED: Import QuestionService *****
from backend.QuestionService.QuestionService import QuestionService

logger = logging.getLogger(__name__)

class ConnectionService:
    '''
    Handles WebSocket connections and message relaying using Redis-backed LobbyService.
    Manages client connections *local to this server instance*.
    Uses MessageService (Redis Pub/Sub) for broadcasting and relaying.
    '''
    def __init__(self):
        # Redis adapter might not be needed directly here anymore if all ops go via other services
        self.redis = None # Or remove if truly unused
        # GameService reference removed
        # self.gameService: GameService = None
        # LobbyService reference added
        self.lobbyService: LobbyService = None
        # MessageService will be set by the server
        self.messageService: MessageService = None
        # ***** ADDED: Initialize questionService attribute *****
        self.questionService: QuestionService = None 

        # --- Local Connection State ONLY ---
        # Stores websockets for clients connected to THIS server instance
        self.localConnections = {} # {clientId: websocket}
        # Stores lobby info - REMOVED (Managed by LobbyService in Redis)
        # self.lobbies = {}
        # Maps clients to gameId - REMOVED (Managed by LobbyService in Redis)
        # self.client_to_game = {}
        # --- End Local State ---

        # Server ID remains useful for logging
        self.serverId = str(uuid.getnode())[-8:]

        logger.info(f"ConnectionService initialized with server ID {self.serverId} (Redis Lobby Mode)")

    async def start(self):
        """Initialize ConnectionService."""
        if not self.lobbyService:
            logger.error("LobbyService not set in ConnectionService!")
            raise ValueError("LobbyService is required")
        if not self.messageService:
            logger.error("MessageService not set in ConnectionService!")
            raise ValueError("MessageService is required")

        logger.info("ConnectionService started (Redis Lobby Mode)")
        return self

    async def stop(self):
        """Stop ConnectionService."""
        logger.info("ConnectionService stopped (Redis Lobby Mode)")

    async def handleConnection(self, websocket):
        """Handle a new WebSocket connection and subsequent messages."""
        # Assign temporary ID until client identifies itself (e.g., via reconnect or initial action)
        temp_client_id = f"temp_{uuid.uuid4()}"
        self.localConnections[temp_client_id] = websocket
        client_id = temp_client_id # Actual ID determined later
        game_id = None # Game ID determined later
        is_host = False # Is this client the host of the game?

        logger.info(f"Client connected with temporary ID {temp_client_id} to server {self.serverId}")

        try:
            # Send the client their temporary ID - Or wait for first message?
            # Maybe better to wait for client action like join/host/reconnect
            # await websocket.send(json.dumps({
            #     "action": "assignedId",
            #     "clientId": temp_client_id
            # }))

            async for message in websocket:
                try:
                    data = json.loads(message)
                    action = data.get("action")
                    sender_client_id = client_id # Use the currently known ID for this connection

                    # --- Host-Centric Relay & Lobby Logic (Using LobbyService) ---

                    if action == "initializeGame":
                        # Ensure client isn't already associated with a game
                        if game_id:
                            await self.sendToClient(sender_client_id, {"action": "error", "message": f"Already in game {game_id}. Cannot initialize another."}, websocket)
                            continue

                        gameType = data.get("gameType", "trivia")
                        # Use temporary ID as the initial host ID
                        lobby_details = await self.lobbyService.create_lobby(sender_client_id, gameType)

                        if lobby_details:
                            game_id = lobby_details["gameId"]
                            # Client is confirmed as host
                            is_host = True
                            client_id = sender_client_id
                            await self.sendToClient(sender_client_id, {
                                "action": "lobbyInitialized",
                                "gameId": game_id,
                                "clientId": sender_client_id, # Confirm their ID
                                "role": "host",
                                "qrCodeData": lobby_details["qrCodeData"]
                            }, websocket)
                            logger.info(f"Lobby {game_id} initialized by host {sender_client_id} on server {self.serverId}")
                            # Publish event (optional, LobbyService could also do this)
                            await self.messageService.publish_event("lobby:created", lobby_details)
                            # Subscribe host to messages directed specifically at them
                            host_channel = f"game:{game_id}:to_host"
                            await self.messageService.subscribe_client(sender_client_id, host_channel, websocket)
                            
                            # ***** ADDED: Subscribe host to broadcast messages as well *****
                            broadcast_channel = f"game:{game_id}:broadcast"
                            await self.messageService.subscribe_client(sender_client_id, broadcast_channel, websocket)
                        else:
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "Failed to initialize lobby"}, websocket)

                    elif action == "joinGame":
                         # Ensure client isn't already associated with a game
                        if game_id:
                            await self.sendToClient(sender_client_id, {"action": "error", "message": f"Already in game {game_id}. Cannot join another."}, websocket)
                            continue

                        join_game_id = data.get("gameId")
                        player_name = data.get("playerName", f"Player {sender_client_id[:4]}") # Default if missing

                        if not join_game_id:
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "gameId missing for joinGame"}, websocket)
                            continue

                        join_result = await self.lobbyService.join_lobby(sender_client_id, join_game_id)

                        if join_result:
                            game_id = join_result["gameId"]
                            host_id = join_result["hostId"]
                            is_host = False # This client is a player
                            client_id = sender_client_id

                            # Notify host (via Pub/Sub)
                            host_notification_channel = f"game:{game_id}:to_host"
                            await self.messageService.publish_raw(host_notification_channel, json.dumps({
                                "action": "playerJoined",
                                "clientId": sender_client_id,
                                "gameId": game_id,
                                "playerName": player_name
                            }))

                            # Confirm join to player
                            await self.sendToClient(sender_client_id, {
                                "action": "joinedLobby", 
                                "gameId": game_id, 
                                "hostId": host_id, 
                                "clientId": sender_client_id,
                                "playerName": player_name # Confirm name back
                            }, websocket)
                            logger.info(f"Player {sender_client_id} ({player_name}) joined lobby {game_id} on server {self.serverId}")
                            # Subscribe player to broadcast messages for this game
                            broadcast_channel = f"game:{game_id}:broadcast"
                            await self.messageService.subscribe_client(sender_client_id, broadcast_channel, websocket)
                        else:
                            logger.warning(f"Join failed for client {sender_client_id} to game {join_game_id}")
                            await self.sendToClient(sender_client_id, {"action": "error", "message": f"Failed to join lobby {join_game_id}. It may not exist or be joinable."}, websocket)

                    elif action == "reconnect":
                        reconnect_client_id = data.get("clientId")
                        reconnect_game_id = data.get("gameId")
                        reconnect_player_name_attempt = data.get("playerName") 

                        if not reconnect_client_id or not reconnect_game_id:
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "Missing clientId or gameId for reconnection"}, websocket)
                            continue

                        logger.info(f"Client {reconnect_client_id} attempting reconnect for game {reconnect_game_id}")

                        # Validate reconnection against Redis state
                        actual_game_id = await self.lobbyService.get_client_game_id(reconnect_client_id)
                        lobby_info = await self.lobbyService.get_lobby_info(reconnect_game_id)

                        player_name_on_reconnect = reconnect_player_name_attempt or f"Player {reconnect_client_id[:4]}"

                        if actual_game_id == reconnect_game_id and lobby_info:
                            host_id = lobby_info.get("hostId")
                            # Re-associate websocket with the correct clientId
                            if reconnect_client_id != temp_client_id:
                                logger.info(f"Re-associating connection from {temp_client_id} to {reconnect_client_id}")
                                # Remove temp ID entry
                                old_ws = self.localConnections.pop(temp_client_id, None)
                                # If the actual clientId is already connected (duplicate tab?), close the old one.
                                if reconnect_client_id in self.localConnections:
                                    logger.warning(f"Closing existing connection for reconnecting client {reconnect_client_id}")
                                    existing_ws = self.localConnections.pop(reconnect_client_id, None)
                                    if existing_ws and existing_ws != websocket and existing_ws.open:
                                        asyncio.create_task(existing_ws.close(1008, "Replaced by new connection"))

                                client_id = reconnect_client_id # Use the correct ID going forward
                                self.localConnections[client_id] = websocket
                            else:
                                # Temp ID was correct or already updated
                                client_id = reconnect_client_id

                            game_id = reconnect_game_id
                            is_host = (client_id == host_id)

                            await self.sendToClient(client_id, {
                                "action": "reconnected",
                                "gameId": game_id,
                                "clientId": client_id,
                                "hostId": host_id,
                                "role": "host" if is_host else "player",
                                "playerName": player_name_on_reconnect 
                            }, websocket)

                            # Notify host if a player reconnected (via Pub/Sub)
                            if not is_host:
                                host_notification_channel = f"game:{game_id}:to_host"
                                await self.messageService.publish_raw(host_notification_channel, json.dumps({
                                    "action": "playerReconnected",
                                    "clientId": client_id,
                                    "gameId": game_id,
                                    "playerName": player_name_on_reconnect 
                                }))
                            logger.info(f"Client {client_id} ({player_name_on_reconnect}) successfully reconnected to lobby {game_id} on server {self.serverId}")
                            # Subscribe client to appropriate channel based on role
                            await self.messageService.subscribe_client(client_id, f"game:{game_id}:broadcast", websocket)
                            if is_host:
                                await self.messageService.subscribe_client(client_id, f"game:{game_id}:to_host", websocket)
                        else:
                            logger.warning(f"Reconnect failed for {reconnect_client_id} to game {reconnect_game_id}: Game ID mismatch or lobby not found.")
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "Reconnect failed. Invalid game or client ID."}, websocket)

                    elif action == "startGame":
                        # Ensure client is associated with a game and is the host
                        if not game_id:
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "Must be in a game to start it."}, websocket)
                            continue
                        if not is_host:
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "Only the host can start the game."}, websocket)
                            continue

                        logger.info(f"Host {sender_client_id} requested to start game {game_id}")
                        
                        # --- Use QuestionService to get questions and start game --- 
                        try:
                            if not self.questionService:
                                logger.error(f"QuestionService not available in ConnectionService.")
                                raise ValueError("QuestionService not configured")
                            
                            # Get the dictionary containing topic and questions list
                            question_data = self.questionService.getQuestionAnswerSet(numQuestions=10) 
                            
                            # Validate the structure and extract the list
                            if not question_data or not isinstance(question_data.get("questions"), list):
                                logger.error(f"Invalid or missing questions data received for game {game_id}. Data: {question_data}")
                                await self.sendToClient(sender_client_id, {"action": "error", "message": "Server error: Could not retrieve valid questions data."}, websocket)
                                continue
                            
                            questions_list = question_data["questions"]
                            
                            if not questions_list:
                                logger.error(f"Empty questions list received for game {game_id}.")
                                await self.sendToClient(sender_client_id, {"action": "error", "message": "Server error: No questions found for the game."}, websocket)
                                continue
                                
                            # Broadcast 'gameStarted' with the actual questions list
                            broadcast_channel = f"game:{game_id}:broadcast"
                            await self.messageService.publish_raw(broadcast_channel, json.dumps({
                                "action": "gameStarted",
                                "gameId": game_id,
                                "questions": questions_list # Send the list
                            }))
                            logger.info(f"Game {game_id} started with {len(questions_list)} questions, broadcast sent.")

                        except ValueError as e: # Catch specific config error
                             logger.error(f"Configuration error starting game {game_id}: {e}")
                             await self.sendToClient(sender_client_id, {"action": "error", "message": f"Server error: {e}"}, websocket)
                        except Exception as e:
                            logger.error(f"Error starting game {game_id} or getting questions: {e}", exc_info=True)
                            await self.sendToClient(sender_client_id, {"action": "error", "message": f"Server error: Could not start game ({type(e).__name__})."}, websocket)
                            
                    elif action == "submitAnswer":
                        # Player is submitting an answer
                        if not game_id:
                            logger.warning(f"submitAnswer received from client {sender_client_id} not in a game.")
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "You are not in a game."}, websocket)
                            continue
                        if is_host:
                             logger.warning(f"Host {sender_client_id} tried to submit an answer for game {game_id}.")
                             # Optionally send error? Or just ignore.
                             continue

                        # Relay answer directly to the host
                        target_channel = f"game:{game_id}:to_host"
                        logger.debug(f"Relaying submitAnswer from player {sender_client_id} to host of game {game_id}")
                        data_to_publish = data.copy()
                        data_to_publish["senderId"] = sender_client_id # Ensure senderId is present
                        await self.messageService.publish_raw(target_channel, json.dumps(data_to_publish))

                    elif action == "questionResult" or action == "nextQuestion" or action == "gameFinished":
                        # Host is broadcasting state updates
                        if not game_id:
                            logger.warning(f"'{action}' received from client {sender_client_id} not in a game.")
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "You are not in a game."}, websocket)
                            continue
                        if not is_host:
                             logger.warning(f"Player {sender_client_id} tried to send host action '{action}' for game {game_id}.")
                             # Optionally send error? Or just ignore.
                             continue

                        # Broadcast the host's message to all players
                        target_channel = f"game:{game_id}:broadcast"
                        logger.debug(f"Host {sender_client_id} broadcasting '{action}' to game {game_id}")
                        data_to_publish = data.copy()
                        data_to_publish["senderId"] = sender_client_id # Ensure senderId is present
                        await self.messageService.publish_raw(target_channel, json.dumps(data_to_publish))

                    elif action == "finishGame": # Host manually ends game
                        if not game_id or not is_host:
                            logger.warning(f"Non-host {sender_client_id} or client not in game sent finishGame for game {game_id}")
                            continue

                        logger.info(f"Host {sender_client_id} requested finishGame for game {game_id}. Broadcasting gameFinished.")

                        # Host signals end, broadcast gameFinished
                        # Note: Host client should calculate final scores and include them in the message it sends.
                        broadcast_channel = f"game:{game_id}:broadcast"
                        data_to_publish = data.copy()
                        data_to_publish["senderId"] = sender_client_id
                        # Ensure the action is 'gameFinished'
                        data_to_publish["action"] = "gameFinished"
                        # The host *should* have included finalScores in the original 'finishGame' message data
                        if "finalScores" not in data_to_publish:
                             logger.warning(f"finishGame message from host {sender_client_id} for game {game_id} missing finalScores.")
                             data_to_publish["finalScores"] = {} # Add empty scores if missing

                        await self.messageService.publish_raw(broadcast_channel, json.dumps(data_to_publish))
                        logger.info(f"Broadcasted gameFinished for game {game_id} due to host request.")
                        # Optionally clean up lobby state
                        await self.lobbyService.delete_lobby(game_id)

                    # --- ADDED: Handle Tie Resolution Request from Host --- 
                    elif action == "resolveTie":
                        if not game_id or not is_host:
                            logger.warning(f"Non-host {sender_client_id} or client not in game sent resolveTie for game {game_id}")
                            continue # Ignore if not host
                        
                        ultimate_winner_id = data.get("ultimateWinnerId")
                        if not ultimate_winner_id:
                            logger.warning(f"resolveTie message from host {sender_client_id} for game {game_id} missing ultimateWinnerId.")
                            await self.sendToClient(sender_client_id, {"action": "error", "message": "Missing winner ID in resolveTie request."}, websocket)
                            continue
                            
                        logger.info(f"Host {sender_client_id} resolved tie for game {game_id}. Winner: {ultimate_winner_id}")
                        
                        # Broadcast the resolution to all clients
                        broadcast_channel = f"game:{game_id}:broadcast"
                        await self.messageService.publish_raw(broadcast_channel, json.dumps({
                            "action": "tieResolved",
                            "gameId": game_id,
                            "ultimateWinnerId": ultimate_winner_id
                        }))
                        logger.info(f"Broadcasted tieResolved for game {game_id}.")

                    # --- Catch-all for other actions before client joins/hosts ---
                    elif not game_id:
                         logger.warning(f"Received action '{action}' from client {sender_client_id} before joining/hosting a game.")
                         await self.sendToClient(sender_client_id, {"action": "error", "message": "Please join or host a game first."}, websocket)

                    # --- Default Relay Logic (if action wasn't handled above and client is in game) ---
                    # This might catch custom game actions.
                    else:
                        # Generic relay based on role, ensure senderId is added
                        target_channel = None
                        data_to_publish = data.copy()
                        data_to_publish["senderId"] = sender_client_id # Add sender context
                        message_to_publish = json.dumps(data_to_publish)

                        if is_host:
                            # Message from host: Broadcast to players
                            target_channel = f"game:{game_id}:broadcast"
                            logger.debug(f"Host {sender_client_id} broadcasting generic action '{action}' to {target_channel}")
                            await self.messageService.publish_raw(target_channel, message_to_publish)
                        else:
                            # Message from player: Send to host
                            target_channel = f"game:{game_id}:to_host"
                            logger.debug(f"Player {sender_client_id} sending generic action '{action}' to {target_channel}")
                            await self.messageService.publish_raw(target_channel, message_to_publish)

                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received from client {client_id}")
                    await self.sendToClient(client_id, {"action": "error", "message": "Invalid JSON"}, websocket)
                except Exception as e:
                    logger.error(f"Error processing message from client {client_id}: {e}", exc_info=True)
                    try:
                        await self.sendToClient(client_id, {"action": "error", "message": "Internal server error"}, websocket)
                    except Exception:
                        pass # Websocket might already be closed

        except (ConnectionClosedOK, ConnectionClosedError) as e:
            logger.info(f"Client {client_id} disconnected ({type(e).__name__}). Server: {self.serverId}")
            # Unsubscribe client from all Pub/Sub channels upon disconnection
            await self.messageService.unsubscribe_client_from_all(client_id)
            # Also ensure temp ID is cleaned up if it was never replaced
            if client_id == temp_client_id:
                await self.messageService.unsubscribe_client_from_all(temp_client_id)
            logger.info(f"Finished cleanup for client {client_id}.")
        except Exception as e:
            logger.error(f"Error in connection handler for client {client_id}: {e}", exc_info=True)
        finally:
            logger.info(f"Cleaning up connection for client {client_id}. Server: {self.serverId}")
            # Remove client from local connections
            self.localConnections.pop(client_id, None)
            self.localConnections.pop(temp_client_id, None) # Ensure temp ID is also removed

            # If client was associated with a game, perform cleanup
            if game_id:
                # Check if the disconnected client was the host
                lobby_info = await self.lobbyService.get_lobby_info(game_id)
                if lobby_info and lobby_info.get("hostId") == client_id:
                    logger.warning(f"Host {client_id} for game {game_id} disconnected. Ending game.")
                    # Broadcast game ended message to all players in the lobby
                    game_ended_channel = f"game:{game_id}:broadcast"
                    await self.messageService.publish_raw(game_ended_channel, json.dumps({
                        "action": "gameEnded",
                        "reason": "Host disconnected",
                        "gameId": game_id
                    }))
                    # Delete the lobby state from Redis
                    await self.lobbyService.delete_lobby(game_id)
                    logger.info(f"Deleted lobby {game_id} due to host disconnection.")
                else:
                    # Client was a player, just remove them from the lobby set
                    logger.info(f"Player {client_id} disconnected from game {game_id}. Removing from lobby.")
                    await self.lobbyService.remove_player_from_lobby(client_id, game_id)
                    # Notify host that player left (optional)
                    if lobby_info: # Ensure lobby still exists
                         host_notification_channel = f"game:{game_id}:to_host"
                         await self.messageService.publish_raw(host_notification_channel, json.dumps({
                             "action": "playerLeft",
                             "clientId": client_id,
                             "gameId": game_id
                         }))
            # TODO: Unsubscribe client from Pub/Sub channels in MessageService
            logger.info(f"Finished cleanup for client {client_id}.")

    # --- Helper Methods ---

    # Made sendToClient take websocket as argument since client_id might be temp
    async def sendToClient(self, client_id, message, websocket=None):
        """Send a JSON message to a specific client connected to this server instance."""
        ws = websocket or self.localConnections.get(client_id)
        if ws and ws.open:
            try:
                await ws.send(json.dumps(message))
                # logger.debug(f"Sent to {client_id}: {message}")
            except Exception as e:
                logger.error(f"Failed to send message to client {client_id}: {e}")
                # Mark connection for cleanup if sending fails?
                # self.localConnections.pop(client_id, None)
        else:
            # logger.warning(f"Attempted to send message to disconnected or unknown client {client_id}")
            pass

    # Broadcast method might be less useful now as broadcasting is handled via Pub/Sub
    # async def broadcast(self, clientIds, message):
    #     """Send a message to multiple clients connected to this server instance."""
    #     message_json = json.dumps(message)
    #     tasks = []
    #     for clientId in clientIds:
    #         ws = self.localConnections.get(clientId)
    #         if ws and ws.open:
    #             tasks.append(asyncio.create_task(ws.send(message_json)))
    #         else:
    #             logger.warning(f"Attempted broadcast to disconnected/unknown client {clientId}")
    #     if tasks:
    #         await asyncio.gather(*tasks, return_exceptions=True)

    # handleConnectionEvent removed as ConnectionService no longer directly subscribes to server-wide events
    # async def handleConnectionEvent(self, channel, message):
    #     """Handle messages received on the connection Pub/Sub channel."""
    #     try:
    #         data = json.loads(message)
    #         logger.info(f"Received connection event on {channel}: {data}")
    #         # Add logic here if cross-server connection events are needed
    #     except json.JSONDecodeError:
    #         logger.error(f"Invalid JSON received on connection channel {channel}: {message}")
    #     except Exception as e:
    #         logger.error(f"Error processing connection event: {e}", exc_info=True)

    # handleEcho method removed - Example logic, not core functionality