#!/bin/bash
# test_reconnection.sh - Script to test WebSocket reconnection

# Define server ports
SERVER1_PORT=6789
SERVER2_PORT=6790

# Make sure the working directory is the project root
cd "$(dirname "$0")/.."

# Check if MultiplayerServer.py exists
if [ ! -f "MultiplayerServer.py" ]; then
    echo "Error: MultiplayerServer.py not found!"
    exit 1
fi

# Kill any existing servers
pkill -f "python.*MultiplayerServer.py" || true
sleep 1

# Start the first server
echo "Starting server 1 on port $SERVER1_PORT..."
python MultiplayerServer.py --port $SERVER1_PORT &
SERVER1_PID=$!

# Wait for server 1 to start
sleep 2

# Check if server 1 started successfully
if ! ps -p $SERVER1_PID > /dev/null; then
    echo "Error: Server 1 failed to start!"
    exit 1
fi

# Start the second server
echo "Starting server 2 on port $SERVER2_PORT..."
python MultiplayerServer.py --port $SERVER2_PORT &
SERVER2_PID=$!

# Wait for server 2 to start
sleep 2

# Check if server 2 started successfully
if ! ps -p $SERVER2_PID > /dev/null; then
    echo "Error: Server 2 failed to start!"
    kill $SERVER1_PID
    exit 1
fi

echo "Both servers started successfully."
echo "Server 1 PID: $SERVER1_PID"
echo "Server 2 PID: $SERVER2_PID"

# Run the reconnection test
echo ""
echo "Running reconnection tests..."
echo "================================="
python tests/ReconnectionTest.py --server1 "ws://localhost:$SERVER1_PORT" --server2 "ws://localhost:$SERVER2_PORT"
TEST_RESULT=$?

# Clean up - kill both servers
echo ""
echo "Cleaning up..."
kill $SERVER1_PID $SERVER2_PID 2>/dev/null || true
sleep 1

# Ensure servers are stopped
pkill -f "python.*MultiplayerServer.py" || true

echo "Test complete. Servers shut down."

# Return the test result
exit $TEST_RESULT