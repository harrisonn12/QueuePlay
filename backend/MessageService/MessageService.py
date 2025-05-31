import json
import logging
import asyncio
import time
from collections import defaultdict
from backend.configuration.RedisConfig import RedisKeyPrefix, RedisChannelPrefix
from backend.commons.enums.Stage import Stage
from backend.commons.adapters.RedisAdapter import RedisAdapter
from websockets.server import WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)

class MessageService:
    """
    Service for handling pub/sub messaging between servers using Redis.
    Provides a centralized way to:
    - Publish messages to channels
    - Subscribe to channels
    - Handle incoming messages
    - Route messages to appropriate handlers

    other servers just tell MessageService
    "here's an event that happened" and MessageService takes care of delivering that information to all the other
    servers that need to know.
    """
    
    def __init__(self, redis: RedisAdapter):
        """
        Initialize MessageService
        
        Args:
            redis: RedisAdapter instance for pub/sub operations
        """
        if not redis:
            raise ValueError("Redis adapter is required for MessageService")
        self.redis = redis
        
        # --- Server-side Callback Subscriptions ---
        self.server_callbacks = defaultdict(list) # Channel -> List of async server callback functions
        
        # --- Client WebSocket Subscriptions ---
        # Maps channel -> set of locally connected client IDs subscribed to it
        self.channel_to_clients = defaultdict(set)
        # Maps client ID -> set of channels the client is subscribed to
        self.client_to_channels = defaultdict(set)
        # Maps client ID -> active WebSocket connection object
        self.client_websockets = {}
        
        # --- Redis PubSub Management ---
        # Maps channel -> active aioredis PubSub object (shared by callbacks & clients)
        self.pubsubs = {}
        # Maps channel -> active listener task for the PubSub object
        self.listener_tasks = {}
        
        logger.info("MessageService initialized")
    
    async def start(self):
        """
        Start the message service. Listeners are started on-demand when subscriptions occur.
        """
        logger.info("MessageService started. Ready for subscriptions.")
        return self
    
    async def stop(self):
        """
        Stop the message service, cancel listeners, and clean up PubSub objects.
        """
        logger.info("Stopping MessageService...")
        # Cancel all listener tasks
        listener_stop_tasks = []
        for channel, task in list(self.listener_tasks.items()): # Iterate over copy
            if task and not task.done():
                task.cancel()
                listener_stop_tasks.append(task)
            # Clean up immediately to prevent race conditions during shutdown
            self.pubsubs.pop(channel, None)
            self.listener_tasks.pop(channel, None)

        if listener_stop_tasks:
            await asyncio.gather(*listener_stop_tasks, return_exceptions=True)
            logger.info(f"Cancelled {len(listener_stop_tasks)} listener tasks.")
        
        # Pubsubs should be closed by cancelling tasks / RedisAdapter closing
        self.pubsubs = {}
        self.listener_tasks = {}
        self.channel_to_clients.clear()
        self.client_to_channels.clear()
        self.client_websockets.clear()
        self.server_callbacks.clear()
        
        logger.info("MessageService stopped")
    
    # --- Server Callback Subscription Methods ---
    
    async def subscribe_server_callback(self, channel: str, callback):
        """
        Subscribe a server-side callback function to a channel.
        
        Args:
            channel: Channel to subscribe to
            callback: Async function to call when a message is received
                      Should accept (channel, message) parameters
        """
        if not callable(callback):
            raise ValueError("Callback must be a callable function")
        
        is_new_channel_subscription = not self._is_channel_subscribed(channel)
        self.server_callbacks[channel].append(callback)
        
        if is_new_channel_subscription:
            await self._subscribe_to_channel_if_needed(channel)
        
        logger.info(f"Added server callback to channel: {channel}")
    
    async def unsubscribe_server_callback(self, channel: str, callback=None):
        """
        Unsubscribe a server-side callback function.
        
        Args:
            channel: Channel to unsubscribe from
            callback: Specific callback to remove, or None to remove all
        """
        if channel not in self.server_callbacks:
            return
        
        if callback:
            self.server_callbacks[channel] = [cb for cb in self.server_callbacks[channel] if cb != callback]
            logger.info(f"Removed server callback from channel: {channel}")
        else:
            self.server_callbacks[channel] = []
            logger.info(f"Removed all server callbacks from channel: {channel}")
        
        await self._unsubscribe_from_channel_if_unused(channel)
    
    # --- Client WebSocket Subscription Methods ---
    
    async def subscribe_client(self, client_id: str, channel: str, websocket: WebSocketServerProtocol):
        """
        Subscribes a client's WebSocket to a specific channel.
        Starts listening to the Redis channel if this is the first subscriber (client or callback).
        
        Args:
            client_id: Unique identifier for the client
            channel: Channel to subscribe to
            websocket: WebSocket connection object
        """
        if not client_id or not channel or not websocket:
            logger.error(f"Invalid arguments for subscribe_client: client='{client_id}', channel='{channel}', ws={websocket}")
            return
        
        is_new_channel_subscription = not self._is_channel_subscribed(channel)
        
        self.channel_to_clients[channel].add(client_id)
        self.client_to_channels[client_id].add(channel)
        self.client_websockets[client_id] = websocket
        
        if is_new_channel_subscription:
            await self._subscribe_to_channel_if_needed(channel)
        
        logger.info(f"Client {client_id} subscribed to channel: {channel}")
    
    async def unsubscribe_client(self, client_id: str, channel: str):
        """
        Unsubscribes a client's WebSocket from a specific channel.
        Stops listening to the Redis channel if this was the last subscriber (client or callback).
        
        Args:
            client_id: Unique identifier for the client
            channel: Channel to unsubscribe from
        """
        if client_id not in self.client_to_channels or channel not in self.client_to_channels[client_id]:
            return # Client wasn't subscribed to this channel
        
        self.channel_to_clients[channel].discard(client_id)
        self.client_to_channels[client_id].discard(channel)
        
        # Don't remove from client_websockets here, only in unsubscribe_client_from_all
        # as the client might be subscribed to other channels.
        
        logger.info(f"Client {client_id} unsubscribed from channel: {channel}")
        await self._unsubscribe_from_channel_if_unused(channel)
    
    async def unsubscribe_client_from_all(self, client_id: str):
        """
        Unsubscribes a client from all channels they were subscribed to.
        Removes the client's WebSocket reference.
        
        Args:
            client_id: Unique identifier for the client
        """
        if client_id not in self.client_to_channels:
            return # Client wasn't subscribed to anything
        
        channels = list(self.client_to_channels.pop(client_id, set())) # Get channels and remove client entry
        self.client_websockets.pop(client_id, None) # Remove websocket reference
        
        unsubscribe_tasks = []
        for channel in channels:
            self.channel_to_clients[channel].discard(client_id)
            # Check if the channel is now unused and schedule Redis unsubscribe
            unsubscribe_tasks.append(self._unsubscribe_from_channel_if_unused(channel))
        
        if unsubscribe_tasks:
            await asyncio.gather(*unsubscribe_tasks)
        
        logger.info(f"Unsubscribed client {client_id} from all channels: {channels}")
    
    # --- Publishing Methods ---
    
    async def publish_raw(self, channel: str, message: str):
        """
        Publish a raw string message to a channel.
        (Renamed from publish to clarify it sends raw data)
        
        Args:
            channel: Channel to publish to
            message: Message to publish (string)
        
        Returns:
            True if published successfully, False otherwise
        """
        try:
            # Use the RedisAdapter's publish method directly
            await self.redis.publish(channel, message)
            # logger.debug(f"Published raw message to channel {channel}: {message[:100]}...")
            return True
        except Exception as e:
            logger.error(f"Error publishing raw message to channel {channel}: {e}")
            return False
    
    async def publish_event(self, event_type: str, data: dict, channel: str = None):
        """
        Publish an event message with standard JSON structure.
        
        Args:
            event_type: Type of event (e.g., "game:updated")
            data: Data to include in the event
            channel: Channel to publish to, or None for default
        
        Returns:
            True if published successfully, False otherwise
        """
        # Determine target channel if not provided (example logic)
        if channel is None:
            if event_type.startswith("game:"):
                channel = f"{RedisChannelPrefix.GAME.value}:all"
            elif event_type.startswith("connection:"):
                channel = f"{RedisChannelPrefix.CONNECTION.value}:all"
            elif event_type.startswith("lobby:"):
                channel = f"{RedisChannelPrefix.LOBBY.value}:all"
            else:
                channel = f"{RedisChannelPrefix.SYSTEM.value}:all"
        
        message = {
            "event": event_type,
            "data": data,
            "timestamp": int(time.time())
        }
        try:
            message_str = json.dumps(message)
            return await self.publish_raw(channel, message_str)
        except json.JSONDecodeError as e:
            logger.error(f"Error encoding event message for {event_type}: {e}")
            return False
    
    # --- Internal PubSub Management ---
    
    def _is_channel_subscribed(self, channel: str) -> bool:
        """Checks if the server is currently subscribed to a Redis channel."""
        return channel in self.pubsubs
    
    def _is_channel_in_use(self, channel: str) -> bool:
        """Checks if a channel has any active local subscribers (client or callback)."""
        has_clients = bool(self.channel_to_clients.get(channel)) 
        has_callbacks = bool(self.server_callbacks.get(channel))
        return has_clients or has_callbacks
    
    async def _subscribe_to_channel_if_needed(self, channel: str):
        """Internal: Subscribes to Redis channel via adapter if not already done."""
        if not self._is_channel_subscribed(channel):
            try:
                pubsub = await self.redis.subscribe(channel)
                if pubsub:
                    self.pubsubs[channel] = pubsub
                    self.listener_tasks[channel] = asyncio.create_task(
                        self._listen_for_messages(channel, pubsub)
                    )
                    logger.info(f"Subscribed to Redis channel: {channel}")
                else:
                    logger.error(f"Failed to subscribe to Redis channel {channel} - adapter returned None")
            except Exception as e:
                logger.error(f"Error subscribing to Redis channel {channel}: {e}", exc_info=True)
                self.pubsubs.pop(channel, None) # Clean up if failed
    
    async def _unsubscribe_from_channel_if_unused(self, channel: str):
        """Internal: Unsubscribes from Redis channel if no local subscribers remain."""
        if self._is_channel_subscribed(channel) and not self._is_channel_in_use(channel):
            logger.info(f"Channel {channel} is no longer in use locally. Unsubscribing from Redis.")
            pubsub = self.pubsubs.pop(channel, None)
            task = self.listener_tasks.pop(channel, None)
            
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass # Expected
                except Exception as e:
                    logger.error(f"Error awaiting cancelled listener task for {channel}: {e}")
            
            if pubsub: # aioredis pubsub doesn't always need explicit close, but adapter might
                try:
                    # Assuming RedisAdapter handles the actual unsubscribe call if needed when connections close
                    # Or add an explicit unsubscribe method to RedisAdapter if required by the library
                    # await self.redis.unsubscribe(channel) # If adapter has this method
                    logger.debug(f"PubSub object removed for channel {channel}")
                except Exception as e:
                    logger.error(f"Error during pubsub cleanup for channel {channel}: {e}")
            # Clean up potentially empty defaultdict entries
            if not self.channel_to_clients.get(channel):
                self.channel_to_clients.pop(channel, None)
            if not self.server_callbacks.get(channel):
                self.server_callbacks.pop(channel, None)
    
    async def _listen_for_messages(self, channel: str, pubsub):
        """Internal: Listens for messages on a Redis channel and dispatches them."""
        try:
            logger.info(f"Starting message listener for channel: {channel}")
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    message_data = message.get('data')
                    if message_data:
                        # Decode if bytes (common with aioredis)
                        if isinstance(message_data, bytes):
                            message_data = message_data.decode('utf-8')
                        await self._dispatch_message(channel, message_data)
                await asyncio.sleep(0.01) # Small sleep to prevent tight loop if timeout occurs
        except asyncio.CancelledError:
            logger.info(f"Listener task for channel {channel} cancelled.")
        except Exception as e:
            # Log errors but keep listening unless it's a critical Redis error
            logger.error(f"Error in message listener for channel {channel}: {e}", exc_info=True)
            # TODO: Add logic to potentially stop listening if Redis connection is lost
            # Relaunch listener after a delay? Or rely on RedisAdapter health checks?
            await asyncio.sleep(5) # Wait before potentially retrying loop
            if channel in self.pubsubs: # Check if we are still supposed to be subscribed
                asyncio.create_task(self._listen_for_messages(channel, pubsub)) # Relaunch task
        finally:
            logger.info(f"Stopping message listener for channel: {channel}")
            # Ensure cleanup happens even if loop exits unexpectedly
            self.pubsubs.pop(channel, None)
            self.listener_tasks.pop(channel, None)
    
    async def _dispatch_message(self, channel: str, message_data: str):
        """Internal: Dispatches a received message to server callbacks and subscribed clients."""
        # 1. Dispatch to Server Callbacks
        callbacks_to_run = self.server_callbacks.get(channel, [])
        if callbacks_to_run:
            # logger.debug(f"Dispatching message on {channel} to {len(callbacks_to_run)} server callbacks.")
            tasks = [callback(channel, message_data) for callback in callbacks_to_run]
            await asyncio.gather(*tasks, return_exceptions=True)

        # 2. Dispatch to Subscribed Client WebSockets
        client_ids_to_notify = list(self.channel_to_clients.get(channel, set())) # Iterate copy
        if client_ids_to_notify:
            # logger.debug(f"Dispatching message on {channel} to {len(client_ids_to_notify)} clients: {client_ids_to_notify}")
            client_tasks = []
            for client_id in client_ids_to_notify:
                websocket = self.client_websockets.get(client_id)
                if websocket and websocket.open:
                    client_tasks.append(self._send_to_websocket(websocket, message_data, client_id, channel))
                elif websocket:
                    logger.warning(f"Websocket for client {client_id} on channel {channel} is closed. Scheduling cleanup.")
                    # Schedule cleanup for this specific client if websocket closed unexpectedly
                    asyncio.create_task(self.unsubscribe_client_from_all(client_id))
                else:
                    logger.warning(f"Websocket not found for client {client_id} subscribed to {channel}. Removing subscription.")
                    # Client websocket missing, clean up their subscription state
                    asyncio.create_task(self.unsubscribe_client_from_all(client_id))
            
            if client_tasks:
                await asyncio.gather(*client_tasks, return_exceptions=True)

    async def _send_to_websocket(self, websocket: WebSocketServerProtocol, message: str, client_id: str, channel: str):
        """Internal helper to send message and handle exceptions."""
        try:
            await websocket.send(message)
        except ConnectionClosed:
            logger.warning(f"Connection closed while sending message to client {client_id} on channel {channel}. Scheduling cleanup.")
            # Schedule cleanup for this specific client
            asyncio.create_task(self.unsubscribe_client_from_all(client_id))
        except Exception as e:
            logger.error(f"Error sending message to client {client_id} on channel {channel}: {e}")
            # Optionally trigger cleanup here too?
            asyncio.create_task(self.unsubscribe_client_from_all(client_id))