import asyncio
import websockets
import json
import random
import time
import argparse
import logging
from concurrent.futures import ThreadPoolExecutor
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Statistics
connections = 0
successful_messages = 0
failed_messages = 0
connection_times = []
message_times = []

async def connect_client(url, client_id=None):
    """Connect a single client to the server"""
    global connections, connection_times
    
    if client_id is None:
        client_id = str(uuid.uuid4())
    
    try:
        start_time = time.time()
        
        websocket = await websockets.connect(url)
        connection_time = time.time() - start_time
        connection_times.append(connection_time)
        
        connections += 1
        logger.debug(f"Client {client_id} connected in {connection_time:.4f}s")
        
        return websocket, client_id
    
    except Exception as e:
        logger.error(f"Connection error for client {client_id}: {e}")
        return None, client_id

async def send_message(websocket, client_id, message_type="echo"):
    """Send a message to the server"""
    global successful_messages, failed_messages, message_times
    
    if not websocket:
        failed_messages += 1
        return False
    
    try:
        message = {
            "action": message_type,
            "clientId": client_id,
            "message": f"Test message from {client_id}",
            "timestamp": int(time.time())
        }
        
        start_time = time.time()
        await websocket.send(json.dumps(message))
        
        # Wait for response
        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        message_time = time.time() - start_time
        message_times.append(message_time)
        
        successful_messages += 1
        logger.debug(f"Message from {client_id} succeeded in {message_time:.4f}s: {response[:30]}...")
        
        return True
    
    except Exception as e:
        failed_messages += 1
        logger.error(f"Message error for client {client_id}: {e}")
        return False

async def client_session(url, messages_per_client=5, session_id=None):
    """Simulate a client session with multiple messages"""
    if session_id is None:
        session_id = str(uuid.uuid4())[:8]
        
    client_id = f"test-client-{session_id}"
    
    websocket, client_id = await connect_client(url, client_id)
    if not websocket:
        return
    
    try:
        # Send multiple messages
        for i in range(messages_per_client):
            await send_message(websocket, client_id)
            await asyncio.sleep(random.uniform(0.1, 0.5))  # Random delay between messages
    
    finally:
        # Close the connection
        if websocket:
            await websocket.close()

async def run_load_test(url, num_clients, messages_per_client, concurrency):
    """Run a load test with multiple concurrent clients"""
    logger.info(f"Starting load test with {num_clients} clients, {messages_per_client} messages per client")
    logger.info(f"Target URL: {url}")
    logger.info(f"Concurrency: {concurrency} clients at a time")
    
    start_time = time.time()
    
    # Create client sessions
    client_tasks = []
    for i in range(num_clients):
        session_id = f"{i+1:04d}"
        client_tasks.append(client_session(url, messages_per_client, session_id))
    
    # Run clients with limited concurrency
    semaphore = asyncio.Semaphore(concurrency)
    
    async def bounded_client(task):
        async with semaphore:
            await task
    
    await asyncio.gather(*[bounded_client(task) for task in client_tasks])
    
    # Calculate statistics
    total_time = time.time() - start_time
    messages_sent = successful_messages + failed_messages
    success_rate = (successful_messages / messages_sent * 100) if messages_sent > 0 else 0
    
    avg_conn_time = sum(connection_times) / len(connection_times) if connection_times else 0
    avg_msg_time = sum(message_times) / len(message_times) if message_times else 0
    
    # Print results
    logger.info("\n===== LOAD TEST RESULTS =====")
    logger.info(f"Test duration: {total_time:.2f} seconds")
    logger.info(f"Clients connected: {connections} of {num_clients} attempted")
    logger.info(f"Messages sent: {successful_messages} successful, {failed_messages} failed")
    logger.info(f"Success rate: {success_rate:.2f}%")
    logger.info(f"Average connection time: {avg_conn_time:.4f} seconds")
    logger.info(f"Average message round-trip time: {avg_msg_time:.4f} seconds")
    logger.info(f"Throughput: {successful_messages/total_time:.2f} messages/second")
    logger.info("============================")

def main():
    parser = argparse.ArgumentParser(description="WebSocket Load Tester for HAProxy")
    parser.add_argument("--url", default="ws://localhost:8081", help="WebSocket server URL")
    parser.add_argument("--clients", type=int, default=50, help="Number of clients to simulate")
    parser.add_argument("--messages", type=int, default=5, help="Messages per client")
    parser.add_argument("--concurrency", type=int, default=10, help="Maximum concurrent connections")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    asyncio.run(run_load_test(args.url, args.clients, args.messages, args.concurrency))

if __name__ == "__main__":
    main()