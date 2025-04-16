import asyncio
import logging
import sys
import os
import time
import json
import websockets
import signal
import argparse
from dotenv import load_dotenv

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MockClient:
    """Simulates a client that can connect, disconnect, and reconnect to the game server"""
    def __init__(self, url, name=None):
        self.url = url
        self.name = name or f"Client-{id(self) % 1000}"
        self.websocket = None
        self.clientId = None
        self.gameId = None
        self.role = None
        self.messages = []
        self.connected = False
        self.reconnected = False
    
    async def connect(self):
        """Connect to the WebSocket server"""
        try:
            self.websocket = await websockets.connect(self.url)
            self.connected = True
            logger.info(f"{self.name} connected to {self.url}")
            # Start the message listener
            asyncio.create_task(self.listen())
            return True
        except Exception as e:
            logger.error(f"{self.name} failed to connect: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from the WebSocket server"""
        if self.websocket:
            await self.websocket.close()
            self.websocket = None
            self.connected = False
            logger.info(f"{self.name} disconnected")
            return True
        return False
    
    async def send(self, message):
        """Send a message to the WebSocket server"""
        if not self.websocket:
            logger.error(f"{self.name} not connected, can't send message")
            return False
        
        try:
            msg_json = json.dumps(message)
            await self.websocket.send(msg_json)
            logger.info(f"{self.name} sent: {message.get('action')}")
            return True
        except Exception as e:
            logger.error(f"{self.name} failed to send message: {e}")
            return False
    
    async def listen(self):
        """Listen for messages from the WebSocket server"""
        if not self.websocket:
            logger.error(f"{self.name} not connected, can't listen")
            return
        
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    self.messages.append(data)
                    action = data.get("action")
                    
                    # Handle different message types
                    if action == "gameInitialized":
                        self.clientId = data.get("clientId")
                        self.gameId = data.get("gameId")
                        self.role = data.get("role")
                        logger.info(f"{self.name} initialized game {self.gameId} as {self.role}")
                    
                    elif action == "gameJoined":
                        self.clientId = data.get("clientId")
                        self.gameId = data.get("gameId")
                        self.role = data.get("role")
                        logger.info(f"{self.name} joined game {self.gameId} as {self.role}")
                    
                    elif action == "reconnected":
                        self.reconnected = True
                        logger.info(f"{self.name} reconnected to game {self.gameId} with state: {data.get('gameState', {}).get('status')}")
                    
                    logger.info(f"{self.name} received: {action}")
                
                except json.JSONDecodeError:
                    logger.error(f"{self.name} received invalid JSON")
        
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"{self.name} connection closed")
            self.connected = False
        
        except Exception as e:
            logger.error(f"{self.name} error in listen: {e}")
            self.connected = False
    
    async def reconnect(self):
        """Reconnect to the WebSocket server"""
        if self.websocket:
            await self.disconnect()
        
        reconnect_success = await self.connect()
        if reconnect_success and self.clientId and self.gameId:
            await self.send({
                "action": "reconnect",
                "clientId": self.clientId,
                "gameId": self.gameId,
                "role": self.role
            })
            
            # Wait a moment for reconnection to process
            await asyncio.sleep(1)
            
            if self.reconnected:
                logger.info(f"{self.name} successfully reconnected to game {self.gameId}")
                return True
            else:
                logger.error(f"{self.name} reconnection message sent but no confirmation received")
                return False
        return False

async def test_basic_reconnection(host_url, player_url):
    """
    Test reconnection when a client disconnects and reconnects.
    
    Steps:
    1. Host creates a game
    2. Player joins the game
    3. Host starts the game
    4. Player disconnects
    5. Player reconnects
    6. Verify game state is recovered
    """
    logger.info("=== Starting Basic Reconnection Test ===")
    
    # Create host client
    host = MockClient(host_url, "Host")
    await host.connect()
    
    # Host creates a game
    await host.send({"action": "initializeGame"})
    
    # Wait for game to be created
    await asyncio.sleep(1)
    
    if not host.gameId:
        logger.error("Failed to create game")
        return False
    
    logger.info(f"Game created with ID: {host.gameId}")
    
    # Create player client
    player = MockClient(player_url, "Player")
    await player.connect()
    
    # Player joins the game
    await player.send({
        "action": "joinGame",
        "gameId": host.gameId
    })
    
    # Wait for player to join
    await asyncio.sleep(1)
    
    if not player.gameId:
        logger.error("Player failed to join game")
        return False
    
    # Host starts the game
    await host.send({
        "action": "startGame",
        "gameId": host.gameId,
        "clientId": host.clientId
    })
    
    # Wait for game to start
    await asyncio.sleep(1)
    
    # Simulate player disconnection
    logger.info("Simulating player disconnection...")
    await player.disconnect()
    
    # Wait a moment
    await asyncio.sleep(2)
    
    # Player reconnects
    logger.info("Reconnecting player...")
    reconnect_result = await player.reconnect()
    
    if reconnect_result:
        logger.info("✅ Basic reconnection test PASSED")
        return True
    else:
        logger.error("❌ Basic reconnection test FAILED")
        return False

async def test_server_failure_reconnection(host_url, player_url, alternate_url):
    """
    Test reconnection when a server goes down and clients connect to another server.
    
    For this test to work properly, you need to have two server instances running.
    
    Steps:
    1. Host creates a game (on server 1)
    2. Player joins the game (on server 1)
    3. Host starts the game
    4. Simulate server 1 failure by disconnecting both clients
    5. Both clients reconnect to server 2
    6. Verify game state is recovered
    """
    logger.info("=== Starting Server Failure Reconnection Test ===")
    
    # Create host client on first server
    host = MockClient(host_url, "Host")
    await host.connect()
    
    # Host creates a game
    await host.send({"action": "initializeGame"})
    
    # Wait for game to be created
    await asyncio.sleep(1)
    
    if not host.gameId:
        logger.error("Failed to create game")
        return False
    
    logger.info(f"Game created with ID: {host.gameId}")
    
    # Create player client on first server
    player = MockClient(player_url, "Player")
    await player.connect()
    
    # Player joins the game
    await player.send({
        "action": "joinGame",
        "gameId": host.gameId
    })
    
    # Wait for player to join
    await asyncio.sleep(1)
    
    # Host starts the game
    await host.send({
        "action": "startGame",
        "gameId": host.gameId,
        "clientId": host.clientId
    })
    
    # Wait for game to start
    await asyncio.sleep(1)
    
    logger.info("Game is now active with host and player")
    
    # Simulate server failure by disconnecting both clients
    logger.info("Simulating server failure...")
    await host.disconnect()
    await player.disconnect()
    
    # Wait a moment
    await asyncio.sleep(2)
    
    # Update URLs to connect to alternate server
    host.url = alternate_url
    player.url = alternate_url
    
    # Reconnect both clients to the alternate server
    logger.info("Reconnecting clients to alternate server...")
    host_reconnect = await host.reconnect()
    player_reconnect = await player.reconnect()
    
    # Check if both reconnected successfully
    if host_reconnect and player_reconnect:
        logger.info("✅ Server failure reconnection test PASSED")
        return True
    else:
        logger.error("❌ Server failure reconnection test FAILED - " +
                   f"Host reconnect: {host_reconnect}, Player reconnect: {player_reconnect}")
        return False

async def run_all_tests(server1_url, server2_url):
    """Run all reconnection tests"""
    results = []
    
    # Test 1: Basic reconnection
    basic_result = await test_basic_reconnection(server1_url, server1_url)
    results.append(("Basic Reconnection", basic_result))
    
    # Clean up from previous test
    await asyncio.sleep(1)
    
    # Test 2: Server failure reconnection (requires two servers)
    if server2_url:
        server_failure_result = await test_server_failure_reconnection(server1_url, server1_url, server2_url)
        results.append(("Server Failure Reconnection", server_failure_result))
    
    # Print summary
    logger.info("\n=== Test Results ===")
    all_passed = True
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{name}: {status}")
        all_passed = all_passed and result
    
    if all_passed:
        logger.info("\n✅ All reconnection tests PASSED!")
    else:
        logger.error("\n❌ Some reconnection tests FAILED!")
    
    return all_passed

def main():
    parser = argparse.ArgumentParser(description='Test WebSocket reconnection')
    parser.add_argument('--server1', default='ws://localhost:6789',
                        help='URL for first WebSocket server (default: ws://localhost:6789)')
    parser.add_argument('--server2', default='ws://localhost:6790',
                        help='URL for second WebSocket server (default: ws://localhost:6790)')
    parser.add_argument('--test', choices=['basic', 'server-failure', 'all'],
                        default='all', help='Which test to run (default: all)')
    
    args = parser.parse_args()
    
    if args.test == 'basic':
        asyncio.run(test_basic_reconnection(args.server1, args.server1))
    elif args.test == 'server-failure':
        asyncio.run(test_server_failure_reconnection(args.server1, args.server1, args.server2))
    else:
        asyncio.run(run_all_tests(args.server1, args.server2))

if __name__ == "__main__":
    load_dotenv()
    main()