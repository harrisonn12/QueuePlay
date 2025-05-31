# Use an official Python runtime as a parent image (slim means lightweight)
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the backend application code into the container at /app/backend
COPY ./backend /app/backend

# Copy the WebSocket server code into the container at /app
COPY ./MultiplayerServer.py /app/

# This helps Docker determine which ports to expose for the application
# 8000 is the port for the FastAPI server
# 6789 is the port for the WebSocket server
EXPOSE 8000 
EXPOSE 6789 

# The command to run the application will be specified in docker-compose.yml