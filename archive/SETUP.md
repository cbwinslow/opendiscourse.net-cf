# OpenDiscourse Setup Guide

This guide will help you set up the OpenDiscourse development environment and deploy the application.

## Prerequisites

- Node.js 18+ and npm
- Cloudflare Wrangler CLI
- PostgreSQL 14+
- Git

## 1. Environment Setup

### Clone the Repository

```bash
git clone https://github.com/your-org/opendiscourse.net-cf.git
cd opendiscourse.net-cf
```

### Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/opendiscourse

# API Keys
GOVINFO_API_KEY=your-govinfo-api-key
CONGRESS_API_KEY=your-congress-api-key
OPENAI_API_KEY=your-openai-api-key  # For embeddings and RAG

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# Ingestion Settings
BATCH_SIZE=10
MAX_PACKAGES=50
```

## 2. Database Setup

### Local Development

1. Install PostgreSQL
2. Create a new database:

   ```bash
   createdb opendiscourse
   ```

3. Run migrations:

   ```bash
   npx wrangler d1 migrations apply opendiscourse-db --local
   ```

## 3. Cloudflare Setup

1. Install Wrangler CLI:

   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:

   ```bash
   wrangler login
   ```

3. Create required Cloudflare resources:

   ```bash
   # Create D1 database
   wrangler d1 create opendiscourse-db
   
   # Create R2 buckets
   wrangler r2 bucket create opendiscourse-documents
   wrangler r2 bucket create opendiscourse-models
   
   # Create KV namespaces
   wrangler kv:namespace create CACHE
   wrangler kv:namespace create SESSIONS
   ```

## 4. Running Locally

### Backend

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

## 5. Deployment

### Deploy to Cloudflare

```bash
# Deploy to production
npm run deploy:prod

# Deploy to staging
npm run deploy:staging
```

## 6. Testing

Run unit tests:

```bash
npm test
```

## 7. Monitoring

View logs:

```bash
# Production logs
npm run logs:prod

# Staging logs
npm run logs:staging
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure all required variables are set in `.env`
   - Restart your development server after making changes

2. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check `DATABASE_URL` in your `.env` file

3. **Cloudflare Authentication**
   - Run `wrangler login` to authenticate
   - Verify your API tokens have the correct permissions

## Support

For additional help, please open an issue in the GitHub repository.
