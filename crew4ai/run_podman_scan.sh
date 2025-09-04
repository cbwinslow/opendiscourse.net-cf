#!/usr/bin/env bash
set -euo pipefail
IMAGE_NAME="crew4ai:local"
echo "Building image with podman: ${IMAGE_NAME}"
podman build -f Dockerfile.slim -t "${IMAGE_NAME}" .
echo "Scanning image with trivy (filesystem + vuln DB)."
trivy image --severity HIGH,CRITICAL --no-progress "${IMAGE_NAME}" || true

echo "Generating SBOM with syft"
if command -v syft >/dev/null 2>&1; then
  syft "${IMAGE_NAME}" -o json > tmp/sbom.json || true
else
  echo "syft not found; skipping SBOM"
fi

echo "Running grype against SBOM (if available)"
if command -v grype >/dev/null 2>&1 && [ -f tmp/sbom.json ]; then
  grype sbom:tmp/sbom.json -o table || true
fi

echo "Exporting image tarball to ./tmp/image.tar"
mkdir -p tmp
podman save -o tmp/image.tar "${IMAGE_NAME}"
echo "Done."
