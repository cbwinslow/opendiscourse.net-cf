import { D1Database } from "@cloudflare/workers-types";

interface R1DatabaseConfig {
  db: D1Database;
}

export class R1DatabaseClient {
  private db: D1Database;

  constructor(config: R1DatabaseConfig) {
    this.db = config.db;
  }

  // Document Operations
  async createDocument(document: {
    id: string;
    title?: string;
    source: string;
    url?: string;
    content_type: string;
    file_size: number;
    metadata?: Record<string, unknown>;
  }) {
    const {
      id,
      title,
      source,
      url,
      content_type,
      file_size,
      metadata = {},
    } = document;

    await this.db
      .prepare(
        `INSERT INTO documents (id, title, source, url, content_type, file_size, metadata, processed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        title || null,
        source,
        url || null,
        content_type,
        file_size,
        JSON.stringify(metadata),
        false,
      )
      .run();

    return { id };
  }

  async getDocument(id: string) {
    const result = await this.db
      .prepare("SELECT * FROM documents WHERE id = ?")
      .bind(id)
      .first();
    return result || null;
  }

  // Chunk Operations
  async insertChunks(chunks: {
    documentId: string;
    chunks: {
      text: string;
      index: number;
      metadata?: Record<string, unknown>;
    }[];
    embeddings: number[][];
  }) {
    const { documentId, chunks: chunkData, embeddings } = chunks;
    const stmt = this.db.prepare(
      `INSERT INTO document_chunks (document_id, chunk_text, chunk_index, embedding, metadata)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const batch = this.db.batch(
      chunkData.map((chunk, i) =>
        stmt.bind(
          documentId,
          chunk.text,
          chunk.index,
          JSON.stringify(embeddings[i]),
          JSON.stringify(chunk.metadata || {}),
        ),
      ),
    );

    await batch;
  }

  // Search Operations
  async searchChunks(
    queryEmbedding: number[],
    options: { limit?: number; similarityThreshold?: number } = {},
  ) {
    const { limit = 5, similarityThreshold = 0.7 } = options;

    const results = await this.db
      .prepare(
        `SELECT 
           dc.id, 
           dc.document_id as "documentId",
           dc.chunk_text as "chunkText",
           dc.chunk_index as "chunkIndex",
           dc.metadata,
           d.title as "documentTitle",
           d.source,
           d.url,
           1 - (dc.embedding <=> ?) as similarity
         FROM document_chunks dc
         JOIN documents d ON dc.document_id = d.id
         WHERE 1 - (dc.embedding <=> ?) > ?
         ORDER BY dc.embedding <=> ?
         LIMIT ?`,
      )
      .bind(
        JSON.stringify(queryEmbedding),
        JSON.stringify(queryEmbedding),
        similarityThreshold,
        JSON.stringify(queryEmbedding),
        limit,
      )
      .all();

    return results.results || [];
  }

  // Queue Operations
  async addToQueue(documentId: string) {
    await this.db
      .prepare(
        `INSERT INTO processing_queue (document_id, status)
         VALUES (?, 'pending')
         ON CONFLICT (document_id) DO UPDATE
         SET status = 'pending',
             retry_count = processing_queue.retry_count + 1,
             error_message = NULL`,
      )
      .bind(documentId)
      .run();
  }

  async getNextBatchFromQueue(limit = 10) {
    const results = await this.db
      .prepare(
        `UPDATE processing_queue
         SET status = 'processing',
             updated_at = CURRENT_TIMESTAMP
         WHERE id IN (
           SELECT id FROM processing_queue
           WHERE status IN ('pending', 'failed')
             AND (retry_count < 3 OR retry_count IS NULL)
           ORDER BY created_at
           LIMIT ?
           FOR UPDATE SKIP LOCKED
         )
         RETURNING *`,
      )
      .bind(limit)
      .all();

    return results.results || [];
  }

  async markQueueItemComplete(id: number) {
    await this.db
      .prepare(
        `UPDATE processing_queue
         SET status = 'completed',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(id)
      .run();
  }

  async markQueueItemFailed(id: number, error: string) {
    await this.db
      .prepare(
        `UPDATE processing_queue
         SET status = 'failed',
             error_message = ?,
             retry_count = COALESCE(retry_count, 0) + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(error.substring(0, 1000), id)
      .run();
  }

  // Maintenance Operations
  async getStats() {
    const [documents, chunks, queue] = await Promise.all([
      this.db
        .prepare("SELECT COUNT(*) as count FROM documents")
        .first("count") as Promise<number>,
      this.db
        .prepare("SELECT COUNT(*) as count FROM document_chunks")
        .first("count") as Promise<number>,
      this.db
        .prepare(
          `SELECT 
             status, 
             COUNT(*) as count 
           FROM processing_queue 
           GROUP BY status`,
        )
        .all()
        .then((result) => result.results),
    ]);

    return {
      documents,
      chunks,
      queue: queue.reduce(
        (acc, item) => ({
          ...acc,
          [item.status as string]: item.count,
        }),
        {},
      ),
    };
  }
}

// Create a singleton instance
export const createR1Database = (db: D1Database) =>
  new R1DatabaseClient({ db });
