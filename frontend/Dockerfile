# Use Node.js 18 Alpine Linux as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve to serve the built application (kept for compatibility)
RUN npm install -g serve

# Expose port 3000
EXPOSE 5173

# Start the application using npm start (vite preview)
CMD ["npm", "start"] 