#!/usr/bin/env node

/**
 * Traffic Splitter for Canary Deployment
 * Gradually routes traffic from webhook-server to n8n
 */

const express = require('express');
const axios = require('axios');
const prometheus = require('prom-client');

// Configuration
const config = {
    port: process.env.SPLITTER_PORT || 3002,
    n8nUrl: process.env.N8N_URL || 'http://localhost:5678',
    webhookServerUrl: process.env.WEBHOOK_SERVER_URL || 'http://localhost:3000',
    initialCanaryPercentage: parseFloat(process.env.INITIAL_CANARY_PERCENTAGE || '0.1'),
    incrementStep: parseFloat(process.env.INCREMENT_STEP || '0.1'),
    incrementInterval: parseInt(process.env.INCREMENT_INTERVAL || '3600000'), // 1 hour
    maxCanaryPercentage: parseFloat(process.env.MAX_CANARY_PERCENTAGE || '1.0'),
    errorThreshold: parseFloat(process.env.ERROR_THRESHOLD || '0.05'), // 5% error rate
};

// Metrics
const register = new prometheus.Registry();

const requestCounter = new prometheus.Counter({
    name: 'traffic_splitter_requests_total',
    help: 'Total number of requests',
    labelNames: ['backend', 'status'],
    registers: [register],
});

const responseTime = new prometheus.Histogram({
    name: 'traffic_splitter_response_time_seconds',
    help: 'Response time in seconds',
    labelNames: ['backend'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register],
});

const chibaScore = new prometheus.Gauge({
    name: 'chiba_style_score',
    help: 'Chiba style score from responses',
    labelNames: ['backend'],
    registers: [register],
});

const canaryPercentage = new prometheus.Gauge({
    name: 'canary_percentage',
    help: 'Current canary deployment percentage',
    registers: [register],
});

const errorRate = new prometheus.Gauge({
    name: 'backend_error_rate',
    help: 'Error rate for each backend',
    labelNames: ['backend'],
    registers: [register],
});

// State
let currentCanaryPercentage = config.initialCanaryPercentage;
let requestStats = {
    n8n: { total: 0, errors: 0, scores: [] },
    webhookServer: { total: 0, errors: 0, scores: [] },
};

// Initialize metrics
canaryPercentage.set(currentCanaryPercentage);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.set('Content-Type', register.contentType);
    register.metrics().then(metrics => {
        res.end(metrics);
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        canaryPercentage: currentCanaryPercentage,
        stats: requestStats,
    });
});

// Control endpoints
app.post('/canary/percentage', (req, res) => {
    const { percentage } = req.body;
    if (percentage >= 0 && percentage <= 1) {
        currentCanaryPercentage = percentage;
        canaryPercentage.set(currentCanaryPercentage);
        res.json({ success: true, percentage: currentCanaryPercentage });
    } else {
        res.status(400).json({ error: 'Percentage must be between 0 and 1' });
    }
});

app.post('/canary/rollback', (req, res) => {
    currentCanaryPercentage = 0;
    canaryPercentage.set(currentCanaryPercentage);
    res.json({ success: true, message: 'Rolled back to webhook-server' });
});

// Main traffic routing
app.all('/webhook*', async (req, res) => {
    const useN8n = Math.random() < currentCanaryPercentage;
    const backend = useN8n ? 'n8n' : 'webhookServer';
    const backendUrl = useN8n ? config.n8nUrl : config.webhookServerUrl;
    
    const startTime = Date.now();
    const endTimer = responseTime.startTimer({ backend });
    
    try {
        // Forward the request
        const response = await axios({
            method: req.method,
            url: `${backendUrl}${req.path}`,
            headers: {
                ...req.headers,
                host: undefined, // Remove host header
                'x-forwarded-for': req.ip,
                'x-original-backend': backend,
            },
            data: req.body,
            timeout: 30000,
            validateStatus: () => true, // Don't throw on HTTP errors
        });
        
        endTimer();
        const duration = Date.now() - startTime;
        
        // Track metrics
        requestStats[backend].total++;
        requestCounter.inc({ backend, status: response.status });
        
        // Extract Chiba score if available
        if (response.data && response.data.validation && response.data.validation.totalScore) {
            const score = response.data.validation.totalScore;
            chibaScore.set({ backend }, score);
            requestStats[backend].scores.push(score);
            
            // Keep only last 100 scores
            if (requestStats[backend].scores.length > 100) {
                requestStats[backend].scores.shift();
            }
        }
        
        // Log for debugging
        console.log(`[${backend}] ${req.method} ${req.path} - ${response.status} (${duration}ms)`);
        
        // Forward the response
        res.status(response.status);
        Object.entries(response.headers).forEach(([key, value]) => {
            if (key !== 'content-encoding') { // Avoid compression issues
                res.setHeader(key, value);
            }
        });
        res.send(response.data);
        
    } catch (error) {
        endTimer();
        
        // Track errors
        requestStats[backend].errors++;
        requestCounter.inc({ backend, status: 'error' });
        
        console.error(`[${backend}] Error:`, error.message);
        
        // Fallback to the other backend if possible
        if (backend === 'n8n' && currentCanaryPercentage < 1) {
            console.log('Falling back to webhook-server...');
            try {
                const fallbackResponse = await axios({
                    method: req.method,
                    url: `${config.webhookServerUrl}${req.path}`,
                    headers: req.headers,
                    data: req.body,
                    timeout: 30000,
                });
                
                res.status(fallbackResponse.status);
                res.send(fallbackResponse.data);
                return;
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError.message);
            }
        }
        
        res.status(500).json({
            error: 'Internal server error',
            backend,
            message: error.message,
        });
    }
});

// Calculate and update error rates
setInterval(() => {
    ['n8n', 'webhookServer'].forEach(backend => {
        const stats = requestStats[backend];
        const rate = stats.total > 0 ? stats.errors / stats.total : 0;
        errorRate.set({ backend }, rate);
        
        // Auto-rollback if error rate is too high
        if (backend === 'n8n' && rate > config.errorThreshold && currentCanaryPercentage > 0) {
            console.error(`High error rate detected for n8n (${(rate * 100).toFixed(2)}%), rolling back...`);
            currentCanaryPercentage = 0;
            canaryPercentage.set(currentCanaryPercentage);
        }
    });
}, 10000); // Every 10 seconds

// Auto-increment canary percentage
const autoIncrement = setInterval(() => {
    const n8nErrorRate = requestStats.n8n.total > 0 
        ? requestStats.n8n.errors / requestStats.n8n.total 
        : 0;
    
    if (n8nErrorRate <= config.errorThreshold && currentCanaryPercentage < config.maxCanaryPercentage) {
        currentCanaryPercentage = Math.min(
            currentCanaryPercentage + config.incrementStep,
            config.maxCanaryPercentage
        );
        canaryPercentage.set(currentCanaryPercentage);
        console.log(`Auto-incremented canary percentage to ${(currentCanaryPercentage * 100).toFixed(0)}%`);
        
        if (currentCanaryPercentage >= config.maxCanaryPercentage) {
            console.log('Canary deployment complete!');
            clearInterval(autoIncrement);
        }
    }
}, config.incrementInterval);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down traffic splitter...');
    clearInterval(autoIncrement);
    server.close(() => {
        console.log('Traffic splitter shut down');
        process.exit(0);
    });
});

// Start server
const server = app.listen(config.port, () => {
    console.log(`Traffic splitter listening on port ${config.port}`);
    console.log(`Initial canary percentage: ${(currentCanaryPercentage * 100).toFixed(0)}%`);
    console.log(`Backends: n8n (${config.n8nUrl}), webhook-server (${config.webhookServerUrl})`);
});