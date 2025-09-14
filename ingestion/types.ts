// Types for the ingestion service

export interface Chunk {
  text: string;
  index: number;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface Document {
  id: string;
  title?: string;
  source: string;
  url?: string;
  content_type: string;
  file_size: number;
  processed: boolean;
  error?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QueueItem {
  id: number;
  document_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentProcessor {
  process(
    file: {
      name: string;
      buffer: Buffer;
      contentType: string;
    },
    metadata?: Record<string, unknown>,
    source?: string,
  ): Promise<{ documentId: string; chunks: number }>;
}

export interface VectorSearchResult {
  id: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
  similarity: number;
  documentTitle?: string;
  source?: string;
  url?: string;
}

export interface IngestionStats {
  documents: number;
  chunks: number;
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    [key: string]: number;
  };
}

// Types for the R1 database client
export interface R1DatabaseClient {
  createDocument(
    document: Omit<Document, "id" | "created_at" | "updated_at" | "processed">,
  ): Promise<{ id: string }>;
  getDocument(id: string): Promise<Document | null>;
  updateDocument(id: string, updates: Partial<Document>): Promise<void>;
  markDocumentAsProcessed(id: string): Promise<void>;
  insertChunks(params: {
    documentId: string;
    chunks: Chunk[];
    embeddings: number[][];
  }): Promise<void>;
  searchChunks(
    queryEmbedding: number[],
    options?: { limit?: number; similarityThreshold?: number },
  ): Promise<VectorSearchResult[]>;
  addToQueue(documentId: string): Promise<void>;
  getNextBatchFromQueue(limit?: number): Promise<QueueItem[]>;
  markQueueItemComplete(id: number): Promise<void>;
  markQueueItemFailed(id: number, error: string): Promise<void>;
  getStats(): Promise<IngestionStats>;
}
