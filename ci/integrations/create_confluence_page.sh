#!/usr/bin/env bash
set -euo pipefail
echo "Create a Confluence page placeholder. Set CONFLUENCE_BASE_URL, CONFLUENCE_USER, CONFLUENCE_API_TOKEN"
if [ -z "${CONFLUENCE_BASE_URL:-}" ]; then
  echo "CONFLUENCE_BASE_URL not set; aborting"
  exit 1
fi
echo "Would POST a new page to ${CONFLUENCE_BASE_URL}/rest/api/content"
