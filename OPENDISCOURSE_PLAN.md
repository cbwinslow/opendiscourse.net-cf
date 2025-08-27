# OpenDiscourse: Political Document Analyzer

## Overview
OpenDiscourse is a political document analysis platform that uses advanced AI techniques to analyze, categorize, and provide insights into political documents such as speeches, bills, and policy papers.

## Core Features

### 1. Document Management
- Upload and store political documents (PDF, TXT, DOCX)
- Automatic metadata extraction (author, date, topic)
- Document versioning and history tracking
- Access control and permissions

### 2. AI-Powered Analysis
- Natural Language Processing for entity extraction
- Sentiment analysis of political content
- Topic modeling and categorization
- Keyphrase and keyword extraction
- Summarization of long documents

### 3. Search & Discovery
- Full-text search across all documents
- Semantic search using vector embeddings
- Advanced filtering by date, author, topic, sentiment
- Similar document recommendations

### 4. RAG (Retrieval Augmented Generation)
- Question answering over political documents
- Context-aware responses with citations
- Multi-document synthesis and comparison
- Fact-checking against known political statements

### 5. Visualization & Reporting
- Interactive dashboards for political analysis
- Trend analysis over time
- Comparative analysis between politicians/parties
- Exportable reports and visualizations

## Technical Architecture

### Cloudflare Services Used
1. **Workers** - Core application logic and API endpoints
2. **D1** - Structured data storage (documents metadata, user data)
3. **R2** - Object storage for original documents
4. **KV** - Caching layer for frequent queries and results
5. **Vectorize** - Vector database for embeddings
6. **AI Gateway** - Access to AI models for embeddings and generation
7. **Pages** - Frontend hosting

### Data Flow
1. Document Upload → R2 Storage
2. Document Processing → Workers (metadata extraction, text processing)
3. Embedding Generation → AI Gateway/Workers → Vectorize
4. Metadata Storage → D1 Database
5. Query Processing → Workers (search, RAG)
6. Results Caching → KV
7. Frontend Display → Pages

## Services Breakdown

### Document Service
- Handle document upload/download
- Process documents for text extraction
- Extract metadata (author, date, etc.)
- Generate document previews

### Search Service
- Full-text search using D1
- Semantic search using Vectorize
- Hybrid search combining both approaches
- Faceted search and filtering

### Analysis Service
- NLP processing of documents
- Sentiment analysis
- Topic modeling
- Entity extraction

### RAG Service
- Document retrieval based on queries
- Context preparation for LLMs
- Response generation with citations
- Multi-document synthesis

### Vector Service
- Embedding generation and storage
- Similarity search
- Vector index management

## API Endpoints

### Documents
- POST /api/documents - Upload document
- GET /api/documents - List documents
- GET /api/documents/{id} - Get document details
- DELETE /api/documents/{id} - Delete document

### Search
- GET /api/search?q={query} - Full-text search
- GET /api/search/semantic?q={query} - Semantic search
- GET /api/search/advanced - Advanced filtering

### Analysis
- POST /api/analyze - Analyze document
- GET /api/analyze/{id} - Get analysis results

### RAG
- POST /api/rag/query - Ask questions about documents
- POST /api/rag/compare - Compare multiple documents

## Deployment Architecture
- Main Worker for API endpoints
- Scheduled Workers for background processing
- R2 for document storage
- D1 for metadata
- Vectorize for embeddings
- KV for caching
- Pages for frontend