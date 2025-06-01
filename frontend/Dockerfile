# Use Node.js 18 Alpine Linux as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY QueuePlay/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY QueuePlay/ .

# Build the application
RUN npm run build

# Install serve to serve the built application
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]