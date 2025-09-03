#!/usr/bin/env bash
set -euo pipefail
echo "Create a Jira issue placeholder. Set JIRA_BASE_URL, JIRA_USER, JIRA_API_TOKEN, JIRA_PROJECT_KEY"
if [ -z "${JIRA_BASE_URL:-}" ]; then
  echo "JIRA_BASE_URL not set; aborting"
  exit 1
fi
echo "Would POST a new issue to ${JIRA_BASE_URL}/rest/api/2/issue"
