import asyncio
import json
import logging
import sys
import os
import time
from dotenv import load_dotenv

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.commons.adapters.RedisAdapter import RedisAdapter
from backend.configuration.RedisConfig import RedisConfig, RedisChannelPrefix
from backend.commons.enums.Stage import Stage
from backend.MessageService.MessageService import MessageService

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Test channel
TEST_CHANNEL = "test:message"

# Track received messages across tests
received_messages = []

async def message_handler(channel, message):
    """Handler for received messages in tests"""
    print(f"✓ Received message on channel {channel}: {message}")
    received_messages.append((channel, message))

async def another_handler(channel, message):
    """Another handler for testing multiple subscribers"""
    print(f"✓ Another handler received message on channel {channel}")
    received_messages.append((channel, f"ANOTHER:{message}"))

async def test_basic_pub_sub():
    """Test basic publish and subscribe functionality"""
    print("\n=== Testing Basic Publish/Subscribe ===")
    
    # Clear received messages
    received_messages.clear()
    
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    # Initialize message service
    message_service = MessageService(redis)
    await message_service.start()
    
    try:
        # Subscribe to test channel
        await message_service.subscribe(TEST_CHANNEL, message_handler)
        
        # Wait for subscription to be ready
        await asyncio.sleep(0.5)
        
        # Publish a test message
        test_message = {"type": "test", "content": "Hello, Pub/Sub!", "id": 1}
        success = await message_service.publish(TEST_CHANNEL, test_message)
        
        if success:
            print(f"✓ Published message to {TEST_CHANNEL}")
        else:
            print(f"✗ Failed to publish message to {TEST_CHANNEL}")
            return False
        
        # Wait for message to be received
        await asyncio.sleep(1)
        
        # Check if message was received
        if len(received_messages) > 0:
            channel, message = received_messages[0]
            if channel == TEST_CHANNEL and message.get("id") == 1:
                print("✓ Message was correctly received by handler")
                return True
            else:
                print(f"✗ Received unexpected message: {message}")
                return False
        else:
            print("✗ No message received")
            return False
    
    finally:
        # Clean up
        await message_service.stop()
        await redis.close()

async def test_multiple_subscribers():
    """Test multiple subscribers to the same channel"""
    print("\n=== Testing Multiple Subscribers ===")
    
    # Clear received messages
    received_messages.clear()
    
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    # Initialize message service
    message_service = MessageService(redis)
    await message_service.start()
    
    try:
        # Subscribe with two different handlers
        await message_service.subscribe(TEST_CHANNEL, message_handler)
        await message_service.subscribe(TEST_CHANNEL, another_handler)
        
        # Wait for subscriptions to be ready
        await asyncio.sleep(0.5)
        
        # Publish a test message
        test_message = {"type": "test", "content": "Multiple subscribers", "id": 2}
        await message_service.publish(TEST_CHANNEL, test_message)
        
        # Wait for message to be received
        await asyncio.sleep(1)
        
        # Check if both handlers received the message
        if len(received_messages) == 2:
            print("✓ Message was received by both handlers")
            return True
        else:
            print(f"✗ Expected 2 received messages, got {len(received_messages)}")
            return False
    
    finally:
        # Clean up
        await message_service.stop()
        await redis.close()

async def test_unsubscribe():
    """Test unsubscribing from a channel"""
    print("\n=== Testing Unsubscribe ===")
    
    # Clear received messages
    received_messages.clear()
    
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    # Initialize message service
    message_service = MessageService(redis)
    await message_service.start()
    
    try:
        # Subscribe to test channel
        await message_service.subscribe(TEST_CHANNEL, message_handler)
        
        # Wait for subscription to be ready
        await asyncio.sleep(0.5)
        
        # Publish a test message
        test_message = {"type": "test", "content": "Before unsubscribe", "id": 3}
        await message_service.publish(TEST_CHANNEL, test_message)
        
        # Wait for message to be received
        await asyncio.sleep(1)
        
        # Check if message was received
        if len(received_messages) != 1:
            print(f"✗ Expected 1 received message, got {len(received_messages)}")
            return False
        
        # Clear received messages
        received_messages.clear()
        
        # Unsubscribe
        await message_service.unsubscribe(TEST_CHANNEL, message_handler)
        
        # Wait for unsubscribe to take effect
        await asyncio.sleep(0.5)
        
        # Publish another message
        test_message = {"type": "test", "content": "After unsubscribe", "id": 4}
        await message_service.publish(TEST_CHANNEL, test_message)
        
        # Wait for message to be received (but it shouldn't be)
        await asyncio.sleep(1)
        
        # Check that no message was received
        if len(received_messages) == 0:
            print("✓ No message received after unsubscribe")
            return True
        else:
            print(f"✗ Received message after unsubscribe: {received_messages}")
            return False
    
    finally:
        # Clean up
        await message_service.stop()
        await redis.close()

async def test_publish_event():
    """Test publishing events with automatic channel selection"""
    print("\n=== Testing Event Publishing ===")
    
    # Clear received messages
    received_messages.clear()
    
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    # Initialize message service
    message_service = MessageService(redis)
    await message_service.start()
    
    try:
        # Subscribe to game channel
        game_channel = f"{RedisChannelPrefix.GAME.value}:all"
        await message_service.subscribe(game_channel, message_handler)
        
        # Subscribe to connection channel
        connection_channel = f"{RedisChannelPrefix.CONNECTION.value}:all"
        await message_service.subscribe(connection_channel, message_handler)
        
        # Wait for subscriptions to be ready
        await asyncio.sleep(0.5)
        
        # Publish a game event (should go to game channel)
        await message_service.publish_event(
            "game:updated", 
            {"gameId": "test-game-123"}
        )
        
        # Publish a connection event (should go to connection channel)
        await message_service.publish_event(
            "connection:new", 
            {"clientId": "test-client-456"}
        )
        
        # Wait for messages to be received
        await asyncio.sleep(1)
        
        # Check we received both messages on correct channels
        if len(received_messages) != 2:
            print(f"✗ Expected 2 received messages, got {len(received_messages)}")
            return False
        
        channels_received = [channel for channel, _ in received_messages]
        
        if game_channel in channels_received and connection_channel in channels_received:
            print("✓ Events were published to correct channels")
            return True
        else:
            print(f"✗ Events published to incorrect channels: {channels_received}")
            return False
    
    finally:
        # Clean up
        await message_service.stop()
        await redis.close()

async def test_error_handling():
    """Test error handling in message service"""
    print("\n=== Testing Error Handling ===")
    
    # Clear received messages
    received_messages.clear()
    
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    # Initialize message service
    message_service = MessageService(redis)
    await message_service.start()
    
    async def faulty_handler(channel, message):
        """Handler that raises an exception"""
        print(f"Faulty handler called with message: {message}")
        raise ValueError("Simulated error in handler")
    
    try:
        # Subscribe with a faulty handler
        await message_service.subscribe(TEST_CHANNEL, faulty_handler)
        # Also subscribe with a normal handler
        await message_service.subscribe(TEST_CHANNEL, message_handler)
        
        # Wait for subscriptions to be ready
        await asyncio.sleep(0.5)
        
        # Publish a test message
        test_message = {"type": "test", "content": "Testing error handling", "id": 5}
        await message_service.publish(TEST_CHANNEL, test_message)
        
        # Wait for message to be processed
        await asyncio.sleep(1)
        
        # The normal handler should still have received the message
        if len(received_messages) > 0:
            print("✓ Message was received by normal handler despite faulty handler")
            return True
        else:
            print("✗ Message was not received by any handler")
            return False
    
    finally:
        # Clean up
        await message_service.stop()
        await redis.close()

async def run_tests():
    """Run all message service tests"""
    print("Starting message service tests...")
    
    # Test basic pub/sub
    basic_result = await test_basic_pub_sub()
    
    # Test multiple subscribers
    multiple_result = await test_multiple_subscribers()
    
    # Test unsubscribe
    unsubscribe_result = await test_unsubscribe()
    
    # Test publish event
    event_result = await test_publish_event()
    
    # Test error handling
    error_result = await test_error_handling()
    
    # Print summary
    print("\n=== Test Results ===")
    print(f"Basic Pub/Sub:        {'✓ PASSED' if basic_result else '✗ FAILED'}")
    print(f"Multiple Subscribers: {'✓ PASSED' if multiple_result else '✗ FAILED'}")
    print(f"Unsubscribe:          {'✓ PASSED' if unsubscribe_result else '✗ FAILED'}")
    print(f"Event Publishing:     {'✓ PASSED' if event_result else '✗ FAILED'}")
    print(f"Error Handling:       {'✓ PASSED' if error_result else '✗ FAILED'}")
    
    # Overall result
    if basic_result and multiple_result and unsubscribe_result and event_result and error_result:
        print("\n✓ All message service tests PASSED!")
    else:
        print("\n✗ Some tests FAILED!")

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(run_tests())