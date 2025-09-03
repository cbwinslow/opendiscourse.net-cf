#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/set_github_secrets.sh <owner/repo>
# Example: ./scripts/set_github_secrets.sh cbwinslow/opendiscourse.net-cf

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <owner/repo>"
  exit 1
fi

REPO="$1"

read -rp "Enter CF_API_TOKEN: " CF_API_TOKEN
read -rp "Enter CF_ACCOUNT_ID (optional): " CF_ACCOUNT_ID
read -rp "Enter WORKER_ENV (optional): " WORKER_ENV

echo "Setting secrets on $REPO..."
gh secret set CF_API_TOKEN -b"$CF_API_TOKEN" -R "$REPO"
if [ -n "$CF_ACCOUNT_ID" ]; then
  gh secret set CF_ACCOUNT_ID -b"$CF_ACCOUNT_ID" -R "$REPO"
fi
if [ -n "$WORKER_ENV" ]; then
  gh secret set WORKER_ENV -b"$WORKER_ENV" -R "$REPO"
fi

echo "Secrets set. Verify in repository settings -> Secrets." 
