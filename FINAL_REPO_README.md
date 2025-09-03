# OpenDiscourse AutoRAG System

This repository contains a complete AutoRAG (Automated Retrieval-Augmented Generation) system for processing political documents from govinfo.gov and congress.gov using Cloudflare's full stack capabilities.

## Repository Setup Complete

The git remotes have been configured for:

- **GitHub**: https://github.com/cbwinslow/opendiscourse.net-cf
- **GitLab**: https://gitlab.com/cbwinslow/opendiscourse.net-cf

## Next Steps

1. **Create the repositories** on GitHub and GitLab if you haven't already:
   - GitHub: https://github.com/new (name: opendiscourse.net-cf)
   - GitLab: https://gitlab.com/projects/new (name: opendiscourse.net-cf)
   - For both, choose public or private but do NOT initialize with a README

2. **Push the code** using the provided script:

   ```bash
   ./push_to_remotes.sh
   ```

   Or manually:

   ```bash
   # Push to GitHub
   git push -u origin main

   # Push to GitLab
   git push -u gitlab main
   ```

## Repository Contents

This repository includes:

- Complete AutoRAG implementation for govinfo.gov/bulkdata
- API integration with govinfo.gov and congress.gov
- Cloudflare Workers, D1, R2, KV, and Vectorize integration
- Semantic search and RAG question-answering capabilities
- Comprehensive documentation and setup guides

## Credentials Already Configured

The following credentials are already configured in the code:

- GovInfo.gov API key: `JRiK258tD1yRUWSnaeI2vUchbbjzyaZGoQT7LWfG`
- Congress.gov API key: `nt7MSte5iCSAphsEVqv10WdjdNU0a7QHCfEagcFj`
- Cloudflare Account ID: `968ff4ee9f5e59bc6c72758269d6b9d6`

## Deployment

After pushing, follow the deployment instructions in `DEPLOYMENT.md` and the guides in the `autorag/` directory to deploy the system to Cloudflare.
