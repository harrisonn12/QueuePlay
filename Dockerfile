FROM python:3.9-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . .

# No need to add a health check endpoint, it's already implemented in MultiplayerServer.py

# Environment variables with defaults
ENV WS_PORT=6789 \
    WS_HOST="0.0.0.0" \
    REDIS_HOST=localhost \
    REDIS_PORT=6379 \
    STAGE=DEVO \
    SERVER_ID=server

# Expose the port the server runs on
EXPOSE ${WS_PORT}

# Command to run the server
CMD ["python", "MultiplayerServer.py"]