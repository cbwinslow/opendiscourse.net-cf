# Docker Deployment Guide for OpenDiscourse

## Overview
This guide explains how to deploy the OpenDiscourse application using Docker containers. The system consists of:
1. Neo4j database container for the knowledge graph
2. Cloudflare Worker container for the API
3. Optional frontend container for the web interface

## Prerequisites
- Docker Engine 20.10 or higher
- Docker Compose 1.29 or higher
- At least 4GB RAM available

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd worker-cron
```

### 2. Build and Run with Docker Compose
```bash
docker-compose up -d
```

This will start:
- Neo4j database on ports 7474 (HTTP) and 7687 (Bolt)
- Cloudflare Worker on port 8787

### 3. Access the Services
- **Neo4j Browser**: http://localhost:7474
- **API Endpoints**: http://localhost:8787/api/
- **Frontend**: http://localhost:8787/

## Individual Container Deployment

### Neo4j Database
```bash
# Build the Neo4j image
docker build -t opendiscourse-neo4j .

# Run the Neo4j container
docker run -d \
  --name opendiscourse-neo4j \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  -v neo4j_data:/data \
  opendiscourse-neo4j
```

### Cloudflare Worker
```bash
# Build the Worker image
docker build -f Dockerfile.worker -t opendiscourse-worker .

# Run the Worker container
docker run -d \
  --name opendiscourse-worker \
  -p 8787:8787 \
  -e NEO4J_URI=bolt://host.docker.internal:7687 \
  -e NEO4J_USER=neo4j \
  -e NEO4J_PASSWORD=password \
  opendiscourse-worker
```

## Configuration

### Environment Variables
The containers can be configured using environment variables:

#### Neo4j Container
- `NEO4J_AUTH`: Authentication credentials (default: neo4j/password)
- `NEO4J_server_memory_heap_initial__size`: Initial heap size (default: 1G)
- `NEO4J_server_memory_heap_max__size`: Maximum heap size (default: 2G)
- `NEO4J_server_memory_pagecache_size`: Page cache size (default: 1G)

#### Worker Container
- `NEO4J_URI`: Neo4j connection URI (default: bolt://neo4j:7687)
- `NEO4J_USER`: Neo4j username (default: neo4j)
- `NEO4J_PASSWORD`: Neo4j password (default: password)

## Data Persistence
Data is persisted in Docker volumes:
- `neo4j_data`: Neo4j database files

To backup data:
```bash
docker run --rm \
  -v neo4j_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/neo4j-backup.tar.gz -C /data .
```

To restore data:
```bash
docker run --rm \
  -v neo4j_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/neo4j-backup.tar.gz -C /data
```

## Monitoring and Maintenance

### Check Container Status
```bash
docker-compose ps
```

### View Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs neo4j
docker-compose logs worker
```

### Scale Services
```bash
# Scale worker instances
docker-compose up -d --scale worker=3
```

## Cloudflare Integration

### Cloudflare Tunnel (Recommended for Production)
1. Install `cloudflared`:
   ```bash
   curl -L https://bin.equinox.io/c/VdrWdbjqyF/cloudflared-stable-linux-amd64.tgz | sudo tar xzv -C /usr/local/bin
   ```

2. Create a tunnel:
   ```bash
   cloudflared tunnel create opendiscourse
   ```

3. Route traffic to your services:
   ```bash
   cloudflared tunnel route dns opendiscourse opendiscourse.example.com
   ```

4. Run the tunnel:
   ```bash
   cloudflared tunnel --hostname opendiscourse.example.com --url http://localhost:8787
   ```

### Cloudflare Workers Integration (Future)
With the upcoming Cloudflare Containers feature (June 2025), you'll be able to:
1. Deploy Docker containers directly to Cloudflare Workers
2. Use Cloudflare's global network for edge computing
3. Integrate with other Cloudflare services seamlessly

## Troubleshooting

### Common Issues

1. **Port Conflicts**:
   ```bash
   # Check which process is using the port
   lsof -i :7474
   # Kill the process if needed
   kill -9 <PID>
   ```

2. **Insufficient Memory**:
   Reduce memory allocation in docker-compose.yml:
   ```yaml
   environment:
     - NEO4J_server_memory_heap_initial__size=512M
     - NEO4J_server_memory_heap_max__size=1G
     - NEO4J_server_memory_pagecache_size=512M
   ```

3. **Connection Issues**:
   Verify Neo4j is running:
   ```bash
   docker-compose logs neo4j
   curl http://localhost:7474
   ```

### Health Checks
The containers include health checks:
- Neo4j: HTTP endpoint check
- Worker: API health endpoint check

View health status:
```bash
docker inspect --format='{{json .State.Health}}' opendiscourse-neo4j
```

## Production Considerations

### Security
1. Change default passwords
2. Use TLS/SSL for production
3. Restrict access with firewall rules
4. Regular security updates

### Performance
1. Monitor resource usage
2. Optimize Neo4j configuration for your dataset
3. Use indexes and constraints
4. Consider read replicas for high traffic

### Backup Strategy
1. Regular automated backups
2. Test restore procedures
3. Store backups in multiple locations
4. Monitor backup success

This deployment guide provides a complete solution for running OpenDiscourse with Docker containers, preparing for both current deployment needs and future Cloudflare integration.