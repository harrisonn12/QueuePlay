import asyncio
import aiohttp
import json
import argparse
import logging
import time
from datetime import datetime
from tabulate import tabulate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def check_server_health(session, url):
    """Check the health status of a server"""
    try:
        async with session.get(url, timeout=2) as response:
            if response.status == 200:
                data = await response.json()
                return {
                    "url": url,
                    "status": "Online",
                    "health": data.get("status", "unknown"),
                    "server_id": data.get("serverId", "unknown"),
                    "connections": data.get("connections", 0),
                    "games": data.get("games", 0),
                    "message": data.get("message", "")
                }
            else:
                return {
                    "url": url,
                    "status": f"Error: HTTP {response.status}",
                    "health": "unhealthy",
                    "server_id": "unknown",
                    "connections": 0,
                    "games": 0,
                    "message": await response.text()
                }
    except asyncio.TimeoutError:
        return {
            "url": url,
            "status": "Timeout",
            "health": "unhealthy",
            "server_id": "unknown",
            "connections": 0,
            "games": 0,
            "message": "Request timed out"
        }
    except Exception as e:
        return {
            "url": url,
            "status": "Error",
            "health": "unhealthy",
            "server_id": "unknown",
            "connections": 0,
            "games": 0,
            "message": str(e)
        }

async def check_haproxy_stats(session, url):
    """Get statistics from HAProxy stats page"""
    try:
        async with session.get(url, timeout=5) as response:
            if response.status == 200:
                # Parse CSV-like output or HTML based on your HAProxy setup
                # This is a simplified example
                text = await response.text()
                return {
                    "status": "Online",
                    "data": "HAProxy statistics available"
                }
            else:
                return {
                    "status": f"Error: HTTP {response.status}",
                    "data": await response.text()
                }
    except Exception as e:
        return {
            "status": "Error",
            "data": str(e)
        }

async def monitor_servers(health_urls, haproxy_url=None, interval=5, count=None):
    """Monitor multiple servers periodically"""
    async with aiohttp.ClientSession() as session:
        iteration = 0
        
        while count is None or iteration < count:
            iteration += 1
            
            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking server status...")
            
            # Check server health
            tasks = [check_server_health(session, url) for url in health_urls]
            results = await asyncio.gather(*tasks)
            
            # Check HAProxy stats if URL provided
            haproxy_stats = None
            if haproxy_url:
                haproxy_stats = await check_haproxy_stats(session, haproxy_url)
            
            # Display results in table format
            table_data = []
            for r in results:
                table_data.append([
                    r["url"],
                    r["status"],
                    r["server_id"],
                    r["connections"],
                    r["games"],
                    r["message"]
                ])
            
            print(tabulate(
                table_data,
                headers=["Server URL", "Status", "Server ID", "Connections", "Games", "Message"],
                tablefmt="pretty"
            ))
            
            if haproxy_stats:
                print("\nHAProxy Status:", haproxy_stats["status"])
            
            if count is None or iteration < count:
                print(f"\nWaiting {interval} seconds for next check...")
                await asyncio.sleep(interval)

def main():
    parser = argparse.ArgumentParser(description="Server Status Monitor")
    parser.add_argument("--servers", nargs="+", default=["http://localhost:6790/health"], 
                      help="List of server health check URLs")
    parser.add_argument("--haproxy", default=None, 
                      help="HAProxy stats URL (e.g., http://localhost:8080)")
    parser.add_argument("--interval", type=int, default=5, 
                      help="Check interval in seconds")
    parser.add_argument("--count", type=int, default=None, 
                      help="Number of checks to perform (default: run forever)")
    parser.add_argument("--verbose", action="store_true", 
                      help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    try:
        asyncio.run(monitor_servers(args.servers, args.haproxy, args.interval, args.count))
    except KeyboardInterrupt:
        print("\nMonitoring stopped by user")

if __name__ == "__main__":
    main()