#!/usr/bin/env bash
set -euo pipefail
SRC_DIR="$(pwd)/crew4ai"
DEST_DIR="$(pwd)/dotfiles/crew4ai"
echo "Syncing ${SRC_DIR} -> ${DEST_DIR}"
rm -rf "${DEST_DIR}"
mkdir -p "${DEST_DIR}"
cp -r "${SRC_DIR}/configs" "${DEST_DIR}/configs"
cp "${SRC_DIR}/run_podman_scan.sh" "${DEST_DIR}/run_podman_scan.sh" || true
cp "${SRC_DIR}/Dockerfile.slim" "${DEST_DIR}/Dockerfile.slim" || true
echo "Done."
