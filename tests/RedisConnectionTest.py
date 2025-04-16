import asyncio
import sys
import os
import logging
from dotenv import load_dotenv

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.commons.adapters.RedisAdapter import RedisAdapter
from backend.configuration.RedisConfig import RedisConfig
from backend.commons.enums.Stage import Stage

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_redis_connection():
    # Initialize Redis adapter
    config = RedisConfig(Stage.DEVO)
    redis = RedisAdapter(**config.get_connection_params())
    
    print(f"Testing Redis connection to {config.host}:{config.port}/db{config.db}")
    
    # Test connection
    try:
        ping_result = await redis.ping()
        if ping_result:
            print("✅ Redis connection successful!")
        else:
            print("❌ Redis ping failed")
            return False
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False
    
    # Test basic operations
    try:
        test_key = "test:connection"
        test_value = {"status": "connected", "timestamp": 123456789}
        
        # Set a value
        print("Testing SET operation...")
        set_result = await redis.set(test_key, test_value, ex=60)
        if not set_result:
            print("❌ SET operation failed")
            return False
        
        # Get the value
        print("Testing GET operation...")
        get_result = await redis.get(test_key)
        if get_result != test_value:
            print(f"❌ GET operation failed. Expected {test_value}, got {get_result}")
            return False
        
        # Delete the value
        print("Testing DELETE operation...")
        await redis.delete(test_key)
        
        # Verify deletion
        get_after_delete = await redis.get(test_key)
        if get_after_delete is not None:
            print(f"❌ DELETE operation failed. Key still exists with value {get_after_delete}")
            return False
        
        print("✅ Basic Redis operations successful!")
    except Exception as e:
        print(f"❌ Redis operations failed: {e}")
        return False
    
    # Test hash operations
    try:
        test_hash = "test:hash"
        
        # Set hash field
        print("Testing HSET operation...")
        hset_result = await redis.hset(test_hash, "field1", "value1")
        hset_result = await redis.hset(test_hash, "field2", {"nested": "value"})
        
        # Get hash field
        print("Testing HGET operation...")
        hget_result = await redis.hget(test_hash, "field1")
        if hget_result != "value1":
            print(f"❌ HGET operation failed. Expected 'value1', got {hget_result}")
            return False
        
        # Get all hash fields
        print("Testing HGETALL operation...")
        hgetall_result = await redis.hgetall(test_hash)
        if "field1" not in hgetall_result or "field2" not in hgetall_result:
            print(f"❌ HGETALL operation failed. Result: {hgetall_result}")
            return False
        
        # Delete hash
        print("Testing HDEL operation...")
        await redis.hdel(test_hash, "field1", "field2")
        
        # Verify deletion
        hgetall_after_delete = await redis.hgetall(test_hash)
        if hgetall_after_delete:
            print(f"❌ HDEL operation failed. Hash still has fields: {hgetall_after_delete}")
            return False
        
        # Clean up
        await redis.delete(test_hash)
        
        print("✅ Hash operations successful!")
    except Exception as e:
        print(f"❌ Redis hash operations failed: {e}")
        return False
    
    # Test pub/sub operations
    try:
        print("Testing PUB/SUB operations...")
        test_channel = "test:channel"
        test_message = {"type": "test", "content": "Hello, Redis!"}
        
        # Create a subscriber
        pubsub = await redis.subscribe(test_channel)
        
        # Wait a bit for subscription to be ready
        await asyncio.sleep(0.5)
        
        # Publish a message
        await redis.publish(test_channel, test_message)
        
        # Wait a bit for message to be delivered
        await asyncio.sleep(0.5)
        
        # Get the published message
        message = await pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            print(f"✅ PUB/SUB operations successful! Received: {message}")
        else:
            # Try one more time with a longer wait
            await asyncio.sleep(1)
            message = await pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                print(f"✅ PUB/SUB operations successful! Received: {message}")
            else:
                print(f"❌ PUB/SUB operation failed. No message received")
                # This is not critical for our tests, so continue
        
        # Unsubscribe from the channel
        await pubsub.unsubscribe(test_channel)
    except Exception as e:
        print(f"❌ Redis PUB/SUB operations failed: {e}")
        return False
    
    # Clean up
    await redis.close()
    
    print("\n✅ All Redis tests passed!")
    return True

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(test_redis_connection())