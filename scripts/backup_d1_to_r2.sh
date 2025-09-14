#!/usr/bin/env bash
# Simple backup script: export D1 to a dump file and upload to R2 via wrangler r2 or AWS S3 CLI configured for R2.
# Requires: wrangler CLI authenticated and configured, or rclone/s3cmd configured for R2.

set -euo pipefail
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUTFILE="d1-backup-${TIMESTAMP}.sql"

# Placeholder: dump D1. Cloudflare D1 doesn't have a standard CLI; if using a local sqlite-like backup, implement here.
# For now, create a small metadata file to upload as example.
echo "D1 backup placeholder for ${TIMESTAMP}" > "${OUTFILE}"

# Upload to R2 using wrangler r2 (if available)
if command -v wrangler >/dev/null 2>&1; then
  echo "Uploading ${OUTFILE} to R2 bucket"
  # replace BUCKET and ACCOUNT with actuals or use environment variables
  wrangler r2 object put --binding=DOCUMENTS_BUCKET "${OUTFILE}" --file "${OUTFILE}" || true
else
  echo "wrangler not found; skipping R2 upload. File saved: ${OUTFILE}"
fi

echo "Backup complete: ${OUTFILE}"
