#!/bin/bash

# Start backend server
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Start frontend server
cd /app
serve frontend/dist -s -p 5173 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?