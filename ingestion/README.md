# OpenDiscourse Data Ingestion System

## Overview
This directory contains the data ingestion system for OpenDiscourse, designed to fetch, process, and store data from government sources including govinfo.gov and congress.gov.

## Directory Structure
```
ingestion/
├── config/                 # Configuration files
├── congress/               # Congress.gov ingestion module
├── govinfo/                # GovInfo.gov ingestion module
├── generic_parsers/        # File parsers for different formats
├── tools/                  # Utility services (database, vectorization, webhooks)
├── scripts/                # Main ingestion scripts
└── tsconfig.json          # TypeScript configuration for ingestion scripts
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure API keys**:
   Update `config/api_config.json` with your API keys:
   - GovInfo API key
   - Congress.gov API key

## Usage

### Ingest Data
```bash
# Ingest govinfo.gov data
npm run ingest:govinfo

# Ingest congress.gov data
npm run ingest:congress

# Ingest all data
npm run ingest:all
```

### Process Individual Files
The system can also process individual document files:
```bash
# Process a PDF file
node ingestion/scripts/ingestion.ts file /path/to/document.pdf
```

## Components

### GovInfo Ingestion
Fetches and processes data from govinfo.gov, including:
- Legislative bills
- Congressional records
- Federal register documents
- Government manuals
- And more...

### Congress Ingestion
Fetches and processes data from congress.gov, including:
- Bills and resolutions
- Members of Congress
- Committees and subcommittees
- Hearings and reports

### File Parsers
Handles various document formats:
- PDF documents
- XML files
- HTML web pages
- Markdown documents
- Plain text files

### Vectorization Service
Chunks documents and prepares them for storage in vector databases:
- Configurable chunk size and overlap
- Metadata preservation
- Embedding generation (simulated)

### Database Service
Stores structured data in D1 database:
- Normalized table schemas
- Efficient indexing
- Data deduplication

### Webhook Receiver
Handles real-time data updates:
- GovInfo.gov webhooks
- Congress.gov webhooks
- Custom webhook endpoints

## Configuration
The system is configured through `config/api_config.json`:
- API endpoints and keys
- Chunking parameters
- Processing limits
- Retry policies

## Extending the System
To add new data sources:
1. Create a new ingestion module in a subdirectory
2. Define the database schema in a migration file
3. Implement the data fetching and processing logic
4. Add the new source to the main ingestion script

## Integration with Cloudflare
The ingestion system is designed to work with Cloudflare services:
- **D1**: Structured data storage
- **R2**: Document storage
- **Vectorize**: Vector database for embeddings
- **Workers**: Processing logic
- **KV**: Caching layer