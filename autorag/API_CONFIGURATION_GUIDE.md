# AutoRAG API Configuration Guide

This guide provides detailed instructions for configuring the AutoRAG system to connect to govinfo.gov and congress.gov APIs.

## 1. API Keys Configuration

Both API keys have been successfully configured in the system:

### govinfo.gov API Key

- **Key**: `JRiK258tD1yRUWSnaeI2vUchbbjzyaZGoQT7LWfG`
- **Status**: ✅ Configured and verified
- **Usage**: Primary source for bulkdata and API access

### congress.gov API Key

- **Key**: `nt7MSte5iCSAphsEVqv10WdjdNU0a7QHCfEagcFj`
- **Status**: ✅ Configured and verified
- **Usage**: Supplementary source for current legislative information

## 2. Cloudflare Configuration

### Account ID

1. Log in to your Cloudflare dashboard
2. Click on your profile icon in the top right
3. Select "My Profile"
4. Your Account ID is displayed on this page

### Resource Setup

You'll need to create the following Cloudflare resources:

1. **D1 Database**

   ```bash
   wrangler d1 create opendiscourse-db
   ```

2. **R2 Bucket**

   ```bash
   wrangler r2 bucket create opendiscourse-documents
   ```

3. **Vectorize Index**

   ```bash
   wrangler vectorize create opendiscourse-vector-index --dimensions 1024 --metric cosine
   ```

4. **KV Namespace** (if not already created)
   ```bash
   wrangler kv:namespace create "opendiscourse-cache"
   ```

## 3. Configuration File Setup

### Copy the Example Configuration

```bash
cp ingestion/config/api_config.json.example ingestion/config/api_config.json
```

### Edit the Configuration File

Open the configuration file in your preferred text editor:

```bash
nano ingestion/config/api_config.json
```

### Update with Your Credentials

Replace the placeholder values with your actual credentials:

```json
{
  "govinfo": {
    "apiBaseUrl": "https://api.govinfo.gov",
    "apiKey": "YOUR_REAL_GOVINFO_API_KEY_HERE",
    "bulkDataUrl": "https://www.govinfo.gov/bulkdata",
    "collections": [
      "BILLS", // Bills and Resolutions
      "CREC", // Congressional Record
      "FR", // Federal Register
      "STATUTE", // Statutes at Large
      "PLAW" // Public and Private Laws
    ]
  },
  "congress": {
    "apiBaseUrl": "https://api.congress.gov/v3",
    "apiKey": "YOUR_REAL_CONGRESS_API_KEY_HERE"
  },
  "cloudflare": {
    "accountId": "YOUR_CLOUDFLARE_ACCOUNT_ID",
    "vectorizeIndex": "opendiscourse-vector-index",
    "r2Bucket": "opendiscourse-documents",
    "d1Database": "opendiscourse-db"
  },
  "ingestion": {
    "chunkSize": 1000,
    "batchSize": 50,
    "maxRetries": 3,
    "retryDelay": 1000,
    "concurrentDownloads": 5
  },
  "parsers": {
    "pdf": {
      "maxPages": 1000,
      "extractImages": false
    },
    "xml": {
      "preserveFormatting": true
    },
    "html": {
      "extractTextOnly": true
    }
  },
  "autorag": {
    "embeddingModel": "@cf/baai/bge-large-en-v1.5",
    "embeddingDimension": 1024,
    "vectorSimilarityThreshold": 0.7,
    "maxContextChunks": 10,
    "bulkDataProcessing": {
      "concurrentCollections": 3,
      "maxPackagesPerCollection": 500,
      "downloadRetries": 3
    }
  }
}
```

## 4. Configure wrangler.toml

Update your `wrangler.toml` file with the actual resource IDs:

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
database_id = "YOUR_D1_DATABASE_ID_HERE"

# KV Namespace for caching
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID_HERE"

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

## 5. Test Your Configuration

### Validate API Keys

You can test your govinfo API key with a simple curl command:

```bash
curl "https://api.govinfo.gov/collections/BILLS?offset=0&pageSize=5&api_key=YOUR_GOVINFO_API_KEY"
```

For congress.gov:

```bash
curl "https://api.congress.gov/v3/bill?api_key=YOUR_CONGRESS_API_KEY&limit=5"
```

### Run a Test Ingestion

After configuring everything, run a small test ingestion:

```bash
# Test govinfo ingestion with a small limit
npm run ingest:govinfo

# Test bulkdata ingestion
npm run ingest:bulkdata -- BILLS --limit 10

# Test congress ingestion
npm run ingest:congress
```

## 6. Common Configuration Issues

### API Key Issues

- If you get "403 Forbidden" errors, your API key may not be activated yet
- If you get "401 Unauthorized" errors, double-check your API key
- Some APIs have rate limits; if you get "429 Too Many Requests", reduce concurrentDownloads

### Cloudflare Resource Issues

- Ensure all resource IDs in wrangler.toml match the ones created
- Verify you're using the Workers Paid plan for Vectorize access
- Check that your Cloudflare account has the necessary permissions

### Network Issues

- If you're behind a corporate firewall, you may need to configure proxy settings
- Some government APIs may have specific IP allowlisting requirements

## 7. Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables in production
   - Add api_config.json to your .gitignore file

2. **Use separate keys for development and production**
   - Most APIs allow you to generate multiple keys
   - This helps with monitoring and security

3. **Monitor API usage**
   - Both govinfo.gov and congress.gov provide usage dashboards
   - Set up alerts for unusual activity

4. **Rotate keys regularly**
   - Most APIs allow you to regenerate keys
   - This is a good security practice

After completing these configuration steps, your AutoRAG system will be ready to ingest and process data from govinfo.gov and congress.gov APIs.
