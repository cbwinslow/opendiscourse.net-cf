-- Migration 0001: Create initial tables for OpenDiscourse

-- Documents table
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    date TEXT,
    content TEXT,
    summary TEXT,
    word_count INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Document metadata table
CREATE TABLE document_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

-- Entities extracted from documents
CREATE TABLE entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    type TEXT NOT NULL,
    relevance REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

-- Topics associated with documents
CREATE TABLE topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    confidence REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

-- Sentiment analysis results
CREATE TABLE sentiment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    polarity REAL,
    subjectivity REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

-- Users table (for access control)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_documents_author ON documents(author);
CREATE INDEX idx_documents_date ON documents(date);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_metadata_document_id ON document_metadata(document_id);
CREATE INDEX idx_entities_document_id ON entities(document_id);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_topics_document_id ON topics(document_id);
CREATE INDEX idx_sentiment_document_id ON sentiment(document_id);
CREATE INDEX idx_users_email ON users(email);