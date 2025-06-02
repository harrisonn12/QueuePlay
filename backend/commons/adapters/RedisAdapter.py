import redis
from redis.sentinel import Sentinel
import json
import asyncio
import logging
from redis.exceptions import RedisError
from redis.asyncio import Redis, ConnectionPool
from redis.typing import KeyT, EncodableT
from configuration.AppConfig import AppConfig, Stage
import os
from configuration.RedisConfig import RedisConfig
from typing import Any

logger = logging.getLogger(__name__)

class RedisAdapter:
    '''
    wrapper (helper class/function that simplifies another tool/library) to interact with redis.
    organizes all redis operations in a single class.
    customizing the way Redis is used to fit this app's needs.
    Supports both direct Redis connections and Redis Sentinel for high availability.
    Without wrapper:
        Only accept strings (not dicts or lists)
        Don't handle errors
        Don't support custom formats (e.g., prefixing keys like "game:123")
        Don't give you built-in async + sync support in one place


    '''
    def __init__(self, app_config: AppConfig = None, redis_config: RedisConfig = None):
        # Ensure one of the configs is provided
        if app_config is None and redis_config is None:
            raise ValueError("Either app_config or redis_config must be provided")
        
        # If RedisConfig is provided, use it directly
        if redis_config is not None:
            self.use_redis_config = True
            self.redis_config = redis_config
            self.use_sentinel = False
            
            logger.info("Using provided Redis configuration.")
            # Get the Redis URL from environment (used by from_url method)
            self.redis_url = os.environ.get("REDIS_URL")
            if not self.redis_url:
                # Fall back to individual parameters if no URL
                self.config = redis_config.get_connection_params()
            logger.info(f"Initialized Redis adapter for {redis_config.host}:{redis_config.port}/db{redis_config.db}")
        else:
            # Original AppConfig logic
            self.use_redis_config = False
            # Check if we should use Redis Sentinel
            use_sentinel = os.getenv("USE_REDIS_SENTINEL", "false").lower() == "true"

            if use_sentinel:
                # Sentinel configuration
                sentinel_hosts_str = os.getenv("REDIS_SENTINEL_HOSTS", "localhost:26379")
                sentinel_service = os.getenv("REDIS_SENTINEL_SERVICE", "mymaster")

                # Parse comma-separated sentinel hosts
                sentinel_hosts = []
                for host_port in sentinel_hosts_str.split(','):
                    host_port = host_port.strip()
                    if ':' in host_port:
                        host, port = host_port.split(':')
                        sentinel_hosts.append((host.strip(), int(port.strip())))
                    else:
                        sentinel_hosts.append((host_port.strip(), 26379))

                logger.info(f"Using Redis Sentinel configuration with hosts: {sentinel_hosts}")
                logger.info(f"Sentinel service name: {sentinel_service}")

                # Initialize Sentinel
                self.sentinel = Sentinel(sentinel_hosts, socket_timeout=0.1)
                self.sentinel_service = sentinel_service
                self.use_sentinel = True

                # Get current master info
                try:
                    master_info = self.sentinel.discover_master(sentinel_service)
                    logger.info(f"Current Redis master: {master_info[0]}:{master_info[1]}")
                except Exception as e:
                    logger.error(f"Failed to discover Redis master: {e}")
                    raise

            else:
                # Direct Redis connection (original logic)
                self.use_sentinel = False

                # Extract config based on stage
                if app_config.stage == Stage.PROD:
                    host = os.getenv("PROD_REDIS_HOST", "your_prod_redis_host")
                    port = int(os.getenv("PROD_REDIS_PORT", 6379))
                    db = int(os.getenv("PROD_REDIS_DB", 0))
                    password = os.getenv("PROD_REDIS_PASSWORD", None)
                    socket_timeout = 10
                    logger.info("Using Production Redis configuration.")
                else: # Default to Development
                    host = os.getenv("REDIS_HOST", "localhost")
                    port = int(os.getenv("REDIS_PORT", 6379))
                    db = int(os.getenv("REDIS_DB", 0))
                    password = os.getenv("REDIS_PASSWORD", None)
                    socket_timeout = 10
                    logger.info("Using Development Redis configuration.")

                # Use extracted values for self.config
                self.config = {
                    "host": host,
                    "port": port,
                    "db": db,
                    "password": password,
                    "socket_timeout": socket_timeout,
                    "decode_responses": True,
                }

                logger.info(f"Initialized Redis adapter for {host}:{port}/db{db}")

        # Initialize pools and clients
        self.sync_pool = None
        self.async_pool = None
        self._sync_client = None
        self._async_client = None

    @property # lazy initialization, meaning the client is not created until it is needed.
    def sync_client(self):
        if self._sync_client is None:
            try:
                if self.use_sentinel:
                    # Get master connection through Sentinel
                    self._sync_client = self.sentinel.master_for(
                        self.sentinel_service,
                        decode_responses=True,
                        socket_timeout=10
                    )
                    logger.debug("Initialized sync Redis client via Sentinel")
                else:
                    # Direct connection (original logic)
                    if self.sync_pool is None:
                        self.sync_pool = redis.ConnectionPool(**self.config)
                    self._sync_client = redis.Redis(connection_pool=self.sync_pool)
                    logger.debug("Initialized sync Redis client directly")
            except RedisError as e:
                logger.error(f"Failed to initialize sync Redis client: {e}")
                raise
        return self._sync_client

    @property
    async def async_client(self):
        '''client = await redis.async_client
            await client.set("key", "value")

        used like that, so with the client object, we can use redis operations.
        '''
        if self._async_client is None:
            try:
                if self.use_redis_config and hasattr(self, 'redis_url') and self.redis_url:
                    # Use from_url for Redis URLs (handles SSL automatically for rediss://)
                    # For Heroku Redis, disable SSL certificate verification as they use self-signed certs
                    self._async_client = Redis.from_url(
                        self.redis_url,
                        decode_responses=True,
                        socket_timeout=self.redis_config.socket_timeout,
                        ssl_cert_reqs=None,  # Disable SSL certificate verification for Heroku Redis
                        ssl_check_hostname=False,  # Don't verify hostname
                        ssl_ca_certs=None  # Don't use CA certificates
                    )
                    logger.debug(f"Initialized async Redis client from URL: {self.redis_url[:20]}...")
                elif self.use_sentinel:
                    # For async Sentinel, we need to get master info and create async connection
                    master_info = self.sentinel.discover_master(self.sentinel_service)
                    host, port = master_info

                    if self.async_pool is None:
                        self.async_pool = ConnectionPool(
                            host=host,
                            port=port,
                            decode_responses=True,
                            socket_timeout=10
                        )
                        logger.debug(f"Initialized async Redis pool via Sentinel to {host}:{port}")

                    self._async_client = Redis(connection_pool=self.async_pool)
                    logger.debug("Initialized async Redis client via Sentinel")
                else:
                    # Direct connection (original logic)
                    if self.async_pool is None:
                        self.async_pool = ConnectionPool(**self.config)
                        logger.debug("Initialized async Redis connection pool")

                    self._async_client = Redis(connection_pool=self.async_pool)
                    logger.debug("Initialized async Redis client directly")
            except RedisError as e:
                logger.error(f"Failed to initialize async Redis client: {e}")
                raise

        return self._async_client

    async def pipeline(self, transaction=True):
        """
        Optimize round-trip times by batching Redis commands into a single request.
        One network round-trip for multiple commands is more efficient than one round-trip per command.

        EX:
        # Without pipeline (3 separate network calls):
        await redis.sadd("game:123", "player1")
        await redis.sadd("game:123", "player2")
        await redis.sadd("game:123", "player3")

        # With pipeline (1 network call):
        pipe = await redis.pipeline()
        pipe.sadd("game:123", "player1")
        pipe.sadd("game:123", "player2")
        pipe.sadd("game:123", "player3")
        await pipe.execute()
        """
        client = await self.async_client
        return client.pipeline(transaction=transaction)

    # Key management methods
    async def exists(self, key):
        """Check if a key exists"""
        try:
            client = await self.async_client
            return await client.exists(key)
        except RedisError as e:
            logger.error(f"Redis error in exists operation for key {key}: {e}")
            return False

    async def delete(self, *keys):
        """Delete one or more keys"""
        if not keys: return 0 # Nothing to delete
        try:
            client = await self.async_client
            # Pass keys using * to unpack them as arguments to the underlying client's delete
            return await client.delete(*keys)
        except RedisError as e:
            # Log error with all keys intended for deletion
            logger.error(f"Redis error in delete operation for keys {keys}: {e}")
            return 0

    async def expire(self, key, seconds):
        """Set a key's time to live in seconds"""
        try:
            client = await self.async_client
            return await client.expire(key, seconds)
        except RedisError as e:
            logger.error(f"Redis error in expire operation for key {key}: {e}")
            return False

    # Basic operations
    async def set(self, key, value, ex=None):
        """Set a key with optional expiration time"""
        try:
            client = await self.async_client

            # Handle JSON serialization if value is dict or list
            if isinstance(value, (dict, list)):
                value = json.dumps(value)

            return await client.set(key, value, ex=ex)
        except RedisError as e:
            logger.error(f"Redis error in set operation for key {key}: {e}")
            return False

    async def get(self, key, default=None):
        """Get a value by key with automatic JSON deserialization if applicable"""
        try:
            client = await self.async_client
            value = await client.get(key)

            if value is None:
                return default

            # Try to deserialize JSON if it looks like JSON
            try:
                if value.startswith('{') and value.endswith('}') or \
                   value.startswith('[') and value.endswith(']'):
                    return json.loads(value)
            except (json.JSONDecodeError, AttributeError):
                pass

            return value
        except RedisError as e:
            logger.error(f"Redis error in get operation for key {key}: {e}")
            return default

    # --- Hash Operations ---
    # used for lobby metadata for reconnection logic

    async def hgetall(self, name):
        """Get all fields and values in a hash, robustly handling decoding and JSON deserialization."""
        try:
            client = await self.async_client # Use the main client (decode_responses=True)
            raw_values = await client.hgetall(name)

            if not raw_values:
                return {}

            # Process results, handling potential bytes or strings from client
            result = {}
            for k_raw, v_raw in raw_values.items():
                # Decode key if it's bytes
                k = k_raw.decode('utf-8') if isinstance(k_raw, bytes) else k_raw
                # Decode value if it's bytes
                v_str = v_raw.decode('utf-8') if isinstance(v_raw, bytes) else v_raw

                # Ensure we have a string before checking for JSON
                if not isinstance(v_str, str):
                    # Log unexpected type or handle appropriately
                    logger.warning(f"Unexpected value type ({type(v_str)}) for key {k} in hgetall({name}). Skipping JSON check.")
                    result[k] = v_str # Keep original value if not string
                    continue

                # Try to deserialize JSON if it looks like JSON
                try:
                    if v_str.startswith('{') and v_str.endswith('}') or \
                       v_str.startswith('[') and v_str.endswith(']'):
                        result[k] = json.loads(v_str)
                    else:
                        result[k] = v_str
                except json.JSONDecodeError:
                    result[k] = v_str # Fallback: keep decoded string

            return result
        except RedisError as e:
            logger.error(f"Redis error in hgetall operation for {name}: {e}")
            return {}

    async def hmset(self, name: KeyT, mapping: dict):
        """Set multiple hash fields and values (maps dict)"""
        try:
            client = await self.async_client
            # aioredis hmset expects a mapping directly
            # Ensure values are encodable (str, bytes, int, float)
            encoded_mapping = {k: json.dumps(v) if isinstance(v, (dict, list)) else v
                               for k, v in mapping.items()}
            return await client.hmset(name, mapping=encoded_mapping)
        except RedisError as e:
            logger.error(f"Redis error in hmset operation for hash {name}: {e}")
            return False
        except TypeError as e:
             logger.error(f"Type error during hmset serialization for hash {name}: {e}. Mapping: {mapping}")
             return False


    # --- Set Operations ---
    async def sadd(self, name: KeyT, *values: EncodableT) -> int:
        """Add members to a set. Determines that player X belongs to game Y.

        named like this because it is Redis built-in set function.

        EX:
        Key: "game:abc123:players"
        Set contents: ["player456", "player789", "player101"]
        """
        try:
            client = await self.async_client
            return await client.sadd(name, *values)
        except RedisError as e:
            logger.error(f"Redis error in sadd operation for set {name}: {e}")
            return 0

    async def srem(self, name: KeyT, *values: EncodableT) -> int:
        """Remove members from a set."""
        try:
            client = await self.async_client
            return await client.srem(name, *values)
        except RedisError as e:
            logger.error(f"Redis error in srem operation for set {name}: {e}")
            return 0

    async def smembers(self, name: KeyT) -> set:
        """Get all members of a set."""
        try:
            client = await self.async_client
            # Returns set of strings because decode_responses=True
            return await client.smembers(name)
        except RedisError as e:
            logger.error(f"Redis error in smembers operation for set {name}: {e}")
            return set()


    # --- Pub/Sub Operations ---
    # (does not store messages, only sends them)
    async def publish(self, channel, message):
        """Publish a message to a channel"""
        try:
            client = await self.async_client

            # Handle JSON serialization if message is dict or list
            if isinstance(message, (dict, list)):
                message = json.dumps(message)

            return await client.publish(channel, message)
        except RedisError as e:
            logger.error(f"Redis error in publish operation for channel {channel}: {e}")
            return 0

    async def subscribe(self, *channels):
        """
        Subscribe to channels and return the pubsub object

        EX:
        pubsub = await redis.subscribe("channel1", "channel2")
        await pubsub.get_message() # blocks until a message is received

        A client could subscribe to a channel without being in the corresponding lobby (like a spectator), or be in a lobby but temporarily disconnected from the channel.
        Channels are just string identifiers for message routing, completely independent from game logic.

        Example channel names:
        game:123:broadcast      # Messages to all players in game 123
        game:123:to_host        # Messages only to the host of game 123

        That is why we need set operations, because we can't look up the players conncted to that channel because Redis pub/sub does not store subscribers in a queryable way. It is in memory only.
        """
        try:
            client = await self.async_client
            pubsub = client.pubsub()
            await pubsub.subscribe(*channels)
            return pubsub
        except RedisError as e:
            logger.error(f"Redis error in subscribe operation for channels {channels}: {e}")
            raise

    # Connection health check
    async def ping(self):
        """Test if Redis connection is alive"""
        try:
            client = await self.async_client
            return await client.ping()
        except RedisError as e:
            logger.error(f"Redis ping failed: {e}")
            return False

    # Key pattern matching
    async def keys(self, pattern):
        """Find keys matching a pattern"""
        try:
            client = await self.async_client
            return await client.keys(pattern)
        except RedisError as e:
            logger.error(f"Redis error in keys operation for pattern {pattern}: {e}")
            return []

    # Cleanup resources
    async def close(self):
        """Close all Redis connections"""
        if self._async_client:
            try:
                await self._async_client.close()
                logger.debug("Closed async Redis client")
            except RedisError as e:
                logger.error(f"Error closing async Redis client: {e}")

        # Close sync client
        if self._sync_client:
            try:
                self._sync_client.close()
                logger.debug("Closed sync Redis client")
            except RedisError as e:
                logger.error(f"Error closing sync Redis client: {e}")
