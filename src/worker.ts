/// <reference types="@cloudflare/workers-types" />

import { AIService } from "../services/ai.js";
import { CascadeChatService } from "../services/cascade_chat.js";

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
  VECTOR_INDEX: VectorizeIndex;
  BACKGROUND_QUEUE: Queue;
  AI: any; // Cloudflare AI binding

  // Environment Variables
  NODE_ENV: "development" | "production" | "staging";
  DOMAIN: string;

  // Secrets
  SESSION_SECRET: string;
  ADMIN_API_KEY: string;
}

// Type guard for QueueMessage
function isQueueMessage(data: unknown): data is QueueMessage {
  if (typeof data !== "object" || data === null) return false;

  const msg = data as Record<string, unknown>;
  const type = msg["type"];
  const filename = msg["filename"];
  const contentType = msg["contentType"];

  return (
    typeof type === "string" &&
    typeof filename === "string" &&
    typeof contentType === "string"
  );
}

export const worker = {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Initialize services
    const aiService = new AIService(env);
    const cascadeChatService = new CascadeChatService(env);
    // API Router
    const router: Record<string, (req: Request) => Promise<Response>> = {
      // Health check endpoint
      "/health": async () =>
        new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        }),

      // AI Endpoints
      "/api/ai/chat": async (req) => {
        if (req.method !== "POST")
          return new Response("Method not allowed", { status: 405 });

        try {
          const body = await req.json() as { messages?: any[] };
          const { messages } = body;
          if (!messages) {
            return new Response(JSON.stringify({ error: 'Messages required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const response = await aiService.generateText({
            prompt: messages
              .map((m: any) => `${m.role}: ${m.content}`)
              .join("\n"),
          });

          return new Response(JSON.stringify({ response }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({ error: "Failed to process request" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },

      // Cascade Chat Endpoint
      "/api/cascade/chat": async (req) => {
        if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

        try {
          const body = await req.json() as { message: string; conversationId?: string };
          const { message, conversationId = "default" } = body;

          if (!message) {
            return new Response(JSON.stringify({ error: "Message required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }

          const response = await cascadeChatService.processMessage(conversationId, message);

          return new Response(JSON.stringify(response), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error("Cascade chat error:", error);
          return new Response(JSON.stringify({ error: "Failed to process cascade chat request" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      },
      // Document Management
      "/api/documents": async (req) => {
        switch (req.method) {
          case "GET": {
            // List documents
            const list = await env.DOCUMENTS.list();
            return new Response(JSON.stringify(list.objects), {
              headers: { "Content-Type": "application/json" },
            });
          }

          case "POST": {
            // Upload document
            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file) {
              return new Response("No file provided", { status: 400 });
            }

            await env.DOCUMENTS.put(file.name, file.stream());

            // Store document metadata in D1
            await env.DB.prepare(
              "INSERT INTO documents (id, filename, content_type, status, created_at) VALUES (?, ?, ?, ?, ?)",
            )
              .bind(
                crypto.randomUUID(),
                file.name,
                file.type,
                "processed",
                new Date().toISOString(),
              )
              .run();

            // Queue background processing
            await env.BACKGROUND_QUEUE.send({
              type: "process_document",
              filename: file.name,
              contentType: file.type,
            });

            return new Response(JSON.stringify({ success: true }), {
              status: 201,
              headers: { "Content-Type": "application/json" },
            });
          }

          default: {
            return new Response("Method not allowed", { status: 405 });
          }
        }
      },

      // Vector Search
      "/api/search": async (req) => {
        if (req.method !== "POST") {
          return new Response("Method not allowed", { status: 405 });
        }

        try {
          const query = url.searchParams.get("q") || "";
          if (!query) {
            return new Response("No query provided", { status: 400 });
          }

          // Generate embedding for the query
          const [embedding] = await aiService.generateEmbedding({
            input: query,
          });

          // Search in vector database
          const results = await env.VECTOR_INDEX.query(embedding, { topK: 5 });

          return new Response(JSON.stringify({ results }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: "Search failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    };

    // Handle the request
    const handler =
      router[path] ||
      (() =>
        new Response(JSON.stringify({ error: "Not Found" }), { status: 404 }));
    return handler(request);
  },

  // Queue handler for background tasks
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        // Safely parse the message body
        const body =
          typeof message.body === "string"
            ? JSON.parse(message.body)
            : JSON.parse(new TextDecoder().decode(message.body as ArrayBuffer));

        if (isQueueMessage(body) && body.type === "process_document") {
          await this.processDocument(
            { filename: body.filename, contentType: body.contentType },
            env,
          );
        }

        message.ack();
      } catch (error) {
        console.error("Error processing message:", error);
        if (error instanceof Error) {
          console.error(error.stack);
        }
        message.retry();
      }
    }
  },

  // Background task: Process uploaded document
  async processDocument(
    data: { filename: string; contentType: string },
    env: Env,
  ): Promise<void> {
    const { filename } = data;

    try {
      // Get the document from R2
      const object = await env.DOCUMENTS.get(filename);
      if (!object) {
        throw new Error("Document not found");
      }

      const text = await object.text();

      // Generate embeddings
      const aiService = new AIService(env);
      const embeddings = await aiService.generateEmbedding({
        input: text,
      });

      // Store in vector database
      await env.VECTOR_INDEX.upsert([
        {
          id: filename,
          values: embeddings[0],
          metadata: { filename, contentType: data.contentType },
        },
      ]);

      console.log(`Processed document: ${filename}`);
    } catch (error) {
      console.error(`Error processing document ${filename}:`, error);
      throw error;
    }
  },
};

export default worker;
