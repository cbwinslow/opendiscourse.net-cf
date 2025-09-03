# AutoRAG Database Setup Guide

This guide walks you through setting up the AutoRAG (Automated Retrieval-Augmented Generation) database on Cloudflare for govinfo.gov/bulkdata.

## Prerequisites

Before you begin, ensure you have:

1. A Cloudflare account with Workers Paid plan (required for Vectorize)
2. Wrangler CLI installed (`npm install -g wrangler`)
3. Node.js and npm installed
4. API keys for govinfo.gov and congress.gov

## Step 1: Configure Environment Variables

1. Copy the example configuration file:

```bash
cp ingestion/config/api_config.json.example ingestion/config/api_config.json
```

2. Update the configuration with your credentials:

```json
{
  "govinfo": {
    "apiBaseUrl": "https://api.govinfo.gov",
    "apiKey": "YOUR_GOVINFO_API_KEY",
    "bulkDataUrl": "https://www.govinfo.gov/bulkdata",
    "collections": ["BILLS", "CREC", "FR"]
  },
  "cloudflare": {
    "accountId": "YOUR_CLOUDFLARE_ACCOUNT_ID",
    "vectorizeIndex": "opendiscourse-vector-index",
    "r2Bucket": "opendiscourse-documents",
    "d1Database": "opendiscourse-db"
  }
}
```

## Step 2: Set up Cloudflare Resources

1. Login to Wrangler:

```bash
wrangler login
```

2. Create the Vectorize index:

```bash
npm run setup:vectorize
```

3. Create the D1 database:

```bash
wrangler d1 create opendiscourse-db
```

4. Create the R2 bucket:

```bash
wrangler r2 bucket create opendiscourse-documents
```

## Step 3: Update Wrangler Configuration

Update `wrangler.toml` with your resource IDs:

```toml
name = "opendiscourse"
main = "src/index.ts"
compatibility_date = "2025-08-27"

[triggers]
crons = ["*/15 * * * *"]

# D1 Database for structured data
[[d1_databases]]
binding = "DB"
database_name = "opendiscourse-db"
database_id = "YOUR_D1_DATABASE_ID"

# KV Namespace for caching
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"

# R2 Bucket for document storage
[[r2_buckets]]
binding = "DOCUMENTS"
bucket_name = "opendiscourse-documents"
preview_bucket_name = "opendiscourse-documents-preview"

# Vectorize for embeddings
[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "opendiscourse-vector-index"
```

## Step 4: Run Database Migrations

Apply the database schema:

```bash
npm run migrate
```

## Step 5: Deploy the Worker

Deploy your worker to Cloudflare:

```bash
npm run deploy
```

## Step 6: Ingest Data

Start ingesting data from govinfo.gov:

```bash
# Ingest bulkdata
npm run ingest:bulkdata

# Or ingest specific collections
npm run ingest:bulkdata -- BILLS CREC
```

## Step 7: Query the AutoRAG System

Once data is ingested, you can query the system:

### Semantic Search

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "healthcare policy", "topK": 5}'
```

### Question Answering

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What does this document say about healthcare?"}'
```

## Monitoring and Maintenance

### Check Processing Status

```bash
curl https://your-worker.your-subdomain.workers.dev/api/health
```

### View Document Processing Overview

Query the `autorag.document_processing_overview` view in your D1 database.

## Troubleshooting

### Common Issues

1. **Vectorize Index Creation Failed**
   - Ensure you're on the Workers Paid plan
   - Check your Cloudflare account ID

2. **D1 Migration Errors**
   - Ensure your D1 database ID is correct in `wrangler.toml`
   - Check that you have the necessary permissions

3. **Ingestion Failures**
   - Verify your govinfo API key is correct
   - Check rate limits on the govinfo API

### Logs

View logs for your worker:

```bash
npm run logs
```

## Next Steps

1. Set up monitoring and alerting
2. Configure custom embedding models
3. Implement access control for the API
4. Add support for additional document sources
5. Optimize chunking strategies for different document types

## API Documentation

See `AUTORAG_README.md` for detailed API documentation.
