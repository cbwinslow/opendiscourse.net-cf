GitHub automation and CI helpers

This folder documents the repository's CI and GitHub Actions workflows.

Workflows live in `.github/workflows/` and are:
- `ci.yml` - runs tests and linters on push and PRs
- `deploy.yml` - deploys on push to `main` or manual dispatch
- `secret-scan.yml` - weekly secret scanning

Local helper scripts live in `ci/` and are safe defaults. Update them to integrate
with your cloud provider, deployment tooling, and secret-management systems.
