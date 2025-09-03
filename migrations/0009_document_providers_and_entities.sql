-- Migration 0009: Add document providers and enhance entities

-- Create document_providers table
CREATE TABLE IF NOT EXISTS document_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    base_url TEXT,
    api_endpoint TEXT,
    api_key_required BOOLEAN DEFAULT false,
    rate_limit INTEGER,
    last_sync TEXT,
    sync_frequency TEXT, -- e.g., 'daily', 'weekly', 'monthly'
    is_active BOOLEAN DEFAULT true,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create document_provider_configs table for provider-specific configurations
CREATE TABLE IF NOT EXISTS document_provider_configs (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    config_key TEXT NOT NULL,
    config_value TEXT,
    is_secret BOOLEAN DEFAULT false,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES document_providers(id) ON DELETE CASCADE,
    UNIQUE(provider_id, config_key)
);

-- Create entity_types table
CREATE TABLE IF NOT EXISTS entity_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Enhance entities table with more fields
ALTER TABLE entities ADD COLUMN IF NOT EXISTS entity_type_id TEXT REFERENCES entity_types(id);
ALTER TABLE entities ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS last_verified TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_entities_entity_type_id ON entities(entity_type_id);
CREATE INDEX IF NOT EXISTS idx_entities_source_id ON entities(source_id);
CREATE INDEX IF NOT EXISTS idx_entities_is_active ON entities(is_active);

-- Create entity_relationships table
CREATE TABLE IF NOT EXISTS entity_relationships (
    id TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    source TEXT,
    confidence FLOAT,
    metadata JSONB,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Create entity_aliases table
CREATE TABLE IF NOT EXISTS entity_aliases (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    alias_type TEXT, -- e.g., 'abbreviation', 'former_name', 'alternate_spelling'
    is_primary BOOLEAN DEFAULT false,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    UNIQUE(entity_id, alias)
);

-- Insert default entity types if they don't exist
INSERT OR IGNORE INTO entity_types (id, name, description, color_code) VALUES
    ('PERSON', 'Person', 'An individual person', '#4287f5'),
    ('ORGANIZATION', 'Organization', 'A company, government agency, or other organization', '#42f5a7'),
    ('LOCATION', 'Location', 'A geographical location', '#f5a742'),
    ('EVENT', 'Event', 'A significant occurrence or happening', '#f54275'),
    ('BILL', 'Legislative Bill', 'A proposed piece of legislation', '#a742f5'),
    ('COMMITTEE', 'Committee', 'A formal group within a legislative body', '#f5d442'),
    ('POLITICAL_PARTY', 'Political Party', 'A political organization', '#f54242'),
    ('GOVERNMENT_AGENCY', 'Government Agency', 'A government department or agency', '#42f5e6'),
    ('POLITICAL_POSITION', 'Political Position', 'A government or political role', '#c642f5');

-- Update documents table with provider relationship
ALTER TABLE documents ADD COLUMN IF NOT EXISTS provider_id TEXT REFERENCES document_providers(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS raw_data JSONB; -- Store original data from provider

-- Create index for provider_id in documents
CREATE INDEX IF NOT EXISTS idx_documents_provider_id ON documents(provider_id);
