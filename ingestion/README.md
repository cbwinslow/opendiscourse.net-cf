# OpenDiscourse Data Ingestion System

## Overview

This directory contains the data ingestion system for OpenDiscourse, designed to fetch, process, and store data from government sources including govinfo.gov and congress.gov.

The system includes a bulk data ingestion pipeline for efficiently processing large datasets from GovInfo's bulk data repository.

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

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file to configure:
   - `GOVINFO_BULKDATA_URL`: Base URL for GovInfo bulk data
   - `MAX_CONCURRENT_DOWNLOADS`: Number of concurrent downloads (default: 5)
   - `RETRY_ATTEMPTS`: Number of retry attempts for failed downloads (default: 3)
   - `RETRY_DELAY_MS`: Delay between retry attempts in milliseconds (default: 5000)
   - `DOWNLOAD_DIR`: Directory to store downloaded files (default: `./data/govinfo/bulkdata`)

## Usage

<<<<<<< HEAD
### Bulk Data Ingestion

#### Process all available collections:
```bash
npm run bulkdata:ingest
```

#### Process specific collections:
```bash
COLLECTIONS=BILLS,FR npm run bulkdata:ingest
```

#### Process a specific year:
```bash
YEAR=2023 npm run bulkdata:ingest
```

### Standard API-based Ingestion
=======
### Ingest Data

>>>>>>> b0b10b9 (scaffold infra: terraform skeleton, CI deploy workflows, backup script and docs)
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
# Process a single file
npm run bulkdata:process -- /path/to/document.pdf

# Process a directory of files
npm run bulkdata:process -- /path/to/directory
```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

## Architecture

The bulk data ingestion system consists of the following main components:

1. **GovInfoBulkDataProcessor**: Core class that handles downloading and processing of bulk data files
2. **File Handlers**: Process different file types (ZIP, XML, JSON, etc.)
3. **Database Integration**: Stores processed data in the appropriate data store
4. **CLI Interface**: Command-line interface for running ingestion jobs

## Data Flow

1. Fetch list of available collections from GovInfo
2. For each collection, list available files
3. Download files to local storage
4. Extract and process file contents
5. Store processed data in the database
6. Update tracking information

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
