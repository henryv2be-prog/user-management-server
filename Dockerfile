# Use Node.js 18 LTS
FROM node:18-alpine

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package.json first for better caching
COPY package.json ./

# Install dependencies with legacy peer deps to avoid conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Create database directory and set permissions
RUN mkdir -p /app/database && chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]