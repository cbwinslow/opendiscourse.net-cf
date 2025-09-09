# Cloudflare Migration Guide

This guide outlines the complete migration from Docker-based infrastructure to a fully Cloudflare-native deployment.

## Overview

The OpenDiscourse platform has been migrated to leverage the full Cloudflare stack:

### From → To
- **Neo4j Database** → **Cloudflare D1 (SQLite) + Vectorize**
- **Traditional Docker Containers** → **Cloudflare Workers**
- **Static File Hosting** → **Cloudflare Pages**
- **PostgreSQL/MySQL** → **Cloudflare D1**
- **Redis Cache** → **Cloudflare KV**
- **File Storage** → **Cloudflare R2**
- **Traditional Vector DB** → **Cloudflare Vectorize**
- **Custom AutoRAG** → **Cloudflare AI + Vectorize RAG**
- **Background Jobs** → **Cloudflare Queues**

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Cloudflare      │    │ Cloudflare      │    │ Cloudflare      │
│ Pages           │    │ Workers         │    │ AI              │
│ (Frontend)      │────│ (API/Backend)   │────│ (LLM/Embeddings)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼────┐  ┌───────▼────┐  ┌──────▼──────┐
        │ D1         │  │ KV         │  │ R2          │
        │ (Database) │  │ (Cache)    │  │ (Storage)   │
        └────────────┘  └────────────┘  └─────────────┘
                                │
                        ┌───────▼────┐
                        │ Vectorize  │
                        │ (Vectors)  │
                        └────────────┘
```

## Migration Steps

### 1. Database Migration (Neo4j → D1 + Vectorize)

#### D1 Setup
```bash
# Create D1 databases
wrangler d1 create opendiscourse-db
wrangler d1 create opendiscourse-analytics

# Apply schema
wrangler d1 migrations apply opendiscourse-db --remote
```

#### Data Migration
```typescript
// Use the DatabaseMigrationService
import DatabaseMigrationService from './services/database/migration_service.js';

const migrator = new DatabaseMigrationService(env.DB, env.VECTOR_INDEX, env.DOCUMENTS);
await migrator.performFullMigration(neo4jData);
```

### 2. AutoRAG Migration (Custom → Cloudflare AI)

#### Old AutoRAG
```python
# Traditional AutoRAG setup
autorag_config = {
    "llm": {"provider": "openai"},
    "embeddings": {"provider": "sentence-transformers"},
    "vector_store": {"provider": "chroma"}
}
```

#### New Cloudflare AutoRAG
```typescript
// Cloudflare-native AutoRAG
const ragService = new CloudflareAutoRAGService(env);

// Ingest documents
await ragService.ingestDocument({
    id: "doc-1",
    title: "Political Document",
    content: "...",
    type: "legislation"
});

// Query with RAG
const response = await ragService.query("What is this bill about?");
```

### 3. Frontend Migration (Static → Cloudflare Pages)

#### Configuration
```toml
# wrangler.toml for Pages
name = "opendiscourse-frontend"
compatibility_date = "2025-08-27"

[env.production]
name = "opendiscourse-frontend"
```

#### Headers and Routing
```
# _headers file
/*
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'
  
# _routes.json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/api/*"]
}
```

### 4. Worker API Migration

#### Key Components
- **Core API**: Politicians, Legislation, Search
- **RAG Endpoints**: Query, Ingest, Recommendations
- **Database Service**: Cloudflare-native operations
- **AI Integration**: Embeddings and text generation

```typescript
// Main worker structure
export const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Initialize services
    const dbService = new CloudflareDatabaseService(env);
    const ragService = new CloudflareAutoRAGService(env);
    
    // Route requests
    return router.handle(request);
  }
};
```

## Deployment

### GitHub Actions Workflow
```yaml
name: Deploy to Cloudflare Platform
on:
  push:
    branches: [main]

jobs:
  deploy-database:
    runs-on: ubuntu-latest
    steps:
      - name: Apply D1 migrations
        run: wrangler d1 migrations apply opendiscourse-db --remote

  deploy-worker:
    needs: deploy-database
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          command: deploy --env production

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Pages
        uses: cloudflare/wrangler-action@v3
        with:
          command: pages deploy frontend
```

### Manual Deployment
```bash
# Deploy worker
npm run build
wrangler deploy --env production

# Deploy frontend
wrangler pages deploy frontend --project-name opendiscourse-frontend

# Deploy database migrations
wrangler d1 migrations apply opendiscourse-db --remote
```

## API Endpoints

### Core Data APIs
- `GET /api/politicians?q=query` - Search politicians
- `GET /api/legislation?q=query` - Search legislation  
- `POST /api/search/semantic` - Semantic search

### RAG APIs
- `POST /api/rag/query` - Ask questions with RAG
- `POST /api/rag/ingest` - Ingest documents
- `GET /api/rag/recommendations` - Get similar documents

### System APIs
- `GET /health` - System health check
- `POST /api/ai/chat` - Direct AI chat
- `GET /api/documents` - Document management

## Benefits of Migration

### Performance
- **Global Edge Network**: Sub-100ms response times worldwide
- **Automatic Scaling**: Handle traffic spikes without configuration
- **Optimized Caching**: KV store with global replication

### Cost Efficiency
- **Pay-per-Request**: No idle server costs
- **Shared Resources**: D1, KV, R2 scale automatically
- **No Infrastructure Management**: Serverless architecture

### Developer Experience
- **Unified Platform**: Single vendor for all services
- **Built-in Monitoring**: Cloudflare Analytics and Logs
- **Easy Deployment**: Git-based workflow

### Security
- **DDoS Protection**: Built-in Cloudflare protection
- **Zero-Trust Architecture**: Secure by default
- **Automatic SSL**: HTTPS everywhere

## Environment Variables

Required secrets in GitHub/Cloudflare:
```
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

Optional configuration:
```
NODE_ENV=production
DOMAIN=opendiscourse.net
```

## Monitoring and Observability

### Health Checks
```typescript
// Comprehensive health check
const health = await dbService.healthCheck();
// Returns status of D1, KV, R2, Vectorize, AI
```

### Analytics
```typescript
// Log events to analytics DB
await dbService.logAnalyticsEvent({
  type: "search",
  metadata: { query: "climate change" }
});
```

### Performance Monitoring
- Cloudflare Analytics for request metrics
- Worker Logging for debugging
- D1 Query performance tracking

## Migration Checklist

- [ ] **D1 Databases**: Created and schema applied
- [ ] **KV Namespaces**: Created for cache and sessions
- [ ] **R2 Buckets**: Created for document storage
- [ ] **Vectorize Index**: Created for embeddings
- [ ] **Worker Deployed**: Main API backend running
- [ ] **Pages Deployed**: Frontend accessible
- [ ] **DNS Configured**: Custom domain pointing to Cloudflare
- [ ] **Data Migrated**: Neo4j data moved to D1/Vectorize
- [ ] **AutoRAG Working**: RAG endpoints functional
- [ ] **Tests Passing**: All API endpoints tested
- [ ] **Monitoring Setup**: Health checks and analytics
- [ ] **CI/CD Pipeline**: Automated deployments working

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors: `npm run typecheck`
   - Verify imports use `.js` extensions for ES modules

2. **Database Connection**
   - Ensure D1 binding names match wrangler.toml
   - Check migration files are applied

3. **Vector Search Issues**
   - Verify Vectorize index is created
   - Check embedding dimensions match (768 for BGE model)

4. **Performance Issues**
   - Monitor KV cache hit rates
   - Optimize D1 queries with indexes
   - Use R2 for large document storage

### Support Resources
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [OpenDiscourse Issues](https://github.com/cbwinslow/opendiscourse.net-cf/issues)