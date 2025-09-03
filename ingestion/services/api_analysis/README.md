 dot# Website and API Analysis Service

This service provides tools for analyzing websites and their APIs, extracting structured data, and generating documentation. It's designed to work with the OpenDiscourse platform to enhance data ingestion capabilities.

## Features

- **Web Scraping**: Extract structured content from web pages including text, headings, links, and tables.
- **API Discovery**: Automatically discover and document API endpoints used by a website.
- **Structured Data Extraction**: Use AI to extract specific data points from web pages using custom schemas.
- **Content Analysis**: Analyze page content to identify key entities, topics, and sentiment.

## Components

### 1. WebScraper

The `WebScraper` class provides methods to:
- Scrape web pages and extract structured content
- Clean and process HTML for analysis
- Extract data using AI based on custom schemas
- Handle common web scraping challenges (pagination, dynamic content, etc.)

### 2. APIAnalyzer

The `APIAnalyzer` class provides methods to:
- Discover API endpoints used by a website
- Analyze API documentation (OpenAPI/Swagger, GraphQL, etc.)
- Generate API documentation from analysis
- Detect authentication methods and rate limiting

### 3. WebsiteAnalysisAPI

A REST API that exposes the analysis capabilities through HTTP endpoints.

## API Endpoints

### Analyze Website

```http
POST /api/analyze/website
```

**Request Body:**
```json
{
  "url": "https://example.com",
  "fullAnalysis": true
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "description": "This domain is for use in illustrative examples...",
  "headings": [
    {"level": 1, "text": "Example Domain"},
    {"level": 2, "text": "Heading 1"}
  ],
  "links": [
    {"text": "More information...", "url": "https://www.iana.org/domains/example"}
  ],
  "tables": [],
  "metadata": {
    "language": "en",
    "keywords": ["example", "domain"],
    "hasForms": false,
    "hasLogin": false
  },
  "content": {
    "mainTopic": "Example Domain",
    "entities": [
      {"type": "ORGANIZATION", "name": "Internet Assigned Numbers Authority"}
    ],
    "keyPoints": [
      "This domain is for use in illustrative examples",
      "This domain is not related to any real services"
    ]
  },
  "apiAnalysis": {
    "endpoints": [
      {
        "path": "/api/data",
        "method": "GET",
        "description": "Retrieves example data",
        "parameters": [
          {"name": "page", "type": "number", "required": false, "description": "Page number"}
        ],
        "response": {
          "type": "object",
          "properties": {
            "data": {"type": "array", "items": {"type": "string"}},
            "total": {"type": "number"}
          }
        }
      }
    ]
  }
}
```

### Analyze API

```http
POST /api/analyze/api
```

**Request Body:**
```json
{
  "url": "https://api.example.com"
}
```

**Response:**
```json
{
  "endpoints": [
    {
      "path": "/users",
      "methods": ["GET", "POST"],
      "description": "Manage user accounts",
      "parameters": [
        {"name": "limit", "in": "query", "type": "number", "description": "Number of results to return"}
      ],
      "requestBody": {
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "email": {"type": "string", "format": "email"}
              },
              "required": ["name", "email"]
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Successful response",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "id": {"type": "string"},
                  "name": {"type": "string"},
                  "email": {"type": "string"}
                }
              }
            }
          }
        }
      }
    }
  ]
}
```

### Extract Data with Schema

```http
POST /api/extract/data
```

**Request Body:**
```json
{
  "url": "https://example.com/product/123",
  "schema": {
    "type": "object",
    "properties": {
      "name": {"type": "string"},
      "price": {"type": "number"},
      "description": {"type": "string"},
      "features": {"type": "array", "items": {"type": "string"}},
      "reviews": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "author": {"type": "string"},
            "rating": {"type": "number"},
            "comment": {"type": "string"}
          }
        }
      }
    }
  },
  "options": {
    "includeHtml": false,
    "includeText": true,
    "maxPages": 5
  }
}
```

**Response:**
```json
{
  "data": {
    "name": "Example Product",
    "price": 99.99,
    "description": "This is an example product description.",
    "features": [
      "Feature 1",
      "Feature 2",
      "Feature 3"
    ],
    "reviews": [
      {
        "author": "John Doe",
        "rating": 5,
        "comment": "Great product!"
      },
      {
        "author": "Jane Smith",
        "rating": 4,
        "comment": "Works as expected."
      }
    ]
  }
}
```

## Setup

1. Install dependencies:
   ```bash
   npm install axios cheerio jsdom langchain
   ```

2. Set up environment variables:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

```typescript
import { WebScraper } from './web_scraper';
import { APIAnalyzer } from './api_analyzer';

// Initialize with your OpenAI API key
const apiKey = process.env.OPENAI_API_KEY;
const scraper = new WebScraper(apiKey);
const analyzer = new APIAnalyzer(apiKey);

// Scrape a website
const result = await scraper.scrape('https://example.com');
console.log('Scraped data:', result);

// Analyze API endpoints
const apiResult = await analyzer.discoverAPIEndpoints('https://api.example.com');
console.log('API analysis:', apiResult);

// Extract data with a schema
const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    price: { type: 'number' }
  }
};

const extracted = await scraper.extractWithSchema('https://example.com/product/123', schema);
console.log('Extracted data:', extracted);
```

## Error Handling

All methods throw errors with descriptive messages. Handle errors using try/catch:

```typescript
try {
  const result = await scraper.scrape('https://example.com');
  console.log(result);
} catch (error) {
  console.error('Scraping failed:', error.message);
}
```

## Rate Limiting

Be mindful of rate limits and website terms of service. The service includes:
- Built-in delays between requests
- Respect for robots.txt
- Configurable timeouts
- User-agent rotation (coming soon)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
