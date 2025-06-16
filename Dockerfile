FROM n8nio/n8n:latest

USER root

# Install additional dependencies if needed
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git

USER node

# Set environment variables
ENV N8N_BASIC_AUTH_ACTIVE=true
ENV N8N_BASIC_AUTH_USER=admin
ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=${PORT:-5678}
ENV N8N_PROTOCOL=https
ENV WEBHOOK_URL=https://${RAILWAY_STATIC_URL}
ENV N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}

# Expose port
EXPOSE ${PORT:-5678}

# Start n8n with PORT environment variable
CMD ["sh", "-c", "n8n start --tunnel"]