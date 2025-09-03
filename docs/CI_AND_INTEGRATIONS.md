CI, Security, and Integrations
==============================

This document summarizes the CI workflows and integration helper scripts added to the
repository.

Workflows:
- `.github/workflows/ci.yml` — runs tests and linters on push and PRs.
- `.github/workflows/deploy.yml` — deploy workflow (calls `./ci/deploy.sh`).
- `.github/workflows/secret-scan.yml` — weekly secret scanning job.
- `.github/workflows/codeql.yml` — CodeQL static analysis for security issues.

Dependabot:
- `.github/dependabot.yml` — dependency update schedule for pip and npm.

Local CI helpers (in `ci/`):
- `test.sh` — runs pytest
- `lint.sh` — runs black/flake8 if installed
- `deploy.sh` — placeholder for deploy steps
- `secret_scan.sh` — run git-secrets or basic grep heuristics

Integration helper scripts (in `ci/integrations/`):
- `create_bitbucket_repo.sh` — create a Bitbucket repo via API (placeholder)
- `create_jira_issue.sh` — create a Jira issue (placeholder)
- `create_confluence_page.sh` — create Confluence page (placeholder)
- `create_linear_issue.sh` — create Linear issue (placeholder)

Notes:
- These integration scripts are placeholders and require API keys/credentials
  in environment variables. They are safe-by-default and will abort if required
  credentials are missing.
