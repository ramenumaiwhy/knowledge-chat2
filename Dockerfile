# Multi-stage build for n8n on Railway
# Stage 1: Build dependencies
FROM node:18-alpine AS builder
WORKDIR /tmp/build

# Install build dependencies
RUN apk add --no-cache python3 py3-pip make g++ git

# Install n8n globally and required node modules
RUN npm install -g n8n@latest && \
    npm install kuromoji@0.1.2 prom-client@14.2.0 && \
    npm cache clean --force

# Stage 2: Production runtime
FROM node:18-alpine
WORKDIR /home/node

# Install only runtime dependencies
RUN apk add --no-cache \
    python3 py3-pip \
    git sqlite bash curl wget \
    && rm -rf /var/cache/apk/*

# Copy n8n from builder stage
COPY --from=builder /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n
COPY --from=builder /usr/local/bin/n8n /usr/local/bin/n8n
COPY --from=builder /tmp/build/node_modules /home/node/node_modules

# Create directory structure with proper permissions
RUN mkdir -p /data/.n8n \
    /data/workflows \
    /data/credentials \
    /home/node/.n8n/nodes/custom \
    && chown -R node:node /data /home/node

# Copy startup and health check scripts
COPY --chown=root:root scripts/startup.sh /startup.sh
COPY --chown=root:root scripts/healthcheck.sh /healthcheck.sh
RUN chmod +x /startup.sh /healthcheck.sh

# Copy application files (order matters for layer caching)
# Static files first
COPY --chown=node:node data/chiba-style-dna.json /home/node/data/
COPY --chown=node:node lib /home/node/lib/

# Custom nodes
COPY --chown=node:node n8n-nodes /home/node/.n8n/nodes/custom/

# Dynamic files last
COPY --chown=node:node n8n-advanced-workflow.json /data/
COPY --chown=node:node data /data/data/

# Set environment variables
ENV N8N_USER_FOLDER=/data \
    N8N_CUSTOM_EXTENSIONS="/home/node/.n8n/nodes/custom" \
    NODE_ENV=production \
    N8N_HOST=0.0.0.0 \
    N8N_PORT=5678 \
    N8N_PROTOCOL=http \
    NODE_PATH="/home/node/node_modules:/usr/local/lib/node_modules" \
    N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \
    N8N_DIAGNOSTICS_ENABLED=false \
    N8N_HIRING_BANNER_ENABLED=false \
    N8N_VERSION_NOTIFICATIONS_ENABLED=false \
    N8N_TEMPLATES_ENABLED=false \
    EXECUTIONS_DATA_PRUNE=true \
    EXECUTIONS_DATA_MAX_AGE=168 \
    N8N_METRICS=false

# Ensure pgrep is available for health check
RUN apk add --no-cache procps

# Switch to non-root user
USER node

# Health check configuration (longer start period for n8n)
HEALTHCHECK --interval=30s --timeout=20s --start-period=120s --retries=5 \
    CMD /healthcheck.sh || exit 1

# Expose port (Railway will override with PORT env var)
EXPOSE 5678

# Use startup script as entrypoint
ENTRYPOINT ["/startup.sh"]
CMD ["start"]