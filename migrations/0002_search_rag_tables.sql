-- Migration 0002: Create additional tables for search and RAG features

-- Search index table for full-text search
CREATE TABLE search_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    term TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

-- Query log for analytics
CREATE TABLE query_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    results_count INTEGER,
    response_time_ms INTEGER,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- RAG context cache
CREATE TABLE rag_context_cache (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    context TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT
);

-- Document chunks for RAG (when documents are too long)
CREATE TABLE document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding_id TEXT, -- Reference to Vectorize index
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_search_index_term ON search_index(term);
CREATE INDEX idx_search_index_document ON search_index(document_id);
CREATE INDEX idx_query_log_timestamp ON query_log(timestamp);
CREATE INDEX idx_rag_context_cache_expires ON rag_context_cache(expires_at);
CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks(embedding_id);