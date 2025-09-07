/*
================================================================================
Name:            Political RAG Self-Host Schema for govinfo.gov + Social + NLP
Date:            2025-08-27
Script Name:     schema_political_rag_selfhost.sql
Version:         1.0.0
Log Summary:     One-and-done SQL to bootstrap all schemas, tables, indices, and
                 vector support for analyzing political documentation from
                 govinfo.gov/bulkdata plus tweets and media, with full NLP
                 pipelines (spaCy, BERT, ST, sentiment, toxicity) and graph
                 structures. Includes MCP-ish harvest registry tables so your
                 MCP server can track endpoints, jobs, and runs, with provenance.
Description:     Run this script on a fresh Postgres (with pgvector) to create:
                 - Schemas: mcp, raw_govinfo, staging, people, social, nlp, graph, audit
                 - Harvest: endpoints/jobs/runs for govinfo (and friends)
                 - Raw ingest model for govinfo packages/granules/files
                 - Unified doc staging for legislation/speeches/tweets/media
                 - People/memberships (e.g., 118th Congress), committees, offices
                 - Social (Twitter/X) accounts and tweets
                 - NLP registry (models, runs) + embeddings and result tables
                 - Graph entities/edges for knowledge graph / GraphRAG
                 - Indexes, FKs, and comments
Change Summary:  v1.0.0 Initial avant-garde drop. All schemas unified, pgvector
                 enabled, and analysis tables wired for provenance. Designed to
                 work great with RAG + Graph RAG and an MCP harvester.
Inputs:          None (but assumes Postgres 15+ with CREATE EXTENSION privilege).
Outputs:         Schemas, tables, types, indexes, and comments in your database.
Warnings:        - This is a generic schema designed from common govinfo patterns.
                   If you have exact field definitions from specific collections,
                   extend the raw_* tables accordingly.
                 - pgvector required for embeddings columns (vector(1536) default).
Usage:           psql -U postgres -d political_rag -f schema_political_rag_selfhost.sql
Variables:       - Adjust VECTOR_DIM if your embedding model changes.
                 - Tweak enums to add more labels for tasks/sentiment/toxicity.
--------------------------------------------------------------------------------
ASCII Architecture Sketch (y2k-core aesthetics)
--------------------------------------------------------------------------------
[harvester (MCP)] -> [mcp.endpoints/jobs/runs] -> [raw_govinfo.*] -> [staging.documents]
                                           \-> [social.*] -> [nlp.*] -> [graph.*]
Observability + Provenance -> [audit.*]

People/Congress -> [people.politicians]--(membership)-->[people.memberships]
Tweets/Media -> [social.tweets/media_appearances] -> NLP -> Graph

VectorDB -> pgvector columns in nlp.embeddings, plus aux indexes everywhere.
================================================================================
*/

-- =============================================================================
-- SECTION 0: Pre-req Extensions and Settings
-- -----------------------------------------------------------------------------
-- Enable the essentials. pgvector powers embeddings. pg_trgm helps fuzzy search.
-- uuid-ossp/pgcrypto for UUIDs and hashing. inet for IP addresses.
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Comfort: set a default search_path (override per session/app as needed)
-- Note: Keeping public first to keep default behavior predictable.
SET search_path = public;

-- Vector dimension default (adjust if your embedding differs)
-- We'll reference this constant in comments; Postgres doesn't support SQL constants directly.
-- Default: 1536 (OpenAI ada-like dims, many LocalAI/gguf embeddings mirror this).
-- If you need a different dimension, change vector(...) declarations below.

-- =============================================================================
-- SECTION 1: Custom Types (Enums)
-- -----------------------------------------------------------------------------
-- Make schemas semantic and self-documenting with enums for consistency.
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type_enum') THEN
    CREATE TYPE source_type_enum AS ENUM ('legislation', 'speech', 'tweet', 'media', 'web', 'file');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chamber_enum') THEN
    CREATE TYPE chamber_enum AS ENUM ('House', 'Senate', 'Joint', 'Other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nlp_task_enum') THEN
    CREATE TYPE nlp_task_enum AS ENUM (
      'embedding',
      'ner',
      'relation_extraction',
      'sentiment',
      'toxicity',
      'hate_speech',
      'topic_modeling',
      'summarization',
      'keyphrase_extraction'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_status_enum') THEN
    CREATE TYPE run_status_enum AS ENUM ('queued', 'running', 'succeeded', 'failed', 'partial');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sentiment_label_enum') THEN
    CREATE TYPE sentiment_label_enum AS ENUM ('very_negative', 'negative', 'neutral', 'positive', 'very_positive', 'mixed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'toxicity_label_enum') THEN
    CREATE TYPE toxicity_label_enum AS ENUM ('none', 'insult', 'threat', 'obscene', 'identity_attack', 'sexual_explicit', 'profanity', 'harassment', 'hateful');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relation_label_enum') THEN
    CREATE TYPE relation_label_enum AS ENUM (
      'AFFILIATED_WITH',
      'MEMBER_OF',
      'SPONSORS',
      'COSPONSORS',
      'MENTIONS',
      'SUPPORTS',
      'OPPOSES',
      'AMENDS',
      'RELATED_TO'
    );
  END IF;
END$$;

-- =============================================================================
-- SECTION 2: Schemas
-- -----------------------------------------------------------------------------
-- Each domain gets a schema. Clean, modular, 90s tidy.
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS mcp;
CREATE SCHEMA IF NOT EXISTS raw_govinfo;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS people;
CREATE SCHEMA IF NOT EXISTS social;
CREATE SCHEMA IF NOT EXISTS nlp;
CREATE SCHEMA IF NOT EXISTS graph;
CREATE SCHEMA IF NOT EXISTS audit;

-- =============================================================================
-- SECTION 3: MCP (Model Context Protocol-ish) Harvest Registry
-- -----------------------------------------------------------------------------
-- Track endpoints (govinfo collections), harvest jobs, and runs with provenance.
-- Your MCP server can read/write here to orchestrate crawls.
-- =============================================================================

CREATE TABLE IF NOT EXISTS mcp.sources (
  source_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT UNIQUE NOT NULL,       -- e.g., 'govinfo'
  name              TEXT NOT NULL,              -- Human name
  base_url          TEXT NOT NULL,              -- e.g., https://www.govinfo.gov/bulkdata
  docs_url          TEXT,                       -- Documentation landing page
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE mcp.sources IS 'Upstream content sources (e.g., govinfo).';
COMMENT ON COLUMN mcp.sources.code IS 'Short code identifier for the source.';

CREATE TABLE IF NOT EXISTS mcp.endpoints (
  endpoint_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         UUID NOT NULL REFERENCES mcp.sources(source_id) ON DELETE CASCADE,
  collection_code   TEXT NOT NULL,              -- e.g., BILLS, CREC, STATUTE, CFR, PLAW
  description       TEXT,
  path_template     TEXT NOT NULL,              -- e.g., /{collection}/{year}/
  params_schema     JSONB DEFAULT '{}'::jsonb,  -- JSON schema for query params
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, collection_code)
);
COMMENT ON TABLE mcp.endpoints IS 'Specific collections or routes under a source (govinfo collections).';

CREATE TABLE IF NOT EXISTS mcp.harvest_jobs (
  job_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id       UUID NOT NULL REFERENCES mcp.endpoints(endpoint_id) ON DELETE CASCADE,
  name              TEXT NOT NULL,              -- e.g., "govinfo_BILLS_118"
  schedule_cron     TEXT,                       -- if you cron it (e.g., "0 * * * *")
  default_params    JSONB DEFAULT '{}'::jsonb,  -- default params for pulls
  headers           JSONB DEFAULT '{}'::jsonb,  -- HTTP headers if needed
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint_id, name)
);
COMMENT ON TABLE mcp.harvest_jobs IS 'Config for recurring pulls per endpoint/collection.';

CREATE TABLE IF NOT EXISTS mcp.harvest_runs (
  run_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID NOT NULL REFERENCES mcp.harvest_jobs(job_id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  status            run_status_enum NOT NULL DEFAULT 'queued',
  effective_params  JSONB DEFAULT '{}'::jsonb,
  bytes_downloaded  BIGINT DEFAULT 0,
  new_packages      INT DEFAULT 0,
  new_granules      INT DEFAULT 0,
  new_files         INT DEFAULT 0,
  error_summary     TEXT,
  errors_json       JSONB DEFAULT '[]'::jsonb,
  ip_address        INET,                       -- capture harvester node IP
  geo_city          TEXT,
  geo_region        TEXT,
  geo_country       TEXT
);
COMMENT ON TABLE mcp.harvest_runs IS 'Audit/provenance of individual harvest executions.';

CREATE INDEX IF NOT EXISTS idx_mcp_runs_job_time ON mcp.harvest_runs(job_id, started_at DESC);

-- =============================================================================
-- SECTION 4: raw_govinfo - Canonical-ish Raw Ingest
-- -----------------------------------------------------------------------------
-- This mirrors common govinfo/bulkdata structures: collections -> packages
-- -> granules -> files. We store metadata JSON to handle collection-specific bits.
-- =============================================================================

CREATE TABLE IF NOT EXISTS raw_govinfo.collections (
  collection_code   TEXT PRIMARY KEY,           -- e.g., BILLS, CREC, STATUTE
  title             TEXT,
  description       TEXT,
  source_id         UUID REFERENCES mcp.sources(source_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_govinfo.packages (
  package_id        TEXT PRIMARY KEY,           -- govinfo package identifier
  collection_code   TEXT NOT NULL REFERENCES raw_govinfo.collections(collection_code) ON DELETE CASCADE,
  title             TEXT,
  congress          INT,                        -- e.g., 118
  chamber           chamber_enum,
  bill_number       TEXT,                       -- if applicable (for BILLS)
  bill_type         TEXT,                       -- hr, s, hjres, etc.
  date_issued       DATE,
  last_modified     TIMESTAMPTZ,
  doc_class         TEXT,                       -- govinfo docClass if present
  canonical_url     TEXT,                       -- package endpoint URL
  metadata_json     JSONB DEFAULT '{}'::jsonb,
  inserted_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_raw_packages_collection ON raw_govinfo.packages(collection_code);
CREATE INDEX IF NOT EXISTS idx_raw_packages_congress_chamber ON raw_govinfo.packages(congress, chamber);

COMMENT ON TABLE raw_govinfo.packages IS 'govinfo packages (top-level docs) across collections.';

CREATE TABLE IF NOT EXISTS raw_govinfo.granules (
  granule_id        TEXT PRIMARY KEY,           -- govinfo granule id
  package_id        TEXT NOT NULL REFERENCES raw_govinfo.packages(package_id) ON DELETE CASCADE,
  title             TEXT,
  granule_class     TEXT,
  sequence          INT,
  canonical_url     TEXT,
  metadata_json     JSONB DEFAULT '{}'::jsonb,
  inserted_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_raw_granules_package ON raw_govinfo.granules(package_id);

COMMENT ON TABLE raw_govinfo.granules IS 'govinfo granules under a package, e.g., sections/parts.';

CREATE TABLE IF NOT EXISTS raw_govinfo.files (
  file_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id        TEXT REFERENCES raw_govinfo.packages(package_id) ON DELETE CASCADE,
  granule_id        TEXT REFERENCES raw_govinfo.granules(granule_id) ON DELETE CASCADE,
  file_path         TEXT,                       -- filename or relative path
  mime_type         TEXT,
  size_bytes        BIGINT,
  checksum_sha1     TEXT,
  canonical_url     TEXT,
  content_text      TEXT,                       -- extracted text (optional; large)
  content_json      JSONB,                      -- if JSON (e.g., metadata payloads)
  inserted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (package_id, granule_id, file_path)
);
CREATE INDEX IF NOT EXISTS idx_raw_files_pkg_granule ON raw_govinfo.files(package_id, granule_id);

COMMENT ON TABLE raw_govinfo.files IS 'Files belonging to packages/granules, with extracted text when applicable.';

-- =============================================================================
-- SECTION 5: staging - Unified Documents for Analysis
-- -----------------------------------------------------------------------------
-- Normalize raw content into consistent "documents" used by RAG/NLP/Graph.
-- =============================================================================

CREATE TABLE IF NOT EXISTS staging.documents (
  document_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type       source_type_enum NOT NULL,  -- legislation, speech, tweet, media, ...
  source_ref        TEXT,                       -- e.g., raw package_id, tweet_id, url
  title             TEXT,
  author            TEXT,                       -- sponsor/speaker; for tweets: handle
  published_at      TIMESTAMPTZ,
  language          TEXT,
  jurisdiction      TEXT,                       -- e.g., US Federal, State
  legislative_body  TEXT,                       -- e.g., "Congress", "Senate"
  congress          INT,                        -- e.g., 118
  chamber           chamber_enum,
  member_bioguide   TEXT,                       -- link to people.politicians.bioguide_id
  url               TEXT,
  text              TEXT NOT NULL,              -- normalized body
  sha256            TEXT UNIQUE,                -- content hash
  metadata_json     JSONB DEFAULT '{}'::jsonb,
  inserted_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_type_time ON staging.documents(source_type, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_congress ON staging.documents(congress, chamber);

COMMENT ON TABLE staging.documents IS 'Unified document layer powering RAG/NLP across sources.';

-- =============================================================================
-- SECTION 6: people - Politicians, Memberships, Committees, Offices
-- -----------------------------------------------------------------------------
-- Because who said politics was simple? We model identities and their roles.
-- =============================================================================

CREATE TABLE IF NOT EXISTS people.politicians (
  person_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bioguide_id       TEXT UNIQUE,                -- standard congressional bioguide id
  first_name        TEXT,
  last_name         TEXT,
  full_name         TEXT,
  party             TEXT,
  state             TEXT,                       -- e.g., 'CA'
  district          TEXT,                       -- House districts
  date_of_birth     DATE,
  gender            TEXT,
  wikipedia_url     TEXT,
  official_url      TEXT,
  twitter_handle    TEXT,                       -- @whatever
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS people.memberships (
  membership_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id         UUID NOT NULL REFERENCES people.politicians(person_id) ON DELETE CASCADE,
  body              TEXT NOT NULL,              -- e.g., "Congress"
  congress          INT,                        -- e.g., 118
  chamber           chamber_enum,
  role_title        TEXT,                       -- e.g., "Senator", "Representative"
  party             TEXT,
  start_date        DATE,
  end_date          DATE,
  metadata_json     JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_memberships_person ON people.memberships(person_id);
CREATE INDEX IF NOT EXISTS idx_memberships_congress ON people.memberships(congress, chamber);

COMMENT ON TABLE people.memberships IS 'Legislative body membership entries, e.g., 118th Congress.';

CREATE TABLE IF NOT EXISTS people.committees (
  committee_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT UNIQUE,                -- official committee code if available
  name              TEXT NOT NULL,
  chamber           chamber_enum,
  metadata_json     JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS people.committee_members (
  committee_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id      UUID NOT NULL REFERENCES people.committees(committee_id) ON DELETE CASCADE,
  person_id         UUID NOT NULL REFERENCES people.politicians(person_id) ON DELETE CASCADE,
  role              TEXT,                       -- Chair, Ranking Member, Member
  start_date        DATE,
  end_date          DATE
);
CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON people.committee_members(committee_id);

-- =============================================================================
-- SECTION 7: social - Twitter/X Accounts and Tweets + Media Appearances
-- -----------------------------------------------------------------------------
-- Bring the tweets and TV hits; we got analyses to run and edges to draw.
-- =============================================================================

CREATE TABLE IF NOT EXISTS social.twitter_accounts (
  account_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id  TEXT UNIQUE,                -- Twitter/X user id
  handle            TEXT UNIQUE,                -- @handle
  display_name      TEXT,
  verified          BOOLEAN,
  person_id         UUID REFERENCES people.politicians(person_id) ON DELETE SET NULL,
  party             TEXT,
  official          BOOLEAN,                    -- official office account?
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_json          JSONB
);

CREATE TABLE IF NOT EXISTS social.tweets (
  tweet_id          TEXT PRIMARY KEY,           -- Twitter/X snowflake id
  account_id        UUID NOT NULL REFERENCES social.twitter_accounts(account_id) ON DELETE CASCADE,
  posted_at         TIMESTAMPTZ NOT NULL,
  lang              TEXT,
  text              TEXT NOT NULL,
  referenced_tweet  TEXT,
  reply_count       INT,
  retweet_count     INT,
  like_count        INT,
  quote_count       INT,
  source_client     TEXT,                       -- "Twitter for iPhone" etc
  url               TEXT,
  raw_json          JSONB,
  inserted_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tweets_account_time ON social.tweets(account_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_lang ON social.tweets(lang);

CREATE TABLE IF NOT EXISTS social.media_appearances (
  appearance_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id         UUID REFERENCES people.politicians(person_id) ON DELETE SET NULL,
  outlet            TEXT,                       -- e.g., CNN, Fox, NPR
  program           TEXT,                       -- show name
  appeared_at       TIMESTAMPTZ,
  url               TEXT,
  transcript_text   TEXT,
  location          TEXT,                       -- venue/city if known
  raw_json          JSONB,
  inserted_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_person_time ON social.media_appearances(person_id, appeared_at DESC);

-- =============================================================================
-- SECTION 8: nlp - Models, Runs, Embeddings, and Result Tables
-- -----------------------------------------------------------------------------
-- This is where the AI party happens. Track models, runs, and outputs per chunk/document.
-- =============================================================================

CREATE TABLE IF NOT EXISTS nlp.models (
  model_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family            TEXT NOT NULL,              -- e.g., "bert", "spacy", "llama", "sbert"
  name              TEXT NOT NULL,              -- e.g., "all-MiniLM-L6-v2"
  provider          TEXT,                       -- HF, LocalAI, OpenAI, custom
  version           TEXT,
  license           TEXT,
  task_types        nlp_task_enum[] NOT NULL,   -- what tasks this model can do
  embedding_dim     INT,                        -- dimension if embedding model
  repo_url          TEXT,
  config_json       JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family, name, version)
);
COMMENT ON TABLE nlp.models IS 'Model registry: what models we use in analysis.';

CREATE TABLE IF NOT EXISTS nlp.runs (
  run_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id          UUID NOT NULL REFERENCES nlp.models(model_id) ON DELETE CASCADE,
  task              nlp_task_enum NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  status            run_status_enum NOT NULL DEFAULT 'running',
  params_json       JSONB DEFAULT '{}'::jsonb,  -- thresholds, prompts, etc
  code_version      TEXT,                       -- git SHA or container tag
  node_name         TEXT,                       -- host identifier
  host_ip           INET,                       -- machine IP
  host_location     TEXT,                       -- optional geotag
  notes             TEXT
);
CREATE INDEX IF NOT EXISTS idx_nlp_runs_model_task_time ON nlp.runs(model_id, task, started_at DESC);

COMMENT ON TABLE nlp.runs IS 'Every execution of a given NLP task with a model and params.';

-- Core embeddings table (pgvector). Default 1536-dim; adjust columns if needed.
CREATE TABLE IF NOT EXISTS nlp.embeddings (
  embedding_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  chunk_index       INT NOT NULL,               -- chunk number within the document
  text              TEXT NOT NULL,
  embedding         VECTOR(1536),               -- adjust dim to your model
  tokens            INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_embeddings_doc ON nlp.embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_run ON nlp.embeddings(run_id);
-- ivfflat index: consider building after a few thousand rows for performance.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'nlp' AND indexname = 'idx_embeddings_vec_ivfflat'
  ) THEN
    EXECUTE 'CREATE INDEX idx_embeddings_vec_ivfflat ON nlp.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
  END IF;
END$$;

-- Named entity recognition outputs (spaCy/transformers)
CREATE TABLE IF NOT EXISTS nlp.ner_entities (
  entity_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  chunk_index       INT,
  span_text         TEXT NOT NULL,
  start_char        INT,
  end_char          INT,
  label             TEXT NOT NULL,              -- e.g., PERSON, ORG, LAW, GPE
  norm_name         TEXT,                       -- canonicalized (linking)
  kb_id             TEXT,                       -- knowledge base ID if linked
  confidence        DOUBLE PRECISION,
  metadata_json     JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ner_doc ON nlp.ner_entities(document_id);
CREATE INDEX IF NOT EXISTS idx_ner_label ON nlp.ner_entities(label);

-- Relation extraction outputs (connect entities)
CREATE TABLE IF NOT EXISTS nlp.relations (
  relation_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  head_entity_id    UUID NOT NULL REFERENCES nlp.ner_entities(entity_id) ON DELETE CASCADE,
  tail_entity_id    UUID NOT NULL REFERENCES nlp.ner_entities(entity_id) ON DELETE CASCADE,
  relation_type     relation_label_enum NOT NULL,
  confidence        DOUBLE PRECISION,
  evidence_text     TEXT,                       -- shortest or helpful snippet
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relations_doc ON nlp.relations(document_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON nlp.relations(relation_type);

-- Sentiment analysis per doc/chunk
CREATE TABLE IF NOT EXISTS nlp.sentiment_results (
  result_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  chunk_index       INT,
  label             sentiment_label_enum NOT NULL,
  score             DOUBLE PRECISION,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sentiment_doc ON nlp.sentiment_results(document_id);

-- Toxicity / Hate speech classification
CREATE TABLE IF NOT EXISTS nlp.toxicity_results (
  result_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  chunk_index       INT,
  label             toxicity_label_enum NOT NULL,
  score             DOUBLE PRECISION,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_toxicity_doc ON nlp.toxicity_results(document_id);

-- Topics, keyphrases, summaries
CREATE TABLE IF NOT EXISTS nlp.topic_results (
  result_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  chunk_index       INT,
  topic_label       TEXT,
  score             DOUBLE PRECISION,
  metadata_json     JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nlp.keyphrase_results (
  result_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  chunk_index       INT,
  phrase            TEXT,
  score             DOUBLE PRECISION,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nlp.summaries (
  summary_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID NOT NULL REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  chunk_index       INT,
  summary_text      TEXT NOT NULL,
  prompt            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generic metric table to stash arbitrary scalar results (because science)
CREATE TABLE IF NOT EXISTS nlp.metrics (
  metric_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID REFERENCES staging.documents(document_id) ON DELETE CASCADE,
  chunk_index       INT,
  metric_name       TEXT NOT NULL,
  metric_value      DOUBLE PRECISION,
  units             TEXT,
  metadata_json     JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON nlp.metrics(metric_name);

-- =============================================================================
-- SECTION 9: graph - Entities and Edges for Graph RAG
-- -----------------------------------------------------------------------------
-- We keep a SQL-side graph mirror (even if you also use Neo4j). Belt + suspenders.
-- =============================================================================

CREATE TABLE IF NOT EXISTS graph.entities (
  entity_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name    TEXT NOT NULL,
  entity_type       TEXT NOT NULL,              -- PERSON, ORG, LAW, TOPIC, etc.
  aliases           TEXT[] DEFAULT '{}',
  kb_id             TEXT,                       -- link to external KB
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (canonical_name, entity_type)
);
CREATE INDEX IF NOT EXISTS idx_entities_type ON graph.entities(entity_type);

CREATE TABLE IF NOT EXISTS graph.entity_links (
  link_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         UUID NOT NULL REFERENCES graph.entities(entity_id) ON DELETE CASCADE,
  person_id         UUID REFERENCES people.politicians(person_id) ON DELETE SET NULL,
  bioguide_id       TEXT,
  twitter_handle    TEXT,
  committee_id      UUID REFERENCES people.committees(committee_id) ON DELETE SET NULL,
  metadata_json     JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS graph.edges (
  edge_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_entity_id UUID NOT NULL REFERENCES graph.entities(entity_id) ON DELETE CASCADE,
  predicate         relation_label_enum NOT NULL,
  object_entity_id  UUID NOT NULL REFERENCES graph.entities(entity_id) ON DELETE CASCADE,
  confidence        DOUBLE PRECISION,
  source_document_id UUID REFERENCES staging.documents(document_id) ON DELETE SET NULL,
  source_run_id     UUID REFERENCES nlp.runs(run_id) ON DELETE SET NULL,
  evidence_text     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_edges_predicate ON graph.edges(predicate);
CREATE INDEX IF NOT EXISTS idx_edges_subject ON graph.edges(subject_entity_id);
CREATE INDEX IF NOT EXISTS idx_edges_object ON graph.edges(object_entity_id);

-- =============================================================================
-- SECTION 10: audit - Methodology, Experiments, and Provenance
-- -----------------------------------------------------------------------------
-- If it ain’t documented, it didn’t happen. Science mode: ON.
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit.methodologies (
  methodology_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,              -- e.g., "Govinfo RAG v1"
  version           TEXT NOT NULL,
  description       TEXT NOT NULL,              -- detailed write-up of how
  steps_markdown    TEXT,                       -- step-by-step (markdown)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

CREATE TABLE IF NOT EXISTS audit.experiments (
  experiment_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  methodology_id    UUID NOT NULL REFERENCES audit.methodologies(methodology_id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  hypothesis        TEXT,
  design_json       JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit.experiment_runs (
  experiment_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id     UUID NOT NULL REFERENCES audit.experiments(experiment_id) ON DELETE CASCADE,
  run_id            UUID REFERENCES nlp.runs(run_id) ON DELETE SET NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  status            run_status_enum NOT NULL DEFAULT 'running',
  ip_address        INET,
  geo_city          TEXT,
  geo_region        TEXT,
  geo_country       TEXT,
  notes             TEXT
);

CREATE TABLE IF NOT EXISTS audit.provenance (
  provenance_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES nlp.runs(run_id) ON DELETE CASCADE,
  document_id       UUID REFERENCES staging.documents(document_id) ON DELETE SET NULL,
  source_type       source_type_enum,
  source_ref        TEXT,
  input_hash        TEXT,
  output_hash       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 11: Helpful Views for Common Questions
-- -----------------------------------------------------------------------------
-- Because you will ask these 5 minutes after it goes live. Prepping shortcuts.
-- =============================================================================

-- View: What did members of a given Congress say (by chamber)?
CREATE OR REPLACE VIEW staging.v_member_statements AS
SELECT
  d.document_id,
  d.published_at,
  d.congress,
  d.chamber,
  p.person_id,
  p.full_name,
  p.party,
  d.title,
  LEFT(d.text, 500) AS preview_text,
  d.url
FROM staging.documents d
LEFT JOIN people.politicians p
  ON p.bioguide_id = d.member_bioguide
WHERE d.source_type IN ('legislation', 'speech');

-- View: Join tweets to politicians with a quick snippet
CREATE OR REPLACE VIEW social.v_politician_tweets AS
SELECT
  t.tweet_id,
  t.posted_at,
  a.handle,
  p.person_id,
  p.full_name,
  p.party,
  LEFT(t.text, 280) AS tweet_preview,
  t.url
FROM social.tweets t
JOIN social.twitter_accounts a ON a.account_id = t.account_id
LEFT JOIN people.politicians p ON p.person_id = a.person_id;

-- View: Edge list with subject/object names for Graph RAG inspection
CREATE OR REPLACE VIEW graph.v_edges_named AS
SELECT
  e.edge_id,
  s.canonical_name AS subject,
  e.predicate,
  o.canonical_name AS object,
  e.confidence,
  e.source_document_id,
  e.source_run_id,
  e.evidence_text,
  e.created_at
FROM graph.edges e
JOIN graph.entities s ON s.entity_id = e.subject_entity_id
JOIN graph.entities o ON o.entity_id = e.object_entity_id;

-- =============================================================================
-- SECTION 12: Comments on Methodology (Narrative in SQL because we fancy)
-- -----------------------------------------------------------------------------
-- High-level methodology we intend to follow:
--
-- 1) Harvest (MCP):
--    - Register govinfo source/endpoints in mcp.sources/mcp.endpoints (e.g., BILLS, CREC).
--    - Create harvest_jobs scoped to collection + Congress/year ranges.
--    - Log each harvest execution in mcp.harvest_runs with params and footprints.
--
-- 2) Ingest:
--    - For each fetched package/granule/file:
--      * Insert metadata into raw_govinfo.packages/granules/files.
--      * Extract text content; normalize to staging.documents with source_type=legislation/speech.
--      * Compute sha256 to dedupe; capture congress/chamber/bill fields when available.
--
-- 3) People:
--    - Populate people.politicians from reliable rosters (e.g., official bulk data), map bioguide IDs.
--    - Create memberships per Congress in people.memberships. Now we can answer "118th Congress" queries.
--
-- 4) Social + Media:
--    - Sync official accounts to social.twitter_accounts; ingest tweets to social.tweets.
--    - Capture media appearances (transcripts) in social.media_appearances.
--    - Normalize tweets/media to staging.documents as source_type='tweet'/'media' for unified NLP.
--
-- 5) NLP Pipeline:
--    - Register models in nlp.models (spaCy NER, SBERT embeddings, sentiment/toxicity classifiers).
--    - Record each pass as nlp.runs with params/provenance.
--    - Produce outputs:
--      * nlp.embeddings (vector(1536)); consider separate runs for different models/dims.
--      * nlp.ner_entities, nlp.relations (derive MEMBERSHIP, SPONSORS, MENTIONS).
--      * nlp.sentiment_results, nlp.toxicity_results, nlp.topic_results, nlp.keyphrase_results, nlp.summaries.
--      * Pop graph.entities/graph.edges based on relation extraction with confidence + evidence.
--
-- 6) RAG/Graph RAG:
--    - Use embeddings to retrieve top-k contexts; blend graph expansion via graph.v_edges_named.
--    - For Neo4j, mirror entities/edges to a bolt store if you prefer graph-native queries.
--
-- 7) Audit & Experiments:
--    - Document methodology in audit.methodologies; tie experiment designs and runs to nlp.runs.
--    - Store IP/location for reproducibility (and that sweet “where was this run from?” trivia).
--
-- Bonus: Sentiment vs. chamber vs. topic? Toxicity trends by outlet? The world is your oyster.
--
-- =============================================================================
-- SECTION 13: Indexing Sparkle (Performance candy, keeps queries snappy)
-- -----------------------------------------------------------------------------
-- Add more as data grows. These are solid starters.
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_docs_sha ON staging.documents(sha256);
CREATE INDEX IF NOT EXISTS idx_docs_member ON staging.documents(member_bioguide);
CREATE INDEX IF NOT EXISTS idx_pols_name ON people.politicians((lower(full_name)));
CREATE INDEX IF NOT EXISTS idx_entities_name ON graph.entities((lower(canonical_name)));

-- =============================================================================
-- SECTION 14: Integrity Nudges (FKs already in place; here be optional checks)
-- -----------------------------------------------------------------------------
-- Ensure content hash looks like hex (not perfect but helpful).
-- =============================================================================
ALTER TABLE staging.documents
  ADD CONSTRAINT chk_sha256_hex
  CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-fA-F]{64}$');

-- =============================================================================
-- Done. Go forth and analyze like it’s 1999 (but with vectors).
-- -----------------------------------------------------------------------------
-- Pro tip: Pair this schema with your RAG/LLM orchestration and monitoring.
-- Screen name? RAGamuffin_98. AIM away msg: "brb indexing the Federalist Papers".
-- =============================================================================
