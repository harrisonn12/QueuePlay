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
EXPOSE 3000

# Start the application using npm start (vite preview)
CMD ["npm", "start"]

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built static files from the build stage to the Nginx html directory
# /app/dist is the output of the build stage
# /usr/share/nginx/html is the default directory for Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY frontend/QueuePlay/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"] 