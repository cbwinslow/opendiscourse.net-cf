# OpenDiscourse Frontend - Cloudflare Pages Optimized

This frontend is optimized for Cloudflare Pages deployment with:

## Features
- Static HTML/CSS/JS optimized for global CDN
- Cloudflare Pages Functions for dynamic content
- Integration with the main worker API
- Optimized for performance and SEO

## Structure
```
frontend/
├── public/              # Static assets
├── functions/           # Cloudflare Pages Functions
├── _headers             # HTTP headers configuration
├── _redirects           # URL redirects
└── _routes.json         # Route configuration
```

## Deployment
The frontend automatically deploys to Cloudflare Pages when pushed to the repository.

## API Integration
The frontend connects to the main worker API at `/api/*` endpoints for:
- Political data queries
- Semantic search
- Document management
- AI chat functionality