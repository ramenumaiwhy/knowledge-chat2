#!/bin/sh
# Enhanced health check for Railway
if wget --no-verbose --tries=1 --spider http://localhost:5678/healthz 2>/dev/null; then
    exit 0
else
    # Check if process is still initializing
    if [ -f /data/.n8n/init.lock ]; then
        # During initialization, consider healthy
        exit 0
    fi
    exit 1
fi