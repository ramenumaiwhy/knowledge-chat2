FROM node:18-alpine

WORKDIR /app

# Copy only package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy only necessary files
COPY webhook-server.js ./
COPY data ./data/

# Expose port
EXPOSE ${PORT:-3000}

# Start webhook server
CMD ["node", "webhook-server.js"]