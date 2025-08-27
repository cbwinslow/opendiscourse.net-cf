// AutoRAG API Service
// Provides endpoints for semantic search and RAG operations

import { AutoRAGService } from '../../services/rag/auto_rag_service';

interface RAGQuery {
  query: string;
  maxContextChunks?: number;
}

interface SearchRequest {
  query: string;
  topK?: number;
  threshold?: number;
}

export class AutoRAGAPI {
  static async handleRequest(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // Initialize AutoRAG service
    // We'll need to import config - in a real implementation this would be passed in
    const config = {
      autorag: {
        embeddingModel: "@cf/baai/bge-large-en-v1.5",
        embeddingDimension: 1024,
        vectorSimilarityThreshold: 0.7
      }
    };
    
    const autoRAGService = new AutoRAGService(env, config);
    
    try {
      // Handle different API endpoints
      if (path === '/api/rag/query' && method === 'POST') {
        return await this.handleRAGQuery(request, autoRAGService);
      } else if (path === '/api/rag/search' && method === 'POST') {
        return await this.handleSemanticSearch(request, autoRAGService);
      } else if (path === '/api/rag/context' && method === 'POST') {
        return await this.handleContextAssembly(request, autoRAGService);
      } else {
        return new Response(JSON.stringify({ 
          error: 'Not Found', 
          message: 'Endpoint not found' 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error handling AutoRAG API request:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  static async handleRAGQuery(request: Request, autoRAGService: AutoRAGService): Promise<Response> {
    try {
      const body = await request.json() as RAGQuery;
      
      if (!body.query) {
        return new Response(JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Query parameter is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Assemble context for the query
      const maxChunks = body.maxContextChunks || 10;
      const context = await autoRAGService.assembleContext(body.query, maxChunks);
      
      // In a real implementation, we would use this context with an LLM to generate a response
      // For now, we'll return the context
      
      return new Response(JSON.stringify({ 
        query: body.query,
        context: context,
        message: "This is a simulated RAG response. In a real implementation, this context would be used with an LLM to generate a response."
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error handling RAG query:', error);
      return new Response(JSON.stringify({ 
        error: 'Bad Request', 
        message: 'Invalid request body' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  static async handleSemanticSearch(request: Request, autoRAGService: AutoRAGService): Promise<Response> {
    try {
      const body = await request.json() as SearchRequest;
      
      if (!body.query) {
        return new Response(JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Query parameter is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Perform semantic search
      const results = await autoRAGService.semanticSearch({
        text: body.query,
        topK: body.topK,
        threshold: body.threshold
      });
      
      return new Response(JSON.stringify({ 
        query: body.query,
        results: results
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error handling semantic search:', error);
      return new Response(JSON.stringify({ 
        error: 'Bad Request', 
        message: 'Invalid request body' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  static async handleContextAssembly(request: Request, autoRAGService: AutoRAGService): Promise<Response> {
    try {
      const body = await request.json() as RAGQuery;
      
      if (!body.query) {
        return new Response(JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Query parameter is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Assemble context for the query
      const maxChunks = body.maxContextChunks || 10;
      const context = await autoRAGService.assembleContext(body.query, maxChunks);
      
      return new Response(JSON.stringify({ 
        query: body.query,
        context: context
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error handling context assembly:', error);
      return new Response(JSON.stringify({ 
        error: 'Bad Request', 
        message: 'Invalid request body' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}