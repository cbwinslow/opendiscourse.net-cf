# OpenDiscourse Deployment Guide

## Overview

This guide explains how to deploy the complete OpenDiscourse system, including the agentic knowledge graph, Docker containers, and Cloudflare integration.

## Deployment Options

### 1. Local Development Deployment

For local development and testing:

```bash
# 1. Start all services with Docker Compose
docker-compose up -d

# 2. Access services:
# - Neo4j: http://localhost:7474
# - API: http://localhost:8787/api/
# - Frontend: http://localhost:8787/

# 3. View logs
docker-compose logs -f

# 4. Stop services
docker-compose down
```

### 2. Cloudflare Production Deployment

For production deployment on Cloudflare:

#### Prerequisites

- Cloudflare account
- Wrangler CLI installed
- Docker Engine (for container builds)
- Cloudflare Tunnel (for Neo4j access)

#### Step 1: Deploy Neo4j Database

```bash
# Build and push Neo4j container
docker build -t opendiscourse-neo4j .
# Deploy to your container hosting service (Render, AWS, etc.)
```

#### Step 2: Deploy Cloudflare Worker

```bash
# Deploy the main worker
npm run deploy
```

#### Step 3: Deploy Frontend to Cloudflare Pages

```bash
cd frontend
npm run deploy
```

#### Step 4: Configure Cloudflare Tunnel (for Neo4j access)

```bash
# Install cloudflared
curl -L https://bin.equinox.io/c/VdrWdbjqyF/cloudflared-stable-linux-amd64.tgz | sudo tar xzv -C /usr/local/bin

# Create a tunnel
cloudflared tunnel create opendiscourse

# Route traffic to your Neo4j instance
cloudflared tunnel route dns opendiscourse neo4j.example.com

# Run the tunnel
cloudflared tunnel --hostname neo4j.example.com --url tcp://your-neo4j-host:7687
```

#### Step 5: Configure Environment Variables

Set the following environment variables in your Cloudflare Worker:

- `NEO4J_URI`: bolt://neo4j.example.com:443
- `NEO4J_USER`: neo4j
- `NEO4J_PASSWORD`: your-password

## System Architecture

### Components

1. **Neo4j Database** - Knowledge graph storage
2. **Cloudflare Worker** - API and business logic
3. **Cloudflare Pages** - Frontend interface
4. **Cloudflare Tunnel** - Secure Neo4j access
5. **D1 Database** - Structured data storage
6. **R2 Storage** - Document file storage
7. **Vectorize** - Vector embeddings for semantic search
8. **KV Cache** - Performance caching

### Data Flow

1. **Data Ingestion** - Fetch from govinfo.gov, congress.gov, file uploads
2. **Processing** - NLP analysis, entity extraction, vectorization
3. **Storage** - Save to D1, R2, Vectorize, and Neo4j
4. **API** - Worker processes requests and queries data stores
5. **Frontend** - Pages serves UI and communicates with Worker API

## Monitoring and Maintenance

### Health Checks

- Worker API: `/api/health`
- Neo4j: HTTP endpoint
- Docker containers: Built-in health checks

### Logging

- Cloudflare Worker logs: `wrangler tail`
- Docker logs: `docker-compose logs`
- Application logs: Integrated logging in services

### Backup Strategy

1. **D1 Database**: Use `wrangler d1 backup`
2. **R2 Storage**: Versioned objects
3. **Neo4j**: Regular database dumps
4. **Vectorize**: Re-indexable from source data

## Scaling Considerations

### Horizontal Scaling

- Cloudflare Workers: Automatic scaling
- D1 Database: Managed scaling
- R2 Storage: Unlimited storage
- Neo4j: Cluster deployment (production)

### Performance Optimization

- KV caching for frequent queries
- Database indexing
- Vector search optimization
- CDN for frontend assets

## Security

### Authentication

- API keys for external access
- JWT tokens for user authentication (future)
- Service-to-service authentication

### Data Protection

- Encryption at rest (all Cloudflare services)
- Encryption in transit (HTTPS/TLS)
- Access control and permissions

### Compliance

- GDPR compliance
- CCPA compliance
- Data retention policies

## Troubleshooting

### Common Issues

1. **Connection to Neo4j Failed**
   - Check Cloudflare Tunnel status
   - Verify Neo4j credentials
   - Ensure firewall rules allow connections

2. **API Endpoints Not Responding**
   - Check Worker deployment status
   - Verify environment variables
   - Review Worker logs

3. **Frontend Not Loading**
   - Check Pages deployment
   - Verify API endpoint URLs
   - Review browser console for errors

### Health Monitoring

```bash
# Check Docker container status
docker-compose ps

# Check Worker logs
wrangler tail

# Test API endpoints
curl https://your-worker.your-subdomain.workers.dev/api/health
```

## Future Enhancements

### Cloudflare Containers (June 2025)

When Cloudflare Containers become available:

1. Deploy Neo4j directly to Cloudflare Workers
2. Use Cloudflare's global network for edge computing
3. Integrate with other Cloudflare services seamlessly

### Additional Features

1. **User Authentication** - Add user accounts and access control
2. **Advanced Visualization** - Interactive charts and graphs
3. **Real-time Collaboration** - Multi-user document annotation
4. **Mobile Application** - Native mobile apps for iOS and Android
5. **Browser Extension** - Chrome extension for political research

This deployment guide provides a complete solution for running OpenDiscourse in both development and production environments, leveraging Cloudflare's powerful infrastructure for optimal performance and scalability.
