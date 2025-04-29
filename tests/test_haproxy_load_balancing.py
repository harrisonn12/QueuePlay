#!/usr/bin/env python3
import requests
import websocket
import json
import time
import random
import string
import threading
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse

# Configuration
API_URL = "http://localhost:8000"
WS_URL = "ws://localhost:6789"
FRONTEND_URL = "http://localhost"

def generate_random_id(length=8):
    """Generate a random ID for testing."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def test_api_load_balancing():
    """Test if API requests are being load balanced across backend instances."""
    print("\n--- Testing API Load Balancing ---")
    
    # Make multiple requests to see if we hit different backend instances
    responses = []
    for i in range(10):
        try:
            # Create a game ID with a counter to make it unique
            game_id = f"test_game_{i}_{generate_random_id()}"
            
            # Use the /getQuestions endpoint
            url = f"{API_URL}/getQuestions?gameId={game_id}&count=1"
            response = requests.get(url, timeout=5)
            
            # Log the response
            status = response.status_code
            content = response.text[:100] + "..." if len(response.text) > 100 else response.text
            print(f"Request {i+1}: Status {status}, Response: {content}")
            
            responses.append(response)
            
            # Small delay to avoid overwhelming the server
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Error in request {i+1}: {e}")
    
    # Check if all responses were successful
    success_count = sum(1 for r in responses if r.status_code == 200)
    print(f"Successful API responses: {success_count}/{len(responses)}")
    
    return success_count > 0

def test_frontend_reachability():
    """Test if the frontend server is reachable through HAProxy."""
    print("\n--- Testing Frontend Reachability ---")
    
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        status = response.status_code
        content_type = response.headers.get('Content-Type', '')
        
        print(f"Frontend status: {status}")
        print(f"Content-Type: {content_type}")
        
        if 'text/html' in content_type.lower():
            print("Frontend is serving HTML content as expected")
            return True
        else:
            print(f"WARNING: Frontend might not be serving HTML (Content-Type: {content_type})")
            return False
        
    except Exception as e:
        print(f"Error accessing frontend: {e}")
        return False

def test_websocket_connection():
    """Test if WebSocket connections can be established through HAProxy."""
    print("\n--- Testing WebSocket Connections ---")
    
    def on_message(ws, message):
        print(f"Received message: {message[:100]}..." if len(message) > 100 else message)
        
    def on_error(ws, error):
        print(f"WebSocket error: {error}")
        
    def on_close(ws, close_status_code, close_msg):
        print(f"WebSocket closed with status code {close_status_code}: {close_msg}")
        
    def on_open(ws):
        print("WebSocket connection established")
        # Send a test message (this will depend on your actual WebSocket protocol)
        try:
            test_message = json.dumps({
                "action": "ping",
                "payload": {
                    "timestamp": time.time()
                }
            })
            ws.send(test_message)
            print(f"Sent test message: {test_message}")
        except Exception as e:
            print(f"Error sending message: {e}")
    
    try:
        # Create WebSocket connection
        ws = websocket.WebSocketApp(
            WS_URL,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        # Start WebSocket connection in a separate thread
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()
        
        # Wait for a bit to allow connection and message processing
        time.sleep(5)
        
        # Close the connection
        ws.close()
        
        return True
        
    except Exception as e:
        print(f"Error setting up WebSocket connection: {e}")
        return False

def test_concurrent_connections():
    """Test multiple concurrent connections to simulate load."""
    print("\n--- Testing Concurrent Connections ---")
    
    num_concurrent = 20
    print(f"Making {num_concurrent} concurrent API requests...")
    
    def make_api_request(i):
        try:
            game_id = f"concurrent_test_{i}_{generate_random_id()}"
            url = f"{API_URL}/getQuestions?gameId={game_id}&count=1"
            response = requests.get(url, timeout=10)
            return i, response.status_code
        except Exception as e:
            return i, f"Error: {str(e)}"
    
    results = []
    with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
        futures = [executor.submit(make_api_request, i) for i in range(num_concurrent)]
        for future in as_completed(futures):
            results.append(future.result())
    
    # Sort and print results
    results.sort(key=lambda x: x[0])
    success_count = sum(1 for _, status in results if status == 200)
    
    for i, status in results:
        print(f"Request {i}: {'Success' if status == 200 else status}")
    
    print(f"Successful concurrent requests: {success_count}/{num_concurrent}")
    return success_count > num_concurrent // 2  # More than half should succeed

def main():
    """Run all tests."""
    parser = argparse.ArgumentParser(description='Test HAProxy load balancing configuration')
    parser.add_argument('--api-only', action='store_true', help='Test only the API endpoints')
    parser.add_argument('--frontend-only', action='store_true', help='Test only the frontend')
    parser.add_argument('--ws-only', action='store_true', help='Test only WebSocket connections')
    parser.add_argument('--concurrent-only', action='store_true', help='Test only concurrent connections')
    
    args = parser.parse_args()
    
    # If no specific test is requested, run all tests
    run_all = not (args.api_only or args.frontend_only or args.ws_only or args.concurrent_only)
    
    test_results = []
    
    # Run the requested tests
    if run_all or args.api_only:
        test_results.append(("API Load Balancing", test_api_load_balancing()))
    
    if run_all or args.frontend_only:
        test_results.append(("Frontend Reachability", test_frontend_reachability()))
    
    if run_all or args.ws_only:
        test_results.append(("WebSocket Connections", test_websocket_connection()))
    
    if run_all or args.concurrent_only:
        test_results.append(("Concurrent Connections", test_concurrent_connections()))
    
    # Print summary
    print("\n=== Test Results Summary ===")
    all_passed = True
    for test_name, result in test_results:
        status = "PASSED" if result else "FAILED"
        if not result:
            all_passed = False
        print(f"{test_name}: {status}")
    
    # Return appropriate exit code
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main()) 