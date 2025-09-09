import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import OpenAI from 'openai';
import * as tf from '@tensorflow/tfjs-node';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as nlp from 'compromise';
import { SentimentAnalyzer, PorterStemmer } from 'natural';
import sqlite3 from 'sqlite3';
import { open, Database, ISqlite } from 'sqlite';
import { createPool, Pool } from 'generic-pool';

type RunResult = sqlite3.RunResult;

interface DocumentProcessorConfig {
  database: {
    path: string;
  };
  openai?: {
    apiKey: string;
  };
  concurrency?: number;
  chunkSize?: number;
  chunkOverlap?: number;
}

interface Document {
  id?: string;
  content: string;
  sourceUrl?: string;
  title?: string;
  metadata?: Record<string, any>;
}

interface ProcessedDocument extends Document {
  id: string;
  chunks: DocumentChunk[];
  metadata: Record<string, any>;
}

interface ProcessChunkResult {
  chunk: DocumentChunk;
  index: number;
}

type BatchProcessor<T> = (items: T[], batchIndex: number) => Promise<void>;

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  vector: number[];
  metadata: {
    chunkIndex: number;
    startOffset: number;
    endOffset: number;
    tokenCount: number;
    entities?: Array<{ text: string; type: string; score: number }>;
    sentiment?: { score: number; comparative: number; tokens: string[] };
    topics?: string[];
    keywords?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentProcessor {
  private db!: Database;
  private pool!: Pool<Database>;
  private openai: OpenAI | null = null;
  private isInitialized = false;
  private initPromise: Promise<void>;
  private runQuery: (query: string, params?: any[]) => Promise<RunResult>;
  private allQuery: <T = any>(query: string, params?: any[]) => Promise<T[]>;
  private useModel: use.UniversalSentenceEncoder | null = null;
  private sentimentAnalyzer: SentimentAnalyzer | null = null;
  private config: DocumentProcessorConfig;

  constructor(config: DocumentProcessorConfig) {
    if (!config.database) {
      throw new Error('Database configuration is required');
    }

    this.config = {
      ...config,
      concurrency: config.concurrency || 5,
      chunkSize: config.chunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200
    };

    const dbPath = this.config.database.path || './documents.db';
    
    // Initialize database connection
    this.initPromise = this.initializeDatabaseConnection(dbPath);
    
    // Setup query methods with proper error handling
    this.runQuery = async (query: string, params: any[] = []): Promise<RunResult> => {
      await this.ensureInitialized();
      try {
        return await this.db.run(query, params);
      } catch (error) {
        console.error('Error executing query:', error);
        throw error;
      }
    };

    this.allQuery = async <T = any>(query: string, params: any[] = []): Promise<T[]> => {
      await this.ensureInitialized();
      try {
        return await this.db.all(query, params);
      } catch (error) {
        console.error('Error executing query:', error);
        throw error;
      }
    };

    // Initialize OpenAI client if API key is provided
    if (this.config.openai?.apiKey) {
      this.openai = new OpenAI({ 
        apiKey: this.config.openai.apiKey 
      });
    }

    // Initialize NLP models
    this.initializeNLPModels().catch(console.error);
  }
  
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initPromise;
    }
  }
  
  private async initializeDatabaseConnection(dbPath: string): Promise<void> {
    try {
      // Initialize database connection
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      console.log('Connected to SQLite database at', dbPath);
      
      // Initialize database schema
      await this.initializeDatabase();
      
      // Initialize connection pool
      this.pool = createPool<Database>(
        {
          create: async () => {
            const db = await open({
              filename: dbPath,
              driver: sqlite3.Database
            });
            // Enable WAL mode for better concurrency
            await db.run('PRAGMA journal_mode = WAL');
            return db;
          },
          destroy: async (db: Database) => {
            await db.close();
          },
          validate: async (db: Database) => {
            try {
              await db.get('SELECT 1');
              return true;
            } catch (e) {
              return false;
            }
          }
        },
        { 
          min: 2, 
          max: 10,
          acquireTimeoutMillis: 30000, // 30 seconds
          idleTimeoutMillis: 30000,    // 30 seconds
          maxWaitingClients: 50
        }
      );
      
      this.isInitialized = true;
    } catch (err) {
      console.error('Database initialization error:', err);
      throw err;
    }
  }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Enable WAL mode for better concurrency first
      await this.db.run('PRAGMA journal_mode = WAL');
      
      // Create tables with IF NOT EXISTS to be idempotent
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          source_url TEXT,
          title TEXT,
          content TEXT NOT NULL,
          metadata TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id TEXT PRIMARY KEY,
          documentId TEXT NOT NULL,
          content TEXT NOT NULL,
          vector BLOB,
          metadata TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE
        )
      `);
      
      // Create indexes for better query performance
      await this.db.run('CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(documentId)');
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async initializeNLPModels(): Promise<void> {
    try {
      // Load Universal Sentence Encoder model
      this.useModel = await use.load();
      
      // Initialize sentiment analyzer
      this.sentimentAnalyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
      
      console.log('NLP models initialized successfully');
    } catch (error) {
      console.error('Error initializing NLP models:', error);
      throw error;
    }
  }

  private generateId(content: string, prefix: string = ''): string {
    return createHash('sha256')
      .update(`${prefix}${content}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`)
      .digest('hex');
  }

  private analyzeSentiment(text: string): { score: number; comparative: number; tokens: string[] } {
    if (!this.sentimentAnalyzer) {
      throw new Error('Sentiment analyzer not initialized');
    }

    const tokens = text.toLowerCase().split(/\s+/);
    const score = this.sentimentAnalyzer.getSentiment(tokens);
    
    return {
      score,
      comparative: tokens.length > 0 ? score / tokens.length : 0,
      tokens
    };
  }

  private extractEntities(text: string): Array<{ text: string; type: string; score: number }> {
    const doc = nlp(text);
    const entities: Array<{ text: string; type: string; score: number }> = [];
    
    // Extract people
    const people = doc.people().out('array');
    people.forEach((person: string) => {
      entities.push({
        text: person,
        type: 'PERSON',
        score: 0.9
      });
    });
    
    // Extract organizations
    const orgs = doc.organizations().out('array');
    orgs.forEach((org: string) => {
      entities.push({
        text: org,
        type: 'ORGANIZATION',
        score: 0.9
      });
    });
    
    // Extract places
    const places = doc.places().out('array');
    places.forEach((place: string) => {
      entities.push({
        text: place,
        type: 'PLACE',
        score: 0.9
        score: 0.8
      });
    }
  }
} catch (error) {
  console.error('Error extracting entities:', error);
}
  
return entities;
}

private async chunkText(
text: string,
chunkSize = 1000,
overlap = 200
): Promise<Array<{ text: string; start: number; end: number }>> {
const chunks: Array<{ text: string; start: number; end: number }> = [];
  
if (!text) return [];
  
// If text is smaller than chunk size, return it as a single chunk
if (text.length <= chunkSize) {
  return [{
    text,
    start: 0,
    end: text.length - 1
  }];
}
  
// Simple sentence splitting with overlap
const sentences = text.split(/(?<=[.!?])\s+/);
let currentChunk = '';
let currentStart = 0;
  
  private async chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): Promise<{text: string, start: number, end: number}[]> {
    if (!text || text.length === 0) return [];
    
    const chunks: {text: string, start: number, end: number}[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';
    let currentStart = 0;
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed chunk size, finalize current chunk
      if (currentChunk.length + sentence.length > chunkSize) {
        if (currentChunk) {
          chunks.push({
            text: currentChunk.trim(),
            start: currentStart,
            end: currentStart + currentChunk.length
          });
        text: currentChunk.trim(),
        start: currentStart,
        end: currentStart + currentChunk.length - 1
      });
    // Use Universal Sentence Encoder for local embeddings
    if (!this.useModel) {
      this.useModel = await use.load();
    }
    
    // If OpenAI is available and we want to use it for better embeddings
    if (this.openai && this.config.openai?.apiKey) {
      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: text,
        });
        return response.data[0].embedding;
      } catch (error) {
        console.warn('Falling back to local embeddings due to OpenAI error:', error);
      }
    }
    
    // Fall back to local embeddings
    if (!this.useModel) {
      throw new Error('Failed to load embedding model');
    }
    const embeddings = await this.useModel.embed([text]);
    return Array.from(embeddings.arraySync()[0]);
  }

  async processDocument(document: {
    id?: string;
    content: string;
    sourceUrl?: string;
    title?: string;
    metadata?: Record<string, any>;
        this.analyzeSentiment(chunk.text)
      ]);

      const processedChunk: DocumentChunk = {
        id: chunkId,
        documentId: docId,
        content: chunk.text,
        vector,
        metadata: {
          chunkIndex: index,
          startOffset: chunk.start,
          endOffset: chunk.end,
          tokenCount: chunk.text.split(' ').length,
          entities,
          sentiment,
          topics: [], // Could be populated with topic modeling
          keywords: [], // Could be populated with keyword extraction
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.saveChunk(processedChunk);
      
      return processedChunk;
    };

  private async processDocument(document: Document): Promise<ProcessedDocument> {
    await this.ensureInitialized();
    
    // Generate document ID if not provided
    const docId = document.id || this.generateId(document.content, 'doc_');
    
    // Chunk the document
    const chunks = await this.chunkText(
      document.content,
      this.config.chunkSize,
      this.config.chunkOverlap
    );
    
    // Process chunks with concurrency control
    const concurrency = this.config.concurrency || 5;
    const chunkBatches = [];
    for (let i = 0; i < chunks.length; i += concurrency) {
      const batch = chunks.slice(i, i + concurrency);
      const processedBatch = await Promise.all(batch.map((chunk, idx) => 
        processChunk(chunk, i + idx)
      ));
      processedChunks.push(...processedBatch);
    }

    // Save document metadata if needed
    await this.saveDocument({
      id: docId,
      sourceUrl: document.sourceUrl,
      title: document.title,
      content: document.content,
      metadata: {
        ...document.metadata,
        chunkCount: processedChunks.length,
        processedAt: new Date().toISOString()
      }
    });

    return processedChunks;
  }

  private async saveDocument(document: {
    id: string;
    sourceUrl?: string;
    title?: string;
    content: string;
    metadata?: Record<string, any>;
  }) {
    const client = await this.pool.acquire();
    try {
      await client.run(
        'INSERT OR REPLACE INTO documents (id, source_url, title, content, metadata) VALUES (?, ?, ?, ?, ?)',
        document.id,
        document.sourceUrl,
        document.title,
        document.content,
        JSON.stringify(document.metadata || {})
      );
    } finally {
      await this.pool.release(client);
    }
  }

  private async saveChunk(chunk: DocumentChunk) {
    const client = await this.pool.acquire();
    try {
      await client.run(
        'INSERT OR REPLACE INTO document_chunks (id, document_id, content, vector, metadata) VALUES (?, ?, ?, ?, ?)',
        chunk.id,
        chunk.documentId,
        chunk.content,
        JSON.stringify(chunk.vector),
        JSON.stringify(chunk.metadata)
      );
    } finally {
      await this.pool.release(client);
    }
  }

  async search(query: string, limit = 10): Promise<{chunk: DocumentChunk, score: number}[]> {
    // Generate query embedding
    const queryVector = await this.generateEmbeddings(query);
    
    // For production, you'd want to use a vector database like Pinecone, Milvus, or pgvector
    // This is a simplified in-memory search for demonstration
    const client = await this.pool.acquire();
    try {
      const chunks = await client.all('SELECT * FROM document_chunks');
      
      // Calculate cosine similarity for each chunk
      const results = await Promise.all(
        chunks.map(async (row: any) => {
          const vector = JSON.parse(row.vector);
          const metadata = JSON.parse(row.metadata);
          const similarity = this.cosineSimilarity(queryVector, vector);
          
          return {
            chunk: {
              id: row.id,
              documentId: row.document_id,
              content: row.content,
              vector,
              metadata,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at)
            },
            score: similarity
          };
        })
      );
      
      // Sort by score and return top results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } finally {
      await this.pool.release(client);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + (val * (b[i] || 0)), 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + (val * val), 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + (val * val), 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async close() {
    await this.pool.drain();
    await this.pool.clear();
    await new Promise<void>((resolve, reject) => {
      this.db.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
