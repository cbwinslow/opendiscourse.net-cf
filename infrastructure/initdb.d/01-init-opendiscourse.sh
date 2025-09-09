#!/bin/bash
set -e

# Initialize PostgreSQL for OpenDiscourse with pgvector extension

echo "Initializing OpenDiscourse database..."

# Create the main application database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create basic schema
    CREATE SCHEMA IF NOT EXISTS opendiscourse;
    CREATE SCHEMA IF NOT EXISTS analytics;
    CREATE SCHEMA IF NOT EXISTS auth;
    
    -- Create application user if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'opendiscourse_app') THEN
            CREATE ROLE opendiscourse_app WITH LOGIN PASSWORD 'app_password_2024';
        END IF;
    END
    \$\$;
    
    -- Grant permissions
    GRANT USAGE ON SCHEMA opendiscourse TO opendiscourse_app;
    GRANT USAGE ON SCHEMA analytics TO opendiscourse_app;
    GRANT CREATE ON SCHEMA opendiscourse TO opendiscourse_app;
    GRANT CREATE ON SCHEMA analytics TO opendiscourse_app;
    
    -- Create basic tables for document storage and vector search
    CREATE TABLE IF NOT EXISTS opendiscourse.documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source VARCHAR(255),
        document_type VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        embedding vector(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS opendiscourse.document_chunks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES opendiscourse.documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create vector indexes for similarity search
    CREATE INDEX IF NOT EXISTS documents_embedding_idx ON opendiscourse.documents 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON opendiscourse.document_chunks 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    
    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS documents_source_idx ON opendiscourse.documents(source);
    CREATE INDEX IF NOT EXISTS documents_type_idx ON opendiscourse.documents(document_type);
    CREATE INDEX IF NOT EXISTS documents_created_at_idx ON opendiscourse.documents(created_at);
    
    -- Grant permissions to app user
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA opendiscourse TO opendiscourse_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA analytics TO opendiscourse_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA opendiscourse TO opendiscourse_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO opendiscourse_app;
    
    -- Create analytics tables
    CREATE TABLE IF NOT EXISTS analytics.search_queries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        query_text TEXT NOT NULL,
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        results_count INTEGER,
        response_time_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS analytics.document_views (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES opendiscourse.documents(id),
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        view_duration_seconds INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS search_queries_created_at_idx ON analytics.search_queries(created_at);
    CREATE INDEX IF NOT EXISTS document_views_created_at_idx ON analytics.document_views(created_at);
    CREATE INDEX IF NOT EXISTS document_views_document_id_idx ON analytics.document_views(document_id);
EOSQL

echo "OpenDiscourse database initialization completed successfully!"