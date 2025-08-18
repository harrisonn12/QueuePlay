import asyncio
import websockets
import logging
import os
import signal
import argparse
import json
import time
import sys
import secrets
from dotenv import load_dotenv

# Add the current directory to Python path so backend imports work

from ConnectionService.ConnectionService import ConnectionService
from commons.adapters.RedisAdapter import RedisAdapter
from MessageService.MessageService import MessageService
from configuration.RedisConfig import RedisConfig
from configuration.AppConfig import AppConfig
from commons.enums.Stage import Stage
from AuthService.AuthService import AuthService
from RateLimitService.RateLimitService import RateLimitService


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
auth_service = None
rate_limit_service = None

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

async def main(args):
    global connection_service, message_service, redis_adapter, auth_service, rate_limit_service

    # STEP 1) Get config from arguments, environment variables, or use defaults
    host = args.host if args.host else os.environ.get("WS_HOST", "0.0.0.0")  # Bind to all interfaces
    # Use Heroku's PORT environment variable first, then WS_PORT, then default
    port = args.port if args.port else int(os.environ.get("PORT", os.environ.get("WS_PORT", "6789")))
    server_id = os.environ.get("SERVER_ID", f"server-{port}")
    stage_str = os.environ.get("STAGE", "DEVO")
    stage = Stage[stage_str] if stage_str in Stage.__members__ else Stage.DEVO

    # Get JWT secret from environment or generate one
    JWT_SECRET = os.environ.get("JWT_SECRET")
    if not JWT_SECRET:
        if stage == Stage.PROD:
            raise ValueError("JWT_SECRET environment variable is required in production")
        else:
            JWT_SECRET = secrets.token_urlsafe(32)
            logger.warning("Using generated JWT secret for development. Set JWT_SECRET env var for production.")

    # Log server info
    logger.info(f"Starting secured WebSocket server {server_id} on {host}:{port}")

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

    # STEP 2.5) Initialize security services
    logger.info("Initializing security services...")
    try:
        auth_service = AuthService(redis_adapter, JWT_SECRET)
        rate_limit_service = RateLimitService(redis_adapter)
        logger.info("Security services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize security services: {e}")
        return

    # STEP 3) Initialize message service first (for pub/sub)
    message_service = MessageService(redis_adapter)
    await message_service.start()

    # STEP 6: Initialize connection service with security
    connection_service = ConnectionService()
    connection_service.messageService = message_service # Connect to Message Service
    
    # Ensure JWT secret is available to ConnectionService
    connection_service.jwt_secret = JWT_SECRET
    logger.info(f"🔑 MULTIPLAYER SERVER: Set JWT secret in ConnectionService (first 10 chars): {JWT_SECRET[:10]}")
    
    await connection_service.start()

    # STEP 7) Set up signal handlers for graceful shutdown
    loop = asyncio.get_running_loop()
    signals = (signal.SIGHUP, signal.SIGTERM, signal.SIGINT)
    for s in signals:
        loop.add_signal_handler(
            s, lambda s=s: asyncio.create_task(shutdown(s, loop))
        )

    # STEP 8) Start the WebSocket server
    try:
        async with websockets.serve(connection_service.handleConnection, host, port):
            logger.info(f"Secured WebSocket server {server_id} started on ws://{host}:{port}")
            logger.info(f"Security features: JWT authentication, rate limiting, WebSocket protection")
            logger.info(f"Server ready! Redis and all security services started successfully.")
            
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
    parser = argparse.ArgumentParser(description='QueuePlay Secured Multiplayer Game Server')
    parser.add_argument('--host', type=str, help='Host to bind the WebSocket server (default from env or localhost)')
    parser.add_argument('--port', type=int, help='Port to bind the WebSocket server (default from env or 6789)')
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
