#!/bin/bash
set -e

# Ensure wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler@latest
fi

# Login to Cloudflare if not already authenticated
if ! wrangler whoami &> /dev/null; then
    echo "Please authenticate with Cloudflare..."
    wrangler login
fi

# Create D1 database for main application
echo "Creating D1 database..."
wrangler d1 create opendiscourse-db

# Create D1 database for analytics
echo "Creating analytics database..."
wrangler d1 create opendiscourse-analytics

# Create KV namespaces
echo "Creating KV namespaces..."
wrangler kv:namespace create CACHE
wrangler kv:namespace create SESSIONS

# Create R2 buckets
echo "Creating R2 buckets..."
wrangler r2 bucket create opendiscourse-documents
wrangler r2 bucket create opendiscourse-models

# Create Vectorize index
echo "Creating Vectorize index..."
wrangler vectorize create opendiscourse-vector-index --preset=openai-text-embedding-3-large --dimensions=3072

# Create Durable Object
wrangler d1 migrations apply opendiscourse-db

# Update wrangler.toml with the new resource IDs
echo "Update the following IDs in wrangler.toml:"
echo "- D1 database IDs"
echo "- KV namespace IDs"
echo "- R2 bucket names"
echo "- Vectorize index name"

echo "\nSetup complete! Please update wrangler.toml with the generated IDs and configure your GitHub secrets."
