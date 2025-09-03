#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Running simple secret scan..."
if command -v git-secrets >/dev/null 2>&1; then
  git-secrets --scan
else
  # basic grep for common secret patterns (very simple)
  echo "git-secrets not found; running basic grep for potential secrets (heuristic)"
  git grep -n --untracked --no-color -I "\bAKIA[0-9A-Z]{16}\b" || true
  git grep -n --untracked --no-color -I "-----BEGIN PRIVATE KEY-----" || true
fi
