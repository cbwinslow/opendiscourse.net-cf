#!/usr/bin/env bash
set -euo pipefail
if command -v podman >/dev/null 2>&1; then
  echo "Using podman"
  ./run_podman_scan.sh
elif command -v docker >/dev/null 2>&1; then
  echo "Using docker"
  docker build -f Dockerfile.slim -t crew4ai:local .
  if command -v syft >/dev/null 2>&1; then
    syft crew4ai:local -o json > tmp/sbom.json || true
  fi
  if command -v trivy >/dev/null 2>&1; then
    trivy image --severity HIGH,CRITICAL crew4ai:local || true
  fi
  if command -v grype >/dev/null 2>&1 && [ -f tmp/sbom.json ]; then
    grype sbom:tmp/sbom.json -o table || true
  fi
else
  echo "Install podman or docker to build images."
  exit 1
fi
