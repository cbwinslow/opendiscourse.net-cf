Secrets and where to store them
================================

Use GitHub Actions Secrets for repository-run workflows and CI. For production,
consider using a centralized secret manager (Vault, AWS Secrets Manager, Cloudflare
Workers secrets, or Bitwarden). Never store secrets in the repo.

Examples of secrets you may need to add in the repository's Settings > Secrets:
- JIRA_BASE_URL, JIRA_USER, JIRA_API_TOKEN
- CONFLUENCE_BASE_URL, CONFLUENCE_USER, CONFLUENCE_API_TOKEN
- BITBUCKET_WORKSPACE, BITBUCKET_USERNAME, BITBUCKET_APP_PASSWORD
- LINEAR_API_KEY

For Cloudflare workers or pages, use Cloudflare's recommended secrets storage and
the Accounts UI to safely inject secrets at deploy time.
