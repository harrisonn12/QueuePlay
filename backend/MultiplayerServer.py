import asyncio
import websockets
import logging
import os
import signal
import argparse
import json
import time
import sys
from aiohttp import web
from dotenv import load_dotenv

# Add the current directory to Python path so backend imports work

from ConnectionService.ConnectionService import ConnectionService
from commons.adapters.RedisAdapter import RedisAdapter
from MessageService.MessageService import MessageService
from configuration.RedisConfig import RedisConfig
from configuration.AppConfig import AppConfig
from commons.enums.Stage import Stage


# Set up logging
logging.basicConfig(
    #level=logging.DEBUG,
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service references for cleanup
connection_service = None
message_service = None
redis_adapter = None

async def shutdown(signal, loop):
    """Cleanup tasks tied to the service's shutdown."""
    logger.info(f"Received exit signal {signal.name}...")

    if connection_service:
        # Assuming ConnectionService might have a stop method if needed in future
        # await connection_service.stop()
        pass
    if message_service:
        await message_service.stop()

    if redis_adapter:
        logger.info("Closing Redis connections...")
        await redis_adapter.close()

    # Send deregistration message to load balancer
    if connection_service and message_service:
        try:
            # Use a known server_id if connection_service is gone
            server_id_for_shutdown = os.environ.get("SERVER_ID", "unknown-server")
            if hasattr(connection_service, 'serverId'):
                 server_id_for_shutdown = connection_service.serverId
            await message_service.publish_event(
                "server:shutdown",
                {
                    "serverId": server_id_for_shutdown,
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
    """Periodic health check for Redis"""
    try:
        while True:
            # Check Redis connection
            if redis_adapter:
                redis_alive = await redis_adapter.ping()
                if not redis_alive:
                    logger.error("Redis connection is down!")
            else:
                 # If redis_adapter isn't even initialized, log that
                 logger.warning("Health check: Redis adapter not initialized yet.")

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
    """
    HTTP handler for the /health endpoint.

    This is like a health inspection report - when someone (like a load balancer)
    asks "is this server healthy?", we check and return a detailed report.
    """
    # Check Redis connection
    is_healthy = True
    status_message = "OK"
    redis_status = "unknown"

    if redis_adapter:
        try:
            redis_alive = await redis_adapter.ping()
            if not redis_alive:
                is_healthy = False
                status_message = "Redis connection is down"
                redis_status = "down"
            else:
                redis_status = "connected"
        except Exception as e:
            is_healthy = False
            status_message = f"Redis error: {str(e)}"
            redis_status = "error"
    else:
        is_healthy = False # Cannot operate without Redis
        status_message = "Redis adapter not initialized"
        redis_status = "uninitialized"

    # Get connection count if possible
    num_connections = 0
    if connection_service and hasattr(connection_service, 'localConnections'):
        num_connections = len(connection_service.localConnections)

    # Create health status response
    health_data = {
        "status": "healthy" if is_healthy else "unhealthy",
        "message": status_message,
        "redis_status": redis_status,
        "server_id": os.environ.get("SERVER_ID", "unknown"),
        "active_connections": num_connections
    }

    status_code = 200 if is_healthy else 503
    return web.json_response(health_data, status=status_code)

async def setup_health_server(health_port):
    """Set up HTTP server for health checks. Runs once during startup."""
    try:
        app = web.Application()
        app.add_routes([web.get('/health', health_handler)])
        
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '0.0.0.0', health_port)
        await site.start()
        logger.info(f"Health check server started on port {health_port}")
        return runner
    except OSError as e:
        if e.errno == 48:  # Address already in use
            logger.error(f"Health check port {health_port} is already in use. Another server instance may be running.")
            raise RuntimeError(f"Port {health_port} is already in use")
        else:
            logger.error(f"Failed to start health check server on port {health_port}: {e}")
            raise
    except Exception as e:
        logger.error(f"Unexpected error starting health check server: {e}")
        raise

async def main(args):
    global connection_service, message_service, redis_adapter

    # STEP 1) Get config from arguments, environment variables, or use defaults
    host = args.host if args.host else os.environ.get("WS_HOST", "0.0.0.0")  # Bind to all interfaces
    port = args.port if args.port else int(os.environ.get("WS_PORT", "6789"))
    health_port = args.health_port if args.health_port else int(os.environ.get("HEALTH_PORT", port + 1))
    server_id = os.environ.get("SERVER_ID", f"server-{port}")
    stage_str = os.environ.get("STAGE", "DEVO")
    stage = Stage[stage_str] if stage_str in Stage.__members__ else Stage.DEVO

    # Log server info
    logger.info(f"Starting WebSocket server {server_id} on {host}:{port}")

    # STEP 1.5) Initialize Redis Config
    # Use RedisConfig instead of AppConfig for proper REDIS_URL handling
    redis_config = RedisConfig(stage=stage)

    # STEP 2) Initialize Redis adapter using RedisConfig
    # Pass the RedisConfig instance to RedisAdapter
    redis_adapter = RedisAdapter(redis_config=redis_config)
    logger.info(f"Initialized Redis adapter using RedisConfig")

    # Test Redis connection
    # No need to log host/port here again, RedisAdapter init does it
    redis_alive = await redis_adapter.ping()
    if not redis_alive:
        logger.error("Could not connect to Redis!")
        return

    # STEP 3) Initialize message service first (for pub/sub)
    message_service = MessageService(redis_adapter)
    await message_service.start()

    # STEP 6: Initialize connection service
    connection_service = ConnectionService()
    connection_service.messageService = message_service # Connect to Message Service
    await connection_service.start()

    # STEP 7) Set up signal handlers for graceful shutdown
    loop = asyncio.get_running_loop()
    signals = (signal.SIGHUP, signal.SIGTERM, signal.SIGINT)
    for s in signals:
        loop.add_signal_handler(
            s, lambda s=s: asyncio.create_task(shutdown(s, loop))
        )

    # STEP 8) Start up background health check
    asyncio.create_task(health_check())

    # STEP 9) Set up health check HTTP server
    health_runner = await setup_health_server(health_port)

    # STEP 10) Start the WebSocket server
    try:
        async with websockets.serve(connection_service.handleConnection, host, port):
            logger.info(f"WebSocket server {server_id} started on ws://{host}:{port}")
            logger.info(f"Health check endpoint available at http://{host}:{health_port}/health")
            logger.info(f"Server ready! Redis and all services started successfully.")
            
            # Run forever
            await asyncio.Future()
    except OSError as e:
        if e.errno == 48:  # Address already in use
            logger.error(f"WebSocket port {port} is already in use. Another server instance may be running.")
            logger.error(f"Please check if another instance is running with: lsof -i :{port}")
            raise RuntimeError(f"Port {port} is already in use")
        else:
            logger.error(f"Failed to start WebSocket server on port {port}: {e}")
            raise
    except Exception as e:
        logger.error(f"Unexpected error starting WebSocket server: {e}")
        raise

# command line interface
def parse_args():
    """
    Parse command-line arguments to allow configuration when starting the server.

    This is like having switches and dials to adjust before starting a machine.
    """
    parser = argparse.ArgumentParser(description='QueuePlay Multiplayer Game Server')
    parser.add_argument('--host', type=str, help='Host to bind the WebSocket server (default from env or localhost)')
    parser.add_argument('--port', type=int, help='Port to bind the WebSocket server (default from env or 6789)')
    parser.add_argument('--health-port', type=int, help='Port for health check endpoint (default: WS_PORT+1)')
    return parser.parse_args()

# main entry point
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
