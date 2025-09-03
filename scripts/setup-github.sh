#!/bin/bash
set -e

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it first:"
    echo "https://github.com/cli/cli#installation"
    exit 1
fi

# Check if already authenticated
if ! gh auth status &> /dev/null; then
    echo "Please authenticate with GitHub..."
    gh auth login
fi

# Create repository if it doesn't exist
REPO_NAME="opendiscourse.net-cf"
if ! gh repo view "$REPO_NAME" &> /dev/null; then
    echo "Creating repository $REPO_NAME..."
    gh repo create "$REPO_NAME" --public --source=. --remote=origin
fi

# Set up repository secrets
echo "Setting up repository secrets..."

# Check if secrets already exist
if ! gh secret list | grep -q CLOUDFLARE_API_TOKEN; then
    read -p "Enter your Cloudflare API Token: " cf_token
    gh secret set CLOUDFLARE_API_TOKEN --body "$cf_token"
fi

if ! gh secret list | grep -q CLOUDFLARE_ACCOUNT_ID; then
    read -p "Enter your Cloudflare Account ID: " account_id
    gh secret set CLOUDFLARE_ACCOUNT_ID --body "$account_id"
fi

# Add other necessary secrets
SECRETS=(
    "DATABASE_URL"
    "AUTH_SECRET"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "GITHUB_CLIENT_ID"
    "GITHUB_CLIENT_SECRET"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
)

for secret in "${SECRETS[@]}"; do
    if ! gh secret list | grep -q "^$secret"; then
        read -p "Enter value for $secret: " secret_value
        gh secret set "$secret" --body "$secret_value"
    fi
done

echo "GitHub repository setup complete!"
echo "Push your code to trigger the deployment workflow:"
echo "  git push -u origin main"
