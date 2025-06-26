# Railway-Optimized n8n Dockerfile
# Designed to work with Railway's infrastructure and avoid common issues

FROM n8nio/n8n:1.31.0

# Use root for setup
USER root

# Install dependencies optimized for Railway
RUN apk add --no-cache \
    curl \
    wget \
    ca-certificates \
    python3 \
    py3-pip \
    build-base \
    git \
    # Additional tools for Railway compatibility
    bash \
    tini \
    && rm -rf /var/cache/apk/*

# Create directories with Railway-compatible permissions
# Railway runs containers with random UIDs, so we need to be flexible
RUN mkdir -p /home/node/.n8n/nodes/custom \
    /home/node/.n8n/nodes/community \
    /data \
    /home/node/packages/nodes \
    /var/lib/n8n \
    /railway/backups \
    && chmod -R 777 /home/node /data /var/lib/n8n /railway

# Copy custom nodes and libraries
COPY --chown=node:node n8n-nodes /home/node/.n8n/nodes/custom/
COPY --chown=node:node lib /home/node/lib/
COPY --chown=node:node data/chiba-style-dna.json /home/node/data/
COPY --chown=node:node scripts /home/node/scripts/
COPY --chown=node:node n8n-advanced-workflow.json /data/
COPY --chown=node:node data /data/data/

# Install dependencies for custom nodes
WORKDIR /home/node/.n8n/nodes/custom
RUN npm init -y && \
    npm install --save \
    kuromoji@0.1.2 \
    prom-client@14.2.0 \
    && npm cache clean --force

# Railway-specific environment variables
ENV PORT=5678 \
    N8N_PORT=5678 \
    N8N_HOST=0.0.0.0 \
    N8N_PROTOCOL=https \
    # Use Railway's dynamic URL
    N8N_WEBHOOK_BASE_URL=https://${RAILWAY_PUBLIC_DOMAIN} \
    WEBHOOK_URL=https://${RAILWAY_PUBLIC_DOMAIN}

# n8n configuration for production
ENV N8N_CUSTOM_EXTENSIONS="/home/node/.n8n/nodes/custom" \
    N8N_USER_FOLDER="/data" \
    N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \
    N8N_DEFAULT_BINARY_DATA_MODE=filesystem \
    N8N_PUSH_BACKEND=websocket \
    N8N_METRICS=true \
    N8N_PAYLOAD_SIZE_MAX=16 \
    N8N_DIAGNOSTICS_ENABLED=false \
    NODE_ENV=production \
    NODE_PATH="/home/node/node_modules:/usr/local/lib/node_modules:/home/node/.n8n/nodes/custom/node_modules" \
    NODE_FUNCTION_ALLOW_BUILTIN=* \
    NODE_FUNCTION_ALLOW_EXTERNAL=*

# Performance settings
ENV EXECUTIONS_DATA_PRUNE=true \
    EXECUTIONS_DATA_MAX_AGE=168 \
    EXECUTIONS_DATA_PRUNE_MAX_COUNT=50000 \
    N8N_CONCURRENCY_PRODUCTION_LIMIT=100 \
    # Railway-specific: Use less aggressive settings
    N8N_GRACEFUL_SHUTDOWN_TIMEOUT=30

# Security hardening for Railway
ENV N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
    N8N_HIDE_USAGE_PAGE=true \
    N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false

# Copy startup script
COPY --chown=root:root scripts/startup.sh /startup.sh
RUN chmod +x /startup.sh

# Copy health check script
COPY --chown=root:root scripts/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

# Switch to node user (Railway will override this if needed)
USER node

WORKDIR /home/node

# Expose port (Railway will override with PORT env var)
EXPOSE 5678

# Railway-optimized health check
# Longer intervals and timeout for Railway's infrastructure
HEALTHCHECK --interval=45s \
    --timeout=45s \
    --start-period=180s \
    --retries=3 \
    CMD /healthcheck.sh

# Use the startup script as entrypoint
ENTRYPOINT ["/startup.sh"]
CMD ["start"]