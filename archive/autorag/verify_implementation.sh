#!/bin/bash

# AutoRAG Implementation Verification Script

echo "=== AutoRAG Implementation Verification ==="
echo

# Check if required files exist
echo "1. Checking required files..."

REQUIRED_FILES=(
  "services/rag/auto_rag_service.ts"
  "ingestion/govinfo/govinfo_bulkdata_processor.ts"
  "services/api/auto_rag_api.ts"
  "scripts/setup_vectorize.ts"
  "migrations/0008_auto_rag_tables.sql"
  "autorag/AUTORAG_README.md"
  "autorag/AUTORAG_SETUP_GUIDE.md"
  "autorag/AUTORAG_SETUP_PLAN.md"
  "autorag/AUTORAG_IMPLEMENTATION_SUMMARY.md"
  "tests/auto_rag.test.ts"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "/home/cbwinslow/Downloads/cf-free-cloudflare-demo (1)/worker-cron/$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
    MISSING_FILES+=("$file")
  fi
done

echo
echo "2. Checking package.json scripts..."

# Check if required scripts are in package.json
if grep -q "ingest:bulkdata" "/home/cbwinslow/Downloads/cf-free-cloudflare-demo (1)/worker-cron/package.json"; then
  echo "  ✅ ingest:bulkdata script"
else
  echo "  ❌ ingest:bulkdata script (MISSING)"
fi

if grep -q "setup:vectorize" "/home/cbwinslow/Downloads/cf-free-cloudflare-demo (1)/worker-cron/package.json"; then
  echo "  ✅ setup:vectorize script"
else
  echo "  ❌ setup:vectorize script (MISSING)"
fi

echo
echo "3. Checking configuration updates..."

# Check if autorag config is in api_config.json
if grep -q "autorag" "/home/cbwinslow/Downloads/cf-free-cloudflare-demo (1)/worker-cron/ingestion/config/api_config.json"; then
  echo "  ✅ AutoRAG configuration in api_config.json"
else
  echo "  ❌ AutoRAG configuration in api_config.json (MISSING)"
fi

echo
echo "4. Checking TypeScript compilation..."

# Check if AutoRAG service compiles
if npx tsc "/home/cbwinslow/Downloads/cf-free-cloudflare-demo (1)/worker-cron/services/rag/auto_rag_service.ts" --noEmit > /dev/null 2>&1; then
  echo "  ✅ AutoRAG service compiles without errors"
else
  echo "  ❌ AutoRAG service has compilation errors"
fi

echo
echo "=== Verification Summary ==="

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
  echo "✅ All required files are present"
else
  echo "❌ Missing files:"
  for file in "${MISSING_FILES[@]}"; do
    echo "  - $file"
  done
fi

echo
echo "5. Running API configuration test..."
npm run test:config

echo
echo "🎉 AutoRAG implementation verification complete!"
echo
echo "Next steps:"
echo "1. Configure your govinfo API key in ingestion/config/api_config.json"
echo "2. Set up your Cloudflare resources (D1, R2, Vectorize)"
echo "3. Run database migrations with 'npm run migrate'"
echo "4. Deploy with 'npm run deploy'"
echo "5. Start ingesting data with 'npm run ingest:bulkdata'"