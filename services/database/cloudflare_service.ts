/**
 * Cloudflare Database Service
 * Replaces Neo4j with D1, KV, Vectorize, and R2
 */

export interface CloudflareEnv {
  DB: D1Database;
  ANALYTICS_DB: D1Database;
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  DOCUMENTS: R2Bucket;
  MODELS: R2Bucket;
  VECTOR_INDEX: VectorizeIndex;
  AI: any;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: any;
}

export class CloudflareDatabaseService {
  private env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
  }

  /**
   * Politicians CRUD operations
   */
  async getPolitician(id: string): Promise<any> {
    const result = await this.env.DB.prepare(
      "SELECT * FROM politicians WHERE id = ?"
    ).bind(id).first();
    
    return result;
  }

  async searchPoliticians(query: string, options: QueryOptions = {}): Promise<any[]> {
    const { limit = 50, offset = 0 } = options;
    
    const result = await this.env.DB.prepare(`
      SELECT * FROM politicians 
      WHERE name LIKE ? OR party LIKE ? OR state LIKE ?
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `).bind(`%${query}%`, `%${query}%`, `%${query}%`, limit, offset).all();
    
    return result.results || [];
  }

  async getPoliticiansByParty(party: string): Promise<any[]> {
    const result = await this.env.DB.prepare(
      "SELECT * FROM politicians WHERE party = ? ORDER BY name ASC"
    ).bind(party).all();
    
    return result.results || [];
  }

  async getPoliticiansByState(state: string): Promise<any[]> {
    const result = await this.env.DB.prepare(
      "SELECT * FROM politicians WHERE state = ? ORDER BY name ASC"
    ).bind(state).all();
    
    return result.results || [];
  }

  /**
   * Legislation CRUD operations
   */
  async getLegislation(id: string): Promise<any> {
    const result = await this.env.DB.prepare(
      "SELECT * FROM legislation WHERE id = ?"
    ).bind(id).first();
    
    return result;
  }

  async searchLegislation(query: string, options: QueryOptions = {}): Promise<any[]> {
    const { limit = 50, offset = 0 } = options;
    
    const result = await this.env.DB.prepare(`
      SELECT * FROM legislation 
      WHERE title LIKE ? OR summary LIKE ?
      ORDER BY introduced_date DESC
      LIMIT ? OFFSET ?
    `).bind(`%${query}%`, `%${query}%`, limit, offset).all();
    
    return result.results || [];
  }

  async getLegislationByCongress(congress: number): Promise<any[]> {
    const result = await this.env.DB.prepare(
      "SELECT * FROM legislation WHERE congress = ? ORDER BY introduced_date DESC"
    ).bind(congress).all();
    
    return result.results || [];
  }

  /**
   * Relationship queries (replacing Neo4j graph queries)
   */
  async getBillSponsors(billId: string): Promise<any[]> {
    const result = await this.env.DB.prepare(`
      SELECT p.*, bs.sponsorship_type, bs.date_signed
      FROM politicians p
      JOIN bill_sponsorship bs ON p.id = bs.politician_id
      WHERE bs.bill_id = ?
      ORDER BY bs.sponsorship_type, p.name
    `).bind(billId).all();
    
    return result.results || [];
  }

  async getPoliticianBills(politicianId: string): Promise<any[]> {
    const result = await this.env.DB.prepare(`
      SELECT l.*, bs.sponsorship_type, bs.date_signed
      FROM legislation l
      JOIN bill_sponsorship bs ON l.id = bs.bill_id
      WHERE bs.politician_id = ?
      ORDER BY l.introduced_date DESC
    `).bind(politicianId).all();
    
    return result.results || [];
  }

  async getCommitteeMembers(committee: string): Promise<any[]> {
    const result = await this.env.DB.prepare(`
      SELECT p.*, cm.role, cm.start_date, cm.end_date
      FROM politicians p
      JOIN committee_memberships cm ON p.id = cm.politician_id
      WHERE cm.committee_name = ?
      ORDER BY cm.role, p.name
    `).bind(committee).all();
    
    return result.results || [];
  }

  async getVotingRecord(politicianId: string, billId?: string): Promise<any[]> {
    let query = `
      SELECT v.*, iv.position, l.title as bill_title
      FROM votes v
      JOIN individual_votes iv ON v.id = iv.vote_id
      LEFT JOIN legislation l ON v.bill_id = l.id
      WHERE iv.politician_id = ?
    `;
    
    const params = [politicianId];
    
    if (billId) {
      query += " AND v.bill_id = ?";
      params.push(billId);
    }
    
    query += " ORDER BY v.action_date DESC";
    
    const result = await this.env.DB.prepare(query).bind(...params).all();
    return result.results || [];
  }

  /**
   * Semantic search using Vectorize
   */
  async semanticSearch(query: string, options: { topK?: number; filter?: any } = {}): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query using Cloudflare AI
      const embedding = await this.generateEmbedding(query);
      
      // Search in Vectorize
      const results = await this.env.VECTOR_INDEX.query(embedding, {
        topK: options.topK || 10,
        filter: options.filter
      });
      
      return results.matches?.map((match: any) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata
      })) || [];
    } catch (error) {
      console.error("Semantic search error:", error);
      return [];
    }
  }

  /**
   * Document storage and retrieval using R2
   */
  async storeDocument(id: string, document: any, type: string = "document"): Promise<void> {
    const key = `${type}/${id}.json`;
    await this.env.DOCUMENTS.put(key, JSON.stringify(document));
  }

  async getDocument(id: string, type: string = "document"): Promise<any> {
    const key = `${type}/${id}.json`;
    const object = await this.env.DOCUMENTS.get(key);
    
    if (!object) return null;
    
    const text = await object.text();
    return JSON.parse(text);
  }

  /**
   * Caching using KV
   */
  async getCached<T>(key: string): Promise<T | null> {
    const value = await this.env.CACHE.get(key);
    return value ? JSON.parse(value) : null;
  }

  async setCached<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttl });
  }

  async deleteCached(key: string): Promise<void> {
    await this.env.CACHE.delete(key);
  }

  /**
   * Analytics operations using separate D1 database
   */
  async logAnalyticsEvent(event: {
    type: string;
    userId?: string;
    metadata?: any;
    timestamp?: string;
  }): Promise<void> {
    await this.env.ANALYTICS_DB.prepare(`
      INSERT INTO analytics_events (id, type, user_id, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      event.type,
      event.userId || null,
      JSON.stringify(event.metadata || {}),
      event.timestamp || new Date().toISOString()
    ).run();
  }

  async getAnalytics(type?: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    let query = "SELECT * FROM analytics_events";
    const params: any[] = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    if (dateRange) {
      conditions.push("timestamp >= ? AND timestamp <= ?");
      params.push(dateRange.start, dateRange.end);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY timestamp DESC LIMIT 1000";

    const result = await this.env.ANALYTICS_DB.prepare(query).bind(...params).all();
    return result.results || [];
  }

  /**
   * Session management using KV
   */
  async createSession(userId: string, data: any): Promise<string> {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      data,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    // Sessions expire after 24 hours
    await this.env.SESSIONS.put(sessionId, JSON.stringify(sessionData), { expirationTtl: 86400 });
    
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any> {
    const sessionData = await this.env.SESSIONS.get(sessionId);
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    // Update last accessed time
    session.lastAccessed = new Date().toISOString();
    await this.env.SESSIONS.put(sessionId, JSON.stringify(session), { expirationTtl: 86400 });
    
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.env.SESSIONS.delete(sessionId);
  }

  /**
   * Utility methods
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: [text]
      });
      
      return response.data[0];
    } catch (error) {
      console.error("Error generating embedding:", error);
      // Return a dummy embedding as fallback
      return Array.from({ length: 768 }, () => Math.random());
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; services: any }> {
    const checks = {
      db: false,
      analytics: false,
      cache: false,
      documents: false,
      vectorIndex: false
    };

    try {
      // Test D1 main database
      await this.env.DB.prepare("SELECT 1").first();
      checks.db = true;
    } catch (error) {
      console.error("D1 health check failed:", error);
    }

    try {
      // Test analytics database
      await this.env.ANALYTICS_DB.prepare("SELECT 1").first();
      checks.analytics = true;
    } catch (error) {
      console.error("Analytics DB health check failed:", error);
    }

    try {
      // Test KV cache
      await this.env.CACHE.get("health-check");
      checks.cache = true;
    } catch (error) {
      console.error("KV cache health check failed:", error);
    }

    try {
      // Test R2 documents
      await this.env.DOCUMENTS.get("health-check");
      checks.documents = true;
    } catch (error) {
      console.error("R2 documents health check failed:", error);
    }

    try {
      // Test Vectorize - basic check
      checks.vectorIndex = !!this.env.VECTOR_INDEX;
    } catch (error) {
      console.error("Vectorize health check failed:", error);
    }

    const allHealthy = Object.values(checks).every(check => check);

    return {
      status: allHealthy ? "healthy" : "degraded",
      services: checks
    };
  }
}

export default CloudflareDatabaseService;