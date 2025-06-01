# Use Python 3.11 slim as base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements file
COPY ../requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port 8000
EXPOSE 8000

# Start the FastAPI application
CMD ["python", "main.py", "--env", "prod"]
