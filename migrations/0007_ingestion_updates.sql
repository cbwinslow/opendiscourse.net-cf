-- Migration 0007: Update tables for ingestion system

-- Add columns to documents table for source tracking
ALTER TABLE documents ADD COLUMN source TEXT;
ALTER TABLE documents ADD COLUMN source_id TEXT;
ALTER TABLE documents ADD COLUMN ingestion_date TEXT;

-- Create indexes for better performance
CREATE INDEX idx_documents_source ON documents(source);
CREATE INDEX idx_documents_source_id ON documents(source_id);
CREATE INDEX idx_documents_ingestion_date ON documents(ingestion_date);

-- Update existing tables to add foreign key constraints where missing
CREATE INDEX IF NOT EXISTS idx_entities_document_id ON entities(document_id);
CREATE INDEX IF NOT EXISTS idx_topics_document_id ON topics(document_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_document_id ON sentiment(document_id);
CREATE INDEX IF NOT EXISTS idx_document_metadata_document_id ON document_metadata(document_id);