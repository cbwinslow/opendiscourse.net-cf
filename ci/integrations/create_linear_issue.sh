#!/usr/bin/env bash
set -euo pipefail
echo "Create a Linear issue placeholder. Set LINEAR_API_KEY env var"
if [ -z "${LINEAR_API_KEY:-}" ]; then
  echo "LINEAR_API_KEY not set; aborting"
  exit 1
fi
echo "Would POST a new issue to the Linear API using your key"
