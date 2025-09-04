/**
 * Database MCP Server for OpenDiscourse.net
 * Handles database operations, queries, and data management
 * Accessible at: db.opendiscourse.net
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
      return new Response(JSON.stringify({ status: "ok", service: "db-mcp" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Execute SQL query
    if (url.pathname === "/query" && request.method === "POST") {
      return await handleSQLQuery(request, env);
    }

    // Get table schema
    if (url.pathname === "/schema" && request.method === "GET") {
      return await handleGetSchema(request, env);
    }

    // Insert data
    if (url.pathname === "/insert" && request.method === "POST") {
      return await handleInsertData(request, env);
    }

    // Update data
    if (url.pathname === "/update" && request.method === "POST") {
      return await handleUpdateData(request, env);
    }

    // Delete data
    if (url.pathname === "/delete" && request.method === "POST") {
      return await handleDeleteData(request, env);
    }

    // Search data
    if (url.pathname === "/search" && request.method === "POST") {
      return await handleSearchData(request, env);
    }

    // Backup database
    if (url.pathname === "/backup" && request.method === "POST") {
      return await handleBackupDatabase(request, env);
    }

    // Political data analysis
    if (url.pathname === "/political" && request.method === "POST") {
      return await handlePoliticalDataAnalysis(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleSQLQuery(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { query, params = [] } = await request.json();

    // Validate query for safety
    if (!isSafeQuery(query)) {
      return new Response(JSON.stringify({ error: "Unsafe query detected" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stmt = env.DB.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    return new Response(
      JSON.stringify({
        success: true,
        results: result.results,
        meta: result.meta,
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

async function handleGetSchema(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const table = url.searchParams.get("table");

    let query;
    if (table) {
      query = `PRAGMA table_info(${table})`;
    } else {
      query = "SELECT name FROM sqlite_master WHERE type='table'";
    }

    const result = await env.DB.prepare(query).all();

    return new Response(
      JSON.stringify({
        schema: result.results,
        table: table || "all_tables",
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

async function handleInsertData(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { table, data } = await request.json();

    if (!table || !data) {
      return new Response(JSON.stringify({ error: "Table and data required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const columns = Object.keys(data).join(", ");
    const placeholders = Object.keys(data).map(() => "?").join(", ");
    const values = Object.values(data);

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await env.DB.prepare(query).bind(...values).run();

    return new Response(
      JSON.stringify({
        success: true,
        inserted_id: result.meta.last_row_id,
        changes: result.meta.changes,
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

async function handleUpdateData(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { table, data, where } = await request.json();

    if (!table || !data || !where) {
      return new Response(JSON.stringify({ error: "Table, data, and where clause required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const setClause = Object.keys(data).map(key => `${key} = ?`).join(", ");
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(" AND ");
    const values = [...Object.values(data), ...Object.values(where)];

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await env.DB.prepare(query).bind(...values).run();

    return new Response(
      JSON.stringify({
        success: true,
        changes: result.meta.changes,
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

async function handleDeleteData(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { table, where } = await request.json();

    if (!table || !where) {
      return new Response(JSON.stringify({ error: "Table and where clause required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(" AND ");
    const values = Object.values(where);

    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await env.DB.prepare(query).bind(...values).run();

    return new Response(
      JSON.stringify({
        success: true,
        changes: result.meta.changes,
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

async function handleSearchData(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { table, search_term, columns = ["*"], limit = 50 } = await request.json();

    if (!table || !search_term) {
      return new Response(JSON.stringify({ error: "Table and search term required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get table schema to find text columns
    const schemaResult = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    const textColumns = schemaResult.results
      .filter((col: any) => col.type.toLowerCase().includes("text") || col.type.toLowerCase().includes("varchar"))
      .map((col: any) => col.name);

    if (textColumns.length === 0) {
      return new Response(JSON.stringify({ error: "No text columns found in table" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const searchConditions = textColumns.map(col => `${col} LIKE ?`).join(" OR ");
    const searchValues = textColumns.map(() => `%${search_term}%`);

    const query = `SELECT ${columns.join(", ")} FROM ${table} WHERE ${searchConditions} LIMIT ${limit}`;
    const result = await env.DB.prepare(query).bind(...searchValues).all();

    return new Response(
      JSON.stringify({
        results: result.results,
        search_term,
        table,
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

async function handleBackupDatabase(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Get all tables
    const tablesResult = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tables = tablesResult.results.map((row: any) => row.name);

    const backup: any = {
      timestamp: new Date().toISOString(),
      tables: {},
    };

    // Export each table
    for (const table of tables) {
      const data = await env.DB.prepare(`SELECT * FROM ${table}`).all();
      backup.tables[table] = data.results;
    }

    // Store backup in KV for persistence
    const backupKey = `backup_${Date.now()}`;
    await env.CACHE.put(backupKey, JSON.stringify(backup));

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: backupKey,
        tables_count: tables.length,
        timestamp: backup.timestamp,
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

async function handlePoliticalDataAnalysis(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { query_type, filters = {} } = await request.json();

    let query;
    let params = [];

    switch (query_type) {
      case "legislation_by_topic":
        query = `
          SELECT l.*, p.name as sponsor_name, p.party, p.state
          FROM legislation l
          LEFT JOIN persons p ON l.sponsor_id = p.id
          WHERE l.topic LIKE ?
          ORDER BY l.introduced_date DESC
          LIMIT 100
        `;
        params = [`%${filters.topic || ""}%`];
        break;

      case "voting_patterns":
        query = `
          SELECT v.legislation_id, v.vote, COUNT(*) as count
          FROM votes v
          JOIN persons p ON v.person_id = p.id
          WHERE p.party = ?
          GROUP BY v.legislation_id, v.vote
          ORDER BY v.legislation_id
        `;
        params = [filters.party || ""];
        break;

      case "committee_activity":
        query = `
          SELECT c.name, COUNT(l.id) as legislation_count,
                 AVG(l.status_progress) as avg_progress
          FROM committees c
          LEFT JOIN legislation l ON c.id = l.committee_id
          GROUP BY c.id, c.name
          ORDER BY legislation_count DESC
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: "Invalid query type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }

    const result = await env.DB.prepare(query).bind(...params).all();

    return new Response(
      JSON.stringify({
        query_type,
        results: result.results,
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

function isSafeQuery(query: string): boolean {
  const unsafePatterns = [
    /drop\s+table/i,
    /drop\s+database/i,
    /truncate\s+table/i,
    /alter\s+table/i,
    /create\s+table/i,
    /delete\s+from/i,
    /update\s+.*set/i,
    /insert\s+into/i,
  ];

  return !unsafePatterns.some(pattern => pattern.test(query));
}
