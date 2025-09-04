/**
 * Multi-tenant MCP Server for OpenDiscourse.net
 * Handles multi-tenancy, user management, and tenant isolation
 * Accessible at: multi.opendiscourse.net
 */

import { Ai } from "@cloudflare/ai";
import { D1Database, KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  AI: Ai;
  DB: D1Database;
  CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "multi-mcp" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Tenant management
    if (url.pathname === "/tenants" && request.method === "POST") {
      return await handleCreateTenant(request, env);
    }

    if (url.pathname.startsWith("/tenants/") && request.method === "GET") {
      return await handleGetTenant(request, env);
    }

    if (url.pathname.startsWith("/tenants/") && request.method === "PUT") {
      return await handleUpdateTenant(request, env);
    }

    if (url.pathname.startsWith("/tenants/") && request.method === "DELETE") {
      return await handleDeleteTenant(request, env);
    }

    // User management
    if (url.pathname === "/users" && request.method === "POST") {
      return await handleCreateUser(request, env);
    }

    if (url.pathname.startsWith("/users/") && request.method === "GET") {
      return await handleGetUser(request, env);
    }

    if (url.pathname.startsWith("/users/") && request.method === "PUT") {
      return await handleUpdateUser(request, env);
    }

    if (url.pathname.startsWith("/users/") && request.method === "DELETE") {
      return await handleDeleteUser(request, env);
    }

    // Tenant-user associations
    if (url.pathname === "/tenant-users" && request.method === "POST") {
      return await handleAddUserToTenant(request, env);
    }

    if (url.pathname.startsWith("/tenant-users/") && request.method === "DELETE") {
      return await handleRemoveUserFromTenant(request, env);
    }

    // Authentication
    if (url.pathname === "/auth/login" && request.method === "POST") {
      return await handleLogin(request, env);
    }

    if (url.pathname === "/auth/logout" && request.method === "POST") {
      return await handleLogout(request, env);
    }

    // Permissions
    if (url.pathname === "/permissions" && request.method === "POST") {
      return await handleSetPermissions(request, env);
    }

    if (url.pathname.startsWith("/permissions/") && request.method === "GET") {
      return await handleGetPermissions(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleCreateTenant(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { name, domain, settings = {} } = await request.json();

    if (!name || !domain) {
      return new Response(JSON.stringify({ error: "Name and domain required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await env.DB.prepare(
      `INSERT INTO tenants (id, name, domain, settings, created_at, active)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        tenantId,
        name,
        domain,
        JSON.stringify(settings),
        new Date().toISOString(),
        true
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantId,
        name,
        domain,
        created_at: new Date().toISOString(),
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

async function handleGetTenant(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const tenantId = request.url.split("/tenants/")[1];

    const result = await env.DB.prepare(
      "SELECT * FROM tenants WHERE id = ? AND active = true"
    )
      .bind(tenantId)
      .first();

    if (!result) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        tenant: {
          id: result.id,
