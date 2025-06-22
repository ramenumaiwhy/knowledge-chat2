# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Server Management
npm start               # Start webhook server (LINE bot)
npm run dev            # Start development server with nodemon

# Data Management
npm run merge-csv                        # Merge updates.csv to knowledge.csv
node scripts/csv-merger.js               # Manual CSV merge operation
node scripts/data-preprocessor.js        # Preprocess combined_blog_mail_pdf.csv for Supabase
node scripts/embedding-generator.js      # Generate embeddings for knowledge base

# Security & Deployment
./scripts/generate-secrets.sh            # Generate security keys for deployment

# Railway Management
node scripts/railway-env-update.js       # Update Railway environment variables
node scripts/railway-browser-check.js    # Check Railway deployment status
node scripts/find-railway-url.js         # Find Railway deployment URL
node scripts/deploy-n8n-workflow.js      # Deploy n8n workflow to Railway
node scripts/update-existing-workflow.js # Update existing n8n workflow

# Supabase & Data Check
node scripts/check-data.js               # Check Supabase data status
node scripts/test-supabase-search.js     # Test Supabase search functionality

# MCP Integration
node scripts/n8n-mcp-setup.js            # Setup MCP for n8n
node scripts/test-mcp-integration.js     # Test MCP integration
node scripts/chiba-mcp-client.js         # Chiba MCP client

# LINE Integration
node scripts/direct-line-integration.js  # Direct LINE integration test

# Utility
node scripts/simple-url-check.js         # Simple URL availability check
```

### Testing
```bash
# Test n8n workflow locally
curl -X POST http://localhost:5678/webhook/line -H "Content-Type: application/json" -d '{"message":"test"}'

# Test webhook server locally
curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" -d '{"events":[{"type":"message","message":{"type":"text","text":"こんにちは"},"replyToken":"test"}]}'
```

## Architecture Overview

This is a **KnowledgeLink** chatbot system with the following components:

### Core System
- **n8n Workflow Engine**: Handles LINE webhook processing, CSV data retrieval, and AI integration
- **GitHub CSV Storage**: Version-controlled knowledge base using CSV files in the repository
- **Google Gemini API**: Natural language processing and response generation (gemini-1.5-flash model)
- **Railway Deployment**: Docker container hosting with environment variable management
- **Supabase**: Vector database for advanced search capabilities (optional)
- **Webhook Server**: Express.js server handling LINE webhook directly (alternative to n8n)

### Data Flow
```
LINE User → LINE API → n8n (Railway) → GitHub CSV → Gemini API → Response
                 ↓
         Alternative: webhook-server.js → GitHub CSV → Gemini API
```

### Key Files
- `n8n-workflow.json`: Complete workflow definition for n8n import
- `webhook-server.js`: Alternative LINE bot server with advanced NLP features
- `data/knowledge.csv`: Main knowledge database
- `data/updates.csv`: Staging area for new knowledge entries
- `data/combined_blog_mail_pdf.csv`: Raw knowledge data from various sources
- `data/processed_knowledge.csv`: Preprocessed data for Supabase import
- `scripts/csv-merger.js`: Automated CSV merging utility
- `Dockerfile`: n8n container with Python tools for CSV processing
- `docs/`: All documentation and implementation guides
- `temp/`: Temporary files and testing artifacts

### Project Dependencies
```json
{
  "dependencies": {
    "@line/bot-sdk": "^9.5.0",           // LINE Bot SDK
    "@google/generative-ai": "^0.1.3",   // Google Gemini AI API
    "@supabase/supabase-js": "^2.45.0",  // Supabase client (optional)
    "axios": "^1.7.9",                   // HTTP client
    "csv-parse": "^5.6.0",                // CSV parsing
    "csv-stringify": "^6.5.2",            // CSV generation
    "dotenv": "^16.4.7",                  // Environment variables
    "express": "^4.21.2",                 // Web server framework
    "kuromoji": "^0.1.2",                 // Japanese morphological analyzer
    "uuid": "^11.0.5"                     // UUID generation
  },
  "devDependencies": {
    "nodemon": "^3.1.9"                   // Auto-restart for development
  }
}
```

### Environment Variables
#### Railway Deployment
- `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`: LINE API credentials
- `GEMINI_API_KEY`: Google AI API access
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`: GitHub API access for CSV files
- `N8N_BASIC_AUTH_PASSWORD`, `N8N_ENCRYPTION_KEY`: n8n security

#### Supabase (Optional)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key for admin access

### CSV Schema
```csv
# Main knowledge.csv
id,category,question,answer,keywords,source,updated_at

# Processed knowledge for Supabase
id,title,content,summary,category,content_type,keywords,date,target_group,occupation,original_length,processed_at
```

## Advanced Features

### Japanese NLP in webhook-server.js
- **Synonym Dictionary**: Maps related terms (ナンパ→声かけ, 女性→女の子, etc.)
- **Greeting Detection**: Special handling for common greetings
- **Multi-stage Search**: Exact match → AND search → OR search → Synonym expansion
- **N-gram Matching**: Partial text matching for better results
- **Relevance Scoring**: Weighted scoring across title, keywords, summary, content

### Data Processing Features
- **CSV Merger**: Automatically merges updates.csv into knowledge.csv
- **Data Preprocessor**: Cleans and optimizes data for Supabase import
- **Embedding Generator**: Creates vector embeddings for semantic search
- **Duplicate Detection**: Prevents duplicate content using hash comparison
- **Smart Truncation**: Preserves sentence boundaries when shortening text

## Development Notes

- Knowledge updates are staged in `updates.csv` then merged to `knowledge.csv`
- Two deployment options: n8n workflow OR direct webhook server
- Webhook server includes advanced Japanese language processing with kuromoji
- Responses are generated by Gemini API with context from matched CSV entries
- All documentation is in Japanese for end-user guides
- Current cost: $5/month (Railway hosting only)
- Gemini API uses gemini-1.5-flash model (free tier: 60 requests per minute)
- Recent improvements:
  - RAG implementation with Japanese NLP and query analysis
  - Relevance scoring with multiple factors
  - Fallback logic for API failures
  - Improved CSV parsing with debug logging

## Testing & Debugging

### Local Testing
```bash
# Start webhook server
npm run dev

# Test webhook endpoint
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "x-line-signature: test" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"テスト質問"},"replyToken":"test-token"}]}'

# Health check
curl http://localhost:3000/health
```

### Data Validation
```bash
# Check Supabase data
node scripts/check-data.js

# Test search functionality
node scripts/test-supabase-search.js

# Preprocess CSV data
node scripts/data-preprocessor.js

# Analyze embeddings similarity
node scripts/analyze-embeddings.js
```

### Common Issues
- **Signature Validation Failed**: Check LINE_CHANNEL_SECRET in environment
- **No matching knowledge found**: Verify CSV data is properly formatted
- **Gemini API errors**: Check API key and rate limits

## Deployment

The system runs on Railway using Docker container deployment. Two deployment options:

### Option 1: n8n Workflow
1. Deploy n8n container using Dockerfile
2. Import `n8n-workflow.json` through n8n UI
3. Configure environment variables in Railway
4. Set webhook URL in LINE Developers Console

### Option 2: Direct Webhook Server
1. Deploy `webhook-server.js` with Node.js buildpack
2. Configure environment variables in Railway
3. Set webhook URL to `https://your-app.railway.app/webhook`
4. Verify webhook in LINE Developers Console

### Required Setup
- LINE Developers account with messaging API channel
- Google AI Studio account for Gemini API key
- GitHub personal access token for CSV access
- Railway account for hosting