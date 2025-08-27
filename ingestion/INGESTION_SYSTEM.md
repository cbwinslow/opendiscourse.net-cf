# OpenDiscourse Data Ingestion System

## Overview
The OpenDiscourse data ingestion system is designed to fetch, process, and store data from government sources including govinfo.gov and congress.gov. The system handles various document formats, extracts metadata, chunks documents for vectorization, and stores data in both SQL and vector databases.

## Architecture

### Core Components
1. **GovInfo Ingestion Module** - Fetches and processes data from govinfo.gov
2. **Congress Ingestion Module** - Fetches and processes data from congress.gov
3. **Generic File Parser** - Handles PDF, XML, HTML, Markdown, and text files
4. **Vectorization Service** - Chunks documents and prepares them for vector storage
5. **Database Service** - Stores structured data in D1 database
6. **Webhook Receiver** - Handles incoming data from external sources

### Data Flow
1. **Data Fetching** - API calls to govinfo.gov and congress.gov
2. **Parsing** - Extract text content from various file formats
3. **Processing** - Extract metadata and organize data
4. **Chunking** - Split documents into smaller pieces for vectorization
5. **Storage** - Store in both D1 (structured) and Vectorize (embeddings)
6. **Indexing** - Make data searchable through APIs

## Supported Data Sources

### GovInfo.gov
- **Collections**: BILLS, CRPT, CREC, FR, GAO, GOVMAN, HMAN, HOMELAND_SECURITY, ERIC, BUDGET, CPD, CPRT, CHRG, CQ, CQAL, LSA, PLAW, STATUTE, USCODE, USCOURTS
- **Data Types**: Packages, Granules, Chapters
- **Metadata**: Titles, dates, identifiers, downloads

### Congress.gov
- **Bills**: Legislative bills with full metadata
- **Members**: Information about members of Congress
- **Committees**: Committee structures and memberships
- **Hearings**: Committee hearings and witness information

## File Processing

### Supported Formats
1. **PDF** - Text extraction from government documents
2. **XML** - Structured data parsing
3. **HTML** - Web content extraction
4. **Markdown** - Lightweight markup format
5. **Plain Text** - Raw text files

### Chunking Strategy
- **Chunk Size**: Configurable (default 1000 words)
- **Overlap**: Configurable (default 100 words)
- **Metadata Preservation**: Each chunk retains document metadata

## Database Schema

### GovInfo Tables
- `govinfo_packages` - Main document storage
- `govinfo_package_metadata` - Extended metadata
- `govinfo_package_identifiers` - Document identifiers
- `govinfo_package_downloads` - Download links
- `govinfo_granules` - Document sections
- `govinfo_granule_metadata` - Granule metadata
- `govinfo_granule_downloads` - Granule downloads
- `govinfo_chapters` - Granule chapters
- `govinfo_chapter_metadata` - Chapter metadata
- `govinfo_chapter_downloads` - Chapter downloads

### Congress Tables
- `congress_bills` - Legislative bills
- `congress_bill_subjects` - Bill subject categories
- `congress_bill_summaries` - Bill summaries
- `congress_bill_actions` - Legislative actions
- `congress_bill_cosponsors` - Bill cosponsors
- `congress_bill_committees` - Bill committee assignments
- `congress_bill_related_bills` - Related bills
- `congress_members` - Members of Congress
- `congress_committees` - Congressional committees
- `congress_committee_members` - Committee memberships
- `congress_hearings` - Committee hearings
- `congress_hearing_witnesses` - Hearing witnesses

## Webhook System

### Endpoints
- `/webhook/govinfo` - Receive govinfo.gov updates
- `/webhook/congress` - Receive congress.gov updates

### Event Types
- **GovInfo**: package_created, package_updated, package_deleted
- **Congress**: bill_created, bill_updated, member_updated

## Configuration

### API Keys
- GovInfo API key required for govinfo.gov access
- Congress.gov API key required for congress.gov access

### Settings
- Chunk size and overlap
- Batch processing limits
- Retry policies
- Concurrent download limits

## Usage

### Command Line Interface
```bash
# Ingest govinfo.gov data
node ingestion.js govinfo

# Ingest congress.gov data
node ingestion.js congress

# Process a document file
node ingestion.js file /path/to/document.pdf

# Ingest all data
node ingestion.js all
```

### Programmatic Usage
```typescript
import { GovInfoIngestion } from './ingestion/govinfo/govinfo_ingestion';

const ingestion = new GovInfoIngestion(config);
await ingestion.ingestAllCollections(1000);
```

## Deployment

### Cloudflare Integration
- **D1**: Structured data storage
- **R2**: Document storage
- **Vectorize**: Embedding storage
- **Workers**: Processing logic
- **KV**: Caching layer

### Scheduled Processing
- Use Cloudflare cron triggers for regular data updates
- Configure webhooks for real-time updates

## Extensibility

### Adding New Sources
1. Create a new ingestion module
2. Define database schema
3. Implement parsing logic
4. Add to main ingestion script

### Custom Processing
1. Extend file parser for new formats
2. Customize chunking strategy
3. Implement custom vectorization
4. Add domain-specific metadata extraction

This system provides a comprehensive foundation for ingesting and processing government data for analysis and retrieval.