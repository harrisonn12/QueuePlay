# Stage 1: Build the React application
FROM node:18-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY frontend/QueuePlay/package.json frontend/QueuePlay/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend application code
COPY frontend/QueuePlay/ ./

# Build the application
# Ensure your build script outputs to the 'dist' folder or adjust accordingly
RUN npm run build

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