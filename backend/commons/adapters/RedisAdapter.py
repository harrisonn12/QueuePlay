import redis
import json
import asyncio
import logging
from redis.exceptions import RedisError
from redis.asyncio import Redis, ConnectionPool
from redis.typing import KeyT, EncodableT
from backend.configuration.AppConfig import AppConfig, Stage
import os

logger = logging.getLogger(__name__)

class RedisAdapter:
    '''
    wrapper (helper class/function that simplifies another tool/library) to interact with redis.
    organizes all redis operations in a single class.
    customizing the way Redis is used to fit this app's needs.
    Without wrapper: 
        Only accept strings (not dicts or lists)
        Don't handle errors
        Don't support custom formats (e.g., prefixing keys like "game:123")
        Don't give you built-in async + sync support in one place

    
    '''
    def __init__(self, app_config: AppConfig):
        # Extract config based on stage
        if app_config.stage == Stage.PROD:
            # Define your Production Redis settings (replace placeholders)
            host = os.getenv("PROD_REDIS_HOST", "your_prod_redis_host") 
            port = int(os.getenv("PROD_REDIS_PORT", 6379)) # Ensure port is int
            db = int(os.getenv("PROD_REDIS_DB", 0))
            password = os.getenv("PROD_REDIS_PASSWORD", None)
            socket_timeout = 10 # Maybe longer timeout for prod?
            logger.info("Using Production Redis configuration.")
        else: # Default to Development
            host = os.getenv("DEV_REDIS_HOST", "localhost")
            port = int(os.getenv("DEV_REDIS_PORT", 6379))
            db = int(os.getenv("DEV_REDIS_DB", 0))
            password = os.getenv("DEV_REDIS_PASSWORD", None)
            socket_timeout = 5
            logger.info("Using Development Redis configuration.")

        # Use extracted values for self.config
        self.config = {
            "host": host,
            "port": port,
            "db": db,
            "password": password,
            "socket_timeout": socket_timeout,
            "decode_responses": True,  # Always decode Redis responses to strings
        }
        
        # Initialize pools for sync and async connections
        self.sync_pool = redis.ConnectionPool(**self.config)
        self.async_pool = None  # Will be initialized on demand
        
        # Clients are initialized on first use
        self._sync_client = None
        self._async_client = None
        
        logger.info(f"Initialized Redis adapter for {host}:{port}/db{db}")

    @property # lazy initialization, meaning the client is not created until it is needed.
    def sync_client(self):
        '''client = await redis.async_client
            await client.set("key", "value")
        
        used like that, so with the client object, we can use redis operations.
        '''
        if self._sync_client is None:
            try:
                self._sync_client = redis.Redis(connection_pool=self.sync_pool)
                logger.debug("Initialized sync Redis client")
            except RedisError as e:
                logger.error(f"Failed to initialize sync Redis client: {e}")
                raise
        return self._sync_client
    
    @property
    async def async_client(self):
        if self.async_pool is None:
            try:
                self.async_pool = ConnectionPool(**self.config)
                logger.debug("Initialized async Redis connection pool")
            except RedisError as e:
                logger.error(f"Failed to initialize async Redis pool: {e}")
                raise
        
        if self._async_client is None:
            try:
                self._async_client = Redis(connection_pool=self.async_pool)
                logger.debug("Initialized async Redis client")
            except RedisError as e:
                logger.error(f"Failed to initialize async Redis client: {e}")
                raise
        
        return self._async_client
    
    # --- Pipeline Method ---
    async def pipeline(self, transaction=True):
        """Return a pipeline object from the async client."""
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
    
    # Hash operations
    async def hset(self, name, key, value):
        """Set a hash field"""
        try:
            client = await self.async_client
            
            # Handle JSON serialization if value is dict or list
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
                
            return await client.hset(name, key, value)
        except RedisError as e:
            logger.error(f"Redis error in hset operation for {name}:{key}: {e}")
            return False
    
    async def hget(self, name, key, default=None):
        """Get a hash field value with automatic JSON deserialization if applicable"""
        try:
            client = await self.async_client
            value = await client.hget(name, key)
            
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
            logger.error(f"Redis error in hget operation for {name}:{key}: {e}")
            return default
    
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
    
    async def hdel(self, name, *keys):
        """Delete one or more hash fields"""
        try:
            client = await self.async_client
            return await client.hdel(name, *keys)
        except RedisError as e:
            logger.error(f"Redis error in hdel operation for {name}: {e}")
            return 0
    
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
    
    # --- Set Operations (Added) ---
    async def sadd(self, name: KeyT, *values: EncodableT) -> int:
        """Add members to a set."""
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

    # Pub/Sub operations
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
        """Subscribe to channels and return the pubsub object"""
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