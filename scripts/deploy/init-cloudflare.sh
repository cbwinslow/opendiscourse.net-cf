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

echo "\nCloudflare resources created successfully!"
echo "Please update the following in your GitHub repository secrets:"
echo "1. CLOUDFLARE_API_TOKEN"
echo "2. CLOUDFLARE_ACCOUNT_ID"
echo "3. R2_ACCESS_KEY_ID"
echo "4. R2_SECRET_ACCESS_KEY"

echo "\nAfter setting up the secrets, push to the main branch to trigger the deployment workflow."
