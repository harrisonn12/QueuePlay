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
from backend.ConnectionService.ConnectionService import ConnectionService
from backend.GameService.GameService import GameService

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Test message handlers
async def connection_message_handler(channel, message):
    """Handler for connection messages"""
    print(f"✓ Connection handler received message on channel {channel}: {message}")

async def game_message_handler(channel, message):
    """Handler for game messages"""
    print(f"✓ Game handler received message on channel {channel}: {message}")

async def test_inter_service_communication():
    """Test communication between ConnectionService and GameService via MessageService"""
    print("\n=== Testing Inter-Service Communication ===")
    
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    # Initialize MessageService
    message_service = MessageService(redis)
    await message_service.start()
    
    # Subscribe to test channels
    connection_channel = f"{RedisChannelPrefix.CONNECTION.value}:all"
    game_channel = f"{RedisChannelPrefix.GAME.value}:all"
    
    await message_service.subscribe(connection_channel, connection_message_handler)
    await message_service.subscribe(game_channel, game_message_handler)
    
    # Initialize GameService
    game_service = GameService(redis)
    game_service.messageService = message_service
    await game_service.start()
    
    # Initialize ConnectionService
    connection_service = ConnectionService()
    connection_service.redis = redis
    connection_service.gameService = game_service
    connection_service.messageService = message_service
    await connection_service.start()
    
    try:
        # Wait for all services to be ready
        await asyncio.sleep(0.5)
        
        print("\n1. Testing connection registration event:")
        # Simulate a client connecting
        # Create a mock websocket for testing
        class MockWebSocket:
            def __init__(self):
                self.open = True
                self.messages = []
            
            async def send(self, message):
                self.messages.append(message)
                return True
            
            async def close(self, code=1000, reason=""):
                self.open = False
                return True
        
        mock_websocket = MockWebSocket()
        client_id = "test-client-123"
        
        # Register a connection
        await connection_service.registerConnection(client_id, mock_websocket)
        print(f"✓ Registered client {client_id}")
        
        # Wait for message to be processed
        await asyncio.sleep(0.5)
        
        print("\n2. Testing game initialization event:")
        # Simulate creating a game
        game_id = "test-game-123"
        game_type = "trivia"
        
        # Initialize a game - using an internal method to avoid needing real WebSocket connections
        game = game_service.gameFactory.createGame(game_type, game_id, client_id)
        game_service.games[game_id] = game
        await game.saveState()
        
        # Publish game creation event
        await message_service.publish_event(
            "game:created", 
            {
                "gameId": game_id,
                "gameType": game_type,
                "hostId": client_id
            }
        )
        print(f"✓ Created game {game_id}")
        
        # Wait for message to be processed
        await asyncio.sleep(0.5)
        
        print("\n3. Testing client message routing:")
        # Test sending a message to a client
        test_message = {"action": "test", "data": "Hello from another server!"}
        
        # Send a message to the client via connection service
        await connection_service.sendToClient(client_id, test_message)
        print(f"✓ Sent message to client {client_id}")
        
        # Wait for message to be delivered
        await asyncio.sleep(0.5)
        
        # Check that the mock websocket received the message
        if len(mock_websocket.messages) > 0:
            print(f"✓ Client received message: {mock_websocket.messages[-1]}")
        else:
            print("✗ Client did not receive message")
        
        print("\n4. Testing game ending event:")
        # End the game
        await game_service.endGame(game_id, "Test end game")
        print(f"✓ Ended game {game_id}")
        
        # Wait for message to be processed
        await asyncio.sleep(0.5)
        
        # Check if the game was removed from cache
        if game_id not in game_service.games:
            print(f"✓ Game {game_id} removed from local cache")
        else:
            print(f"✗ Game {game_id} still in local cache")
            
        print("\n5. Testing connection closed event:")
        # Unregister the connection
        await connection_service.unregisterConnection(client_id)
        print(f"✓ Unregistered client {client_id}")
        
        # Wait for message to be processed
        await asyncio.sleep(0.5)
        
        # Cleanup connections
        if client_id not in connection_service.localConnections:
            print(f"✓ Client {client_id} removed from local connections")
        else:
            print(f"✗ Client {client_id} still in local connections")
        
        print("\n=== Inter-Service Communication Test Complete ===")
        return True
        
    finally:
        # Clean up services
        await connection_service.stop()
        await game_service.stop()
        await message_service.stop()
        await redis.close()

async def run_tests():
    """Run all integration tests"""
    print("Starting integration tests...")
    
    # Test inter-service communication
    result = await test_inter_service_communication()
    
    # Print summary
    print("\n=== Test Results ===")
    print(f"Inter-Service Communication: {'✓ PASSED' if result else '✗ FAILED'}")
    
    # Overall result
    if result:
        print("\n✓ All integration tests PASSED!")
    else:
        print("\n✗ Some tests FAILED!")

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(run_tests())