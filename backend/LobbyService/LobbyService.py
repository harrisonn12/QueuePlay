import uuid
import logging
import time
from typing import Union, Set
from LobbyService.src.QRCodeGenerator import QRCodeGenerator
from commons.adapters.RedisAdapter import RedisAdapter
from configuration.RedisConfig import RedisKeyPrefix

logger = logging.getLogger(__name__)

# Use same value for both TTL constants
LOBBY_TTL = 15 * 60 # Expire the lobby after 15 minutes of inactivity if delete_lobby() does not run properly.
CLIENT_GAME_TTL = LOBBY_TTL  # Used if disconnections aren't handled properly with remove_player_from_lobby()

class LobbyService:
    """
    Service for managing lobbies using Redis.
    """
    def __init__(self, qrCodeGenerator: QRCodeGenerator, redis_adapter: RedisAdapter):
        self.qrCodeGenerator = qrCodeGenerator
        self.redis: RedisAdapter = redis_adapter
        logger.info("LobbyService initialized with RedisAdapter.")

    def _get_lobby_key(self, game_id: str) -> str:
        return f"{RedisKeyPrefix.GAME.value}:{game_id}"

    def _get_lobby_players_key(self, game_id: str) -> str:
        return f"{RedisKeyPrefix.GAME.value}:{game_id}:players"

    def _get_client_game_key(self, client_id: str) -> str:
        return f"{RedisKeyPrefix.PLAYER.value}:{client_id}:game"

    async def create_lobby(self, host_id: str, game_type: str) -> Union[dict, None]:
        """Creates a new lobby in Redis, adds the host, and returns lobby details."""
        game_id = str(uuid.uuid4())
        lobby_key = self._get_lobby_key(game_id)
        players_key = self._get_lobby_players_key(game_id)
        client_game_key = self._get_client_game_key(host_id)
        created_at = int(time.time())

        try:
            # Use a pipeline for atomicity
            pipe = await self.redis.pipeline(transaction=True)
            async with pipe:
                pipe.hmset(lobby_key, {
                    "gameId": game_id,
                    "hostId": host_id,
                    "gameType": game_type,
                    "createdAt": created_at
                })
                pipe.expire(lobby_key, LOBBY_TTL)
                pipe.sadd(players_key, host_id)
                pipe.expire(players_key, LOBBY_TTL)
                # Map client to this game
                pipe.set(client_game_key, game_id, ex=CLIENT_GAME_TTL)
                results = await pipe.execute()

            # Check results (hmset returns bool in some clients, status in others)
            if not all(results):
                 logger.error(f"Failed to fully create lobby {game_id} in Redis pipeline.")
                 # Attempt cleanup (best effort)
                 await self.redis.delete(lobby_key, players_key, client_game_key)
                 return None

            # Removed QR Code generation from create_lobby
            # qr_code_data = self.generateLobbyQRCode(game_id)
            logger.info(f"Lobby {game_id} created by host {host_id}")
            return {
                "gameId": game_id,
                "hostId": host_id
                # Removed qrCodeData
                # "qrCodeData": qr_code_data
            }
        except Exception as e:
            logger.error(f"Error creating lobby for host {host_id}: {e}", exc_info=True)
            # Attempt cleanup on error
            await self.redis.delete(lobby_key, players_key, client_game_key)
            return None

# REMOVED: Redundant method - functionality moved to add_player_to_lobby()

    async def get_lobby_info(self, game_id: str) -> Union[dict, None]:
        """Retrieves basic lobby information (hostId, etc.)."""
        lobby_key = self._get_lobby_key(game_id)
        try:
            info = await self.redis.hgetall(lobby_key)
            # aioredis returns bytes by default unless decode_responses=True
            # Adapter handles decoding based on its config, so remove .decode()
            return info if info else None
        except Exception as e:
            logger.error(f"Error getting lobby info for {game_id}: {e}", exc_info=True)
            return None

    async def get_lobby_players(self, game_id: str) -> Set[str]:
        """Retrieves the set of player IDs in a lobby."""
        players_key = self._get_lobby_players_key(game_id)
        try:
            players = await self.redis.smembers(players_key)
            # Returns set of strings because RedisAdapter uses decode_responses=True
            return players if players else set()
        except Exception as e:
            logger.error(f"Error getting lobby players for {game_id}: {e}", exc_info=True)
            return set()

    async def get_client_game_id(self, client_id: str) -> Union[str, None]:
        """Finds which game_id a specific client_id is associated with."""
        client_game_key = self._get_client_game_key(client_id)
        try:
            game_id_bytes = await self.redis.get(client_game_key)
            return game_id_bytes.decode() if game_id_bytes else None
        except Exception as e:
            logger.error(f"Error getting game ID for client {client_id}: {e}", exc_info=True)
            return None

# REMOVED: Redundant method - functionality moved to enhanced remove_player_from_lobby() below

    async def delete_lobby(self, game_id: str):
        """Deletes all Redis keys associated with a lobby."""
        lobby_key = self._get_lobby_key(game_id)
        players_key = self._get_lobby_players_key(game_id)
        # We also need to remove the client->game mapping for all players in the lobby
        players = await self.get_lobby_players(game_id)
        client_keys_to_delete = [self._get_client_game_key(pid) for pid in players]

        keys_to_delete = [lobby_key, players_key] + client_keys_to_delete
        if not keys_to_delete:
             return

        try:
            deleted_count = await self.redis.delete(*keys_to_delete)
            logger.info(f"Deleted lobby {game_id} and associated keys (Count: {deleted_count})")
        except Exception as e:
            logger.error(f"Error deleting lobby {game_id}: {e}", exc_info=True)

    def generateLobbyQRCode(self, gameSessionId: str) -> str:
        return self.qrCodeGenerator.generate(gameSessionId)

    async def lobby_exists(self, game_id: str) -> bool:
        """Check if a lobby exists."""
        lobby_key = self._get_lobby_key(game_id)
        try:
            exists = await self.redis.exists(lobby_key)
            return bool(exists)
        except Exception as e:
            logger.error(f"Error checking if lobby {game_id} exists: {e}", exc_info=True)
            return False

    async def add_player_to_lobby(self, game_id: str, player_id: str, player_name: str, phone_number: str = None) -> Union[dict, None]:
        """Add a player to a lobby with their details. Replaces old join_lobby() method."""
        players_key = self._get_lobby_players_key(game_id)
        client_game_key = self._get_client_game_key(player_id)
        player_details_key = f"{RedisKeyPrefix.PLAYER.value}:{player_id}:details"
        
        try:
            # Check if lobby exists first and get lobby info
            lobby_info = await self.get_lobby_info(game_id)
            if not lobby_info:
                logger.warning(f"Attempt to add player {player_id} to non-existent lobby {game_id}")
                return None
            
            host_id = lobby_info.get("hostId")

            # Store player details and add to lobby
            pipe = await self.redis.pipeline(transaction=True)
            async with pipe:
                # Add player to lobby's player set
                pipe.sadd(players_key, player_id)
                pipe.expire(players_key, LOBBY_TTL)
                
                # Store player details
                player_details = {
                    "player_id": player_id,
                    "player_name": player_name,
                    "game_id": game_id,
                    "joined_at": int(time.time())
                }
                if phone_number:
                    player_details["phone_number"] = phone_number
                
                pipe.hmset(player_details_key, player_details)
                pipe.expire(player_details_key, LOBBY_TTL)
                
                # Map client to this game
                pipe.set(client_game_key, game_id, ex=CLIENT_GAME_TTL)
                
                # Refresh lobby TTL on activity
                lobby_key = self._get_lobby_key(game_id)
                pipe.expire(lobby_key, LOBBY_TTL)
                
                results = await pipe.execute()

            if not results[0]: # sadd returns number of elements added (0 if already member)
                logger.info(f"Player {player_id} was already in lobby {game_id}")
            else:
                logger.info(f"Added player {player_id} ({player_name}) to lobby {game_id}")
            
            return {
                "gameId": game_id,
                "hostId": host_id  # Return hostId to the joining player
            }

        except Exception as e:
            logger.error(f"Error adding player {player_id} to lobby {game_id}: {e}", exc_info=True)
            return None

    async def remove_player_from_lobby(self, game_id: str, player_id: str) -> bool:
        """Remove a player from the lobby and clean up their details."""
        players_key = self._get_lobby_players_key(game_id)
        client_game_key = self._get_client_game_key(player_id)
        player_details_key = f"{RedisKeyPrefix.PLAYER.value}:{player_id}:details"
        
        try:
            pipe = await self.redis.pipeline(transaction=True)
            async with pipe:
                pipe.srem(players_key, player_id)  # Remove from game player set
                pipe.delete(client_game_key)  # Remove client's game mapping
                pipe.delete(player_details_key)  # Remove player details
                results = await pipe.execute()
            
            logger.info(f"Removed player {player_id} from lobby {game_id} (Removed from set: {results[0] > 0})")
            return True  # Indicate success even if player wasn't in set (idempotent)
            
        except Exception as e:
            logger.error(f"Error removing player {player_id} from lobby {game_id}: {e}", exc_info=True)
            return False
