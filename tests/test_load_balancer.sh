#!/bin/bash
# test_load_balancer.sh - Script to test HAProxy load balancing

# Make sure the working directory is the project root
cd "$(dirname "$0")/.."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found!"
    exit 1
fi

# Install tabulate for the monitoring script if it's not installed
pip install tabulate >/dev/null 2>&1

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "Error: Docker is not running or not installed!"
        exit 1
    fi
}

# Function to wait for services to be ready
wait_for_services() {
    echo "Waiting for services to be ready..."
    
    # Wait for HAProxy to be ready (max 30 seconds)
    max_attempts=15
    attempts=0
    while ! curl -s http://localhost:8080 >/dev/null && [ $attempts -lt $max_attempts ]; do
        echo "Waiting for HAProxy... (attempt $((attempts+1))/$max_attempts)"
        attempts=$((attempts+1))
        sleep 2
    done
    
    if [ $attempts -eq $max_attempts ]; then
        echo "ERROR: HAProxy did not start in time!"
        echo "Check logs with: docker-compose logs haproxy"
        return 1
    fi
    
    # Wait for game server health endpoints (max 30 seconds)
    attempts=0
    while ! curl -s http://localhost:6790/health >/dev/null && [ $attempts -lt $max_attempts ]; do
        echo "Waiting for game server 1 health endpoint... (attempt $((attempts+1))/$max_attempts)"
        attempts=$((attempts+1))
        sleep 2
    done
    
    if [ $attempts -eq $max_attempts ]; then
        echo "ERROR: Game server 1 health endpoint not available!"
        echo "Check logs with: docker-compose logs server1"
        return 1
    fi
    
    attempts=0
    while ! curl -s http://localhost:6792/health >/dev/null && [ $attempts -lt $max_attempts ]; do
        echo "Waiting for game server 2 health endpoint... (attempt $((attempts+1))/$max_attempts)"
        attempts=$((attempts+1))
        sleep 2
    done
    
    if [ $attempts -eq $max_attempts ]; then
        echo "ERROR: Game server 2 health endpoint not available!"
        echo "Check logs with: docker-compose logs server2"
        return 1
    fi
    
    echo "All services are ready!"
    return 0
}

# Start load balancer and game servers using Docker Compose
start_services() {
    echo "Starting load balancer and game servers..."
    docker-compose up -d
    wait_for_services
}

# Stop services
stop_services() {
    echo "Stopping services..."
    docker-compose down
}

# Run the load balancing test
run_test() {
    echo ""
    echo "Running load balancing test..."
    echo "==============================="
    python tests/test_load_balancing.py --balancer ws://localhost:8081 --servers ws://localhost:6789 ws://localhost:6791 --connections 60
    
    echo ""
    echo "Running load test..."
    echo "===================="
    python tests/load_balancer_test.py --url ws://localhost:8081 --clients 50 --messages 3 --concurrency 20
}

# Monitor server status
monitor_status() {
    echo ""
    echo "Monitoring server status..."
    echo "=========================="
    python tests/server_status.py --servers http://localhost:6790/health http://localhost:6792/health --haproxy http://localhost:8080 --count 3 --interval 3
}

# Main test procedure
main() {
    check_docker
    
    echo "======================================"
    echo "  HAProxy Load Balancer Test"
    echo "======================================"
    
    # Start services
    start_services
    
    # Run tests
    run_test
    
    # Monitor server status
    monitor_status
    
    # Clean up
    read -p "Press Enter to stop the services, or Ctrl+C to keep them running... "
    stop_services
    
    echo "Test complete!"
}

# Run the main function
main