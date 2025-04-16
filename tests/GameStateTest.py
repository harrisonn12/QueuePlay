import asyncio
import json
import logging
import sys
import os
import uuid
import time
from dotenv import load_dotenv

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.commons.adapters.RedisAdapter import RedisAdapter
from backend.configuration.RedisConfig import RedisConfig, RedisKeyPrefix
from backend.commons.enums.Stage import Stage
from backend.GameService.games.GameState import GameState
from backend.GameService.games.GameStateManager import GameStateManager

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_game_state_serialization():
    """Test game state serialization to and from dict"""
    print("\n=== Testing Game State Serialization ===")
    
    # Create a game state
    gameId = str(uuid.uuid4())
    gameState = GameState(gameId)
    gameState.active = True
    gameState.questions = [
        {"question": "What is 1+1?", "options": ["1", "2", "3", "4"], "answerIndex": 1},
        {"question": "What is the capital of France?", "options": ["London", "Paris", "Berlin", "Madrid"], "answerIndex": 1}
    ]
    gameState.currentQuestionIndex = 0
    gameState.addPlayerAnswer(0, "player1", 1)
    gameState.addPlayerAnswer(0, "player2", 2)
    gameState.scores = {"player1": 1, "player2": 0}
    
    # Serialize to dict
    data = gameState.toDict()
    
    # Deserialize from dict
    newState = GameState.fromDict(data)
    
    # Verify all properties were preserved
    if newState.gameId != gameState.gameId:
        print(f"❌ Game ID mismatch: {newState.gameId} != {gameState.gameId}")
        return False
    
    if newState.active != gameState.active:
        print(f"❌ Active state mismatch: {newState.active} != {gameState.active}")
        return False
    
    if len(newState.questions) != len(gameState.questions):
        print(f"❌ Questions count mismatch: {len(newState.questions)} != {len(gameState.questions)}")
        return False
    
    if newState.currentQuestionIndex != gameState.currentQuestionIndex:
        print(f"❌ Current question index mismatch: {newState.currentQuestionIndex} != {gameState.currentQuestionIndex}")
        return False
    
    if newState.playerAnswers.get(0, {}).get("player1") != gameState.playerAnswers.get(0, {}).get("player1"):
        print(f"❌ Player answers mismatch")
        return False
    
    if newState.scores.get("player1") != gameState.scores.get("player1"):
        print(f"❌ Scores mismatch")
        return False
    
    print("✅ Game state serialization test passed!")
    return True

async def test_game_state_persistence():
    """Test saving and loading game state from Redis"""
    print("\n=== Testing Game State Persistence ===")
    
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    # Create a game state manager
    gameStateManager = GameStateManager(redis)
    
    # Create a game state
    gameId = str(uuid.uuid4())
    gameState = GameState(gameId)
    gameState.active = True
    gameState.questions = [
        {"question": "What is 1+1?", "options": ["1", "2", "3", "4"], "answerIndex": 1},
        {"question": "What is the capital of France?", "options": ["London", "Paris", "Berlin", "Madrid"], "answerIndex": 1}
    ]
    gameState.currentQuestionIndex = 0
    gameState.addPlayerAnswer(0, "player1", 1)
    gameState.addPlayerAnswer(0, "player2", 2)
    gameState.scores = {"player1": 1, "player2": 0}
    
    try:
        # Save game state to Redis
        success = await gameStateManager.saveGameState(gameState)
        if not success:
            print("❌ Failed to save game state to Redis")
            return False
        
        print(f"✅ Game state saved to Redis with ID {gameId}")
        
        # Load game state from Redis
        loadedState = await gameStateManager.loadGameState(gameId)
        if not loadedState:
            print("❌ Failed to load game state from Redis")
            return False
        
        print(f"✅ Game state loaded from Redis with ID {gameId}")
        
        # Verify all properties were preserved
        if loadedState.gameId != gameState.gameId:
            print(f"❌ Game ID mismatch: {loadedState.gameId} != {gameState.gameId}")
            return False
        
        if loadedState.active != gameState.active:
            print(f"❌ Active state mismatch: {loadedState.active} != {gameState.active}")
            return False
        
        if len(loadedState.questions) != len(gameState.questions):
            print(f"❌ Questions count mismatch: {len(loadedState.questions)} != {len(gameState.questions)}")
            return False
        
        if loadedState.currentQuestionIndex != gameState.currentQuestionIndex:
            print(f"❌ Current question index mismatch: {loadedState.currentQuestionIndex} != {gameState.currentQuestionIndex}")
            return False
        
        # Delete game state from Redis
        deleted = await gameStateManager.deleteGameState(gameId)
        if not deleted:
            print("❌ Failed to delete game state from Redis")
            return False
        
        print(f"✅ Game state deleted from Redis with ID {gameId}")
        
        # Verify game state is gone
        loadedState = await gameStateManager.loadGameState(gameId)
        if loadedState:
            print("❌ Game state still exists after deletion")
            return False
        
        print("✅ Game state persistence test passed!")
        return True
    
    except Exception as e:
        print(f"❌ Error during game state persistence test: {e}")
        return False
    finally:
        await redis.close()

async def test_game_state_listing():
    """Test listing games from Redis"""
    print("\n=== Testing Game State Listing ===")
    
    # Initialize Redis
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    # Create a game state manager
    gameStateManager = GameStateManager(redis)
    
    # Create multiple game states
    gameIds = []
    for i in range(3):
        gameId = str(uuid.uuid4())
        gameIds.append(gameId)
        
        gameState = GameState(gameId)
        gameState.active = True
        gameState.questions = [{"question": f"Question {i}", "options": ["A", "B", "C", "D"], "answerIndex": 0}]
        
        # Save game state to Redis
        await gameStateManager.saveGameState(gameState)
    
    try:
        # List games
        games = await gameStateManager.listGames()
        
        # Verify our test games are in the list
        for gameId in gameIds:
            if gameId not in games:
                print(f"❌ Game {gameId} not found in list")
                return False
        
        print(f"✅ Found {len(games)} games including our {len(gameIds)} test games")
        
        # Clean up
        for gameId in gameIds:
            await gameStateManager.deleteGameState(gameId)
        
        print("✅ Game state listing test passed!")
        return True
    
    except Exception as e:
        print(f"❌ Error during game state listing test: {e}")
        return False
    finally:
        # Clean up any remaining games
        for gameId in gameIds:
            try:
                await gameStateManager.deleteGameState(gameId)
            except:
                pass
        
        await redis.close()

async def run_tests():
    """Run all game state tests"""
    print("Starting game state management tests...")
    
    # Test game state serialization
    serialization_result = await test_game_state_serialization()
    
    # Test game state persistence
    persistence_result = await test_game_state_persistence()
    
    # Test game state listing
    listing_result = await test_game_state_listing()
    
    # Print summary
    print("\n=== Test Results ===")
    print(f"Game State Serialization: {'✅ PASSED' if serialization_result else '❌ FAILED'}")
    print(f"Game State Persistence:   {'✅ PASSED' if persistence_result else '❌ FAILED'}")
    print(f"Game State Listing:       {'✅ PASSED' if listing_result else '❌ FAILED'}")
    
    # Overall result
    if serialization_result and persistence_result and listing_result:
        print("\n✅ All game state tests PASSED!")
    else:
        print("\n❌ Some tests FAILED!")

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(run_tests())