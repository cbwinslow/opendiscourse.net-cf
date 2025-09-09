/// <reference types="@cloudflare/workers-types/2023-07-01" />

import { AIService } from '../services/ai.js';

interface QueueMessage {
  type: string;
  filename: string;
  contentType: string;
}

interface Env {
  // Core Services
  DB: D1Database;
  ANALYTICS_DB: D1Database;
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  DOCUMENTS: R2Bucket;
  MODELS: R2Bucket;
  VECTOR_INDEX: Vectorize;
  AI: Ai;
  BACKGROUND_QUEUE: Queue<QueueMessage>;

  // Environment variables
  NODE_ENV?: string;
  DOMAIN?: string;
  OPENAI_API_KEY?: string;
  GOVINFO_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Initialize AI service
    const aiService = new AIService(env);

    // API Router
    const router: Record<string, (req: Request) => Promise<Response>> = {
      // Health check endpoint
      "/health": async () =>
        new Response(JSON.stringify({ 
          status: "ok", 
          timestamp: new Date().toISOString(),
          service: "opendiscourse-api" 
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }),

      // AI Endpoints
      "/api/ai/chat": async (req) => {
        if (req.method !== "POST")
          return new Response("Method not allowed", { status: 405, headers: corsHeaders });

        try {
          const body = await req.json() as { messages?: any[] };
          const { messages } = body;
          if (!messages) {
            return new Response(JSON.stringify({ error: 'Messages required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const response = await aiService.chat(messages);
          return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('AI Chat error:', error);
          return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      },

      // Document search endpoint
      "/api/search": async (req) => {
        if (req.method !== "POST")
          return new Response("Method not allowed", { status: 405, headers: corsHeaders });

        try {
          const body = await req.json() as { query?: string };
          const { query } = body;
          if (!query) {
            return new Response(JSON.stringify({ error: 'Query required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          // For now, return a simple search response
          const results = [
            { id: 1, title: "Sample Document", content: "This is a sample search result" }
          ];

          return new Response(JSON.stringify({ results, query }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Search error:', error);
          return new Response(JSON.stringify({ error: 'Search failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      },
    };

    // Route the request
    const handler = router[pathname];
    if (handler) {
      return await handler(request);
    }

    // Default 404
    return new Response("Not Found", { 
      status: 404,
      headers: corsHeaders
    });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled event triggered at:', new Date().toISOString());
  }
};