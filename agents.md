# agents.md

This file catalogs the agents, scripts, and components added by this delivery.

- Orchestrate GovInfo MCP Bootstrap (orchestrate_govinfo_mcp_bootstrap.py)
  - Role: One-command database bootstrap + MCP seed + demo harvest + NLP demo + optional MCP HTTP server.
  - Key responsibilities:
    - Applies full Postgres schema (pgvector-enabled) for govinfo + social + NLP + graph + audit + MCP.
    - Seeds MCP registry with 'govinfo' source, BILLS endpoint, and a default job.
    - Best-effort demo harvest from govinfo.gov/bulkdata and normalization to staging.documents.
    - Demo embeddings (hash-based) persisted to nlp.embeddings, plus toy graph edges.
    - Optional tiny MCP server (FastAPI) to register endpoints/jobs and trigger demo harvest.
  - Inputs:
    - Env or CLI for Postgres (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD).
    - Harvest parameters (--collection, --congress, --limit).
  - Outputs:
    - Database schema and populated rows across mcp._, staging._, nlp._, graph._.
    - Console logs for steps/results and errors.

- Database (Postgres + pgvector)
  - Role: Central data store for raw/staging/NLP/graph/audit/MCP.
  - Notable schemas: mcp, raw_govinfo, staging, people, social, nlp, graph, audit.

- (Optional) Mini MCP HTTP Server
  - Role: Basic REST interface to add endpoints, jobs, and run a demo harvest.
  - Endpoints:
    - GET /health
    - POST /mcp/endpoints
    - POST /mcp/jobs
    - POST /mcp/harvest
  - Notes: Intended as a thin control plane for local dev, not production-grade.

Update cadence:

- Update this file whenever you add or modify scripts, endpoints, services, or DB schema so future you doesn’t have to time-travel.
