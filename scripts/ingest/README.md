# Data Ingestion Scripts

This directory contains scripts for ingesting data from various sources into the OpenDiscourse database.

## GovInfo.gov Data Ingestion

The `govinfo_to_db.ts` script fetches data from the GovInfo.gov API and stores it in the database.

### Prerequisites

1. Node.js (v14 or later)
2. PostgreSQL database with the OpenDiscourse schema
3. GovInfo.gov API key

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root with the following variables:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://user:password@localhost:5432/opendiscourse
   
   # API Keys
   GOVINFO_API_KEY=your-govinfo-api-key
   
   # Ingestion Settings
   BATCH_SIZE=10
   MAX_PACKAGES=50
   ```

### Running the Script

To run the GovInfo.gov data ingestion:

```bash
npx ts-node govinfo_to_db.ts
```

### Configuration

The script can be configured using environment variables:

- `BATCH_SIZE`: Number of packages to process in each batch (default: 10)
- `MAX_PACKAGES`: Maximum number of packages to process (default: 50, set to 0 for no limit)

### Collections

The script processes the following GovInfo.gov collections by default:
- BILLS: Congressional bills
- CRPT: Congressional reports
- CREC: Congressional Record
- FR: Federal Register

### Error Handling

The script includes basic error handling and will continue processing if an error occurs with a single package, granule, or chapter. Errors are logged to the console.

### Logging

The script logs progress to the console, including:
- When it starts and completes processing each collection
- The number of packages processed
- Any errors that occur

### Monitoring

You can monitor the progress of the ingestion by checking the logs. The script will output the number of packages processed and any errors that occur.
