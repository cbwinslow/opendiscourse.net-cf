// OpenDiscourse: Political Document Analyzer
// A comprehensive system using Cloudflare's full suite of services

interface Env {
  DB: D1Database;           // Structured data storage
  CACHE: KVNamespace;       // Caching layer
  DOCUMENTS: R2Bucket;      // Document storage
  VECTOR_INDEX: Vectorize;  // Vector database for embeddings
}

// Import our API service
import { OpenDiscourseAPI } from "../services/api/api_service";
// Import webhook receiver
import { WebhookReceiver } from "../ingestion/tools/webhook_receiver";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle webhook endpoints
    if (path.startsWith("/webhook/")) {
      return WebhookReceiver.handleWebhook(request, env);
    }
    
    // Pass the request to our API service
    return OpenDiscourseAPI.handleRequest(request, env);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`Cron job executed at ${timestamp}`);
    
    // Perform maintenance tasks
    // In a real implementation, we would do actual maintenance here
  }
};
