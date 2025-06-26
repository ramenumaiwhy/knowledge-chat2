#!/bin/sh
set -e

echo "=== n8n Startup Script ==="
echo "Node version: $(node --version)"
echo "Working directory: $(pwd)"

# Error handling with detailed debug info
trap 'echo "❌ Error occurred at line $LINENO"; echo "=== Environment Variables ==="; env | grep -E "N8N|NODE|RAILWAY|PORT" | sort; echo "=== Directory Structure ==="; ls -la /data 2>/dev/null || echo "/data not found"; ls -la /home/node/.n8n/nodes/custom 2>/dev/null || echo "Custom nodes directory not found"; exit 1' ERR

# Railway environment detection and setup
if [ -n "$RAILWAY_ENVIRONMENT" ]; then
    echo "🚂 Railway environment detected: $RAILWAY_ENVIRONMENT"
    
    # Dynamic port configuration
    if [ -n "$PORT" ]; then
        export N8N_PORT=$PORT
        echo "📡 N8N_PORT set to: $N8N_PORT"
    fi
    
    # Webhook URL configuration
    if [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
        export N8N_WEBHOOK_BASE_URL="https://$RAILWAY_PUBLIC_DOMAIN"
        export WEBHOOK_URL="https://$RAILWAY_PUBLIC_DOMAIN"
        export N8N_EDITOR_BASE_URL="https://$RAILWAY_PUBLIC_DOMAIN"
        echo "🌐 Webhook URL: $N8N_WEBHOOK_BASE_URL"
    fi
    
    # Database configuration (if needed)
    if [ -n "$DATABASE_URL" ]; then
        echo "🗄️ Configuring database from DATABASE_URL"
        export DB_TYPE=postgresdb
        export DB_POSTGRESDB_DATABASE=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        export DB_POSTGRESDB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        export DB_POSTGRESDB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        export DB_POSTGRESDB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        export DB_POSTGRESDB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    else
        echo "📦 Using SQLite (default)"
        export DB_TYPE=sqlite
    fi
fi

# Create necessary directories
echo "📁 Setting up directories..."
mkdir -p /data/.n8n /data/workflows /data/credentials
chmod -R 777 /data

# Initialize lock file for health check
touch /data/.n8n/init.lock

# Record startup time for health check grace period
date +%s > /data/.n8n/startup.time

# Verify n8n installation
if ! command -v n8n >/dev/null 2>&1; then
    echo "❌ n8n command not found!"
    exit 1
fi

echo "🚀 Starting n8n..."
echo "Configuration:"
echo "  - Host: ${N8N_HOST:-0.0.0.0}"
echo "  - Port: ${N8N_PORT:-5678}"
echo "  - Protocol: ${N8N_PROTOCOL:-http}"
echo "  - User folder: ${N8N_USER_FOLDER:-/data}"
echo "  - Custom extensions: ${N8N_CUSTOM_EXTENSIONS}"

# Remove lock file when n8n starts successfully
(sleep 30 && rm -f /data/.n8n/init.lock) &

# Start n8n with all arguments passed
exec n8n "$@"