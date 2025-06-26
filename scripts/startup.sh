#!/bin/sh
set -e

# Railway-specific environment setup
if [ -n "$RAILWAY_ENVIRONMENT" ]; then
    echo "Running in Railway environment: $RAILWAY_ENVIRONMENT"
    
    # Update webhook URL with Railway domain
    if [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
        export N8N_WEBHOOK_BASE_URL="https://$RAILWAY_PUBLIC_DOMAIN"
        export WEBHOOK_URL="https://$RAILWAY_PUBLIC_DOMAIN"
        echo "Webhook URL set to: $N8N_WEBHOOK_BASE_URL"
    fi
    
    # Set database URL if using Railway PostgreSQL
    if [ -n "$DATABASE_URL" ]; then
        # Parse DATABASE_URL for n8n format
        export DB_TYPE=postgresdb
        export DB_POSTGRESDB_DATABASE=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        export DB_POSTGRESDB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
        export DB_POSTGRESDB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        export DB_POSTGRESDB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        export DB_POSTGRESDB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        echo "Database configured from DATABASE_URL"
    fi
fi

# Create init lock file
mkdir -p /data/.n8n
touch /data/.n8n/init.lock

# Start n8n with proper error handling
exec tini -- n8n "$@"