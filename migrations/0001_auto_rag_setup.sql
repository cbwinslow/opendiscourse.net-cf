-- Migration script for AutoRAG database setup
-- This script creates the necessary tables for the AutoRAG system

-- Create schema for AutoRAG if it doesn't exist
CREATE SCHEMA IF NOT EXISTS autorag;

-- Table for storing document metadata
CREATE TABLE IF NOT EXISTS autorag.documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    collection TEXT,
    url TEXT,
    mime_type TEXT,
    file_size INTEGER,
    word_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing document chunks
CREATE TABLE IF NOT EXISTS autorag.document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    word_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES autorag.documents(id) ON DELETE CASCADE
);

-- Table for storing processing status
CREATE TABLE IF NOT EXISTS autorag.processing_status (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    status TEXT NOT NULL, -- pending, processing, completed, failed
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES autorag.documents(id) ON DELETE CASCADE
);

-- Table for storing RAG queries
CREATE TABLE IF NOT EXISTS autorag.rag_queries (
    id TEXT PRIMARY KEY,
    query_text TEXT NOT NULL,
    context TEXT,
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_source ON autorag.documents(source);
CREATE INDEX IF NOT EXISTS idx_documents_collection ON autorag.documents(collection);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON autorag.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_status_status ON autorag.processing_status(status);
CREATE INDEX IF NOT EXISTS idx_rag_queries_created_at ON autorag.rag_queries(created_at);

-- Insert initial data for testing
INSERT OR IGNORE INTO autorag.documents (id, title, source, collection, url) 
VALUES 
    ('test-doc-1', 'Sample Government Document', 'govinfo', 'BILLS', 'https://www.govinfo.gov/sample-bill.pdf'),
    ('test-doc-2', 'Congressional Record', 'govinfo', 'CREC', 'https://www.govinfo.gov/sample-crec.pdf');

INSERT OR IGNORE INTO autorag.document_chunks (id, document_id, chunk_index, text_content) 
VALUES 
    ('test-chunk-1', 'test-doc-1', 0, 'This is a sample chunk from a government document. It contains information about legislative processes.'),
    ('test-chunk-2', 'test-doc-1', 1, 'Another chunk from the same document discussing policy implications.'),
    ('test-chunk-3', 'test-doc-2', 0, 'Sample text from the Congressional Record about political discourse.');

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