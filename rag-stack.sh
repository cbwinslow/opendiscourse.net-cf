#!/usr/bin/env python3
# =============================================================================
# Name:             Analyze & Bootstrap Political RAG Mega-Stack (Self-Hosted)
# Date:             2025-08-26
# Script Name:      analyze_and_bootstrap_political_rag_stack_selfhost.py
# Version:          1.1.0
# Log Summary:      One-command, fully self-hosted, end-to-end RAG + Graph RAG stack:
#                   - Supabase (SELF-HOSTED containers: Postgres, GoTrue, PostgREST,
#                     Realtime, Storage, Kong gateway, Studio, Postgres Meta)
#                   - FastAPI (RAG/Graph-RAG API) + Next.js (UI)
#                   - Vector DBs: Postgres+pgvector (primary), Qdrant, Weaviate
#                   - Knowledge graph: Neo4j + APOC
#                   - Inference UX: LocalAI (OpenAI-compatible) + OpenWebUI
#                   - Automations: Flowise, n8n; Discovery: SearXNG
#                   - Observability: Prometheus, Grafana, Loki, Promtail, cAdvisor,
#                     node-exporter, RabbitMQ metrics, optional OpenSearch + Dashboards
#                   - Document analyzer: (optional) ingest a local/URL doc into vectors + graph
# Description:      This single script generates .env, docker-compose.yml, service code,
#                   Supabase declarative Kong config, monitoring configs, initializes
#                   pgvector schema, starts all containers, waits for health, and
#                   optionally ingests a provided document: chunk -> embed (LocalAI or
#                   hash fallback) -> store in Postgres+pgvector -> naive graph edges in Neo4j.
# Change Summary:   v1.1.0: Switched Supabase from cloud placeholders to SELF-HOSTED containers.
#                   Added Kong declarative config and wiring for /auth, /rest/v1, /realtime/v1,
#                   /storage/v1, /studio, /pg. Updated API/Next.js to point to local Supabase.
#                   Promoted RabbitMQ Prometheus metrics port 15692. Hardened init SQL to create
#                   anon/authenticated roles if missing. Adjusted psql exec to supabase_db.
# Inputs:
#   --project-dir <dir>        Target project directory (default: ./political-rag-stack)
#   --doc-file <path>          Local .txt/.md/.html file to analyze and ingest
#   --doc-url <url>            Remote URL (.txt/.md/.html) to fetch, analyze, ingest
#   --doc-type <kind>          "legislation"|"speech"|"tweet"|"web"|"file" (default: web)
#   --title <text>             Title override for the document
#   --author <text>            Author (optional)
#   --published-at <ISO8601>   Published timestamp (optional)
#   --no-up                    Generate everything; do not start containers
#   --stack-slim               Skip heavy optional services (OpenSearch, Graphite)
#   --force                    Overwrite existing files even if present
#   --timeout-seconds <int>    Max seconds to wait for services (default: 180)
# Outputs:
#   - A runnable folder with:
#       .env, docker-compose.yml, monitoring/, services/api, services/web,
#       init/sql/init.sql (pgvector + schema), supabase/kong/kong.yml, agents.md
#   - After startup: inserted document and chunks in Postgres+pgvector, naive
#     entity edges in Neo4j, and a console summary
# Warnings:
#   - Demo secrets are generated; rotate for production.
#   - LocalAI needs a GGUF model in ./models for quality embeddings/chat; else
#     a hash-based fallback embedding is used (decent for demos).
#   - Self-hosted Supabase here is minimal but functional for local dev. For
#     full parity, compare with official supabase/docker setup via CLI.
# Usage:
#   - python3 analyze_and_bootstrap_political_rag_stack_selfhost.py --doc-file ./bill.txt
#   - python3 analyze_and_bootstrap_political_rag_stack_selfhost.py --doc-url https://example.com/page.txt
# Variables:
#   - All environment variables are generated in .env
#   - SUPABASE_URL defaults to http://localhost:8000 (Kong proxy)
#   - NEXT_PUBLIC_SUPABASE_URL aligns with the same
#
#                              ┌─────────────────────────────────────────┐
#                              │    ASCII SYSTEM SKETCH (Self-Host)     │
#                              └─────────────────────────────────────────┘
#
#     [Browser]
#        │
#        ▼
#  [Next.js 14]  ───────────────────────────────────────┐
#        │                                              │
#        │ fetch                                        │ Supabase (SELF-HOST)
#        ▼                                              ▼
#  [FastAPI Orchestrator] ───► [RabbitMQ] ─────────────▶(workers later)
#        │  ▲             │          │
#        │  │             │          ├──► [SearXNG]
#        │  │             │          └──► [LocalAI] ◄─ [OpenWebUI]
#        │  │
#        │  └──► Vector Retrievals
#        │           ├──► [Supabase DB (Postgres+pgvector)]
#        │           ├──► [Qdrant]
#        │           └──► [Weaviate]
#        │
#        └──► Graph RAG: [Neo4j + APOC]
#
#  Supabase (Self-Hosted):
#    - [Kong] -> /auth -> [GoTrue], /rest/v1 -> [PostgREST], /storage/v1 -> [Storage]
#                /realtime/v1 -> [Realtime], /studio -> [Studio], /pg -> [Postgres Meta]
#
#  Observability: [Prometheus] -> [Grafana] + [Loki/Promtail] (+ [OpenSearch], optional)
#                 [cAdvisor], [node-exporter], [RabbitMQ metrics:15692]
#
#  We press play. The mixtape drops. We dance. Screen name: RAGamuffin_98.
# =============================================================================

# =============================================================================
# SECTION: Imports and simple utilities (no external deps)
# -----------------------------------------------------------------------------
# - Keep the bootstrapper portable; only stdlib used here.
# - Provide helpers for file IO, secrets, docker checks, and service waiters.
# =============================================================================
import argparse
import hashlib
import json
import os
import secrets
import socket
import stat
import string
import subprocess
import sys
import textwrap
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

try:
    import urllib.request as urllib_request
except Exception:
    urllib_request = None

def log(msg: str) -> None:
    print(f"[selfhost-bootstrap] {msg}")

def err(msg: str) -> None:
    print(f"[selfhost-bootstrap:ERROR] {msg}", file=sys.stderr)

def die(msg: str, code: int = 1) -> None:
    err(msg)
    sys.exit(code)

def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)

def write_file(path: Path, content: str, overwrite: bool) -> None:
    if path.exists() and not overwrite:
        log(f"SKIP (exists): {path}")
        return
    ensure_dir(path.parent)
    path.write_text(content, encoding="utf-8")
    log(f"Wrote: {path}")

def chmod_exec(path: Path) -> None:
    st = os.stat(path)
    os.chmod(path, st.st_mode | stat.S_IEXEC)
    log(f"Exec bit set: {path}")

def rand_secret(n: int = 48) -> str:
    return secrets.token_urlsafe(n)

def rand_password(n: int = 24) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    return "".join(secrets.choice(alphabet) for _ in range(n))

def has_docker() -> bool:
    try:
        subprocess.run(["docker", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except Exception:
        return False

def run_compose_up(project_dir: Path) -> None:
    cmd = ["docker", "compose", "up", "-d"]
    log("Starting containers: docker compose up -d")
    subprocess.run(cmd, cwd=str(project_dir), check=True)

def wait_for_tcp(host: str, port: int, timeout: int) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=3):
                return True
        except Exception:
            time.sleep(1)
    return False

def wait_for_http(url: str, timeout: int) -> bool:
    if urllib_request is None:
        return False
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib_request.urlopen(url, timeout=3) as resp:
                if 200 <= resp.status < 500:
                    return True
        except Exception:
            time.sleep(1)
    return False

# =============================================================================
# SECTION: Configuration renderers
# -----------------------------------------------------------------------------
# - Render .env, docker-compose.yml, SQL init, Supabase Kong config, monitoring.
# - Render minimal FastAPI service and Next.js app files.
# =============================================================================

def render_env(
    supabase_url: str,
    supabase_anon_key: str,
    supabase_service_key: str,
    supabase_jwt_secret: str,
    api_secret: str,
    jwt_secret: str,
    postgres_password: str,
    neo4j_password: str,
    rabbit_password: str,
    grafana_admin_password: str,
    openai_key_local: str,
    stack_slim: bool,
) -> str:
    return textwrap.dedent(f"""
    # .env — generated on {datetime.utcnow().isoformat()}Z by analyze_and_bootstrap_political_rag_stack_selfhost.py
    # Self-hosted Supabase base URL (Kong proxy)
    SUPABASE_URL="{supabase_url}"
    SUPABASE_ANON_KEY="{supabase_anon_key}"
    SUPABASE_SERVICE_ROLE_KEY="{supabase_service_key}"
    SUPABASE_JWT_SECRET="{supabase_jwt_secret}"

    # FastAPI
    API_SECRET="{api_secret}"
    JWT_SECRET="{jwt_secret}"
    API_HOST=0.0.0.0
    API_PORT=8000

    # Postgres (via Supabase DB container)
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD="{postgres_password}"
    POSTGRES_DB=political_rag
    POSTGRES_HOST=supabase-db
    POSTGRES_PORT=5432

    # Neo4j
    NEO4J_USERNAME=neo4j
    NEO4J_PASSWORD="{neo4j_password}"
    NEO4J_URI=bolt://neo4j:7687

    # Qdrant
    QDRANT_URL=http://qdrant:6333

    # Weaviate
    WEAVIATE_URL=http://weaviate:8080
    WEAVIATE_API_KEY=""

    # LocalAI
    OPENAI_API_BASE=http://localai:8080/v1
    OPENAI_API_KEY="{openai_key_local}"

    # RabbitMQ
    RABBITMQ_DEFAULT_USER=guest
    RABBITMQ_DEFAULT_PASS="{rabbit_password}"
    RABBITMQ_URL=amqp://guest:{rabbit_password}@rabbitmq:5672//

    # Observability
    PROMETHEUS_SCRAPE_INTERVAL=15s
    GRAFANA_ADMIN_USER=admin
    GRAFANA_ADMIN_PASSWORD="{grafana_admin_password}"
    LOKI_URL=http://loki:3100

    # OpenSearch (optional)
    OPENSEARCH_URL=http://opensearch:9200

    # Next.js
    NEXT_PUBLIC_API_URL=http://localhost:8000
    NEXT_PUBLIC_SUPABASE_URL="{supabase_url}"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="{supabase_anon_key}"

    # SearXNG
    SEARXNG_URL=http://searxng:8080

    # Flowise & n8n
    FLOWISE_PORT=3002
    N8N_PORT=5678

    # Graphite (optional)
    GRAPHITE_WEB_PORT=8085

    STACK_SLIM={"true" if stack_slim else "false"}
    """).strip() + "\n"

def render_supabase_kong_yaml() -> str:
    # Declarative Kong config to route to Supabase services
    return textwrap.dedent("""
    _format_version: "2.1"
    _transform: true

    services:
      - name: gotrue
        url: http://auth:9999
        routes:
          - name: gotrue
            paths:
              - /auth
      - name: postgrest
        url: http://rest:3000
        routes:
          - name: postgrest
            paths:
              - /rest/v1
      - name: realtime
        url: http://realtime:4000
        routes:
          - name: realtime
            paths:
              - /realtime/v1
      - name: storage
        url: http://storage:5000
        routes:
          - name: storage
            paths:
              - /storage/v1
      - name: studio
        url: http://studio:3000
        routes:
          - name: studio
            paths:
              - /studio
      - name: pg-meta
        url: http://pgmeta:8080
        routes:
          - name: pgmeta
            paths:
              - /pg
    """).strip() + "\n"

def render_compose(stack_slim: bool) -> str:
    compose = f"""
    version: "3.9"

    services:
      # ------------------------------------------------------------
      # Supabase (Self-Hosted): Postgres DB + Platform services
      # ------------------------------------------------------------
      supabase-db:
        image: supabase/postgres:15.1.0
        container_name: supabase_db
        environment:
          POSTGRES_PASSWORD: ${'{' }POSTGRES_PASSWORD{'}'}
          POSTGRES_DB: ${'{' }POSTGRES_DB{'}'}
        ports:
          - "5432:5432"
        volumes:
          - ./data/supabase-db:/var/lib/postgresql/data
          - ./init/sql:/docker-entrypoint-initdb.d
        restart: unless-stopped

      auth:
        image: supabase/gotrue:latest
        container_name: supabase_auth
        depends_on:
          - supabase-db
        environment:
          GOTRUE_API_HOST: 0.0.0.0
          GOTRUE_API_PORT: 9999
          GOTRUE_DB_DRIVER: postgres
          GOTRUE_DB_DATABASE_URL: postgres://postgres:${'{' }POSTGRES_PASSWORD{'}'}@supabase-db:5432/${'{' }POSTGRES_DB{'}'}
          GOTRUE_JWT_SECRET: ${'{' }SUPABASE_JWT_SECRET{'}'}
          GOTRUE_SITE_URL: http://localhost:3000
          GOTRUE_URI_ALLOW_LIST: http://localhost:3000, http://localhost:8000
          GOTRUE_DISABLE_SIGNUP: "false"
          GOTRUE_MAILER_AUTOCONFIRM: "true"
          GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
        ports:
          - "9999:9999"
        restart: unless-stopped

      rest:
        image: supabase/postgrest:latest
        container_name: supabase_rest
        depends_on:
          - supabase-db
        environment:
          PGRST_DB_URI: postgres://postgres:${'{' }POSTGRES_PASSWORD{'}'}@supabase-db:5432/${'{' }POSTGRES_DB{'}'}
          PGRST_DB_SCHEMA: "public,rag"
          PGRST_DB_ANON_ROLE: anon
          PGRST_JWT_SECRET: ${'{' }SUPABASE_JWT_SECRET{'}'}
          PGRST_OPENAPI_SERVER_PROXY_URI: http://localhost:8000
        ports:
          - "3004:3000"
        restart: unless-stopped

      realtime:
        image: supabase/realtime:latest
        container_name: supabase_realtime
        depends_on:
          - supabase-db
        environment:
          DB_HOST: supabase-db
          DB_NAME: ${'{' }POSTGRES_DB{'}'}
          DB_USER: postgres
          DB_PASSWORD: ${'{' }POSTGRES_PASSWORD{'}'}
          PORT: 4000
          JWT_SECRET: ${'{' }SUPABASE_JWT_SECRET{'}'}
        ports:
          - "4000:4000"
        restart: unless-stopped

      storage:
        image: supabase/storage-api:latest
        container_name: supabase_storage
        depends_on:
          - supabase-db
          - rest
        environment:
          ANON_KEY: ${'{' }SUPABASE_ANON_KEY{'}'}
          SERVICE_KEY: ${'{' }SUPABASE_SERVICE_ROLE_KEY{'}'}
          POSTGREST_URL: http://rest:3000
          PGRST_JWT_SECRET: ${'{' }SUPABASE_JWT_SECRET{'}'}
          DATABASE_URL: postgres://postgres:${'{' }POSTGRES_PASSWORD{'}'}@supabase-db:5432/${'{' }POSTGRES_DB{'}'}
          AWS_DEFAULT_REGION: "us-east-1"
          GLOBAL_S3_BUCKET: "local-bucket"
          FILE_SIZE_LIMIT: "52428800"
        ports:
          - "5000:5000"
        volumes:
          - ./data/supabase-storage:/var/lib/storage
        restart: unless-stopped

      pgmeta:
        image: supabase/postgres-meta:latest
        container_name: supabase_pgmeta
        depends_on:
          - supabase-db
        environment:
          PG_META_PORT: 8080
          PG_META_DB_HOST: supabase-db
          PG_META_DB_PASSWORD: ${'{' }POSTGRES_PASSWORD{'}'}
          PG_META_DB_NAME: ${'{' }POSTGRES_DB{'}'}
          PG_META_DB_USER: postgres
          PG_META_DB_PORT: 5432
        ports:
          - "8086:8080"
        restart: unless-stopped

      studio:
        image: supabase/studio:latest
        container_name: supabase_studio
        depends_on:
          - supabase-db
          - auth
          - rest
          - storage
          - realtime
        environment:
          STUDIO_PG_META_URL: http://pgmeta:8080
          SUPABASE_URL: http://kong:8000
          STUDIO_AUTH_URL: http://kong:8000/auth
          STUDIO_DEFAULT_ORGANIZATION: "Selfhost Org"
          STUDIO_DEFAULT_PROJECT: "Selfhost Project"
          NEXT_PUBLIC_ENABLE_LOGS: "true"
          NEXT_PUBLIC_ENABLE_GRAPHQL: "false"
          JWT_SECRET: ${'{' }SUPABASE_JWT_SECRET{'}'}
          ANON_KEY: ${'{' }SUPABASE_ANON_KEY{'}'}
          SERVICE_KEY: ${'{' }SUPABASE_SERVICE_ROLE_KEY{'}'}
        ports:
          - "54324:3000"
        restart: unless-stopped

      kong:
        image: kong:3.3
        container_name: supabase_kong
        depends_on:
          - auth
          - rest
          - realtime
          - storage
          - studio
          - pgmeta
        environment:
          KONG_DATABASE: "off"
          KONG_DECLARATIVE_CONFIG: /home/kong/kong.yml
          KONG_PROXY_LISTEN: 0.0.0.0:8000
          KONG_ADMIN_LISTEN: 0.0.0.0:8001
        volumes:
          - ./supabase/kong/kong.yml:/home/kong/kong.yml:ro
        ports:
          - "8000:8000"
          - "8001:8001"
        restart: unless-stopped

      # ------------------------------------------------------------
      # Core app and surrounding services
      # ------------------------------------------------------------
      qdrant:
        image: qdrant/qdrant:latest
        container_name: rag_qdrant
        ports:
          - "6333:6333"
        volumes:
          - ./data/qdrant:/qdrant/storage
        restart: unless-stopped

      weaviate:
        image: semitechnologies/weaviate:1.24.12
        container_name: rag_weaviate
        environment:
          QUERY_DEFAULTS_LIMIT: "25"
          AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: "true"
          PERSISTENCE_DATA_PATH: "/var/lib/weaviate"
          CLUSTER_HOSTNAME: "node1"
        ports:
          - "8080:8080"
        volumes:
          - ./data/weaviate:/var/lib/weaviate
        restart: unless-stopped

      neo4j:
        image: neo4j:5
        container_name: rag_neo4j
        environment:
          NEO4J_AUTH: "neo4j/${'{' }NEO4J_PASSWORD{'}'}"
          NEO4J_PLUGINS: '["apoc"]'
          NEO4J_dbms_security_procedures_unrestricted: "apoc.*,gds.*"
        ports:
          - "7474:7474"
          - "7687:7687"
        volumes:
          - ./data/neo4j/data:/data
          - ./data/neo4j/logs:/logs
          - ./data/neo4j/plugins:/plugins
        restart: unless-stopped

      rabbitmq:
        image: rabbitmq:3.13-management
        container_name: rag_rabbitmq
        environment:
          RABBITMQ_DEFAULT_USER: ${'{' }RABBITMQ_DEFAULT_USER{'}'}
          RABBITMQ_DEFAULT_PASS: ${'{' }RABBITMQ_DEFAULT_PASS{'}'}
        ports:
          - "5672:5672"
          - "15672:15672"   # Management UI
          - "15692:15692"   # Prometheus metrics
        volumes:
          - ./data/rabbitmq:/var/lib/rabbitmq
        restart: unless-stopped

      localai:
        image: localai/localai:latest
        container_name: rag_localai
        environment:
          MODELS_PATH: /models
          THREADS: "4"
        volumes:
          - ./models:/models
        ports:
          - "8085:8080"
        restart: unless-stopped

      openwebui:
        image: ghcr.io/open-webui/open-webui:latest
        container_name: rag_openwebui
        environment:
          WEBUI_AUTH: "False"
          OPENAI_API_BASE: ${'{' }OPENAI_API_BASE{'}'}
          OPENAI_API_KEY: ${'{' }OPENAI_API_KEY{'}'}
        ports:
          - "3001:8080"
        volumes:
          - ./data/openwebui:/app/backend/data
        restart: unless-stopped
        depends_on:
          - localai

      flowise:
        image: flowiseai/flowise:latest
        container_name: rag_flowise
        environment:
          PORT: ${'{' }FLOWISE_PORT{'}'}
        ports:
          - "${'{' }FLOWISE_PORT{'}'}:${'{' }FLOWISE_PORT{'}'}"
        volumes:
          - ./data/flowise:/root/.flowise
        restart: unless-stopped

      n8n:
        image: n8nio/n8n:latest
        container_name: rag_n8n
        ports:
          - "${'{' }N8N_PORT{'}'}:5678"
        volumes:
          - ./data/n8n:/home/node/.n8n
        environment:
          N8N_HOST: "localhost"
          N8N_PORT: "5678"
          N8N_PROTOCOL: "http"
        restart: unless-stopped

      searxng:
        image: searxng/searxng:latest
        container_name: rag_searxng
        ports:
          - "8081:8080"
        environment:
          - SEARXNG_BASE_URL=${'{' }SEARXNG_URL{'}'}
        volumes:
          - ./data/searxng:/etc/searxng
        restart: unless-stopped

      api:
        build:
          context: ./services/api
        container_name: rag_api
        env_file:
          - ./.env
        ports:
          - "8000:8000"
        depends_on:
          - supabase-db
          - neo4j
          - qdrant
          - weaviate
          - rabbitmq
          - localai
        volumes:
          - ./services/api/app:/app/app:rw
          - ./logs/api:/var/log/app
        restart: unless-stopped

      web:
        build:
          context: ./services/web
        container_name: rag_web
        env_file:
          - ./.env
        ports:
          - "3000:3000"
        depends_on:
          - api
          - kong
        volumes:
          - ./services/web:/usr/src/app
        restart: unless-stopped

      prometheus:
        image: prom/prometheus:latest
        container_name: rag_prometheus
        volumes:
          - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
        ports:
          - "9090:9090"
        restart: unless-stopped

      grafana:
        image: grafana/grafana:latest
        container_name: rag_grafana
        environment:
          GF_SECURITY_ADMIN_USER: ${'{' }GRAFANA_ADMIN_USER{'}'}
          GF_SECURITY_ADMIN_PASSWORD: ${'{' }GRAFANA_ADMIN_PASSWORD{'}'}
        volumes:
          - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
          - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
        ports:
          - "3003:3000"
        depends_on:
          - prometheus
          - loki
        restart: unless-stopped

      loki:
        image: grafana/loki:2.9.4
        container_name: rag_loki
        command: -config.file=/etc/loki/config.yml
        volumes:
          - ./monitoring/loki/config.yml:/etc/loki/config.yml:ro
          - ./data/loki:/loki
        ports:
          - "3100:3100"
        restart: unless-stopped

      promtail:
        image: grafana/promtail:2.9.4
        container_name: rag_promtail
        command: -config.file=/etc/promtail/config.yml
        volumes:
          - ./monitoring/promtail/config.yml:/etc/promtail/config.yml:ro
          - /var/run/docker.sock:/var/run/docker.sock
        restart: unless-stopped

      cadvisor:
        image: gcr.io/cadvisor/cadvisor:latest
        container_name: rag_cadvisor
        ports:
          - "8088:8080"
        volumes:
          - /:/rootfs:ro
          - /var/run:/var/run:ro
          - /sys:/sys:ro
          - /var/lib/docker/:/var/lib/docker:ro
        restart: unless-stopped

      node-exporter:
        image: prom/node-exporter:latest
        container_name: rag_node_exporter
        ports:
          - "9100:9100"
        pid: host
        restart: unless-stopped
    """
    if not stack_slim:
        compose += """
      opensearch:
        image: opensearchproject/opensearch:2
        container_name: rag_opensearch
        environment:
          - discovery.type=single-node
          - DISABLE_SECURITY_PLUGIN=true
          - bootstrap.memory_lock=true
          - OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m
        ulimits:
          memlock:
            soft: -1
            hard: -1
        ports:
          - "9200:9200"
        volumes:
          - ./data/opensearch:/usr/share/opensearch/data
        restart: unless-stopped

      opensearch-dashboards:
        image: opensearchproject/opensearch-dashboards:2
        container_name: rag_opensearch_dashboards
        environment:
          - OPENSEARCH_HOSTS=["http://opensearch:9200"]
        ports:
          - "5601:5601"
        depends_on:
          - opensearch
        restart: unless-stopped

      graphite:
        image: graphiteapp/graphite-statsd:1.1.10-5
        container_name: rag_graphite
        ports:
          - "2003:2003"
          - "2004:2004"
          - "2023:2023"
          - "2024:2024"
          - "8125:8125/udp"
          - "8085:80"
        volumes:
          - ./data/graphite:/opt/graphite/storage
        restart: unless-stopped
    """
    compose += """
    networks:
      default:
        name: political_rag_net
    """
    return textwrap.dedent(compose).strip() + "\n"

def render_init_sql() -> str:
    # Initialize pgvector, roles for PostgREST, and our schema/tables
    return textwrap.dedent("""
    -- init/sql/init.sql
    -- Supabase Postgres init: enable extensions, ensure roles, create RAG schema/tables.

    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- Supabase-style roles for PostgREST (minimal)
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
      END IF;
    END $$;

    CREATE SCHEMA IF NOT EXISTS rag;

    -- Documents and chunks for RAG
    CREATE TABLE IF NOT EXISTS rag.documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source TEXT NOT NULL,
      source_type TEXT NOT NULL, -- legislation|speech|tweet|web|file
      title TEXT,
      author TEXT,
      published_at TIMESTAMPTZ,
      url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS rag.chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID REFERENCES rag.documents(id) ON DELETE CASCADE,
      chunk_index INT NOT NULL,
      content TEXT NOT NULL,
      embedding vector(1536),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Vector index (requires enough rows for IVFFLAT to be useful)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_chunks_embedding' AND n.nspname = 'rag'
      ) THEN
        EXECUTE 'CREATE INDEX idx_chunks_embedding ON rag.chunks USING ivfflat (embedding vector_cosine_ops)';
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_chunks_docid ON rag.chunks(document_id);

    -- Permissions: allow anon/authenticated to read rag schema (tighten as needed)
    GRANT USAGE ON SCHEMA rag TO anon, authenticated, service_role;
    GRANT SELECT ON ALL TABLES IN SCHEMA rag TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA rag GRANT SELECT ON TABLES TO anon, authenticated;
    """).strip() + "\n"

def render_prometheus_yml() -> str:
    return textwrap.dedent("""
    global:
      scrape_interval: ${PROMETHEUS_SCRAPE_INTERVAL}

    scrape_configs:
      - job_name: 'fastapi'
        static_configs:
          - targets: ['api:8000']

      - job_name: 'node_exporter'
        static_configs:
          - targets: ['node-exporter:9100']

      - job_name: 'cadvisor'
        static_configs:
          - targets: ['cadvisor:8080']

      - job_name: 'rabbitmq'
        metrics_path: /metrics
        static_configs:
          - targets: ['rabbitmq:15692']
    """).strip() + "\n"

def render_loki_config() -> str:
    return textwrap.dedent("""
    auth_enabled: false
    server:
      http_listen_port: 3100

    common:
      path_prefix: /loki
      storage:
        filesystem:
          chunks_directory: /loki/chunks
          rules_directory: /loki/rules
      replication_factor: 1
      ring:
        instance_addr: 127.0.0.1
        kvstore:
          store: inmemory

    schema_config:
      configs:
        - from: 2024-01-01
          store: boltdb-shipper
          object_store: filesystem
          schema: v13
          index:
            prefix: index_
            period: 24h

    analytics:
      reporting_enabled: false
    """).strip() + "\n"

def render_promtail_config() -> str:
    return textwrap.dedent("""
    server:
      http_listen_port: 9080
      grpc_listen_port: 0

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: http://loki:3100/loki/api/v1/push

    scrape_configs:
      - job_name: docker
        docker_sd_configs:
          - host: unix:///var/run/docker.sock
            refresh_interval: 5s
        relabel_configs:
          - source_labels: ['__meta_docker_container_name']
            regex: '/(.*)'
            target_label: 'container'
    """).strip() + "\n"

def render_grafana_datasources() -> str:
    return textwrap.dedent("""
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        access: proxy
        url: http://prometheus:9090
        isDefault: true
      - name: Loki
        type: loki
        access: proxy
        url: http://loki:3100
      - name: OpenSearch
        type: grafana-opensearch-datasource
        access: proxy
        url: http://opensearch:9200
        jsonData:
          database: "[logs-*]"
          flavor: "opensearch"
          timeField: "@timestamp"
          version: "2.0.0"
    """).strip() + "\n"

def render_grafana_dashboards_provider() -> str:
    return textwrap.dedent("""
    apiVersion: 1
    providers:
      - name: Default
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards
    """).strip() + "\n"

def render_grafana_fastapi_dashboard() -> str:
    return textwrap.dedent(r"""
    {
      "annotations": {"list": []},
      "editable": true,
      "fiscalYearStartMonth": 0,
      "graphTooltip": 0,
      "id": null,
      "links": [],
      "panels": [
        {
          "type": "timeseries",
          "title": "FastAPI Requests (5m inc by path)",
          "targets": [
            {
              "expr": "sum by (path) (increase(http_requests_total[5m]))",
              "refId": "A",
              "datasource": {"type": "prometheus", "uid": "prometheus"}
            }
          ],
          "gridPos": {"h": 8, "w": 24, "x": 0, "y": 0}
        },
        {
          "type": "timeseries",
          "title": "CPU (cAdvisor)",
          "targets": [
            {
              "expr": "sum(rate(container_cpu_usage_seconds_total[5m]))",
              "refId": "B",
              "datasource": {"type": "prometheus", "uid": "prometheus"}
            }
          ],
          "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
        }
      ],
      "schemaVersion": 39,
      "style": "dark",
      "tags": ["fastapi", "infrastructure"],
      "templating": {"list": []},
      "time": {"from": "now-6h", "to": "now"},
      "timezone": "",
      "title": "RAG Stack Overview",
      "version": 1
    }
    """).strip() + "\n"

def render_fastapi_service() -> Dict[str, str]:
    dockerfile = textwrap.dedent("""
    # syntax=docker/dockerfile:1
    # =============================================================================
    # FastAPI Service Dockerfile (services/api/Dockerfile)
    # Purpose: Build a slim Python 3.11 container running FastAPI + Uvicorn.
    # Exposes port 8000. Installs pinned deps for stability.
    # =============================================================================
    FROM python:3.11-slim

    ENV PYTHONDONTWRITEBYTECODE=1 \
        PYTHONUNBUFFERED=1

    WORKDIR /app

    COPY requirements.txt /app/requirements.txt
    RUN pip install --no-cache-dir -r /app/requirements.txt

    COPY app /app/app

    EXPOSE 8000
    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    """).strip() + "\n"
    requirements = textwrap.dedent("""
    fastapi==0.111.0
    uvicorn[standard]==0.30.1
    httpx==0.27.0
    pydantic==2.8.2
    python-dotenv==1.0.1
    psycopg[binary]==3.1.18
    qdrant-client==1.9.1
    weaviate-client==4.8.4
    neo4j==5.21.0
    prometheus-client==0.20.0
    pika==1.3.2
    tenacity==8.5.0
    """).strip() + "\n"
    main_py = textwrap.dedent("""
    # =============================================================================
    # Name:             FastAPI Orchestrator (RAG + Graph RAG)
    # Date:             2025-08-26
    # Script Name:      services/api/app/main.py
    # Version:          1.1.0
    # Log Summary:      API endpoints for ingestion, retrieval (RAG), graph upserts,
    #                   health and Prometheus metrics. Integrates with:
    #                   - Postgres (Supabase DB) + pgvector
    #                   - Qdrant, Weaviate
    #                   - Neo4j
    #                   - LocalAI (OpenAI-compatible)
    #                   - RabbitMQ
    # Description:      Minimal but wired orchestrator. Retrieval stubs are included
    #                   for Qdrant/Weaviate; pgvector uses a simple latest-chunks demo.
    #                   Extend retrieval as needed. Metrics exposed at /metrics.
    # Change Summary:   v1.1.0: Pointed Postgres host to supabase-db; no cloud refs.
    # Inputs:           Env vars read from .env; requests receive JSON payloads.
    # Outputs:          JSON responses for endpoints noted below.
    # Warnings:         Retrieval logic is demo-grade; implement embeddings + similarity.
    # Usage:            Call from Next.js or curl; see /docs for OpenAPI UI.
    # =============================================================================

    import os
    import json
    import time
    from typing import List, Optional, Literal, Dict, Any
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
    from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
    from starlette.responses import Response
    import httpx
    import psycopg
    from psycopg.rows import dict_row
    from qdrant_client import QdrantClient
    from weaviate import Client as WeaviateClient
    from neo4j import GraphDatabase
    import pika

    # -----------------------
    # Env & Globals
    # -----------------------
    API_SECRET = os.getenv("API_SECRET", "dev-secret")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt")
    OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "http://localai:8080/v1")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-local")
    SUPABASE_URL = os.getenv("SUPABASE_URL", "http://kong:8000")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

    POSTGRES_DSN = f"dbname={os.getenv('POSTGRES_DB','political_rag')} user={os.getenv('POSTGRES_USER','postgres')} password={os.getenv('POSTGRES_PASSWORD','postgres')} host={os.getenv('POSTGRES_HOST','supabase-db')} port={os.getenv('POSTGRES_PORT','5432')}"
    QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
    WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://weaviate:8080")
    WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY", "")
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
    NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672//")
    SEARXNG_URL = os.getenv("SEARXNG_URL", "http://searxng:8080")

    # -----------------------
    # Metrics
    # -----------------------
    REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests", ["path"])
    REQUEST_LATENCY = Histogram("http_request_latency_seconds", "Latency", ["path"])

    # -----------------------
    # App Setup with CORS
    # -----------------------
    app = FastAPI(title="Political RAG Orchestrator (Self-Hosted)", version="1.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -----------------------
    # Clients (lazy init)
    # -----------------------
    def pg_conn():
        return psycopg.connect(POSTGRES_DSN, row_factory=dict_row)

    def qdrant_client():
        return QdrantClient(url=QDRANT_URL)

    def weaviate_client():
        if WEAVIATE_API_KEY:
            return WeaviateClient(
                url=WEAVIATE_URL,
                additional_headers={"X-OpenAI-Api-Key": WEAVIATE_API_KEY}
            )
        return WeaviateClient(url=WEAVIATE_URL)

    neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    def rabbit_conn():
        return pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))

    # -----------------------
    # Models
    # -----------------------
    class IngestRequest(BaseModel):
        source: Literal["legislation", "speech", "tweet", "web", "file"] = "web"
        title: Optional[str] = None
        url: Optional[str] = None
        content: Optional[str] = None
        author: Optional[str] = None
        published_at: Optional[str] = None
        metadata: Dict[str, Any] = Field(default_factory=dict)
        vector_store: Literal["pgvector", "qdrant", "weaviate"] = "pgvector"
        chunk_size: int = 800
        chunk_overlap: int = 120

    class QueryRequest(BaseModel):
        query: str
        top_k: int = 6
        vector_store: Literal["pgvector", "qdrant", "weaviate"] = "pgvector"
        graph_mode: Literal["off", "expand", "rerank"] = "off"
        temperature: float = 0.2

    # -----------------------
    # Helpers
    # -----------------------
    def instrument(path: str):
        def decorator(fn):
            def wrapper(*args, **kwargs):
                REQUEST_COUNT.labels(path=path).inc()
                with REQUEST_LATENCY.labels(path=path).time():
                    return fn(*args, **kwargs)
            return wrapper
        return decorator

    async def openai_chat(messages, temperature=0.2):
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{OPENAI_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"model": "gpt-3.5-turbo", "messages": messages, "temperature": temperature},
            )
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"]

    # -----------------------
    # Health & Metrics
    # -----------------------
    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/metrics")
    def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    # -----------------------
    # Ingestion
    # -----------------------
    @app.post("/ingest")
    @instrument("/ingest")
    def ingest(req: IngestRequest):
        # Insert a document row and enqueue an ingest job (worker TBD)
        try:
            conn = pg_conn()
            with conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO rag.documents (source, source_type, title, author, published_at, url)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (req.source, req.source, req.title, req.author, req.published_at, req.url)
                )
                row = cur.fetchone()
                doc_id = row["id"]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")

        try:
            connection = rabbit_conn()
            ch = connection.channel()
            ch.queue_declare(queue="ingest_jobs", durable=True)
            ch.basic_publish(
                exchange="",
                routing_key="ingest_jobs",
                body=json.dumps(req.dict() | {"document_id": str(doc_id)}).encode("utf-8"),
                properties=pika.BasicProperties(delivery_mode=2),
            )
            connection.close()
        except Exception:
            pass

        return {"ok": True, "document_id": str(doc_id)}

    # -----------------------
    # RAG Query
    # -----------------------
    @app.post("/rag/query")
    @instrument("/rag/query")
    async def rag_query(req: QueryRequest):
        contexts: List[str] = []

        if req.vector_store == "pgvector":
            try:
                conn = pg_conn()
                with conn, conn.cursor() as cur:
                    # Demo: return the latest chunks; replace with similarity search after embedding
                    cur.execute("""
                        SELECT content FROM rag.chunks ORDER BY created_at DESC NULLS LAST LIMIT %s
                    """, (req.top_k,))
                    contexts = [r["content"] for r in cur.fetchall()]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"pgvector error: {e}")

        elif req.vector_store == "qdrant":
            try:
                qc = qdrant_client()
                _ = qc.get_collections()
                contexts = ["[Qdrant connected] Add vector search logic."]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"qdrant error: {e}")
        else:
            try:
                w = weaviate_client()
                _ = w.schema.get()
                contexts = ["[Weaviate connected] Add hybrid search logic."]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"weaviate error: {e}")

        graph_hint = ""
        if req.graph_mode != "off":
            try:
                with neo4j_driver.session() as session:
                    cypher = "MATCH (e:Entity)-[r:REL]->(x:Entity) RETURN e.name as e, r.type as rel, x.name as x LIMIT 5"
                    rows = session.run(cypher).values()
                    graph_hint = "; ".join([f"{a}-{b}->{c}" for a,b,c in rows]) or "No graph signals yet."
            except Exception:
                graph_hint = "Graph unavailable."

        system = {"role": "system", "content": "You are a helpful political analysis assistant. Concise, factual."}
        user = {"role": "user", "content": f"Question: {req.query}\\nContext:\\n- " + "\\n- ".join(contexts) + f"\\nGraph: {graph_hint}"}
        reply = await openai_chat([system, user], temperature=req.temperature)
        return {"answer": reply, "contexts": contexts[:3], "graph_hint": graph_hint}
    """).strip() + "\n"
    return {
        "Dockerfile": dockerfile,
        "requirements.txt": requirements,
        "app/main.py": main_py,
    }

def render_nextjs_service() -> Dict[str, str]:
    dockerfile = textwrap.dedent("""
    # syntax=docker/dockerfile:1
    # =============================================================================
    # Next.js Web Dockerfile (services/web/Dockerfile)
    # Purpose: Build a Node 20 Alpine container to run Next.js dev server at 3000.
    # =============================================================================
    FROM node:20-alpine
    WORKDIR /usr/src/app
    COPY package.json package-lock.json* ./
    RUN npm install
    COPY . .
    EXPOSE 3000
    CMD ["npm", "run", "dev"]
    """).strip() + "\n"
    package_json = textwrap.dedent("""
    {
      "name": "political-rag-web",
      "version": "1.1.0",
      "private": true,
      "scripts": {
        "dev": "next dev --port 3000",
        "build": "next build",
        "start": "next start -p 3000",
        "lint": "next lint"
      },
      "dependencies": {
        "next": "14.2.5",
        "react": "18.3.1",
        "react-dom": "18.3.1",
        "@supabase/supabase-js": "2.45.4",
        "isomorphic-unfetch": "3.1.0"
      },
      "devDependencies": {
        "eslint": "8.57.0",
        "eslint-config-next": "14.2.5",
        "typescript": "5.5.4"
      }
    }
    """).strip() + "\n"
    next_config = "module.exports = { reactStrictMode: true };\n"
    tsconfig = textwrap.dedent("""
    {
      "compilerOptions": {
        "target": "es6",
        "lib": ["dom", "dom.iterable", "esnext"],
        "allowJs": true,
        "skipLibCheck": true,
        "strict": false,
        "forceConsistentCasingInFileNames": true,
        "noEmit": true,
        "esModuleInterop": true,
        "module": "esnext",
        "moduleResolution": "bundler",
        "resolveJsonModule": true,
        "isolatedModules": true,
        "jsx": "preserve",
        "incremental": true
      },
      "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
      "exclude": ["node_modules"]
    }
    """).strip() + "\n"
    app_page = textwrap.dedent("""
    import { useState } from 'react';
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:8000";

    export default function Home() {
      const [q, setQ] = useState("What are the key provisions in the latest education bill?");
      const [answer, setAnswer] = useState("");
      const [loading, setLoading] = useState(false);

      async function ask() {
        setLoading(true);
        setAnswer("");
        const r = await fetch(`${API_URL}/rag/query`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ query: q, top_k: 6, vector_store: "pgvector", graph_mode: "expand" })
        });
        const j = await r.json();
        setAnswer(j.answer || JSON.stringify(j, null, 2));
        setLoading(false);
      }

      return (
        <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1>Political RAG Workbench (Self-Hosted)</h1>
          <p>Ask about laws, speeches, or tweets — and let the stack cook.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <input style={{ flex: 1, padding: 8 }} value={q} onChange={(e) => setQ(e.target.value)} />
            <button onClick={ask} disabled={loading} style={{ padding: 8 }}>{loading ? "Thinking..." : "Ask"}</button>
          </div>
          <pre style={{ marginTop: 24, background: '#111', color: '#0f0', padding: 12, whiteSpace: 'pre-wrap' }}>
            {answer}
          </pre>
          <section style={{ marginTop: 24 }}>
            <h3>Quick Links</h3>
            <ul>
              <li><a href="http://localhost:3001" target="_blank">OpenWebUI</a></li>
              <li><a href="http://localhost:3002" target="_blank">Flowise</a></li>
              <li><a href="http://localhost:5678" target="_blank">n8n</a></li>
              <li><a href="http://localhost:8081" target="_blank">SearXNG</a></li>
              <li><a href="http://localhost:3003" target="_blank">Grafana</a></li>
              <li><a href="http://localhost:9090" target="_blank">Prometheus</a></li>
              <li><a href="http://localhost:7474" target="_blank">Neo4j Browser</a></li>
              <li><a href="http://localhost:15672" target="_blank">RabbitMQ Console</a></li>
              <li><a href="http://localhost:8000/studio" target="_blank">Supabase Studio (via Kong)</a></li>
              <li><a href="http://localhost:3004" target="_blank">PostgREST (direct)</a></li>
            </ul>
          </section>
        </main>
      );
    }
    """).strip() + "\n"
    gitignore = "node_modules\n.next\n.env.local\n"
    return {
        "Dockerfile": dockerfile,
        "package.json": package_json,
        "next.config.js": next_config,
        "tsconfig.json": tsconfig,
        "app/page.tsx": app_page,
        ".gitignore": gitignore,
    }

def render_agents_md() -> str:
    return textwrap.dedent("""
    # agents.md

    Components in the Political RAG Mega-Stack (Self-Hosted):

    - Supabase (Self-Hosted)
      - Postgres (supabase-db), GoTrue (auth), PostgREST (rest), Realtime (realtime),
        Storage API (storage), Kong Gateway (kong), Studio (studio), Postgres Meta (pgmeta)
      - Kong routes: /auth, /rest/v1, /realtime/v1, /storage/v1, /studio, /pg
    - FastAPI Orchestrator (services/api)
      - Endpoints: /health, /metrics, /ingest, /rag/query
      - Integrations: Supabase DB (pgvector), Qdrant, Weaviate, Neo4j, LocalAI, RabbitMQ, SearXNG
    - Next.js Web (services/web)
      - Simple UI & quick-links; points Supabase URL to Kong proxy (http://localhost:8000)
    - LocalAI + OpenWebUI
      - Local OpenAI-compatible inference + human-friendly chat
    - Flowise & n8n
      - Visual pipelines & automations (e.g., scheduled ingests)
    - SearXNG
      - Meta-search across sources
    - Vector DBs
      - Primary: Postgres+pgvector (in Supabase DB)
      - Alternatives: Qdrant & Weaviate
    - Neo4j
      - Knowledge graph for Graph RAG
    - RabbitMQ
      - Queue for ingest jobs (metrics on 15692)
    - Observability
      - Prometheus, Grafana, Loki, Promtail, cAdvisor, node-exporter
    - Optional
      - OpenSearch + Dashboards, Graphite + StatsD

    Maintenance:
    - Update this file when adding services, endpoints, or changing ports/creds.
    """).strip() + "\n"

# =============================================================================
# SECTION: Document ingestion helpers (host-side, stdlib only)
# -----------------------------------------------------------------------------
# - load_text_from_file/url, naive_html_to_text, chunk_text
# - embed_texts_with_fallback via LocalAI / hashed fallback
# - cooccurrence_edges for naive graph edges
# =============================================================================

def load_text_from_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in [".txt", ".md", ".html", ".htm"]:
        return path.read_text(encoding="utf-8", errors="ignore")
    raise RuntimeError(f"Unsupported file type: {suffix}. Use .txt/.md/.html.")

def naive_html_to_text(html: str) -> str:
    out: List[str] = []
    in_tag = False
    skip = False
    i = 0
    while i < len(html):
        ch = html[i]
        if ch == "<":
            in_tag = True
            if html[i:i+7].lower() == "<script":
                skip = True
            if html[i:i+6].lower() == "<style":
                skip = True
        elif ch == ">":
            in_tag = False
            if html[max(0, i-8):i+1].lower().endswith("</script>"):
                skip = False
            if html[max(0, i-7):i+1].lower().endswith("</style>"):
                skip = False
        else:
            if not in_tag and not skip:
                out.append(ch)
        i += 1
    lines = [ln.strip() for ln in "".join(out).splitlines()]
    return "\n".join([ln for ln in lines if ln])

def load_text_from_url(url: str) -> str:
    if urllib_request is None:
        raise RuntimeError("urllib is unavailable; cannot fetch URLs.")
    req = urllib_request.Request(url, headers={"User-Agent": "Mozilla/5.0 (RAG-Stack)"})
    with urllib_request.urlopen(req, timeout=20) as resp:
        data = resp.read()
        ctype = resp.headers.get_content_type()
        if ctype in ("text/plain", "text/markdown"):
            return data.decode("utf-8", errors="ignore")
        if ctype in ("text/html", "application/xhtml+xml"):
            return naive_html_to_text(data.decode("utf-8", errors="ignore"))
        path = urlparse(url).path
        if path.endswith((".txt", ".md")):
            return data.decode("utf-8", errors="ignore")
        if path.endswith((".html", ".htm")):
            return naive_html_to_text(data.decode("utf-8", errors="ignore"))
        raise RuntimeError(f"Unsupported content-type from URL: {ctype}")

def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> List[str]:
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    buf = ""
    for p in paras:
        if len(buf) + len(p) + 2 <= chunk_size:
            buf = (buf + "\n\n" + p).strip()
        else:
            if buf:
                chunks.append(buf)
            buf = (buf[-overlap:] if overlap and buf else "") + ("\n\n" if buf else "") + p
            buf = buf.strip()
    if buf:
        chunks.append(buf)
    if not chunks:
        i = 0
        while i < len(text):
            chunks.append(text[i:i+chunk_size])
            i += max(1, chunk_size - overlap)
    return chunks

def try_localai_embeddings(base_url: str, api_key: str, texts: List[str], model: str = "text-embedding-ada-002") -> Optional[List[List[float]]]:
    if urllib_request is None:
        return None
    endpoint = base_url.rstrip("/") + "/embeddings"
    payload = {"input": texts, "model": model}
    data = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    )
    try:
        with urllib_request.urlopen(req, timeout=40) as resp:
            body = resp.read().decode("utf-8")
            obj = json.loads(body)
            vectors = [d["embedding"] for d in obj.get("data", [])]
            if vectors and all(isinstance(v, list) for v in vectors):
                return vectors
            return None
    except Exception:
        return None

def hashed_embedding(text: str, dim: int = 1536) -> List[float]:
    vec = [0.0] * dim
    tok: List[str] = []
    cur: List[str] = []
    for ch in text:
        if ch.isalnum():
            cur.append(ch.lower())
        else:
            if cur:
                tok.append("".join(cur))
                cur = []
    if cur:
        tok.append("".join(cur))
    for t in tok:
        idx = int(hashlib.md5(t.encode("utf-8")).hexdigest(), 16) % dim
        vec[idx] += 1.0
    norm = sum(v*v for v in vec) ** 0.5
    return [v / norm for v in vec] if norm > 0 else vec

def embed_texts_with_fallback(texts: List[str], openai_base: str, openai_key: str) -> List[List[float]]:
    tried = try_localai_embeddings(openai_base, openai_key, texts)
    if tried and all(isinstance(v, list) for v in tried):
        return tried
    return [hashed_embedding(t, 1536) for t in texts]

# =============================================================================
# SECTION: Post-start ingestion helpers (exec into containers)
# -----------------------------------------------------------------------------
# - psql_exec: run SQL inside supabase_db container
# - neo4j_cypher: run cypher-shell inside rag_neo4j container
# - insert_document_and_chunks: insert doc + vectors
# - upsert_edges_to_neo4j: naive co-occurrence graph edges
# =============================================================================

def psql_exec(pg_user: str, pg_password: str, pg_db: str, sql: str) -> str:
    env = os.environ.copy()
    env["PGPASSWORD"] = pg_password
    cmd = [
        "docker", "exec", "-i", "supabase_db",
        "psql",
        "-U", pg_user,
        "-d", pg_db,
        "-h", "localhost",
        "-p", "5432",
        "-v", "ON_ERROR_STOP=1",
        "-c", sql
    ]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
    if p.returncode != 0:
        err(p.stderr.decode("utf-8", errors="ignore"))
        raise RuntimeError("psql command failed")
    return p.stdout.decode("utf-8", errors="ignore")

def neo4j_cypher(neo4j_user: str, neo4j_pwd: str, cypher: str) -> str:
    cmd = ["docker", "exec", "-i", "rag_neo4j", "cypher-shell", "-u", neo4j_user, "-p", neo4j_pwd, cypher]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode != 0:
        err(p.stderr.decode("utf-8", errors="ignore"))
        raise RuntimeError("cypher-shell failed")
    return p.stdout.decode("utf-8", errors="ignore")

def insert_document_and_chunks(
    title: str,
    source_type: str,
    author: Optional[str],
    published_at: Optional[str],
    url: Optional[str],
    chunks: List[str],
    embeddings: List[List[float]],
    pg_user: str,
    pg_pwd: str,
    pg_db: str
) -> str:
    safe_title = title.replace("$$", "")
    safe_author = None if author is None else author.replace("$$", "")
    safe_url = None if url is None else url.replace("$$", "")
    safe_published = published_at

    insert_doc_sql = f"""
    WITH ins AS (
      INSERT INTO rag.documents (source, source_type, title, author, published_at, url)
      VALUES ('{source_type}', '{source_type}', $${
        safe_title
    }$$, { 'NULL' if not safe_author else "$$"+safe_author+"$$" }, { 'NULL' if not safe_published else "$$"+safe_published+"$$" }, { 'NULL' if not safe_url else "$$"+safe_url+"$$" })
      RETURNING id
    )
    SELECT id FROM ins;
    """
    out = psql_exec(pg_user, pg_pwd, pg_db, insert_doc_sql)
    # Simple parse of UUID from psql tabular output
    doc_id = ""
    for ln in out.splitlines():
        ln = ln.strip()
        if len(ln) >= 36 and ln.count("-") >= 4 and "row)" not in ln and "rows)" not in ln and "SELECT" not in ln:
            doc_id = ln
            break
    if not doc_id:
        raise RuntimeError("Failed to parse document id from psql output")

    for idx, (chunk, vec) in enumerate(zip(chunks, embeddings)):
        v_literal = "'[" + ", ".join(f"{float(x):.8f}" for x in vec) + "]'::vector"
        safe_chunk = chunk.replace("$$", "")
        chunk_sql = f"""
        INSERT INTO rag.chunks (document_id, chunk_index, content, embedding, metadata)
        VALUES ('{doc_id}', {idx}, $${
            safe_chunk
        }$$, {v_literal}, '{{}}'::jsonb);
        """
        psql_exec(pg_user, pg_pwd, pg_db, chunk_sql)

    return doc_id

def cooccurrence_edges(text: str, max_entities: int = 12) -> List[Tuple[str, str, str]]:
    entities: List[str] = []
    for w in text.split():
        if len(w) > 2 and w[0].isupper() and any(ch.isalpha() for ch in w[1:]):
            clean = "".join(ch for ch in w if ch.isalnum() or ch in "-_./")
            if clean not in entities:
                entities.append(clean)
        if len(entities) >= max_entities:
            break
    edges: List[Tuple[str, str, str]] = []
    for i in range(len(entities)):
        for j in range(i+1, len(entities)):
            edges.append((entities[i], "CO_OCCURS_WITH", entities[j]))
    return edges

def upsert_edges_to_neo4j(edges: List[Tuple[str,str,str]], neo4j_user: str, neo4j_pwd: str) -> None:
    for (s, p, o) in edges[:64]:
        cypher = f"""
        MERGE (a:Entity {{name: '{s.replace("'", "\\'")}'}})
        MERGE (b:Entity {{name: '{o.replace("'", "\\'")}'}})
        MERGE (a)-[r:REL {{type: '{p.replace("'", "\\'")}'}}]->(b)
        RETURN a,b;
        """
        neo4j_cypher(neo4j_user, neo4j_pwd, cypher)

# =============================================================================
# SECTION: Main orchestration
# -----------------------------------------------------------------------------
# - Parse args
# - Generate secrets, files, configs
# - docker compose up (unless --no-up)
# - Wait for Postgres/Kong/Neo4j/API
# - Optional doc ingest -> vectors + graph
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Analyze a political document and bootstrap a fully self-hosted RAG + Graph RAG stack with Supabase containers.")
    parser.add_argument("--project-dir", default="political-rag-stack", help="Target project directory.")
    parser.add_argument("--doc-file", help="Path to a local .txt/.md/.html file.")
    parser.add_argument("--doc-url", help="URL to fetch text from (.txt/.md/.html preferred).")
    parser.add_argument("--doc-type", default="web", choices=["legislation", "speech", "tweet", "web", "file"], help="Document source_type.")
    parser.add_argument("--title", default=None, help="Document title.")
    parser.add_argument("--author", default=None, help="Document author.")
    parser.add_argument("--published-at", dest="published_at", default=None, help="Published timestamp (ISO8601).")
    parser.add_argument("--no-up", action="store_true", help="Do not start containers.")
    parser.add_argument("--stack-slim", action="store_true", help="Skip OpenSearch/Graphite.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files.")
    parser.add_argument("--timeout-seconds", type=int, default=180, help="Service startup timeout in seconds.")
    args = parser.parse_args()

    project_dir = Path(args.project_dir).resolve()
    ensure_dir(project_dir)

    if not has_docker():
        die("Docker is not installed or not in PATH. Please install Docker first.")

    # -----------------------
    # Generate secrets & keys
    # -----------------------
    # For self-host Supabase, we need a shared JWT secret. We also expose
    # "anon" and "service role" keys to clients; for local dev we just mint
    # placeholders. In real setups, generate proper JWTs matching your claims.
    supabase_url = "http://localhost:8000"  # Kong proxy
    supabase_jwt_secret = rand_secret(32)   # HS256 shared
    supabase_anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ANON.LOCAL." + secrets.token_hex(8)
    supabase_service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SERVICE.LOCAL." + secrets.token_hex(8)

    api_secret = rand_secret(24)
    jwt_secret = rand_secret(24)
    postgres_password = rand_password(24)
    neo4j_password = rand_password(20)
    rabbit_password = rand_password(16)
    grafana_admin_password = rand_password(16)
    openai_key_local = "sk-" + secrets.token_hex(16)

    # -----------------------
    # Write configs
    # -----------------------
    write_file(project_dir / ".env", render_env(
        supabase_url, supabase_anon_key, supabase_service_key, supabase_jwt_secret,
        api_secret, jwt_secret, postgres_password, neo4j_password,
        rabbit_password, grafana_admin_password, openai_key_local, args.stack_slim
    ), overwrite=args.force)

    write_file(project_dir / "docker-compose.yml", render_compose(args.stack_slim), overwrite=args.force)
    write_file(project_dir / "init/sql/init.sql", render_init_sql(), overwrite=args.force)

    # Monitoring
    write_file(project_dir / "monitoring/prometheus/prometheus.yml", render_prometheus_yml(), overwrite=args.force)
    write_file(project_dir / "monitoring/loki/config.yml", render_loki_config(), overwrite=args.force)
    write_file(project_dir / "monitoring/promtail/config.yml", render_promtail_config(), overwrite=args.force)

    # Grafana provisioning
    write_file(project_dir / "monitoring/grafana/provisioning/datasources/datasources.yml", render_grafana_datasources(), overwrite=args.force)
    write_file(project_dir / "monitoring/grafana/provisioning/dashboards/dashboards.yml", render_grafana_dashboards_provider(), overwrite=args.force)
    write_file(project_dir / "monitoring/grafana/dashboards/rag-overview.json", render_grafana_fastapi_dashboard(), overwrite=args.force)

    # Supabase Kong declarative config
    write_file(project_dir / "supabase/kong/kong.yml", render_supabase_kong_yaml(), overwrite=args.force)

    # Services: FastAPI + Next.js
    api_files = render_fastapi_service()
    write_file(project_dir / "services/api/Dockerfile", api_files["Dockerfile"], overwrite=args.force)
    write_file(project_dir / "services/api/requirements.txt", api_files["requirements.txt"], overwrite=args.force)
    write_file(project_dir / "services/api/app/main.py", api_files["app/main.py"], overwrite=args.force)

    web_files = render_nextjs_service()
    for rel, content in web_files.items():
        write_file(project_dir / f"services/web/{rel}", content, overwrite=args.force)

    # Agents
    write_file(project_dir / "agents.md", render_agents_md(), overwrite=args.force)

    # LocalAI models dir
    ensure_dir(project_dir / "models")

    # -----------------------
    # Bring up the stack
    # -----------------------
    if not args.no_up:
        try:
            run_compose_up(project_dir)
        except subprocess.CalledProcessError as e:
            die(f"Docker compose failed: {e}")
    else:
        log("Skipped starting containers due to --no-up")

    # -----------------------
    # Wait for services
    # -----------------------
    timeout = args.timeout_seconds

    log("Waiting for Supabase DB (localhost:5432)...")
    if not wait_for_tcp("localhost", 5432, timeout):
        log("Warning: Postgres not ready. Ingestion may fail.")

    log("Waiting for Kong proxy (Supabase) at http://localhost:8000 ...")
    if not wait_for_http("http://localhost:8000/studio", timeout):
        log("Note: Kong may still be warming up; Studio route may 404 until container ready.")

    log("Waiting for Neo4j (localhost:7687)...")
    if not wait_for_tcp("localhost", 7687, timeout):
        log("Warning: Neo4j not ready. Graph upsert may fail.")

    log("Waiting for FastAPI (http://localhost:8000/health)...")
    if not wait_for_http("http://localhost:8000/health", timeout):
        log("Note: API not responding yet; continue if bringing up for first time.")

    # -----------------------
    # Optional: document ingest
    # -----------------------
    if args.doc_file or args.doc_url:
        try:
            if args.doc_file:
                doc_path = Path(args.doc_file)
                if not doc_path.exists():
                    die(f"Document file not found: {doc_path}")
                text = load_text_from_file(doc_path)
                url = None
            else:
                text = load_text_from_url(args.doc_url)
                url = args.doc_url

            title = args.title or (doc_path.name if args.doc_file else (urlparse(url).path.rsplit("/", 1)[-1] or "Untitled"))
            author = args.author
            published_at = args.published_at

            chunks = chunk_text(text, chunk_size=900, overlap=150)
            log(f"Document parsed: {len(chunks)} chunk(s). Generating embeddings...")

            # Load env we just wrote
            env_map: Dict[str, str] = {}
            for line in (project_dir / ".env").read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env_map[k.strip()] = v.strip().strip('"')

            vectors = embed_texts_with_fallback(
                texts=chunks,
                openai_base=env_map.get("OPENAI_API_BASE", "http://localhost:8085/v1"),
                openai_key=env_map.get("OPENAI_API_KEY", "sk-local")
            )

            log("Writing document and chunks to Postgres (Supabase DB)...")
            doc_id = insert_document_and_chunks(
                title=title,
                source_type=args.doc_type,
                author=author,
                published_at=published_at,
                url=url,
                chunks=chunks,
                embeddings=vectors,
                pg_user="postgres",
                pg_pwd=env_map.get("POSTGRES_PASSWORD", "postgres"),
                pg_db=env_map.get("POSTGRES_DB", "political_rag"),
            )
            log(f"Document stored with id: {doc_id}")

            log("Deriving naive entity co-occurrence edges...")
            edges = cooccurrence_edges(text)
            if edges:
                upsert_edges_to_neo4j(edges, "neo4j", env_map.get("NEO4J_PASSWORD", "neo4j"))
                log(f"Upserted {len(edges)} edge(s) to Neo4j.")
            else:
                log("No edges derived (text may lack capitalized tokens).")

            sample = " ".join(chunks[0].split()[:80]) + ("..." if len(chunks[0].split()) > 80 else "")
            log("Analysis Summary:")
            log(f"- Title: {title}")
            log(f"- Type: {args.doc_type}")
            log(f"- Chunks: {len(chunks)}")
            log(f"- Sample (first chunk): {sample}")

        except Exception as e:
            err(f"Document analysis/ingest failed: {e}")
    else:
        log("No --doc-file or --doc-url provided; stack is up, but no analysis performed yet.")

    # -----------------------
    # Friendly outro
    # -----------------------
    log("Done. Open:")
    log("- Web (Next.js):    http://localhost:3000")
    log("- API (FastAPI):    http://localhost:8000/docs   (health: /health)")
    log("- Supabase (Kong):  http://localhost:8000")
    log("- Studio (Kong):    http://localhost:8000/studio  (direct: http://localhost:54324)")
    log("- PostgREST:        http://localhost:3004")
    log("- OpenWebUI:        http://localhost:3001")
    log("- Flowise:          http://localhost:3002")
    log("- n8n:              http://localhost:5678")
    log("- SearXNG:          http://localhost:8081")
    log("- Grafana:          http://localhost:3003")
    log("- Prometheus:       http://localhost:9090")
    log("- Neo4j Browser:    http://localhost:7474")
    log("- RabbitMQ UI:      http://localhost:15672")
    log("Drop a GGUF model into ./models for LocalAI. If embeddings failed, we used hash-fallback (good enough for a vibe check).")
    log("Wehoooooohooooo! Long live dial-up modems and Winamp skins. Screen name? RAGamuffin_98 🤘")

if __name__ == "__main__":
    main()

# =============================================================================
# Three improvements to ship next:
# 1) Add a dedicated ingestion worker container to consume RabbitMQ jobs, perform
#    real embeddings with LocalAI, and extract entities/relations (spaCy + LLM).
# 2) Generate valid Supabase anon/service JWTs (HS256) embedding role claims by
#    default, and wire Supabase Auth into the Next.js UI and FastAPI authz.
# 3) Provision richer Grafana dashboards (Neo4j health, vector search latency,
#    RAG pipeline spans) and add OTEL exporter for traces to Tempo/OpenTelemetry.
# =============================================================================
