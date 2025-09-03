-- Database schema for Individuals and Ingested Content

CREATE TABLE IF NOT EXISTS individuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL,
    aliases TEXT[],
    primary_email TEXT,
    primary_phone TEXT,
    websites TEXT[],
    social_handles JSONB,
    provenance JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingested_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    individual_id UUID REFERENCES individuals(id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    url TEXT,
    raw_json JSONB,
    media_type TEXT,
    bucket_path TEXT,
    transcribed_text TEXT,
    transcription_metadata JSONB,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    individual_id UUID REFERENCES individuals(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL,
    metric_value JSONB,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
