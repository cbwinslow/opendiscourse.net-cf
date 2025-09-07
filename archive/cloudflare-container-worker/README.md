# OpenDiscourse Cloudflare Worker

This is a Cloudflare Worker for the OpenDiscourse platform, providing serverless API endpoints for document processing and retrieval.

## Features

- Serverless API endpoints for document management
- Integration with Cloudflare's global network
- Built with TypeScript for type safety
- Containerized deployment support

## Prerequisites

- Node.js 18 or later
- npm or yarn
- Cloudflare Wrangler CLI (`npm install -g wrangler`)
- Docker (for local development with containers)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/opendiscourse.net-cf.git
   cd opendiscourse.net-cf/cloudflare-container-worker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**

   ```bash
   npm run build
   ```

4. **Login to Cloudflare**

   ```bash
   npx wrangler login
   ```

5. **Deploy the worker**

   ```bash
   npx wrangler deploy
   ```

## Development

### Local Development

To run the worker locally:

```bash
npm run dev
```

This will start the worker at `http://localhost:8787`.

### Environment Variables

Create a `.dev.vars` file in the project root for local development:

```bash
NODE_ENV=development
# Add other environment variables here
```

### Testing

Run tests with:

```bash
npm test
```

## API Endpoints

- `GET /` - Health check and API information
- `GET /api/health` - Health check endpoint
- `POST /api/documents` - Upload a document
- `GET /api/documents/search?q=query` - Search documents

## Deployment

### Production Deployment

```bash
npm run deploy
```

### Docker Build

Build the Docker image:

```bash
docker build -t opendiscourse/worker:latest .
```

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
