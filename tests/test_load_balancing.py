import asyncio
import websockets
import json
import logging
import time
import random
import argparse
import uuid
from collections import defaultdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Track statistics
server_distribution = defaultdict(int)

async def connect_and_identify_server(url):
    """Connect to a server and identify which server instance it is"""
    client_id = str(uuid.uuid4())
    server_id = None
    
    try:
        # Connect to WebSocket server
        async with websockets.connect(url) as websocket:
            # Send an echo message
            message = {
                "action": "initializeGame",
                "clientId": client_id
            }
            await websocket.send(json.dumps(message))
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            
            # Use gameId as a proxy for server identity
            # In a real implementation, you might have a dedicated endpoint
            if "gameId" in data:
                game_id = data["gameId"]
                logger.info(f"Connected successfully to game {game_id}")
                
                # Send another message to get more server info
                await websocket.send(json.dumps({
                    "action": "echo",
                    "clientId": client_id,
                    "message": "Tell me your server ID"
                }))
                
                # Wait for response
                echo_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                echo_data = json.loads(echo_response)
                server_id = echo_data.get("serverId", game_id)
                
            return server_id or game_id or "unknown"
    
    except Exception as e:
        logger.error(f"Error connecting to {url}: {e}")
        return f"error-{str(e)[:20]}"

async def test_load_balancing(balancer_url, direct_urls, num_connections=100):
    """Test load balancing by making multiple connections and tracking server distribution"""
    logger.info(f"Testing load balancing with {num_connections} connections")
    logger.info(f"Load balancer URL: {balancer_url}")
    logger.info(f"Direct server URLs: {direct_urls}")
    
    # Connect directly to each server to confirm they're working
    logger.info("\nTesting direct connections to each server...")
    for url in direct_urls:
        try:
            server_id = await connect_and_identify_server(url)
            logger.info(f"Direct connection to {url}: connected to server {server_id}")
        except Exception as e:
            logger.error(f"Failed to connect directly to {url}: {e}")
    
    # Test multiple connections through the load balancer
    logger.info("\nTesting load balanced connections...")
    tasks = []
    for i in range(num_connections):
        # Add a small delay between connections
        await asyncio.sleep(random.uniform(0.05, 0.2))
        tasks.append(connect_and_identify_server(balancer_url))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Count server distribution
    for server_id in results:
        if not isinstance(server_id, Exception):
            server_distribution[server_id] += 1
    
    # Print results
    total_connections = sum(server_distribution.values())
    logger.info("\n==== LOAD BALANCING RESULTS ====")
    logger.info(f"Total successful connections: {total_connections} of {num_connections} attempted")
    
    if total_connections > 0:
        logger.info("\nServer distribution:")
        for server_id, count in server_distribution.items():
            percentage = (count / total_connections) * 100
            logger.info(f"  {server_id}: {count} connections ({percentage:.1f}%)")
        
        # Calculate imbalance
        max_count = max(server_distribution.values())
        min_count = min(server_distribution.values())
        imbalance = ((max_count - min_count) / total_connections) * 100
        
        logger.info(f"\nLoad imbalance: {imbalance:.1f}%")
        
        if imbalance < 20:
            logger.info("✅ Load is well balanced across servers")
        else:
            logger.info("⚠️ Load is not well balanced - check HAProxy configuration")
    
    logger.info("===============================")

def main():
    parser = argparse.ArgumentParser(description="Load Balancer Test")
    parser.add_argument("--balancer", default="ws://localhost:8081", 
                      help="Load balancer WebSocket URL")
    parser.add_argument("--servers", nargs="+", 
                      default=["ws://localhost:6789", "ws://localhost:6790"], 
                      help="Direct server WebSocket URLs")
    parser.add_argument("--connections", type=int, default=20, 
                      help="Number of connections to make")
    args = parser.parse_args()
    
    asyncio.run(test_load_balancing(args.balancer, args.servers, args.connections))

if __name__ == "__main__":
    main()