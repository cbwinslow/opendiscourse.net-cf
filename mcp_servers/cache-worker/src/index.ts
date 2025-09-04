/**
 * Cache/Queue MCP Server for OpenDiscourse.net
 * Handles caching, queuing, and message processing
 * Accessible at: cache.opendiscourse.net
 */

import { Ai } from "@cloudflare/ai";
import { D1Database, Queue, KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  AI: Ai;
  DB: D1Database;
  CACHE: KVNamespace;
  ANALYTICS_QUEUE: Queue;
  NOTIFICATION_QUEUE: Queue;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "cache-mcp" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cache operations
    if (url.pathname === "/cache" && request.method === "POST") {
      return await handleCacheSet(request, env);
    }

    if (url.pathname.startsWith("/cache/") && request.method === "GET") {
      return await handleCacheGet(request, env);
    }

    if (url.pathname.startsWith("/cache/") && request.method === "DELETE") {
      return await handleCacheDelete(request, env);
    }

    // Queue operations
    if (url.pathname === "/queue/analytics" && request.method === "POST") {
      return await handleQueueAnalytics(request, env);
    }

    if (url.pathname === "/queue/notification" && request.method === "POST") {
      return await handleQueueNotification(request, env);
    }

    // Batch operations
    if (url.pathname === "/batch" && request.method === "POST") {
      return await handleBatchOperations(request, env);
    }

    // Cache statistics
    if (url.pathname === "/stats" && request.method === "GET") {
      return await handleCacheStats(request, env);
    }

    // Political data caching
    if (url.pathname === "/political" && request.method === "POST") {
      return await handlePoliticalCache(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },

  // Queue message handlers
  async queue(batch: any, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processQueueMessage(message, env);
      } catch (error) {
        console.error("Queue processing error:", error);
      }
    }
  },
};

async function handleCacheSet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { key, value, ttl = 3600 } = await request.json();

    if (!key || value === undefined) {
      return new Response(JSON.stringify({ error: "Key and value required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cacheKey = `cache_${key}`;
    const cacheData = {
      value,
      timestamp: new Date().toISOString(),
      ttl,
    };

    await env.CACHE.put(cacheKey, JSON.stringify(cacheData), {
      expirationTtl: ttl,
    });

    // Store cache metadata in D1
    await env.DB.prepare(
      `INSERT OR REPLACE INTO cache_metadata (key, ttl, created_at, expires_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(
        cacheKey,
        ttl,
        new Date().toISOString(),
        new Date(Date.now() + ttl * 1000).toISOString()
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        key,
        ttl,
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
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

async function handleCacheGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const key = request.url.split("/cache/")[1];
    const cacheKey = `cache_${key}`;

    const cached = await env.CACHE.get(cacheKey);
    if (!cached) {
      return new Response(JSON.stringify({ error: "Cache miss" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cacheData = JSON.parse(cached);

    return new Response(
      JSON.stringify({
        key,
        value: cacheData.value,
        cached_at: cacheData.timestamp,
        ttl_remaining: Math.max(0, cacheData.ttl - Math.floor((Date.now() - new Date(cacheData.timestamp).getTime()) / 1000)),
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

async function handleCacheDelete(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const key = request.url.split("/cache/")[1];
    const cacheKey = `cache_${key}`;

    await env.CACHE.delete(cacheKey);

    // Remove metadata
    await env.DB.prepare("DELETE FROM cache_metadata WHERE key = ?")
      .bind(cacheKey)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        key,
        deleted: true,
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

async function handleQueueAnalytics(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { event_type, data, priority = "normal" } = await request.json();

    const message = {
      id: `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "analytics",
      event_type,
      data,
      priority,
      timestamp: new Date().toISOString(),
    };

    await env.ANALYTICS_QUEUE.send(message);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: message.id,
        queued: true,
        timestamp: message.timestamp,
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

async function handleQueueNotification(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { recipient, message, type = "info", channels = ["email"] } = await request.json();

    const notificationMessage = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "notification",
      recipient,
      message,
      notification_type: type,
      channels,
      timestamp: new Date().toISOString(),
    };

    await env.NOTIFICATION_QUEUE.send(notificationMessage);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: notificationMessage.id,
        queued: true,
        timestamp: notificationMessage.timestamp,
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

async function handleBatchOperations(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { operations } = await request.json();

    if (!Array.isArray(operations)) {
      return new Response(JSON.stringify({ error: "Operations must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const operation of operations) {
      try {
        let result;

        switch (operation.type) {
          case "cache_set":
            result = await handleCacheSet(
              new Request("http://localhost/cache", {
                method: "POST",
                body: JSON.stringify(operation.data),
              }),
              env
            );
            break;

          case "cache_get":
            result = await handleCacheGet(
              new Request(`http://localhost/cache/${operation.key}`),
              env
            );
            break;

          case "cache_delete":
            result = await handleCacheDelete(
              new Request(`http://localhost/cache/${operation.key}`, {
                method: "DELETE",
              }),
              env
            );
            break;

          default:
            result = new Response(JSON.stringify({ error: "Unknown operation type" }), {
              status: 400,
            });
        }

        results.push({
          operation: operation.type,
          success: result.status < 400,
          status: result.status,
          data: result.status < 400 ? await result.json() : null,
        });
      } catch (error) {
        results.push({
          operation: operation.type,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        batch_size: operations.length,
        results,
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

async function handleCacheStats(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Get cache metadata stats
    const stats = await env.DB.prepare(
      `SELECT
        COUNT(*) as total_entries,
        AVG(ttl) as avg_ttl,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry
       FROM cache_metadata`
    ).first();

    return new Response(
      JSON.stringify({
        cache_stats: stats,
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

async function handlePoliticalCache(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { legislation_id, data, ttl = 86400 } = await request.json();

    const cacheKey = `political_${legislation_id}`;

    // Cache political data with longer TTL
    await env.CACHE.put(cacheKey, JSON.stringify({
      data,
      cached_at: new Date().toISOString(),
      ttl,
    }), {
      expirationTtl: ttl,
    });

    // Queue for analytics
    await env.ANALYTICS_QUEUE.send({
      type: "political_cache",
      legislation_id,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        legislation_id,
        cached: true,
        ttl,
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
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

async function processQueueMessage(message: any, env: Env): Promise<void> {
  switch (message.type) {
    case "analytics":
      // Process analytics data
      await env.DB.prepare(
        `INSERT INTO analytics_events (id, event_type, data, processed_at)
         VALUES (?, ?, ?, ?)`
      )
        .bind(
          message.id,
          message.event_type,
          JSON.stringify(message.data),
          new Date().toISOString()
        )
        .run();
      break;

    case "notification":
      // Process notification
      await env.DB.prepare(
        `INSERT INTO notifications (id, recipient, message, type, channels, sent_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          message.id,
          message.recipient,
          message.message,
          message.notification_type,
          JSON.stringify(message.channels),
          new Date().toISOString()
        )
        .run();
      break;

    case "political_cache":
      // Log political data access
      await env.DB.prepare(
        `INSERT INTO political_access_log (legislation_id, accessed_at)
         VALUES (?, ?)`
      )
        .bind(message.legislation_id, new Date().toISOString())
        .run();
      break;
  }
}
