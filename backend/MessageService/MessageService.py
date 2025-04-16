import json
import logging
import asyncio
import time
from backend.configuration.RedisConfig import RedisKeyPrefix, RedisChannelPrefix
from backend.commons.enums.Stage import Stage

logger = logging.getLogger(__name__)

class MessageService:
    """
    Service for handling pub/sub messaging between servers.
    Provides a centralized way to:
    - Publish messages to channels
    - Subscribe to channels
    - Handle incoming messages
    - Route messages to appropriate handlers

    other servers just tell MessageService
    "here's an event that happened" and MessageService takes care of delivering that information to all the other
    servers that need to know.
    """
    
    def __init__(self, redis=None):
        """
        Initialize MessageService
        
        Args:
            redis: RedisAdapter instance for pub/sub operations
        """
        self.redis = redis
        self.subscribers = {}  # Channel -> List of callback handlers
        self.pubsubs = {}  # Channel -> PubSub object
        self.listener_tasks = {}  # Channel -> Listener task
        
        logger.info("MessageService initialized")
    
    async def start(self):
        """
        Start the message service and subscribe to any registered channels
        """
        if not self.redis:
            raise ValueError("Redis adapter not set in MessageService")
        
        # Start listeners for any existing subscribers
        for channel in self.subscribers:
            if channel not in self.listener_tasks:
                await self._subscribe_to_channel(channel)
        
        logger.info("MessageService started")
        return self
    
    async def stop(self):
        """
        Stop the message service and all listeners
        """
        # Cancel all listener tasks
        for channel, task in self.listener_tasks.items():
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        # Close all pubsub connections
        for channel, pubsub in self.pubsubs.items():
            try:
                await pubsub.unsubscribe(channel)
                logger.info(f"Unsubscribed from channel: {channel}")
            except Exception as e:
                logger.error(f"Error unsubscribing from channel {channel}: {e}")
        
        self.listener_tasks = {}
        self.pubsubs = {}
        
        logger.info("MessageService stopped")
    
    async def subscribe(self, channel, callback):
        """
        Subscribe to a channel and register a callback function to handle messages
        
        Args:
            channel: Channel name to subscribe to
            callback: Async function to call when a message is received
                      Should accept (channel, message) parameters
        """
        if not callable(callback):
            raise ValueError("Callback must be a callable function")
        
        # Add callback to subscribers
        if channel not in self.subscribers:
            self.subscribers[channel] = []
        self.subscribers[channel].append(callback)
        
        # Subscribe to channel if not already subscribed
        if channel not in self.pubsubs:
            await self._subscribe_to_channel(channel)
        
        logger.info(f"Added subscriber to channel: {channel}")
    
    async def unsubscribe(self, channel, callback=None):
        """
        Unsubscribe from a channel, or remove a specific callback
        
        Args:
            channel: Channel to unsubscribe from
            callback: Specific callback to remove, or None to remove all
        """
        if channel not in self.subscribers:
            return
        
        if callback:
            # Remove specific callback
            self.subscribers[channel] = [
                cb for cb in self.subscribers[channel] if cb != callback
            ]
            logger.info(f"Removed subscriber callback from channel: {channel}")
        else:
            # Remove all callbacks
            self.subscribers[channel] = []
            logger.info(f"Removed all subscribers from channel: {channel}")
        
        # If no more subscribers, unsubscribe from channel
        if not self.subscribers[channel]:
            if channel in self.pubsubs:
                try:
                    await self.pubsubs[channel].unsubscribe(channel)
                    logger.info(f"Unsubscribed from channel: {channel}")
                except Exception as e:
                    logger.error(f"Error unsubscribing from channel {channel}: {e}")
            
            # Cancel listener task
            if channel in self.listener_tasks and self.listener_tasks[channel]:
                self.listener_tasks[channel].cancel()
                try:
                    await self.listener_tasks[channel]
                except asyncio.CancelledError:
                    pass
            
            # Clean up
            self.pubsubs.pop(channel, None)
            self.listener_tasks.pop(channel, None)
            self.subscribers.pop(channel, None)
    
    async def publish(self, channel, message):
        """
        Publish a message to a channel
        
        Args:
            channel: Channel to publish to
            message: Message to publish (dict, list, or string)
        
        Returns:
            True if published successfully, False otherwise
        """
        if not self.redis:
            logger.error("Cannot publish message: Redis not set")
            return False
        
        try:
            # Publish the message to the all subscribers of the channel
            #self.redis.publish does not require a subscription - any Redis client can publish.    
            # this will send message to Redis server (dispatching it entirely handled by Redis server 
            await self.redis.publish(channel, message)
            logger.debug(f"Published message to channel {channel}")
            return True
        
        except Exception as e:
            logger.error(f"Error publishing to channel {channel}: {e}")
            return False
    
    async def publish_event(self, event_type, data, channel=None):
        """
        Publish an event message with standard format
        
        Args:
            event_type: Type of event (e.g., "game:updated")
            data: Data to include in the event
            channel: Channel to publish to, or None for default
        
        Returns:
            True if published successfully, False otherwise
        """
        if channel is None:
            # Determine default channel based on event type
            if event_type.startswith("game:"):
                channel = f"{RedisChannelPrefix.GAME.value}:all"
            elif event_type.startswith("connection:"):
                channel = f"{RedisChannelPrefix.CONNECTION.value}:all"
            else:
                channel = f"{RedisChannelPrefix.SYSTEM.value}:all"
        
        # Prepare event message
        message = {
            "event": event_type,
            "data": data,
            "timestamp": int(time.time())
        }
        
        return await self.publish(channel, message)
    
    async def _subscribe_to_channel(self, channel):
        """
        Subscribe to a Redis channel and start listener
        
        Args:
            channel: Channel to subscribe to
        """
        if not self.redis:
            logger.error(f"Cannot subscribe to channel {channel}: Redis not set")
            return
        
        try:
            # Subscribe to the channel
            # basically, the server subscribes to redis channels using the Redis client.  
            # it is used to subscribe to channels (done once here) and receive messages from 
            # only for subscribing to channels, so just listening. like a radio receiver.
            pubsub = await self.redis.subscribe(channel)
            self.pubsubs[channel] = pubsub
            
            # Start listener task
            self.listener_tasks[channel] = asyncio.create_task(
                self._listen_for_messages(channel, pubsub)
            )
            
            logger.info(f"Subscribed to channel: {channel}")
        
        except Exception as e:
            logger.error(f"Error subscribing to channel {channel}: {e}")
    
    async def _listen_for_messages(self, channel, pubsub):
        """
        Listen for messages on a channel and dispatch to handlers
        
        Args:
            channel: Channel name
            pubsub: PubSub object for this channel
        """
        try:
            logger.info(f"Starting message listener for channel: {channel}")
            
            while True:
                try:
                    # Wait for a message
                    message = await pubsub.get_message(
                        ignore_subscribe_messages=True,
                        timeout=1
                    )
                    
                    if message is not None and message["type"] == "message":
                        # Parse the message data
                        try:
                            data = message["data"]
                            
                            # Try to parse as JSON if it's a string
                            if isinstance(data, str):
                                try:
                                    data = json.loads(data)
                                except json.JSONDecodeError:
                                    # Not JSON, use as is
                                    pass
                            
                            # Dispatch to all handlers
                            if channel in self.subscribers:
                                for callback in self.subscribers[channel]:
                                    try:
                                        await callback(channel, data)
                                    except Exception as e:
                                        logger.error(f"Error in message handler: {e}")
                        
                        except Exception as e:
                            logger.error(f"Error processing message: {e}")
                    
                    # Small pause to avoid busy waiting
                    await asyncio.sleep(0.01)
                
                except asyncio.CancelledError:
                    # Listener was cancelled, exit gracefully
                    raise
                
                except Exception as e:
                    logger.error(f"Error in message listener: {e}")
                    # Brief pause before retry
                    await asyncio.sleep(1)
        
        except asyncio.CancelledError:
            logger.info(f"Message listener for channel {channel} cancelled")
            raise
        
        except Exception as e:
            logger.error(f"Fatal error in message listener for channel {channel}: {e}")