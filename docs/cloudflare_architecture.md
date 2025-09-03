# Cloudflare Architecture — OpenDiscourse

Checklist
- [x] Diagram current Cloudflare assets used by the app
- [x] Call out additional recommended assets/features for production readiness
- [x] Provide short implementation notes and next steps

## Overview
This diagram shows the Cloudflare services currently in use (Workers, D1, R2, KV, Vectorize, Pages) and recommended additional services and controls needed for production (WAF, Logpush, CI/CD, backups, monitoring, secrets rotation, staging/canary). Use the diagram as a living reference when preparing infrastructure-as-code and deployment pipelines.

## Diagram (Mermaid)

```mermaid
flowchart LR
  subgraph EDGE[Cloudflare Edge]
    A[Client Browser]
    CDN[Cloudflare CDN / Cache]
    WAF[WAF / Firewall / Rate Limits]
    Access[Cloudflare Access]
  end

  subgraph PLATFORM[Platform Services]
    Pages[Cloudflare Pages (frontend)]
    Workers[Cloudflare Workers (Container Worker + Functions)]
    AIgateway[AI Gateway / Vectorize]
    Queues[Workers Queues / Durable Objects]
  end

  subgraph STORAGE[Storage & DB]
    R2[R2 Buckets]
    D1[D1 Database]
    KV[Workers KV]
    VectorIndex[Vector Index (R2 or managed Vectorize)]
  end

  subgraph OBS[Observability & Security]
    Logs[Logpush -> S3 / BigQuery / Datadog]
    Sentry[Sentry (edge + server)]
    Metrics[Metrics / Dashboards / Alerts]
  end

  subgraph CI[CI / Infra]
    GitHub[GitHub Actions / CI]
    Terraform[Terraform / Pulumi / Wrangler config]
    Secrets[Secrets Manager / GitHub Secrets]
  end

  A -->|HTTPS| CDN
  CDN --> WAF
  WAF --> Workers
  CDN --> Pages
  Pages --> CDN

  Workers --> D1
  Workers --> R2
  Workers --> KV
  Workers --> AIgateway
  Workers --> Queues
  Workers -->|log| Logs
  Workers --> Sentry

  AIgateway --> VectorIndex
  R2 --> VectorIndex

  GitHub -->|deploy| Workers
  GitHub -->|deploy| Pages
  GitHub --> Terraform
  Terraform -->|provision| D1
  Terraform -->|provision| R2
  Terraform -->|provision| Workers

  Logs --> Metrics
  Sentry --> Metrics
  Metrics --> Alerts

  Secrets --> Workers
  Secrets --> GitHub

  style EDGE fill:#f3f4f6,stroke:#333
  style PLATFORM fill:#eef2ff,stroke:#333
  style STORAGE fill:#fff7ed,stroke:#333
  style OBS fill:#fef3f3,stroke:#333
  style CI fill:#ecfdf5,stroke:#333

  classDef core fill:#e6fffa,stroke:#0f766e;
  class Workers,Pages,D1,R2,KV core
``` 

## Current assets (from repo & config)
- Cloudflare Workers (container-worker / wrangler) — main runtime for API and RAG logic
- D1 database usage for structured storage
- R2 buckets for document storage and potentially vector indexes
- Workers KV for small key-value cache and metadata
- Vectorize or LangChain integration for embeddings and similarity search
- Cloudflare Pages (frontend) — static dashboard and UI
- Wrangler configuration present in repo

## Recommended additions for production
- WAF rules and managed rulesets (protect from injection, bots, scraping)
- Logpush -> central storage (S3 / BigQuery) + pipeline to SIEM/analytics (Datadog, BigQuery)
- Monitoring + alerting (Cloudflare analytics + custom metrics -> Grafana / Datadog)
- Sentry (edge + server) properly configured for error aggregation and performance
- CI/CD pipeline (GitHub Actions) for lint/tests + staged deploys to a staging zone
- Infrastructure as Code (Terraform or Cloudflare Terraform provider) to pin resources
- Secrets management and rotation (GitHub Secrets + Cloudflare Secrets; avoid inline secrets)
- Backups & exports: periodic D1 dumps to R2 / external storage
- Vector index lifecycle (index rebuild, retention, sharding) and R2 lifecycle rules
- Staging environment and canary deploy strategy (Routes + tags in Cloudflare Workers)
- Rate-limiting for abusive endpoints and bot mitigation
- Access controls: Roles, Audit logs, 2FA enforcement on all deploy accounts
- Compliance controls (data residency, data retention policy) for political content
- Automated DB migrations (schema versioning + migrations in CI)
- Health checks and synthetic monitoring (heartbeat endpoints + uptime checks)

## Minimal implementation notes
- Create a `terraform/` folder in repo and add Cloudflare provider configs for D1, R2, Workers, KV, Pages. Use state backend (e.g., remote S3) and lock.
- Add `/.github/workflows/deploy.yml` to run lint/tests then `wrangler deploy --env staging` and `wrangler publish` with secrets fetched from GitHub Secrets.
- Configure Logpush to push HTTP request logs and Workers logs to a secure bucket. Build dashboards in Grafana/Datadog querying those logs.
- Add scheduled backup job (Cloudflare Worker or GitHub Action) that dumps D1 to R2 nightly.
- Add WAF rules in Terraform and enable managed rulesets; add rule exceptions for internal IPs.

## Next steps I can take now
- Add a starter `docs/cloudflare_architecture.md` (done)
- Create a `terraform/` skeleton and sample `main.tf` referencing current resources
- Add a GitHub Actions workflow template for CI/CD and staged deploys
- Add a sample `wrangler` deploy script and secrets checklist

If you'd like, I can now scaffold: `terraform/` skeleton, a `/.github/workflows/deploy.yml` template, and a `scripts/backup_d1_to_r2.sh` runner. Tell me which of those to create first.
