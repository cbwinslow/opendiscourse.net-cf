# OpenDiscourse System Architecture and Data Flow

## Overview

This document describes the complete system architecture and data flow for the OpenDiscourse political document analysis platform.

## System Components

### 1. Data Sources

- **govinfo.gov API** - Legislative documents, congressional records
- **congress.gov API** - Bills, members, committees, hearings
- **File Uploads** - User-provided political documents
- **Web Sources** - crawl4ai-rag integration for web content

### 2. Ingestion Layer

- **Data Ingestion Services** - Fetch data from APIs
- **File Parsers** - Extract text from PDF, XML, HTML, Markdown
- **Webhook Receivers** - Real-time updates from external sources

### 3. Processing Layer

- **Document Processor** - Text extraction and metadata extraction
- **Analysis Engine** - NLP processing, sentiment analysis, entity extraction
- **Chunking Service** - Split documents for vectorization
- **Vectorization Service** - Generate embeddings for semantic search

### 4. Storage Layer

- **D1 Database** - Structured data storage (documents, metadata, analysis results)
- **R2 Storage** - Original document files
- **Vectorize** - Vector embeddings for semantic search
- **KV Cache** - Frequently accessed data
- **Neo4j** - Knowledge graph for entity relationships

### 5. API Layer

- **Cloudflare Workers** - RESTful API endpoints
- **RAG Service** - Retrieval Augmented Generation for question answering
- **Search Service** - Full-text and semantic search
- **Graph API** - Knowledge graph queries

### 6. Presentation Layer

- **Web Frontend** - User interface hosted on Cloudflare Pages
- **Dashboard** - Data visualization and analytics
- **Reporting** - Exportable reports and insights

## Data Flow

### Phase 1: Data Ingestion

```
[Data Sources] → [Ingestion Services] → [File Parsers] → [Document Processor]
     ↓
[Parsed Documents] → [Metadata Extraction] → [D1 Database]
```

### Phase 2: Analysis and Processing

```
[Documents] → [Analysis Engine] → [Entity Extraction]
     ↓
[Entities & Relationships] → [Neo4j Knowledge Graph]

[Documents] → [Sentiment Analysis] → [D1 Database]
     ↓
[Documents] → [Chunking Service] → [Vectorization Service] → [Vectorize]
```

### Phase 3: Storage and Indexing

```
[Structured Data] → [D1 Database]
[Document Files] → [R2 Storage]
[Vector Embeddings] → [Vectorize]
[Entity Relationships] → [Neo4j]
[Frequently Accessed Data] → [KV Cache]
```

### Phase 4: API and Query Processing

```
[User Requests] → [Cloudflare Workers API]
     ↓
[API Layer] → [Query Routing] → [Appropriate Data Store]
     ↓
[Query Results] → [Response Processing] → [User]
```

### Phase 5: Presentation and Visualization

```
[API Responses] → [Web Frontend] → [User Interface]
     ↓
[Dashboard] ← [Visualization Engine] ← [Analytics Data]
```

## Detailed Data Flow Steps

### 1. Document Ingestion

1. User uploads document or system fetches from govinfo.gov/congress.gov
2. File parser extracts text content based on file type
3. Document processor extracts metadata (title, author, date, etc.)
4. Metadata stored in D1 database

### 2. NLP Analysis

1. Document text sent to analysis engine
2. Entity extraction identifies politicians, legislation, organizations
3. Sentiment analysis determines political sentiment
4. Topic modeling categorizes document content
5. Results stored in D1 database

### 3. Knowledge Graph Population

1. Entities and relationships extracted from analysis
2. Data formatted for Neo4j schema
3. Nodes and relationships created in knowledge graph
4. Relationship inference algorithms discover new connections

### 4. Vectorization

1. Document chunks sent to vectorization service
2. Embeddings generated using AI models
3. Embeddings stored in Vectorize database
4. Indexes updated for semantic search

### 5. API Processing

1. User request received by Cloudflare Worker
2. Request routed to appropriate service
3. Data retrieved from relevant storage system
4. Results processed and formatted
5. Response sent to user

### 6. Frontend Presentation

1. API responses received by web frontend
2. Data rendered in user interface
3. Visualizations generated from analytics data
4. Interactive elements enable user exploration

## Integration Points

### Cloudflare Services

- **Workers** - API logic and business rules
- **D1** - Structured data storage
- **R2** - Document file storage
- **Vectorize** - Vector database for embeddings
- **KV** - Caching layer
- **Pages** - Frontend hosting
- **AI Gateway** - AI model access (future)

### Neo4j Integration

- **Docker Container** - Neo4j database instance
- **Cloudflare Tunnel** - Secure connection to Neo4j
- **Worker API** - Graph query endpoints
- **Future Containers** - Direct container deployment (June 2025)

### External Integrations

- **govinfo.gov API** - Legislative document ingestion
- **congress.gov API** - Member and committee data
- **crawl4ai-rag** - Web content crawling (planned)
- **Social Media APIs** - Twitter, Facebook, etc. (planned)

## Security and Privacy

### Data Protection

- Encryption at rest (R2, D1, Neo4j)
- Encryption in transit (HTTPS, TLS)
- Access control and authentication
- Audit logging for compliance

### Privacy Considerations

- Minimal data collection
- User consent for data processing
- Data retention and deletion policies
- GDPR and CCPA compliance

## Scalability and Performance

### Horizontal Scaling

- Cloudflare Workers automatically scale
- D1 database handles concurrent connections
- R2 provides unlimited storage
- Vectorize optimized for large collections

### Performance Optimization

- KV caching for frequently accessed data
- Database indexing for fast queries
- Vector search optimization
- CDN for frontend assets

## Monitoring and Maintenance

### Health Monitoring

- API health checks
- Database performance metrics
- Storage usage tracking
- Error rate monitoring

### Maintenance Tasks

- Database backups
- Index optimization
- Model retraining
- Security updates

This architecture provides a robust, scalable platform for political document analysis while leveraging Cloudflare's global network for optimal performance.
