<<<<<<< HEAD
=======
<<<<<<< HEAD

>>>>>>> b0b10b9 (scaffold infra: terraform skeleton, CI deploy workflows, backup script and docs)
# OpenDiscourse: Political Document Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-blue.svg)](https://swagger.io/specification/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

OpenDiscourse is a comprehensive political document analysis platform built on Cloudflare's powerful suite of services. It leverages Workers, D1, R2, KV, Vectorize, and AI Gateway to provide advanced document management, search, analysis, and RAG (Retrieval Augmented Generation) capabilities.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare Wrangler CLI (`npm install -g wrangler`)
- PostgreSQL 14+ (for local development)
- Git
- Supabase account (for authentication and database)
- Cloudflare account (for deployment)
- API keys for required services (see Configuration section)

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/opendiscourse.net-cf.git
   cd opendiscourse.net-cf
   ```

2. **Run the setup script**

   ```bash
   # Make the script executable
   chmod +x scripts/setup-dev.sh
   
   # Run the setup script
   ./scripts/setup-dev.sh
   ```
   
   The script will:
   - Check for required tools and dependencies
   - Install Node.js dependencies
   - Set up environment variables
   - Create and configure the database
   - Run database migrations

3. **Configure your environment**

   If you haven't already, edit the `.env` file with your configuration:
   - Get Supabase credentials from your Supabase project settings
   - Generate a secure session secret: `openssl rand -base64 32`
   - Add API keys for required services (OpenAI, etc.)

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Access the application**

   - Frontend: [http://localhost:3000](http://localhost:3000)
   - API: [http://localhost:8787](http://localhost:8787)

### Manual Setup (Alternative)

If you prefer to set up the project manually, follow these steps:

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**
   ```bash
   createdb opendiscourse
   npx wrangler d1 migrations apply opendiscourse-db --local
   ```

For detailed setup instructions, see our [SETUP.md](SETUP.md) guide.

## 📚 Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [API Documentation](https://api.opendiscourse.net/docs) (when deployed)
- [Deployment Guide](DEPLOYMENT.md)
- [Contributing Guide](CONTRIBUTING.md)

## 📄 Document Providers

OpenDiscourse supports multiple document providers for ingesting political documents. The system comes pre-configured with several common providers:

### Available Providers

1. **GOVINFO** - U.S. Government Publishing Office
   - Requires API key
   - Provides congressional bills, federal register, and more
   - Daily sync recommended

2. **ProPublica Congress API**
   - Requires API key
   - Comprehensive U.S. legislative data
   - Daily sync recommended

3. **Congress.gov**
   - No API key required
   - Official U.S. federal legislative information
   - Weekly sync recommended

4. **GovTrack**
   - No API key required
   - Tracks U.S. Congress activities
   - Daily sync recommended

5. **OpenSecrets**
   - Requires API key
   - Tracks money in U.S. politics
   - Monthly sync recommended

### Managing Providers

To set up the default providers:

```bash
# Install dependencies if not already done
npm install

# Run the provider setup script
npx ts-node ingestion/scripts/setup_providers.ts
```

### Adding a New Provider

1. Edit `ingestion/scripts/setup_providers.ts`
2. Add a new entry to the `COMMON_PROVIDERS` array
3. Run the setup script again

### Provider Configuration

Each provider can be configured with the following settings:
- API endpoints
- Rate limiting
- Sync frequency
- Authentication keys
- Provider-specific parameters

## 🏛️ Entity Management

OpenDiscourse extracts and tracks entities from documents, including:

- People (politicians, public figures)
- Organizations (government agencies, corporations)
- Locations
- Legislative bills
- Committees
- Political parties

### Entity Types

The system supports the following entity types by default:

| Type ID | Description | Example |
|---------|-------------|---------|
| PERSON | Individual person | "Nancy Pelosi" |
| ORGANIZATION | Company or organization | "U.S. Senate" |
| LOCATION | Geographical location | "Washington, D.C." |
| BILL | Legislative bill | "H.R. 1" |
| COMMITTEE | Legislative committee | "House Judiciary Committee" |
| POLITICAL_PARTY | Political party | "Democratic Party" |
| GOVERNMENT_AGENCY | Government department | "Department of Justice" |
| POLITICAL_POSITION | Government role | "Speaker of the House" |

### Managing Entities

Entities are automatically extracted during document ingestion. You can also manage them manually through the API or database.

## ✨ Features

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
- AutoRAG database for semantic search and question answering

### Visualization & Reporting

- Interactive dashboards for political analysis
- Trend analysis over time
- Comparative analysis between politicians/parties
- Exportable reports and visualizations

### Data Ingestion

- Automated ingestion from govinfo.gov (API and bulkdata)
- Support for multiple document formats (PDF, XML, HTML, Markdown, TXT)
- Webhook system for real-time updates
- Chunking and vectorization for semantic search
- AutoRAG database for govinfo.gov/bulkdata processing (recommended approach)

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

### AutoRAG Database System

1. **Vectorize** - Vector database for semantic search
2. **D1** - Structured data storage for document metadata
3. **R2** - Object storage for original documents
4. **Workers AI** - Embedding generation and processing

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

### AutoRAG

- `POST /api/rag/search` - Semantic search in document corpus
- `POST /api/rag/context` - Assemble context for a query

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
- API keys for govinfo.gov and congress.gov (see `autorag/API_CONFIGURATION_GUIDE.md`)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Login to Cloudflare:

   ```bash
   wrangler login
   ```

3. Obtain API keys:
   - For govinfo.gov: Visit https://api.govinfo.gov/signup/
   - For congress.gov: Visit https://congress.gov/api/Documentation
   - See `autorag/API_CONFIGURATION_GUIDE.md` for detailed instructions

4. Configure API keys:

   ```bash
   cp ingestion/config/api_config.json.example ingestion/config/api_config.json
   # Edit the file with your real API keys
   nano ingestion/config/api_config.json
   ```

5. Create required Cloudflare resources:

   ```bash
   # Create D1 database
   wrangler d1 create opendiscourse-db

   # Create R2 bucket
   wrangler r2 bucket create opendiscourse-documents

   # Create KV namespace
   wrangler kv:namespace create "opendiscourse-cache"

   # Create Vectorize index
   wrangler vectorize create opendiscourse-vector-index --dimensions 1024 --metric cosine
   ```

6. Update `wrangler.toml` with the actual IDs returned from the previous commands.

7. Apply database migrations:
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

# Ingest govinfo.gov bulkdata
npm run ingest:bulkdata

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
├── autorag/                  # AutoRAG database system
│   ├── AUTORAG_README.md     # AutoRAG documentation
│   ├── AUTORAG_SETUP_GUIDE.md # Setup guide
│   ├── AUTORAG_SETUP_PLAN.md # Implementation plan
│   └── AUTORAG_IMPLEMENTATION_SUMMARY.md # Implementation summary
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

## Repository Setup

To set up this repository on GitHub and GitLab:

1. **Create repositories** on GitHub and GitLab (see GITHUB_SETUP.md and GITLAB_SETUP.md)
2. **Run the setup script**:
   ```bash
   ./setup_remotes.sh
   ```
3. **Or manually add remotes**:
   ```bash
   git remote add origin https://github.com/your-username/your-repo.git
   git remote add gitlab https://gitlab.com/your-username/your-repo.git
   ```
4. **Push to both repositories**:
   ```bash
   git push -u origin main
   git push -u gitlab main
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
11. **Cloudflare Containers** - Deploy Docker containers to Cloudflare Workers (June 2025)

<<<<<<< HEAD
OpenDiscourse represents the future of political document analysis, combining the power of Cloudflare's edge computing with advanced AI techniques to provide unprecedented insights into political discourse.
=======
# OpenDiscourse represents the future of political document analysis, combining the power of Cloudflare's edge computing with advanced AI techniques to provide unprecedented insights into political discourse.

# opendiscourse.net-cf

> > > > > > > b328189aabbeda0eb157cb62df9c02295c81962a
>>>>>>> b0b10b9 (scaffold infra: terraform skeleton, CI deploy workflows, backup script and docs)
