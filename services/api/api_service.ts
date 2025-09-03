// Main API service for OpenDiscourse

// Coordinates all services and handles API requests
import { WebsiteAnalysisAPI } from "./website_analysis_api.js";

// Type definitions for document analysis
type AnalysisRequest = {
  documentId: string;
  content: string;
};

type DocumentAnalysis = {
  id: string;
  documentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  metrics: {
    wordCount: number;
    sentenceCount: number;
    readingTime: number;
  };
  sentiment: {
    score: number;
    label: string;
  };
  entities: Array<{
    type: string;
    text: string;
    count: number;
  }>;
  topics: string[];
  summary: string;
};

// Type definitions for environment variables
interface Env {
  OPENAI_API_KEY: string;
  DB: D1Database;
  CACHE: KVNamespace;
  VECTOR_INDEX: VectorizeIndex;
  DOCUMENTS: R2Bucket;
}

export class OpenDiscourseAPI {
  private static websiteAnalysisAPI: WebsiteAnalysisAPI;

  // Generate a unique ID
  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Parse request body with proper typing
  private static async parseRequestBody<T>(request: Request): Promise<T> {
    try {
      return await request.json<T>();
    } catch (error) {
      throw new Error('Invalid request body');
    }
  }
  
  // Handle search routes
  static async handleSearchRoutes(request: Request, env: Env, path: string): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    try {
      const url = new URL(request.url);
      const query = url.searchParams.get('q') || '';
      const searchService = this.getSearchService(env);
      
      if (path === '/api/search/semantic') {
        const results = await searchService.semanticSearch(query);
        return new Response(JSON.stringify({ 
          success: true, 
          query, 
          results: results.results 
        }), { headers: corsHeaders });
      } else {
        const results = await searchService.search(query);
        return new Response(JSON.stringify({ 
          success: true, 
          query, 
          results: results.results 
        }), { headers: corsHeaders });
      }
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
  
  // Handle analysis routes
  static async handleAnalysisRoutes(request: Request, env: Env, path: string): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      
      if (request.method === 'POST' && path === '/api/analyze/document') {
        return this.analyzeDocument(request, env);
      }
      
      if (request.method === 'GET' && path.startsWith('/api/analyze/')) {
        const analysisId = path.split('/').pop();
        if (analysisId) {
          return this.getAnalysis(request, env, analysisId);
        }
      }
      
      return new Response(JSON.stringify({ error: 'Not Found' }), { 
        status: 404, 
        headers: corsHeaders 
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
  
  // Handle RAG routes
  static async handleRagRoutes(_request: Request, _env: Env, _path: string): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'RAG endpoint',
      implemented: false
    }), { 
      headers: corsHeaders 
    });
  }
  
  // Analyze a document
  static async analyzeDocument(request: Request, _env: Env): Promise<Response> {
    try {
      const body = await request.json<AnalysisRequest>();
      const { documentId, content } = body;
      
      if (!documentId || !content) {
        return this.createCorsResponse(
          { success: false, error: 'Missing required fields' },
          400
        );
      }
      
      // Simulate analysis processing
      const analysis: DocumentAnalysis = {
        id: `analysis-${this.generateId()}`,
        documentId,
        status: 'completed',
        createdAt: new Date().toISOString(),
        metrics: {
          wordCount: content.split(/\s+/).length,
          sentenceCount: content.split(/[.!?]+/).length - 1,
          readingTime: Math.ceil(content.split(/\s+/).length / 200)
        },
        sentiment: {
          score: 0.8,
          label: 'positive'
        },
        entities: [
          { type: 'PERSON', text: 'John Doe', count: 3 },
          { type: 'ORGANIZATION', text: 'Example Corp', count: 2 }
        ],
        topics: ['technology', 'politics'],
        summary: 'This is a mock summary of the analyzed document.'
      };
      
      return this.createCorsResponse({
        success: true,
        analysis
      });
      
    } catch (error) {
      return this.createCorsResponse(
        {
          success: false,
          error: 'Failed to analyze document',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        500
      );
    }
  }
  
  // Get analysis by ID
  static async getAnalysis(_request: Request, _env: Env, analysisId: string): Promise<Response> {
    try {
      if (!analysisId) {
        return this.createCorsResponse(
          { success: false, error: 'Analysis ID is required' },
          400
        );
      }
      
      // Simulate retrieving analysis
      const analysis: DocumentAnalysis = {
        id: analysisId,
        documentId: `doc-${this.generateId()}`,
        status: 'completed',
        createdAt: new Date().toISOString(),
        metrics: {
          wordCount: 250,
          sentenceCount: 15,
          readingTime: 2
        },
        sentiment: {
          score: 0.8,
          label: 'positive'
        },
        entities: [
          { type: 'PERSON', text: 'John Doe', count: 3 },
          { type: 'ORGANIZATION', text: 'Example Corp', count: 2 }
        ],
        topics: ['technology', 'politics'],
        summary: 'This is a mock analysis result.'
      };
      
      return this.createCorsResponse({
        success: true,
        analysis
      });
      
    } catch (error) {
      return this.createCorsResponse(
        {
          success: false,
          error: 'Failed to retrieve analysis',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        500
      );
    }
  }

  // Create a consistent CORS response
  private static createCorsResponse(
    body: any,
    status: number = 200,
    headers: Record<string, string> = {}
  ): Response {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
      ...headers
    };

    return new Response(JSON.stringify(body), {
      status,
      headers: corsHeaders
    });
  }

  constructor() {
    // Initialize any required services here
  }

  /**
   * Initialize the API services
   */
  static async initialize(env: Env) {
    if (!this.websiteAnalysisAPI) {
      this.websiteAnalysisAPI = new WebsiteAnalysisAPI(env);
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  static async handleRequest(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
    
    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Initialize services
    await this.initialize(env);
    
    // Route website analysis endpoints to the WebsiteAnalysisAPI
    if (path.startsWith('/api/analyze/') || path === '/api/extract/data') {
      try {
        return await this.websiteAnalysisAPI.handleRequest(request);
      } catch (error: unknown) {
        console.error('Error in WebsiteAnalysisAPI:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Internal Server Error', 
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          }), 
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        );
      }
    }
    
    try {
      // Route handling
      if (path === "/" && method === "GET") {
        return this.handleRoot(request, env);
      }
      
      if (path.startsWith("/api/")) {
        if (path.startsWith("/api/documents")) {
          return this.handleDocumentRoutes(request, env, path);
        }
        
        if (path.startsWith("/api/search")) {
          return this.handleSearchRoutes(request, env, path);
        }
        
        if (path.startsWith("/api/analyze")) {
          return this.handleAnalysisRoutes(request, env, path);
        }
        
        if (path.startsWith("/api/rag")) {
          return this.handleRagRoutes(request, env, path);
        }
        
        if (path === "/api/health") {
          return this.handleHealthCheck(request, env);
        }
      }
      
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ 
        error: "Internal Server Error",
        message: error.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
  
  static async handleRoot(_request: Request, _env: Env): Promise<Response> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>OpenDiscourse API</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>OpenDiscourse API</h1>
        <p>Political Document Analysis Platform</p>
        <h2>Available Endpoints</h2>
        <ul>
            <li>GET /api/health - System health check</li>
            <li>POST /api/documents - Upload document</li>
            <li>GET /api/documents - List documents</li>
            <li>GET /api/documents/{id} - Get document</li>
            <li>DELETE /api/documents/{id} - Delete document</li>
            <li>GET /api/search?q={query} - Full-text search</li>
            <li>GET /api/search/semantic?q={query} - Semantic search</li>
            <li>POST /api/analyze - Analyze document</li>
            <li>GET /api/analyze/{id} - Get analysis results</li>
            <li>POST /api/rag/query - Ask questions about documents</li>
            <li>POST /api/rag/compare - Compare multiple documents</li>
        </ul>
        <p>Documentation: <a href="https://github.com/your-org/opendiscourse">GitHub Repository</a></p>
    </div>
</body>
</html>
    `;
    
    return new Response(html, {
      headers: { "Content-Type": "text/html" }
    });
  }
  
  static async handleDocumentRoutes(request: Request, env: Env, _path: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    const method = request.method;
    const url = new URL(request.url);
    const documentId = url.pathname.split('/').pop() || '';
    
    try {
      switch (method) {
        case 'POST':
          return await this.uploadDocument(request, env);
        case 'GET':
          if (documentId) {
            return await this.getDocument(request, env, documentId);
          } else {
            return await this.listDocuments(request, env);
          }
        case 'DELETE':
          if (documentId) {
            return await this.deleteDocument(request, env, documentId);
          }
          break;
        case 'OPTIONS':
          return new Response(null, { headers: corsHeaders });
      }
      
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
  
  static async deleteDocument(_request: Request, _env: Env, _documentId: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Document deleted successfully'
    }), {
      headers: corsHeaders
    });
  }
  
  static async getDocument(_request: Request, _env: Env, documentId: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    return new Response(JSON.stringify({
      success: true,
      document: {
        id: documentId,
        title: 'Sample Document',
        content: 'This is a sample document.'
      }
    }), {
      headers: corsHeaders
    });
  }
  
  static async listDocuments(_request: Request, _env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    return new Response(JSON.stringify({
      success: true,
      documents: [
        {
          id: 'doc-1',
          title: 'Document 1',
          content: 'This is document 1.'
        },
        {
          id: 'doc-2',
          title: 'Document 2',
          content: 'This is document 2.'
        }
      ]
    }), {
      headers: corsHeaders
    });
  }
  
  static async uploadDocument(_request: Request, _env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Document uploaded successfully'
    }), {
      headers: corsHeaders
    });
  }
  
  // Search service implementation
  static getSearchService(_env: Env): {
    search: (query: string) => Promise<{ results: any[] }>;
    semanticSearch: (query: string) => Promise<{ results: any[] }>;
  } {
    return {
      search: async (_query: string) => ({
        results: [
          { id: 'doc-1', title: 'Document 1', snippet: 'Sample document content' },
          { id: 'doc-2', title: 'Document 2', snippet: 'Another sample document' }
        ]
      }),
      semanticSearch: async (_query: string) => ({
        results: [
          { id: 'doc-1', title: 'Document 1', score: 0.95 },
          { id: 'doc-2', title: 'Document 2', score: 0.85 }
        ]
      })
    };
  }
  
  // Health check handler
  static async handleHealthCheck(_request: Request, _env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    return new Response(JSON.stringify({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    }), { 
      headers: corsHeaders 
    });
  }
  
  // Question answering
  static async askQuestion(_request: Request, _env: Env): Promise<Response> {
    const question = "What is the main topic of the document?";
    const answer = "The main topic of the document is politics.";

    return this.createCorsResponse({
      success: true,
      question,
      answer
    });
  }
  
  // Document comparison
  static async compareDocuments(_request: Request, _env: Env): Promise<Response> {
    const documentIds = ["doc-1", "doc-2"];
    const comparison = {
      document_ids: documentIds,
      similarity_score: 0.8,
      key_differences: [
        "Different approaches to economic policy",
        "Varied perspectives on healthcare reform"
      ],
      common_themes: ["Economic policy", "Healthcare reform"],
      summary: "The documents share several common themes but differ in their approach to economic and healthcare policies.",
      created_at: new Date().toISOString()
    };

    return this.createCorsResponse({
      success: true,
      comparison
    });
  }
}
