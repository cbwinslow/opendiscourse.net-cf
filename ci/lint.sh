#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Running linters..."
which black >/dev/null 2>&1 && black --check . || echo "black not installed, skipping"
which flake8 >/dev/null 2>&1 && flake8 || echo "flake8 not installed, skipping"
