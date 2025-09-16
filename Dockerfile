# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json first for better caching
COPY package.json ./

# Install dependencies without package-lock.json
RUN npm install --no-package-lock

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]