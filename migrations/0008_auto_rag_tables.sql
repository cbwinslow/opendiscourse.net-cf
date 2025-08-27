-- Migration 0008: Create AutoRAG tables for vector database and semantic search

-- Create schema for AutoRAG if it doesn't exist
CREATE SCHEMA IF NOT EXISTS autorag;

-- Table for storing document metadata specific to AutoRAG
CREATE TABLE IF NOT EXISTS autorag.documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    collection TEXT,
    url TEXT,
    mime_type TEXT,
    file_size INTEGER,
    word_count INTEGER,
    embedding_model TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing document chunks with their embeddings
CREATE TABLE IF NOT EXISTS autorag.document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    embedding_vector TEXT, -- Store as JSON string in D1
    word_count INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES autorag.documents(id) ON DELETE CASCADE
);

-- Table for storing processing status of documents
CREATE TABLE IF NOT EXISTS autorag.processing_status (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    status TEXT NOT NULL, -- pending, processing, completed, failed
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (document_id) REFERENCES autorag.documents(id) ON DELETE CASCADE
);

-- Table for storing RAG queries and responses
CREATE TABLE IF NOT EXISTS autorag.rag_queries (
    id TEXT PRIMARY KEY,
    query_text TEXT NOT NULL,
    context TEXT,
    response TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_autorag_documents_source ON autorag.documents(source);
CREATE INDEX IF NOT EXISTS idx_autorag_documents_collection ON autorag.documents(collection);
CREATE INDEX IF NOT EXISTS idx_autorag_document_chunks_document_id ON autorag.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_autorag_processing_status_status ON autorag.processing_status(status);
CREATE INDEX IF NOT EXISTS idx_autorag_rag_queries_created_at ON autorag.rag_queries(created_at);

-- Create view for document processing overview
CREATE VIEW IF NOT EXISTS autorag.document_processing_overview AS
SELECT 
    d.id,
    d.title,
    d.source,
    d.collection,
    ps.status,
    ps.started_at,
    ps.completed_at,
    ps.error_message
FROM autorag.documents d
LEFT JOIN autorag.processing_status ps ON d.id = ps.document_id;