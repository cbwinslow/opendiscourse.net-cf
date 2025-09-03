import { APIAnalyzer } from '../../ingestion/services/api_analysis/api_analyzer.js';
import { WebScraper } from '../../ingestion/services/api_analysis/web_scraper.js';

// Environment variables required by the service
interface Env {
  OPENAI_API_KEY: string;
  DB: D1Database;
  CACHE: KVNamespace;
  VECTOR_INDEX: VectorizeIndex;
  DOCUMENTS: R2Bucket;
}

// Type definitions for request/response handling
interface RequestBody {
  url?: string;
  schema?: Record<string, unknown>;
  fullAnalysis?: boolean;
  [key: string]: unknown;
}

export class WebsiteAnalysisAPI {
  private apiAnalyzer: APIAnalyzer;
  private webScraper: WebScraper;
  
  private openAIApiKey: string;
  
  constructor(env: Env) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for website analysis');
    }
    
    this.openAIApiKey = env.OPENAI_API_KEY;
    this.apiAnalyzer = new APIAnalyzer(this.openAIApiKey);
    this.webScraper = new WebScraper(this.openAIApiKey);
  }
  
  private jsonResponse(data: unknown, { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {}): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }

  private errorResponse(error: unknown, status = 500, headers: Record<string, string> = {}): Response {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorDetails = error instanceof Error ? { stack: error.stack } : undefined;
    
    return this.jsonResponse(
      { 
        error: 'Internal Server Error',
        message: errorMessage,
        ...(errorDetails ? { details: errorDetails } : {})
      },
      { 
        status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          ...headers
        }
      }
    );
  }

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Parse request body for POST requests
      let body: Record<string, unknown> = {};
      if (request.method === 'POST') {
        try {
          body = await request.json() as Record<string, unknown>;
        } catch (error) {
          return this.jsonResponse(
            { error: 'Bad Request', message: 'Invalid JSON body' },
            { status: 400, headers: corsHeaders }
          );
        }
      }
      
      // Route requests
      if (path === '/api/analyze/website' && request.method === 'POST') {
        return await this.handleAnalyzeWebsite(body, corsHeaders);
      } else if (path === '/api/analyze/api' && request.method === 'POST') {
        return await this.handleAnalyzeAPI(body, corsHeaders);
      } else if (path === '/api/extract/data' && request.method === 'POST') {
        return await this.handleExtractData(body, corsHeaders);
      } else {
        return this.jsonResponse(
          { error: 'Not Found', message: 'Endpoint not found' },
          { status: 404, headers: corsHeaders }
        );
      }
    } catch (error: unknown) {
      console.error('Error in WebsiteAnalysisAPI:', error);
      return this.errorResponse(error, 500, corsHeaders);
    }
  }
  
  /**
   * Analyzes a website for API endpoints
   */
  private async handleAnalyzeAPI(
    body: RequestBody,
    headers: Record<string, string>
  ): Promise<Response> {
    const url = body?.url;
    if (!url || typeof url !== 'string') {
      return this.jsonResponse(
        { error: 'Bad Request', message: 'URL is required and must be a string' },
        { status: 400, headers }
      );
    }
    
    try {
      const result = await this.apiAnalyzer.discoverAPIEndpoints(url);
      return this.jsonResponse(result, { headers });
    } catch (error: unknown) {
      console.error('Error analyzing API:', error);
      return this.errorResponse(error, 500, headers);
    }
  }
  
  /**
   * Analyzes a website's content and structure
   */
  private async handleAnalyzeWebsite(
    body: RequestBody,
    headers: Record<string, string>
  ): Promise<Response> {
    const url = body?.url;
    if (!url || typeof url !== 'string') {
      return this.jsonResponse(
        { error: 'Bad Request', message: 'URL is required and must be a string' },
        { status: 400, headers }
      );
    }
    
    try {
      const result = await this.webScraper.scrape(url);
      
      // If full analysis is requested, also analyze the API
      if (body.fullAnalysis) {
        try {
          const apiResult = await this.apiAnalyzer.discoverAPIEndpoints(url);
          return this.jsonResponse(
            { ...result, apiAnalysis: apiResult },
            { headers }
          );
        } catch (apiError: unknown) {
          // If API analysis fails, still return the basic analysis
          console.error('API analysis failed:', apiError);
          const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
          return this.jsonResponse(
            { 
              ...result, 
              apiAnalysis: { 
                error: 'API analysis failed',
                message: errorMessage
              } 
            },
            { headers }
          );
        }
      }
      
      return this.jsonResponse(result, { headers });
    } catch (error: unknown) {
      console.error('Error analyzing website:', error);
      return this.errorResponse(error, 500, headers);
    }
  }
  
  /**
   * Extracts structured data from a webpage using a schema
   */
  private async handleExtractData(
    body: RequestBody,
    headers: Record<string, string>
  ): Promise<Response> {
    const url = body?.url;
    if (!url || typeof url !== 'string') {
      return this.jsonResponse(
        { error: 'Bad Request', message: 'URL is required and must be a string' },
        { status: 400, headers }
      );
    }
    
    const schema = body.schema;
    if (!schema || typeof schema !== 'object' || schema === null) {
      return this.jsonResponse(
        { error: 'Bad Request', message: 'A valid schema object is required' },
        { status: 400, headers }
      );
    }
    
    try {
      const result = await this.webScraper.extractWithSchema(url, schema);
      return this.jsonResponse({ data: result }, { headers });
    } catch (error: unknown) {
      console.error('Error extracting data:', error);
      return this.errorResponse(error, 500, headers);
    }
  }
  
}
