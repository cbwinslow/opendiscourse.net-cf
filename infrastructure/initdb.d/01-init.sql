-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enum types
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'processed', 'failed');
CREATE TYPE processing_stage AS ENUM ('uploaded', 'chunked', 'embedded', 'indexed');

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_filename TEXT NOT NULL,
    content_type TEXT,
    file_size BIGINT,
    storage_path TEXT UNIQUE NOT NULL,
    status document_status NOT NULL DEFAULT 'pending',
    current_stage processing_stage,
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Document chunks
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

-- Create indexes for performance
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Search history
CREATE TABLE searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    user_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search results
CREATE TABLE search_results (
    search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    rank INTEGER NOT NULL,
    PRIMARY KEY (search_id, document_id, chunk_id)
);

-- Processing queue
CREATE TABLE processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status document_status NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for queue processing
CREATE INDEX idx_processing_queue_status ON processing_queue(status, priority DESC, scheduled_at);
CREATE INDEX idx_processing_queue_document ON processing_queue(document_id);

-- Create functions for timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_documents_modtime
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_document_chunks_modtime
BEFORE UPDATE ON document_chunks
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_processing_queue_modtime
BEFORE UPDATE ON processing_queue
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Function for similarity search
CREATE OR REPLACE FUNCTION semantic_search(
    query_embedding vector(1536),
    similarity_threshold float,
    match_count int
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.content,
        jsonb_build_object(
            'document_metadata', d.metadata,
            'chunk_metadata', c.metadata,
            'document_id', d.id,
            'document_name', d.original_filename,
            'chunk_index', c.chunk_index
        ) as metadata,
        1 - (c.embedding <=> query_embedding) as similarity
    FROM
        document_chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE 1 - (c.embedding <=> query_embedding) > similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
