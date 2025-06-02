import os
import asyncio
from redis.asyncio import Redis

async def test_redis_connection():
    redis_url = os.environ.get('REDIS_URL')
    print(f'Testing Redis connection...')
    print(f'REDIS_URL scheme: {redis_url.split("://")[0] if redis_url else "None"}')
    
    try:
        # Create client using from_url (same as our app)
        client = Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_timeout=10
        )
        print('✓ Redis client created successfully')
        
        # Test the connection
        result = await client.ping()
        print(f'✓ Ping successful: {result}')
        
        # Test a simple operation
        await client.set('test_key', 'test_value', ex=60)
        value = await client.get('test_key')
        print(f'✓ Set/Get test successful: {value}')
        
        await client.close()
        print('✓ All Redis tests passed!')
        
    except Exception as e:
        print(f'✗ Redis connection failed: {e}')
        print(f'✗ Error type: {type(e).__name__}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_redis_connection()) 