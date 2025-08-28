#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f ../.env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' ../.env | xargs)
else
    echo "Error: .env file not found. Please run setup.sh first."
    exit 1
fi

# Check for required environment variables
required_vars=(
    "CLOUDFLARE_ACCOUNT_ID"
    "CLOUDFLARE_API_TOKEN"
    "CLOUDFLARE_ZONE_ID"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set in .env file"
        exit 1
    fi
done

# Install Wrangler if not already installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing Cloudflare Wrangler..."
    npm install -g wrangler
fi

# Login to Cloudflare
wrangler whoami || wrangler login

# Deploy Workers
WORKER_NAMES=(
    "opendiscourse-api"
    "opendiscourse-ingest"
    "opendiscourse-queue"
)

for worker in "${WORKER_NAMES[@]}"; do
    echo "Deploying $worker..."
    cd ../workers/$worker
    wrangler deploy
    cd ../../infrastructure
done

# Deploy D1 databases
D1_DATABASES=(
    "opendiscourse"
    "opendiscourse-analytics"
)

for db in "${D1_DATABASES[@]}"; do
    echo "Creating D1 database: $db"
    wrangler d1 create $db || echo "Database $db may already exist"
    
    # Apply migrations
    echo "Applying migrations for $db"
    wrangler d1 execute $db --file=../migrations/0001_initial_schema.sql
    
    if [ "$db" == "opendiscourse" ]; then
        wrangler d1 execute $db --file=../migrations/0004_auto_rag_schema.sql
    fi
done

# Deploy R2 buckets
R2_BUCKETS=(
    "opendiscourse-documents"
    "opendiscourse-models"
    "opendiscourse-cache"
)

for bucket in "${R2_BUCKETS[@]}"; do
    echo "Creating R2 bucket: $bucket"
    wrangler r2 bucket create $bucket || echo "Bucket $bucket may already exist"
done

# Deploy Vectorize indexes
VECTORIZE_INDEXES=(
    "opendiscourse-documents"
)

for index in "${VECTORIZE_INDEXES[@]}"; do
    echo "Creating Vectorize index: $index"
    wrangler vectorize create $index --preset=openai-text-embedding-3-large || echo "Index $index may already exist"
done

# Deploy Queues
QUEUES=(
    "document-processing"
    "embedding-generation"
    "webhook-events"
)

for queue in "${QUEUES[@]}"; do
    echo "Creating Queue: $queue"
    wrangler queues create $queue || echo "Queue $queue may already exist"
done

# Update DNS records
DOMAINS=(
    "api.opendiscourse.net"
    "app.opendiscourse.net"
    "monitor.opendiscourse.net"
    "logs.opendiscourse.net"
)

for domain in "${DOMAINS[@]}"; do
    echo "Updating DNS for $domain"
    # This is a simplified example - actual implementation would use Cloudflare API
    # to update DNS records to point to the appropriate services
    echo "Please configure DNS for $domain in the Cloudflare dashboard"
done

echo "Deployment completed successfully!"
echo "Please review the Cloudflare dashboard to ensure all resources were created correctly."
