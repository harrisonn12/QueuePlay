import asyncio
import websockets
import logging
import os
import signal
import argparse
import json
import time
from aiohttp import web
from dotenv import load_dotenv
from backend.ConnectionService.ConnectionService import ConnectionService
from backend.GameService.GameService import GameService
from backend.commons.adapters.RedisAdapter import RedisAdapter
from backend.MessageService.MessageService import MessageService
from backend.configuration.RedisConfig import RedisConfig, RedisChannelPrefix
from backend.commons.enums.Stage import Stage


#FLOW:
#1. Server creates redis_adapter
#2. Server creates message_service = MessageService(redis_adapter)
#3. Server creates game_service = GameService(redis_adapter)
#4. Server creates connection_service = ConnectionService()
#5. Server sets connection_service.redis = redis_adapter
#6. Server sets connection_service.gameService = game_service
#7. Server sets connection_service.messageService = message_service


# Set up logging
logging.basicConfig(
    #level=logging.DEBUG,
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service references for cleanup
connection_service = None
game_service = None
message_service = None
redis_adapter = None

async def shutdown(signal, loop):
    """Cleanup tasks tied to the service's shutdown."""
    logger.info(f"Received exit signal {signal.name}...")
    
    # Stop services in reverse order
    if game_service:
        logger.info("Stopping game service...")
        await game_service.stop()
    
    if connection_service:
        logger.info("Stopping connection service...")
        await connection_service.stop()
    
    if message_service:
        logger.info("Stopping message service...")
        await message_service.stop()
    
    if redis_adapter:
        logger.info("Closing Redis connections...")
        await redis_adapter.close()
    
    # Send deregistration message to load balancer
    if connection_service and message_service:
        try:
            await message_service.publish_event(
                "server:shutdown",
                {
                    "serverId": os.environ.get("SERVER_ID", connection_service.serverId),
                    "timestamp": int(time.time())
                }
            )
            logger.info("Sent server shutdown notification")
        except Exception as e:
            logger.error(f"Failed to send shutdown notification: {e}")
    
    # Cancel any remaining tasks
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    
    if tasks:
        logger.info(f"Cancelling {len(tasks)} outstanding tasks...")
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    
    logger.info("Shutdown complete.")
    loop.stop()

async def health_check():
    """Periodic health check for the server"""
    try:
        while True:
            # Check Redis connection
            if redis_adapter:
                redis_alive = await redis_adapter.ping()
                if not redis_alive:
                    logger.error("Redis connection is down!")
            
            # Additional health checks could go here
            
            # Sleep for 60 seconds before next check
            await asyncio.sleep(60)
    
    except asyncio.CancelledError:
        logger.info("Health check task cancelled")
        raise
    
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        # Restart the task after a brief delay
        await asyncio.sleep(5)
        asyncio.create_task(health_check())

async def health_handler(request):
    """Health check endpoint for the load balancer"""
    # Check Redis connection
    is_healthy = True
    status_message = "OK"
    
    if redis_adapter:
        try:
            redis_alive = await redis_adapter.ping()
            if not redis_alive:
                is_healthy = False
                status_message = "Redis connection is down"
        except Exception as e:
            is_healthy = False
            status_message = f"Redis error: {str(e)}"
    else:
        status_message = "Server initializing"
    
    # Create health status response
    health_data = {
        "status": "healthy" if is_healthy else "unhealthy",
        "message": status_message,
        "serverId": os.environ.get("SERVER_ID", "unknown"),
        "connections": len(connection_service.localConnections) if connection_service else 0,
        "games": len(game_service.games) if game_service else 0,
    }
    
    status_code = 200 if is_healthy else 503
    return web.json_response(health_data, status=status_code)

async def setup_health_server(health_port):
    """Set up HTTP server for health checks"""
    app = web.Application()
    app.add_routes([web.get('/health', health_handler)])
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', health_port)
    await site.start()
    logger.info(f"Health check server started on port {health_port}")
    return runner

async def main(args):
    global connection_service, game_service, message_service, redis_adapter
    
    # Get host and port from arguments, environment variables, or use defaults
    host = args.host if args.host else os.environ.get("WS_HOST", "0.0.0.0")  # Bind to all interfaces
    port = args.port if args.port else int(os.environ.get("WS_PORT", "6789"))
    health_port = args.health_port if args.health_port else int(os.environ.get("HEALTH_PORT", port + 1))
    server_id = os.environ.get("SERVER_ID", f"server-{port}")
    stage_str = os.environ.get("STAGE", "DEVO")
    stage = Stage[stage_str] if stage_str in Stage.__members__ else Stage.DEVO
    
    # Log server info
    logger.info(f"Starting WebSocket server {server_id} on {host}:{port}")
    
    # Initialize Redis adapter
    redis_config = RedisConfig(stage)
    #middleman between app code and redis server. handles all communication with Redis.
    #everything goes through this redis client.
    #redis client does not maintain subscription state.  
    redis_adapter = RedisAdapter(**redis_config.get_connection_params())
    logger.info(f"Connecting to Redis at {redis_config.host}:{redis_config.port}")
    
    # Test Redis connection
    redis_alive = await redis_adapter.ping()
    if not redis_alive:
        logger.error("Could not connect to Redis!")
        return
    
    # Initialize message service first (for pub/sub)
    message_service = MessageService(redis_adapter)
    await message_service.start()
    
    # Initialize game service
    game_service = GameService(redis_adapter)
    game_service.messageService = message_service
    # Register system message handlers
    await message_service.subscribe(f"{RedisChannelPrefix.GAME.value}:all", game_service.handleGameEvent)
    await game_service.start()
    
    # Initialize connection service
    connection_service = ConnectionService()
    connection_service.redis = redis_adapter
    connection_service.gameService = game_service
    connection_service.messageService = message_service
    # Register connection message handlers
    await message_service.subscribe(f"{RedisChannelPrefix.CONNECTION.value}:all", connection_service.handleConnectionEvent)
    await connection_service.start()
    
    # Start health check
    asyncio.create_task(health_check())
    
    # Set up signal handlers for graceful shutdown
    loop = asyncio.get_running_loop()
    signals = (signal.SIGHUP, signal.SIGTERM, signal.SIGINT)
    for s in signals:
        loop.add_signal_handler(
            s, lambda s=s: asyncio.create_task(shutdown(s, loop))
        )
    
    # Set up health check HTTP server
    health_runner = await setup_health_server(health_port)
    
    # Start the WebSocket server
    async with websockets.serve(connection_service.handleConnection, host, port):
        logger.info(f"WebSocket server {server_id} started on ws://{host}:{port}")
        logger.info(f"Health check endpoint available at http://{host}:{health_port}/health")
        logger.info(f"Server ready! Redis and all services started successfully.")
        
        # Run forever
        await asyncio.Future()

def parse_args():
    parser = argparse.ArgumentParser(description='QueuePlay Multiplayer Game Server')
    parser.add_argument('--host', type=str, help='Host to bind the WebSocket server (default from env or localhost)')
    parser.add_argument('--port', type=int, help='Port to bind the WebSocket server (default from env or 6789)')
    parser.add_argument('--health-port', type=int, help='Port for health check endpoint (default: WS_PORT+1)')
    return parser.parse_args()

if __name__ == "__main__":
    load_dotenv()
    try:
        # Parse command line arguments
        args = parse_args()
        
        asyncio.run(main(args))
    except KeyboardInterrupt:
        logger.info("Server stopped by keyboard interrupt")
    except Exception as e:
        logger.error(f"Server error: {e}")
    finally:
        logger.info("Server shutdown complete")
