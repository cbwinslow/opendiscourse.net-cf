# OpenDiscourse: Political Document Analyzer

OpenDiscourse is a comprehensive political document analysis platform built on Cloudflare's powerful suite of services. It leverages Workers, D1, R2, KV, Vectorize, and AI Gateway to provide advanced document management, search, analysis, and RAG (Retrieval Augmented Generation) capabilities.

## Features

### Document Management
- Upload and store political documents (PDF, TXT, DOCX)
- Automatic metadata extraction
- Document versioning and history tracking

### AI-Powered Analysis
- Natural Language Processing for entity extraction
- Sentiment analysis of political content
- Topic modeling and categorization
- Keyphrase and keyword extraction
- Summarization of long documents

### Search & Discovery
- Full-text search across all documents
- Semantic search using vector embeddings
- Advanced filtering by date, author, topic, sentiment
- Similar document recommendations

### RAG (Retrieval Augmented Generation)
- Question answering over political documents
- Context-aware responses with citations
- Multi-document synthesis and comparison
- Fact-checking against known political statements

### Visualization & Reporting
- Interactive dashboards for political analysis
- Trend analysis over time
- Comparative analysis between politicians/parties
- Exportable reports and visualizations

### Data Ingestion
- Automated ingestion from govinfo.gov and congress.gov
- Support for multiple document formats (PDF, XML, HTML, Markdown, TXT)
- Webhook system for real-time updates
- Chunking and vectorization for semantic search

### Agentic Knowledge Graph
- Entity and relationship extraction using BERT-based NER
- Political bias detection and sentiment analysis
- Fact-checking and hate speech detection
- Politician profiling and behavioral analysis
- Graph-based relationship inference

## Technical Architecture

### Cloudflare Services Used
1. **Workers** - Core application logic and API endpoints
2. **D1** - Structured data storage (documents metadata, user data)
3. **R2** - Object storage for original documents
4. **KV** - Caching layer for frequent queries and results
5. **Vectorize** - Vector database for embeddings
6. **AI Gateway** - Access to AI models for embeddings and generation
7. **Pages** - Frontend hosting

### Agentic Knowledge Graph System
1. **Neo4j** - Graph database for entity relationships
2. **BERT-based Models** - Entity extraction and analysis
3. **Agent Architecture** - Coordinated analysis pipeline
4. **Inference Engine** - Relationship discovery

## API Endpoints

### Documents
- `POST /api/documents` - Upload document
- `GET /api/documents` - List documents
- `GET /api/documents/{id}` - Get document details
- `DELETE /api/documents/{id}` - Delete document

### Search
- `GET /api/search?q={query}` - Full-text search
- `GET /api/search/semantic?q={query}` - Semantic search

### Analysis
- `POST /api/analyze` - Analyze document
- `GET /api/analyze/{id}` - Get analysis results

### RAG
- `POST /api/rag/query` - Ask questions about documents
- `POST /api/rag/compare` - Compare multiple documents

### Knowledge Graph
- `POST /api/graph/query` - Query the knowledge graph
- `GET /api/graph/entities/{id}` - Get entity details
- `GET /api/graph/relationships` - Explore relationships

### Health
- `GET /api/health` - System health check

## Development

### Prerequisites
- Node.js
- Cloudflare account
- Wrangler CLI

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Create required resources:
   ```bash
   # Create D1 database
   wrangler d1 create opendiscourse-db
   
   # Create R2 bucket
   wrangler r2 bucket create opendiscourse-documents
   
   # Create KV namespace
   wrangler kv:namespace create "opendiscourse-cache"
   
   # Create Vectorize index
   wrangler vectorize create opendiscourse-vector-index --preset @cf/baai/bge-small-en-v1.5
   ```

4. Update `wrangler.toml` with the actual IDs returned from the previous commands.

5. Apply database migrations:
   ```bash
   npm run migrate
   ```

### Running Locally
```bash
npm run dev
```

### Deployment
```bash
npm run deploy
```

### Viewing Logs
```bash
npm run logs
```

## Data Ingestion System

The project includes a comprehensive data ingestion system for government data:

### Ingestion Scripts
```bash
# Ingest govinfo.gov data
npm run ingest:govinfo

# Ingest congress.gov data
npm run ingest:congress

# Ingest all data
npm run ingest:all
```

### Supported Sources
- **govinfo.gov**: Legislative bills, congressional records, federal register, and more
- **congress.gov**: Bills, members, committees, hearings

### File Processing
- PDF, XML, HTML, Markdown, and plain text files
- Automatic chunking for vectorization
- Metadata extraction and preservation

## Agentic Knowledge Graph System

The project includes an advanced agentic knowledge graph system for political analysis:

### Components
- **Entity Extraction**: BERT-based NER for political entities
- **Relationship Discovery**: Connection identification between entities
- **Political Analysis**: Bias detection, sentiment analysis, fact-checking
- **Politician Profiling**: Comprehensive behavioral analysis
- **Graph Inference**: Automated relationship discovery

### Directory Structure
```
agentic_graph/
├── agents/                 # Agent implementations
├── models/                 # NLP models and analysis tools
├── neo4j/                  # Neo4j integration and schema
├── utils/                  # Utility functions
├── config/                 # Configuration files
├── orchestrator.ts         # Main orchestrator
├── METHODOLOGY.md          # Research methodology
├── SYSTEM_SUMMARY.md       # System overview
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Docker Deployment

The project includes Docker containers for deployment:

### Directory Structure
```
docker/
├── neo4j/
│   ├── neo4j.conf          # Neo4j configuration
│   └── entrypoint.sh       # Neo4j entrypoint script
├── Dockerfile              # Neo4j Dockerfile
├── Dockerfile.worker       # Worker Dockerfile
└── docker-compose.yml      # Orchestration file
```

### Quick Deployment
```bash
# Start all services
docker-compose up -d

# Access services:
# - Neo4j: http://localhost:7474
# - API: http://localhost:8787/api/
# - Frontend: http://localhost:8787/
```

## Project Structure
```
├── src/
│   └── index.ts              # Main worker implementation
├── services/                 # Application services
│   ├── api/                  # API service
│   ├── analysis/             # Analysis service
│   ├── documents/            # Document processing service
│   ├── rag/                  # RAG service
│   ├── search/               # Search service
│   └── vector/               # Vector service
├── ingestion/                # Data ingestion system
│   ├── congress/             # Congress.gov ingestion
│   ├── govinfo/              # GovInfo.gov ingestion
│   ├── generic_parsers/      # File parsers
│   ├── tools/                # Ingestion tools
│   ├── scripts/              # Ingestion scripts
│   ├── config/               # Configuration files
│   └── README.md             # Ingestion system documentation
├── agentic_graph/            # Agentic knowledge graph system
│   ├── agents/               # Agent implementations
│   ├── models/               # NLP models
│   ├── neo4j/                # Neo4j integration
│   ├── config/               # Configuration
│   ├── orchestrator.ts       # Main orchestrator
│   ├── METHODOLOGY.md        # Research methodology
│   ├── SYSTEM_SUMMARY.md     # System overview
│   ├── package.json          # Dependencies
│   └── tsconfig.json         # TypeScript config
├── migrations/               # D1 database migrations
│   ├── 0001_create_tables.sql
│   ├── 0002_search_rag_tables.sql
│   ├── 0003_user_advanced_tables.sql
│   ├── 0004_govinfo_schema.sql
│   ├── 0005_congress_schema.sql
│   └── 0006_webhook_events.sql
├── frontend/                 # Frontend assets for Cloudflare Pages
│   ├── index.html            # Main HTML file
│   ├── package.json          # Frontend dependencies
│   └── wrangler.toml         # Pages configuration
├── docker/                   # Docker configuration
│   ├── neo4j/                # Neo4j configuration
│   ├── Dockerfile            # Neo4j Dockerfile
│   ├── Dockerfile.worker     # Worker Dockerfile
│   └── docker-compose.yml    # Orchestration
├── wrangler.toml             # Wrangler configuration
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file
├── OPENDISCOURSE_PLAN.md     # Detailed project plan
├── TECHNICAL_SUMMARY.md      # Technical implementation details
├── INGESTION_SYSTEM.md       # Data ingestion documentation
├── SYSTEM_OVERVIEW.md        # Complete system overview
├── tasks.md                  # Development task tracking
└── DEPLOYMENT.md             # Deployment guide
```

## Future Enhancements

1. **User Authentication** - Add user accounts and access control
2. **Advanced Visualization** - Interactive charts and graphs
3. **Real-time Collaboration** - Multi-user document annotation
4. **Mobile Application** - Native mobile apps for iOS and Android
5. **Browser Extension** - Chrome extension for political research
6. **API Integrations** - Connect to government data sources
7. **Multilingual Support** - Support for multiple languages
8. **Advanced RAG** - Multi-hop reasoning and complex query handling
9. **crawl4ai-rag Integration** - Web crawling for enhanced data sources
10. **Voice Analysis** - Speaker identification and voice pattern analysis

OpenDiscourse represents the future of political document analysis, combining the power of Cloudflare's edge computing with advanced AI techniques to provide unprecedented insights into political discourse.