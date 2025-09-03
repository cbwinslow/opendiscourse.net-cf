# Cloudflare Worker Deployment

This document lists the exact GitHub secret names required to deploy the Cloudflare Worker via GitHub Actions, and a helper script to set them using the GitHub CLI (`gh`).

Required GitHub Secrets

- `CF_API_TOKEN` — Cloudflare API Token with permission to publish Workers in the target account.
- `CF_ACCOUNT_ID` — Cloudflare account id (used by some wrangler setups).
- `WORKER_ENV` — optional environment name (e.g., `production`).
- `CF_PAGES_TOKEN` — Cloudflare Pages API token used to publish Pages (if using Pages).
- `CF_PAGES_PROJECT` — Cloudflare Pages project name (optional, used by Pages deploy step).
- `GCP_SERVICE_ACCOUNT_KEY` — JSON key for a GCP service account with Cloud Run deploy permissions (base64 or raw JSON). Set as a GitHub Secret.
- `GCP_PROJECT_ID` — Google Cloud project id for Cloud Run builds.
- `GCP_REGION` — Optional region for Cloud Run deploy (default: `us-central1`).

Quick setup using GitHub CLI
1. Install `gh` and authenticate: `gh auth login`.
2. From the repo root, run the helper script `scripts/set_github_secrets.sh`.

Notes
- This repository's Action uses `cloudflare/wrangler-action@v1`. Ensure the action reference is valid in your GH Actions runner. If you prefer, replace with a direct `npm install -g wrangler` and `wrangler publish` step.
