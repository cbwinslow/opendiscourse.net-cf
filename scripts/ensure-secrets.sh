#!/usr/bin/env bash
# Helper checklist to set required GitHub secrets and environment variables.
# Run locally and use as guidance when configuring repository secrets.

cat <<'EOF'
Required GitHub secrets:
- CF_API_TOKEN: Cloudflare API token with minimal publish/manage permissions
- CLOUDFLARE_API_TOKEN: alias used in some workflows
- DOCUMENTS_BUCKET: R2 bucket name or binding name for uploads

Local (wrangler) setup:
- Install Wrangler and authenticate: npm install -g wrangler; wrangler login
- Ensure `wrangler.toml` has environment entries for staging/production

Next steps:
- Create least-privilege API tokens for CI and rotation schedule.
- Add repository secrets in GitHub: Settings -> Secrets -> Actions
EOF
