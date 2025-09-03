// Import Cloudflare Workers types
/// <reference types="@cloudflare/workers-types" />

// Define environment variables interface
interface Env {
  NODE_ENV?: "development" | "production";
  // Add other environment variables here as needed
}

// Handle incoming requests
export default {
  async fetch(
    request: Request,
    env: Env = { NODE_ENV: "development" },
    ctx: ExecutionContext = {} as ExecutionContext,
  ): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Handle different routes
      if (url.pathname === "/") {
        return handleRoot(env);
      } else if (url.pathname === "/api/health") {
        return handleHealthCheck();
      } else if (url.pathname.startsWith("/api/")) {
        return handleApiRequest(request, env, ctx);
      }

      // Return 404 for unknown routes
      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error("Error processing request:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

// Handle root endpoint
function handleRoot(env: Env): Response {
  return new Response(
    JSON.stringify({
      name: "OpenDiscourse API",
      version: "1.0.0",
      environment: env.NODE_ENV || "development",
      documentation: "https://docs.opendiscourse.net",
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

// Handle health check endpoint
function handleHealthCheck(): Response {
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

// Handle API requests
async function handleApiRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);

  // Example: Handle document search
  if (url.pathname === "/api/documents/search" && request.method === "GET") {
    const query = url.searchParams.get("q") || "";
    // In a real implementation, you would search your database here
    return new Response(
      JSON.stringify({
        query,
        results: [],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // Example: Handle document upload
  if (url.pathname === "/api/documents" && request.method === "POST") {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return new Response("No file provided", { status: 400 });
      }

      // In a real implementation, you would process and store the file here
      return new Response(
        JSON.stringify({
          success: true,
          filename: file.name,
          size: file.size,
          type: file.type,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Error processing file upload:", error);
      return new Response("Error processing file", { status: 500 });
    }
  }

  // Return 404 for unknown API endpoints
  return new Response("Not Found", { status: 404 });
}
