// Main API service for OpenDiscourse

import { OpenAI } from "langchain/llms/openai";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { loadQAStuffChain } from "langchain/chains";

// Coordinates all services and handles API requests

// Adjust import paths to be relative to the current file location
import { DocumentService } from "../documents/document_processor.js";
import { VectorService } from "../vector/vector_service.js";
import { RagService } from "../rag/rag_service.js";
import { SearchService } from "../search/search_service.js";
import { AnalysisService } from "../analysis/analysis_service.js";

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  DOCUMENTS: R2Bucket;
  VECTOR_INDEX: Vectorize;
}

export class OpenDiscourseAPI {
  private static llm: OpenAI;
  private static vectorStore: HNSWLib;

  constructor() {
    OpenDiscourseAPI.llm = new OpenAI({ temperature: 0.7 });
  }

  static async handleRequest(request: Request, env: Env): Promise<Response> {
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
  
  static async handleRoot(request: Request, env: Env): Promise<Response> {
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
  
  static async handleDocumentRoutes(request: Request, env: Env, path: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    const method = request.method;
    
    if (path === "/api/documents" && method === "POST") {
      return this.uploadDocument(request, env);
    }
    
    if (path === "/api/documents" && method === "GET") {
      return this.listDocuments(request, env);
    }
    
    const documentIdMatch = path.match(/^\/api\/documents\/(.+)$/);
    if (documentIdMatch) {
      const documentId = documentIdMatch[1];
      
      if (method === "GET") {
        return this.getDocument(request, env, documentId);
      }
      
      if (method === "DELETE") {
        return this.deleteDocument(request, env, documentId);
      }
    }
    
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: corsHeaders
    });
  }
  
  static async handleSearchRoutes(request: Request, env: Env, path: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    const method = request.method;
    const url = new URL(request.url);
    
    if (path === "/api/search" && method === "GET") {
      const query = url.searchParams.get("q") || "";
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const results = await SearchService.fullTextSearch(query, limit, env);
      return new Response(JSON.stringify({
        success: true,
        query: query,
        results: results,
        count: results.length
      }), {
        headers: corsHeaders
      });
    }
    
    if (path === "/api/search/semantic" && method === "GET") {
      const query = url.searchParams.get("q") || "";
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const results = await SearchService.semanticSearch(query, limit, env);
      return new Response(JSON.stringify({
        success: true,
        query: query,
        results: results,
        count: results.length,
        method: "semantic"
      }), {
        headers: corsHeaders
      });
    }
    
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: corsHeaders
    });
  }
  
  static async handleAnalysisRoutes(request: Request, env: Env, path: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    const method = request.method;
    
    if (path === "/api/analyze" && method === "POST") {
      return this.analyzeDocument(request, env);
    }
    
    const analysisIdMatch = path.match(/^\/api\/analyze\/(.+)$/);
    if (analysisIdMatch && method === "GET") {
      const documentId = analysisIdMatch[1];
      return this.getAnalysis(request, env, documentId);
    }
    
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: corsHeaders
    });
  }
  
  static async handleRagRoutes(request: Request, env: Env, path: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    const method = request.method;
    
    if (path === "/api/rag/query" && method === "POST") {
      return this.askQuestion(request, env);
    }
    
    if (path === "/api/rag/compare" && method === "POST") {
      return this.compareDocuments(request, env);
    }
    
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: corsHeaders
    });
  }
  
  static async handleHealthCheck(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        api: "operational"
      }
    };
    
    return new Response(JSON.stringify(healthStatus), {
      headers: corsHeaders
    });
  }
  
  // Document management methods
  static async uploadDocument(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    // In a real implementation, we would process multipart form data
    // For now, we'll simulate document upload
    
    const documentId = this.generateId();
    const timestamp = new Date().toISOString();
    
    const document = {
      id: documentId,
      title: "Sample Political Document",
      author: "Sample Author",
      date: timestamp,
      content: "This is a sample political document for demonstration purposes.",
      summary: "A sample document used for testing the OpenDiscourse platform.",
      word_count: 15,
      created_at: timestamp,
      updated_at: timestamp
    };
    
    return new Response(JSON.stringify({
      success: true,
      document: document
    }), {
      headers: corsHeaders
    });
  }
  
  static async listDocuments(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    // Simulate document listing
    const documents = [
      {
        id: "sample-doc-1",
        title: "Sample Political Document",
        author: "Sample Author",
        date: new Date().toISOString(),
        summary: "A sample document used for testing the OpenDiscourse platform.",
        word_count: 15,
        created_at: new Date().toISOString()
      }
    ];
    
    return new Response(JSON.stringify({
      success: true,
      documents: documents
    }), {
      headers: corsHeaders
    });
  }
  
  static async getDocument(request: Request, env: Env, documentId: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    // Simulate document retrieval
    const document = {
      id: documentId,
      title: "Sample Political Document",
      author: "Sample Author",
      date: new Date().toISOString(),
      content: "This is a sample political document for demonstration purposes.",
      summary: "A sample document used for testing the OpenDiscourse platform.",
      word_count: 15,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({
      success: true,
      document: document
    }), {
      headers: corsHeaders
    });
  }
  
  static async deleteDocument(request: Request, env: Env, documentId: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    // Simulate document deletion
    return new Response(JSON.stringify({
      success: true,
      message: `Document ${documentId} deleted`
    }), {
      headers: corsHeaders
    });
  }
  
  // Analysis methods
  static async analyzeDocument(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    // Parse request body
    const body = await request.json() as { document_id: string };
    const documentId = body.document_id;
    
    if (!documentId) {
      return new Response(JSON.stringify({
        success: false,
        error: "document_id is required"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Simulate document analysis
    const analysis = {
      document_id: documentId,
      sentiment: {
        polarity: 0.1,
        subjectivity: 0.5
      },
      entities: [
        { entity: "Government", type: "ORGANIZATION", relevance: 0.9 },
        { entity: "Policy", type: "CONCEPT", relevance: 0.8 }
      ],
      topics: [
        { topic: "Politics", confidence: 0.95 },
        { topic: "Governance", confidence: 0.85 }
      ],
      keyphrases: [
        "political document",
        "government policy"
      ],
      summary: "This document discusses government policies and political matters.",
      created_at: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({
      success: true,
      analysis: analysis
    }), {
      headers: corsHeaders
    });
  }
  
  static async getAnalysis(request: Request, env: Env, documentId: string): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    // Simulate analysis retrieval
    const analysis = {
      document_id: documentId,
      sentiment: {
        polarity: 0.1,
        subjectivity: 0.5
      },
      entities: [
        { entity: "Government", type: "ORGANIZATION", relevance: 0.9 },
        { entity: "Policy", type: "CONCEPT", relevance: 0.8 }
      ],
      topics: [
        { topic: "Politics", confidence: 0.95 },
        { topic: "Governance", confidence: 0.85 }
      ],
      created_at: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({
      success: true,
      analysis: analysis
    }), {
      headers: corsHeaders
    });
  }
  
  // RAG methods
  static async askQuestion(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    // Parse request body
    const body = await request.json() as { question: string, document_ids?: string[] };
    const question = body.question;
    
    if (!question) {
      return new Response(JSON.stringify({
        success: false,
        error: "question is required"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Simulate RAG response
    const documentContent = "This is a sample political document for demonstration purposes.";
    const chain = loadQAStuffChain(OpenDiscourseAPI.llm);
    const answer = await chain.call({
      question: question,
      context: documentContent,
    });

    const response = {
      question: question,
      answer: answer['text'],
      confidence: 0.95,
      citations: [
        {
          document_id: "sample-doc-1",
          title: "Sample Political Document",
          excerpt: "Relevant excerpt from the document that supports the answer..."
        }
      ],
      created_at: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      success: true,
      response: response
    }), {
      headers: corsHeaders
    });
  }
  
  static async compareDocuments(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    
    // Parse request body
    const body = await request.json() as { document_ids: string[] };
    const documentIds = body.document_ids;
    
    if (!documentIds || documentIds.length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: "At least 2 document_ids are required for comparison"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Simulate document comparison
    const comparison = {
      document_ids: documentIds,
      similarity_score: 0.75,
      key_differences: [
        "Different approaches to economic policy",
        "Varied perspectives on healthcare reform"
      ],
      common_themes: [
        "Focus on infrastructure development",
        "Emphasis on national security"
      ],
      summary: "The documents share several common themes but differ in their approach to economic and healthcare policies.",
      created_at: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({
      success: true,
      comparison: comparison
    }), {
      headers: corsHeaders
    });
  }
  
  // Utility methods
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
