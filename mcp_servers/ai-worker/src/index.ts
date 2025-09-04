/**
 * AI/ML MCP Server for OpenDiscourse.net
 * Provides AI-powered code analysis, documentation generation, and intelligent suggestions
 * Accessible at: ai.opendiscourse.net
 */

import { Ai } from "@cloudflare/ai";
import { D1Database, VectorizeIndex, KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  AI: Ai;
  DB: D1Database;
  VECTOR_INDEX: VectorizeIndex;
  CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "ai-mcp" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Code analysis endpoint
    if (url.pathname === "/analyze" && request.method === "POST") {
      return await handleCodeAnalysis(request, env);
    }

    // Documentation generation
    if (url.pathname === "/docs" && request.method === "POST") {
      return await handleDocGeneration(request, env);
    }

    // Intelligent suggestions
    if (url.pathname === "/suggest" && request.method === "POST") {
      return await handleSuggestions(request, env);
    }

    // Political analysis (specialized for legislature data)
    if (url.pathname === "/political" && request.method === "POST") {
      return await handlePoliticalAnalysis(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleCodeAnalysis(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { code, language } = await request.json();

    const prompt = `Analyze this ${language} code and provide insights:
${code}

Provide:
1. Code quality assessment
2. Potential improvements
3. Security concerns
4. Performance suggestions`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 1000,
    });

    // Store analysis in D1
    await env.DB.prepare(
      "INSERT INTO code_analyses (code_hash, language, analysis, created_at) VALUES (?, ?, ?, ?)"
    )
      .bind(
        await hashCode(code),
        language,
        response.response,
        new Date().toISOString()
      )
      .run();

    return new Response(
      JSON.stringify({
        analysis: response.response,
        language,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleDocGeneration(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { code, type } = await request.json();

    const prompt = `Generate comprehensive documentation for this code:
${code}

Generate ${type} documentation with examples and usage instructions.`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 1500,
    });

    return new Response(
      JSON.stringify({
        documentation: response.response,
        type,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleSuggestions(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { context, type } = await request.json();

    const prompt = `Provide intelligent suggestions for: ${context}
Type: ${type}

Give specific, actionable suggestions.`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 800,
    });

    return new Response(
      JSON.stringify({
        suggestions: response.response,
        context,
        type,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handlePoliticalAnalysis(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { text, analysis_type } = await request.json();

    const prompt = `Analyze this political/legislative text:
${text}

Analysis type: ${analysis_type}

Provide:
1. Key policy implications
2. Stakeholder impacts
3. Potential controversies
4. Legislative context
5. Voting considerations`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 1200,
    });

    // Store in vector index for semantic search
    const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: text,
    });

    await env.VECTOR_INDEX.upsert([
      {
        id: `political_${Date.now()}`,
        values: embedding.data[0],
        metadata: { text, analysis: response.response, type: analysis_type },
      },
    ]);

    return new Response(
      JSON.stringify({
        analysis: response.response,
        analysis_type,
        stored_in_vector: true,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
