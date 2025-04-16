import asyncio
import json
import logging
import sys
import os
import uuid
import websockets
from dotenv import load_dotenv

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.commons.adapters.RedisAdapter import RedisAdapter
from backend.configuration.RedisConfig import RedisConfig, RedisKeyPrefix
from backend.commons.enums.Stage import Stage

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

SERVER_URL = os.environ.get("WS_URL", "ws://localhost:6789")

async def connect_and_create_game():
    """Create a game and return the gameId and connection"""
    try:
        # Connect to the server
        connection = await websockets.connect(SERVER_URL)
        
        # Generate a client ID
        client_id = str(uuid.uuid4())
        
        # Create a game
        game_id = str(uuid.uuid4())
        create_message = {
            "action": "initializeGame",
            "clientId": client_id,
            "gameId": game_id,
            "gameType": "trivia"
        }
        
        # Send the message
        await connection.send(json.dumps(create_message))
        
        # Wait for response
        response = await connection.recv()
        response_data = json.loads(response)
        
        # Verify game was created
        if response_data.get("action") == "gameInitialized" and response_data.get("gameId") == game_id:
            print(f"✅ Game {game_id} created successfully")
        else:
            print(f"❌ Failed to create game: {response_data}")
            return None, None
        
        return game_id, connection
    
    except Exception as e:
        print(f"❌ Error creating game: {e}")
        return None, None

async def disconnect(connection):
    """Close a WebSocket connection"""
    if connection:
        await connection.close()

async def check_game_in_redis(game_id):
    """Check if a game exists in Redis"""
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    try:
        # Game state key
        game_key = f"{RedisKeyPrefix.GAME.value}:{game_id}"
        
        # Check if the key exists
        exists = await redis.exists(game_key)
        
        if exists:
            # Get the game state
            game_data = await redis.get(game_key)
            print(f"✅ Game {game_id} found in Redis with data: {game_data}")
            return True
        else:
            print(f"❌ Game {game_id} not found in Redis")
            return False
    
    except Exception as e:
        print(f"❌ Error checking game in Redis: {e}")
        return False
    
    finally:
        await redis.close()

async def main():
    """Main test function"""
    # Create a game
    game_id, connection = await connect_and_create_game()
    
    # If game created successfully
    if game_id:
        # Wait a moment for Redis to update
        await asyncio.sleep(1)
        
        # Check if game exists in Redis
        await check_game_in_redis(game_id)
        
        # Close the connection
        await disconnect(connection)

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())