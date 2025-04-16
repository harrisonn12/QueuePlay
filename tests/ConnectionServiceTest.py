import asyncio
import json
import logging
import sys
import os
import time
import websockets
import uuid
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

# Test configuration
SERVER_URL = os.environ.get("WS_URL", "ws://localhost:6789")

async def connect_client():
    try:
        # Generate a client ID
        client_id = str(uuid.uuid4())
        
        # Connect to WebSocket server
        connection = await websockets.connect(SERVER_URL)
        print(f"Connected client {client_id}")
        
        return connection, client_id
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        return None, None

async def disconnect_client(connection):
    if connection:
        await connection.close()
        print("Disconnected client")

async def send_message(connection, message):
    if connection:
        await connection.send(json.dumps(message))
        print(f"Sent message: {message}")

async def receive_message(connection, timeout=5):
    if connection:
        try:
            message = await asyncio.wait_for(connection.recv(), timeout=timeout)
            return json.loads(message)
        except asyncio.TimeoutError:
            print("❌ Timeout waiting for message")
            return None
        except Exception as e:
            print(f"❌ Error receiving message: {e}")
            return None
    return None

async def test_connection_lifecycle():
    """Test the connection lifecycle: connect, send, receive, disconnect"""
    # Initialize Redis to check connection state
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    print("\n=== Testing Connection Lifecycle ===")
    
    # Connect a client
    connection, client_id = await connect_client()
    if not connection:
        print("❌ Failed to connect client")
        return False
    
    try:
        # Send an initialization message
        await send_message(connection, {
            "clientId": client_id,
            "action": "echo",
            "message": "hello"
        })
        
        # Wait a moment for the connection to be registered
        await asyncio.sleep(1)
        
        # Check if the connection is registered in Redis
        connection_key = f"{RedisKeyPrefix.CONNECTION.value}:{client_id}"
        connection_data = await redis.get(connection_key)
        
        if connection_data:
            print(f"✅ Connection registered in Redis: {connection_data}")
        else:
            print("❌ Connection not found in Redis")
            return False
        
        # Disconnect the client
        await disconnect_client(connection)
        
        # Wait a moment for the disconnection to be processed
        await asyncio.sleep(1)
        
        # Check if the connection is removed from Redis
        connection_exists = await redis.exists(connection_key)
        if not connection_exists:
            print("✅ Connection removed from Redis after disconnect")
        else:
            print("❌ Connection still exists in Redis after disconnect")
            return False
        
        print("✅ Connection lifecycle test passed!")
        return True
    
    except Exception as e:
        print(f"❌ Error during connection lifecycle test: {e}")
        # Ensure disconnect in case of error
        await disconnect_client(connection)
        return False
    finally:
        await redis.close()

async def test_connection_expiration():
    """Test that connections expire if not refreshed"""
    # Initialize Redis to check connection state
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    print("\n=== Testing Connection Expiration ===")
    
    try:
        # Manually create a connection in Redis with a short expiration
        client_id = str(uuid.uuid4())
        connection_key = f"{RedisKeyPrefix.CONNECTION.value}:{client_id}"
        
        # Create test connection data
        connection_data = {
            "clientId": client_id,
            "serverId": "test-server",
            "connected": int(time.time()),
            "lastActive": int(time.time())
        }
        
        # Store in Redis with 2 second expiration
        await redis.set(connection_key, connection_data, ex=2)
        
        # Verify it exists
        exists = await redis.exists(connection_key)
        if exists:
            print("✅ Test connection created in Redis")
        else:
            print("❌ Failed to create test connection in Redis")
            return False
        
        # Wait for expiration
        print("Waiting for connection to expire...")
        await asyncio.sleep(3)
        
        # Verify it's gone
        exists = await redis.exists(connection_key)
        if not exists:
            print("✅ Connection expired successfully")
        else:
            print("❌ Connection did not expire as expected")
            return False
        
        print("✅ Connection expiration test passed!")
        return True
    
    except Exception as e:
        print(f"❌ Error during connection expiration test: {e}")
        return False
    finally:
        await redis.close()

async def test_multiple_clients():
    """Test handling multiple clients simultaneously"""
    print("\n=== Testing Multiple Clients ===")
    
    # Connect multiple clients
    num_clients = 5
    clients = []
    
    try:
        # Connect all clients
        for i in range(num_clients):
            connection, client_id = await connect_client()
            if not connection:
                print(f"❌ Failed to connect client {i+1}")
                return False
            
            clients.append((connection, client_id))
            
            # Send initialization message
            await send_message(connection, {
                "clientId": client_id,
                "action": "echo",
                "message": f"hello from client {i+1}"
            })
        
        # Wait a moment for all connections to be registered
        await asyncio.sleep(1)
        
        print(f"✅ Successfully connected {num_clients} clients")
        
        # Disconnect all clients
        for connection, _ in clients:
            await disconnect_client(connection)
        
        print("✅ Multiple clients test passed!")
        return True
    
    except Exception as e:
        print(f"❌ Error during multiple clients test: {e}")
        return False
    finally:
        # Ensure all clients are disconnected
        for connection, _ in clients:
            try:
                await disconnect_client(connection)
            except:
                pass

async def run_tests():
    """Run all connection tests"""
    print("Starting connection management tests...")
    
    # Test connection lifecycle
    lifecycle_result = await test_connection_lifecycle()
    
    # Test connection expiration
    import time  # Import needed for the expiration test
    expiration_result = await test_connection_expiration()
    
    # Test multiple clients
    multiple_clients_result = await test_multiple_clients()
    
    # Print summary
    print("\n=== Test Results ===")
    print(f"Connection Lifecycle: {'✅ PASSED' if lifecycle_result else '❌ FAILED'}")
    print(f"Connection Expiration: {'✅ PASSED' if expiration_result else '❌ FAILED'}")
    print(f"Multiple Clients: {'✅ PASSED' if multiple_clients_result else '❌ FAILED'}")
    
    # Overall result
    if lifecycle_result and expiration_result and multiple_clients_result:
        print("\n✅ All connection tests PASSED!")
    else:
        print("\n❌ Some tests FAILED!")

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(run_tests())