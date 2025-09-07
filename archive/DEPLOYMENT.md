# OpenDiscourse Deployment Guide

## Prerequisites

1. Node.js (v18 or higher)
2. Cloudflare account
3. Wrangler CLI installed globally:
   ```bash
   npm install -g wrangler
   ```

## Setup Steps

1. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

2. **Create required Cloudflare resources**:
   ```bash
   # Create D1 database
   wrangler d1 create opendiscourse-db
   
   # Create R2 bucket
   wrangler r2 bucket create opendiscourse-documents
   
   # Create KV namespace
   wrangler kv:namespace create "opendiscourse-cache"
   
   # Create Vectorize index
   wrangler vectorize create opendiscourse-vector-index --preset @cf/baai/bge-small-en-v1.5
   ```

3. **Update `wrangler.toml`** with the actual IDs returned from the previous commands:
   - Replace `opendiscourse-db-id` with the actual D1 database ID
   - Replace `opendiscourse-cache-id` with the actual KV namespace ID

4. **Apply database migrations**:
   ```bash
   npm run migrate
   ```

## Development

### Running Locally
```bash
npm run dev
```

This will start a local development server on `http://localhost:8787`

### Testing API Endpoints
Once the development server is running, you can test the API endpoints:

1. Health check:
   ```bash
   curl http://localhost:8787/api/health
   ```

2. List documents:
   ```bash
   curl http://localhost:8787/api/documents
   ```

3. Search documents:
   ```bash
   curl "http://localhost:8787/api/search?q=sample"
   ```

## Deployment

### Deploy to Cloudflare
```bash
npm run deploy
```

This will deploy the worker to your Cloudflare account using the configuration in `wrangler.toml`.

### Environment Variables
For production deployment, you may need to set environment variables:
```bash
wrangler secret put MY_SECRET_KEY
```

## Monitoring

### View Logs
```bash
npm run logs
```

### View Metrics
You can view detailed metrics and logs in the Cloudflare dashboard:
1. Go to the Workers & Pages section
2. Select your worker
3. View the Analytics tab for performance metrics
4. View the Logs tab for detailed request logs

## Database Management

### Apply Migrations
```bash
npm run migrate
```

### Direct Database Access
For direct database access during development:
```bash
wrangler d1 execute opendiscourse-db --command "SELECT * FROM documents LIMIT 5;"
```

## Troubleshooting

### Common Issues

1. **Deployment fails with permissions error**:
   - Ensure you've logged in with `wrangler login`
   - Check that your Cloudflare account has the necessary permissions

2. **Database migrations fail**:
   - Ensure the D1 database exists and the ID is correct in `wrangler.toml`
   - Check that you're using the correct database name

3. **API endpoints return 404**:
   - Verify the worker is deployed correctly
   - Check the routes in `src/index.ts`

4. **TypeScript compilation errors**:
   - Run `npx tsc --noEmit` to check for errors
   - Ensure all dependencies are installed with `npm install`

### Debugging Tips

1. **Enable detailed logging**:
   Add `console.log` statements in your code to debug issues

2. **Test locally first**:
   Always test locally with `npm run dev` before deploying

3. **Check Cloudflare documentation**:
   Refer to the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/) for detailed API information

## Scaling Considerations

1. **Database Performance**:
   - Use indexes appropriately
   - Monitor query performance
   - Consider partitioning large tables

2. **Caching Strategy**:
   - Use KV for frequently accessed data
   - Implement appropriate cache expiration

3. **Rate Limiting**:
   - Implement rate limiting for public APIs
   - Use Cloudflare's built-in rate limiting features

4. **Content Delivery**:
   - Use Cloudflare's CDN features for static assets
   - Consider using Cloudflare Pages for frontend hosting

## Security Best Practices

1. **Authentication**:
   - Implement proper user authentication
   - Use secure session management

2. **Data Protection**:
   - Encrypt sensitive data
   - Implement proper access controls

3. **API Security**:
   - Validate all input
   - Implement rate limiting
   - Use HTTPS only

4. **Secrets Management**:
   - Use `wrangler secret` for sensitive configuration
   - Never commit secrets to version control

This guide should help you successfully deploy and manage the OpenDiscourse application on Cloudflare's platform.