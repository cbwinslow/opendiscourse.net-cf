# AutoRAG Database for govinfo.gov/bulkdata

This directory contains the AutoRAG (Automated Retrieval-Augmented Generation) system for processing and analyzing political documents from govinfo.gov/bulkdata using Cloudflare's full stack capabilities.

## Overview

The AutoRAG system automatically:

1. Ingests bulkdata from govinfo.gov
2. Processes documents (PDF, XML, HTML)
3. Generates embeddings using Cloudflare AI
4. Stores embeddings in Vectorize for semantic search
5. Provides RAG endpoints for question answering

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   GovInfo API   │───▶│  BulkData Proc.  │───▶│  Doc. Storage    │
└─────────────────┘    └──────────────────┘    │   (R2/D1)        │
                              │                 └──────────────────┘
                              ▼
                       ┌──────────────────┐
                       │  Embedding Gen.  │
                       │   (Workers AI)   │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐    ┌──────────────────┐
                       │  Vector Storage  │───▶│  Semantic Search │
                       │   (Vectorize)    │    │     API          │
                       └──────────────────┘    └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │     RAG API      │
                       │ (Question/Answer)│
                       └──────────────────┘
```

## Components

### 1. Data Ingestion

- `govinfo_bulkdata_processor.ts` - Processes bulkdata from govinfo.gov
- Handles multiple document formats (PDF, XML, HTML)
- Extracts metadata and content

### 2. Vector Database

- `auto_rag_service.ts` - Manages vector operations
- Generates embeddings using Cloudflare AI
- Stores and retrieves document vectors

### 3. RAG API

- `auto_rag_api.ts` - Provides semantic search and RAG endpoints
- `/api/rag/query` - Question answering
- `/api/rag/search` - Semantic search
- `/api/rag/context` - Context assembly

## Setup

1. **Obtain API Keys**
   - For govinfo.gov: Visit https://api.govinfo.gov/signup/ to get your API key
   - For congress.gov: Visit https://congress.gov/api/Documentation to request an API key
   - For Cloudflare: Get your Account ID from the Cloudflare dashboard

2. **Configure API Keys**

   ```bash
   # Copy the example configuration file
   cp ingestion/config/api_config.json.example ingestion/config/api_config.json

   # Edit the configuration file with your real API keys
   nano ingestion/config/api_config.json
   ```

   Update the configuration with your actual credentials:

   ```json
   {
     "govinfo": {
       "apiBaseUrl": "https://api.govinfo.gov",
       "apiKey": "YOUR_REAL_GOVINFO_API_KEY",
       "bulkDataUrl": "https://www.govinfo.gov/bulkdata",
       "collections": ["BILLS", "CREC", "FR"]
     },
     "congress": {
       "apiBaseUrl": "https://api.congress.gov/v3",
       "apiKey": "YOUR_REAL_CONGRESS_API_KEY"
     },
     "cloudflare": {
       "accountId": "YOUR_CLOUDFLARE_ACCOUNT_ID",
       "vectorizeIndex": "opendiscourse-vector-index",
       "r2Bucket": "opendiscourse-documents",
       "d1Database": "opendiscourse-db"
     }
   }
   ```

3. **Create Cloudflare Resources**

   ```bash
   # Login to Cloudflare
   wrangler login

   # Create Vectorize index
   npm run setup:vectorize

   # Create D1 database
   wrangler d1 create opendiscourse-db

   # Create R2 bucket
   wrangler r2 bucket create opendiscourse-documents
   ```

4. **Update wrangler.toml**
   Update your `wrangler.toml` file with the actual resource IDs returned from the previous commands.

5. **Run Database Migrations**

   ```bash
   npm run migrate
   ```

6. **Deploy**
   ```bash
   npm run deploy
   ```

## Usage

### Ingest Data

```bash
# Ingest govinfo bulkdata
npm run ingest:bulkdata

# Ingest specific collection
npm run ingest:bulkdata -- BILLS
```

### Query Data

```bash
# Semantic search
curl -X POST /api/rag/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "healthcare policy", "topK": 5}'

# Question answering
curl -X POST /api/rag/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What does this document say about healthcare?"}'
```

## API Endpoints

| Endpoint           | Method | Description                        |
| ------------------ | ------ | ---------------------------------- |
| `/api/rag/search`  | POST   | Semantic search in document corpus |
| `/api/rag/query`   | POST   | Question answering with RAG        |
| `/api/rag/context` | POST   | Assemble context for a query       |

## Configuration

The system can be configured through `api_config.json`:

```json
{
  "autorag": {
    "embeddingModel": "@cf/baai/bge-large-en-v1.5",
    "embeddingDimension": 1024,
    "vectorSimilarityThreshold": 0.7,
    "maxContextChunks": 10
  }
}
```
