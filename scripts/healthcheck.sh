#!/bin/sh
# Enhanced health check for n8n on Railway

# Get the actual port n8n is running on
PORT=${N8N_PORT:-${PORT:-5678}}

# Check if n8n is still initializing (first 90 seconds)
if [ -f /data/.n8n/init.lock ]; then
    echo "n8n is still initializing..."
    exit 0
fi

# Try multiple endpoints for better reliability
# n8n provides /healthz endpoint
if wget --no-verbose --tries=1 --timeout=10 --spider http://localhost:${PORT}/healthz 2>/dev/null; then
    echo "Health check passed: /healthz endpoint responsive"
    exit 0
fi

# Fallback: Check if the main page responds
if wget --no-verbose --tries=1 --timeout=10 --spider http://localhost:${PORT}/ 2>/dev/null; then
    echo "Health check passed: Main page responsive"
    exit 0
fi

# Check if n8n process is running
if pgrep -f "n8n" > /dev/null 2>&1; then
    echo "n8n process is running but not responding to HTTP requests yet"
    # During the first 2 minutes, consider this as healthy
    if [ -f /data/.n8n/startup.time ]; then
        startup_time=$(cat /data/.n8n/startup.time)
        current_time=$(date +%s)
        elapsed=$((current_time - startup_time))
        if [ $elapsed -lt 120 ]; then
            echo "Still within startup grace period (${elapsed}s elapsed)"
            exit 0
        fi
    fi
fi

echo "Health check failed: n8n is not responding"
exit 1