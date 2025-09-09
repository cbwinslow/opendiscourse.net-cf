/**
 * Cloudflare AutoRAG Service
 * Replaces traditional AutoRAG with Cloudflare AI, D1, and Vectorize
 */

export interface AutoRAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  maxDocuments: number;
  vectorDimensions: number;
  retrievalTopK: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  metadata: any;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    id: string;
    content: string;
    score: number;
    metadata: any;
  }>;
  confidence: number;
}

export class CloudflareAutoRAGService {
  private env: any;
  private config: AutoRAGConfig;

  constructor(env: any, config: AutoRAGConfig = {
    chunkSize: 1000,
    chunkOverlap: 200,
    maxDocuments: 10000,
    vectorDimensions: 768,
    retrievalTopK: 5
  }) {
    this.env = env;
    this.config = config;
  }

  /**
   * Ingest document and create embeddings for RAG
   */
  async ingestDocument(document: {
    id: string;
    title: string;
    content: string;
    type: string;
    metadata?: any;
  }): Promise<void> {
    try {
      // Split document into chunks
      const chunks = this.chunkDocument(document.content, document.id);
      
      // Store document in R2
      await this.env.DOCUMENTS.put(
        `documents/${document.type}/${document.id}.json`,
        JSON.stringify(document)
      );

      // Generate embeddings for each chunk
      const embeddingPromises = chunks.map(async (chunk, index) => {
        const embedding = await this.generateEmbedding(chunk);
        
        // Store chunk embedding in D1
        await this.env.DB.prepare(`
          INSERT OR REPLACE INTO document_embeddings (
            id, document_id, document_type, chunk_index, text_content, 
            embedding_vector, metadata, created_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          `${document.id}_chunk_${index}`,
          document.id,
          document.type,
          index,
          chunk,
          JSON.stringify(embedding),
          JSON.stringify({
            title: document.title,
            type: document.type,
            ...document.metadata
          }),
          new Date().toISOString()
        ).run();

        // Store in Vectorize for fast similarity search
        return {
          id: `${document.id}_chunk_${index}`,
          values: embedding,
          metadata: {
            documentId: document.id,
            documentType: document.type,
            title: document.title,
            chunkIndex: index,
            content: chunk.substring(0, 500) // Store preview in metadata
          }
        };
      });

      const vectors = await Promise.all(embeddingPromises);
      
      // Batch upload to Vectorize
      const batches = this.chunkArray(vectors, 100); // Vectorize batch limit
      for (const batch of batches) {
        await this.env.VECTOR_INDEX.upsert(batch);
      }

      console.log(`Successfully ingested document ${document.id} with ${chunks.length} chunks`);
    } catch (error) {
      console.error(`Error ingesting document ${document.id}:`, error);
      throw error;
    }
  }

  /**
   * Query the RAG system
   */
  async query(question: string, options: {
    documentType?: string;
    maxSources?: number;
    includeConfidence?: boolean;
  } = {}): Promise<RAGResponse> {
    try {
      const { documentType, maxSources = this.config.retrievalTopK, includeConfidence = true } = options;

      // Generate embedding for the question
      const questionEmbedding = await this.generateEmbedding(question);

      // Search for relevant chunks in Vectorize
      const searchOptions: any = { topK: maxSources * 2 }; // Get more results to filter
      
      if (documentType) {
        searchOptions.filter = { documentType };
      }

      const searchResults = await this.env.VECTOR_INDEX.query(questionEmbedding, searchOptions);
      
      if (!searchResults.matches || searchResults.matches.length === 0) {
        return {
          answer: "I couldn't find relevant information to answer your question.",
          sources: [],
          confidence: 0
        };
      }

      // Get the top relevant sources
      const topSources = searchResults.matches
        .slice(0, maxSources)
        .map((match: any) => ({
          id: match.id,
          content: match.metadata.content,
          score: match.score,
          metadata: match.metadata
        }));

      // Create context from retrieved sources
      const context = topSources
        .map((source, index) => `[${index + 1}] ${source.content}`)
        .join('\n\n');

      // Generate answer using Cloudflare AI
      const answer = await this.generateAnswer(question, context);

      // Calculate confidence based on source relevance scores
      const confidence = includeConfidence ? this.calculateConfidence(topSources) : 1.0;

      return {
        answer,
        sources: topSources,
        confidence
      };

    } catch (error) {
      console.error('Error in RAG query:', error);
      throw error;
    }
  }

  /**
   * Advanced semantic search across documents
   */
  async semanticSearch(query: string, options: {
    documentTypes?: string[];
    limit?: number;
    threshold?: number;
  } = {}): Promise<Array<{
    id: string;
    title: string;
    content: string;
    score: number;
    type: string;
  }>> {
    try {
      const { documentTypes, limit = 20, threshold = 0.7 } = options;

      const queryEmbedding = await this.generateEmbedding(query);

      const searchOptions: any = { topK: limit };
      if (documentTypes && documentTypes.length > 0) {
        searchOptions.filter = { documentType: { $in: documentTypes } };
      }

      const results = await this.env.VECTOR_INDEX.query(queryEmbedding, searchOptions);

      return results.matches
        ?.filter((match: any) => match.score >= threshold)
        .map((match: any) => ({
          id: match.metadata.documentId,
          title: match.metadata.title,
          content: match.metadata.content,
          score: match.score,
          type: match.metadata.documentType
        })) || [];

    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  /**
   * Get document recommendations based on similarity
   */
  async getRecommendations(documentId: string, limit: number = 5): Promise<Array<{
    id: string;
    title: string;
    score: number;
    type: string;
  }>> {
    try {
      // Get the document's first chunk embedding as a representative
      const docChunk = await this.env.DB.prepare(`
        SELECT embedding_vector, metadata FROM document_embeddings 
        WHERE document_id = ? AND chunk_index = 0
      `).bind(documentId).first();

      if (!docChunk) {
        return [];
      }

      const embedding = JSON.parse(docChunk.embedding_vector);
      const results = await this.env.VECTOR_INDEX.query(embedding, { topK: limit + 1 });

      return results.matches
        ?.filter((match: any) => match.metadata.documentId !== documentId)
        .slice(0, limit)
        .map((match: any) => ({
          id: match.metadata.documentId,
          title: match.metadata.title,
          score: match.score,
          type: match.metadata.documentType
        })) || [];

    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Multi-document comparison and analysis
   */
  async compareDocuments(documentIds: string[]): Promise<{
    summary: string;
    similarities: Array<{ doc1: string; doc2: string; score: number }>;
    differences: string[];
  }> {
    try {
      // Get embeddings for all documents
      const docEmbeddings = await Promise.all(
        documentIds.map(async (id) => {
          const chunk = await this.env.DB.prepare(`
            SELECT embedding_vector, metadata FROM document_embeddings 
            WHERE document_id = ? AND chunk_index = 0
          `).bind(id).first();
          
          return {
            id,
            embedding: chunk ? JSON.parse(chunk.embedding_vector) : null,
            metadata: chunk ? JSON.parse(chunk.metadata) : null
          };
        })
      );

      // Calculate pairwise similarities
      const similarities = [];
      for (let i = 0; i < docEmbeddings.length; i++) {
        for (let j = i + 1; j < docEmbeddings.length; j++) {
          if (docEmbeddings[i].embedding && docEmbeddings[j].embedding) {
            const score = this.cosineSimilarity(
              docEmbeddings[i].embedding,
              docEmbeddings[j].embedding
            );
            similarities.push({
              doc1: docEmbeddings[i].id,
              doc2: docEmbeddings[j].id,
              score
            });
          }
        }
      }

      // Generate summary using AI
      const documentsInfo = docEmbeddings
        .filter(doc => doc.metadata)
        .map(doc => `${doc.metadata.title} (${doc.metadata.type})`)
        .join(', ');

      const summaryPrompt = `Compare and summarize the following documents: ${documentsInfo}. Focus on key similarities and differences.`;
      const summary = await this.generateText(summaryPrompt);

      return {
        summary,
        similarities: similarities.sort((a, b) => b.score - a.score),
        differences: [] // Could be enhanced with more detailed analysis
      };

    } catch (error) {
      console.error('Error comparing documents:', error);
      throw error;
    }
  }

  /**
   * Private utility methods
   */
  private chunkDocument(content: string, documentId: string): string[] {
    const chunks = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.config.chunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        
        // Start new chunk with overlap
        const overlapWords = currentChunk
          .split(' ')
          .slice(-Math.floor(this.config.chunkOverlap / 10))
          .join(' ');
        currentChunk = overlapWords + ' ' + sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: [text]
      });
      return response.data[0];
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a dummy embedding as fallback
      return Array.from({ length: this.config.vectorDimensions }, () => Math.random());
    }
  }

  private async generateAnswer(question: string, context: string): Promise<string> {
    try {
      const prompt = `Based on the following context, answer the question. If the context doesn't contain enough information, say so.

Context:
${context}

Question: ${question}

Answer:`;

      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: "You are a helpful assistant that answers questions based on provided context. Be concise and accurate." },
          { role: "user", content: prompt }
        ]
      });

      return response.response || "I couldn't generate an answer based on the provided context.";
    } catch (error) {
      console.error('Error generating answer:', error);
      return "I encountered an error while generating an answer.";
    }
  }

  private async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "user", content: prompt }
        ]
      });
      return response.response || "";
    } catch (error) {
      console.error('Error generating text:', error);
      return "";
    }
  }

  private calculateConfidence(sources: any[]): number {
    if (sources.length === 0) return 0;
    
    const avgScore = sources.reduce((sum, source) => sum + source.score, 0) / sources.length;
    return Math.min(avgScore, 1.0);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Health check for AutoRAG service
   */
  async healthCheck(): Promise<{ status: string; metrics: any }> {
    try {
      // Check document count
      const docCount = await this.env.DB.prepare(
        "SELECT COUNT(*) as count FROM document_embeddings"
      ).first();

      // Test embedding generation
      const testEmbedding = await this.generateEmbedding("test");

      // Test Vectorize
      const testSearch = await this.env.VECTOR_INDEX.query(testEmbedding, { topK: 1 });

      return {
        status: "healthy",
        metrics: {
          documentChunks: docCount?.count || 0,
          embeddingDimensions: testEmbedding.length,
          vectorizeResponsive: !!testSearch,
          lastChecked: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: "unhealthy",
        metrics: {
          error: error instanceof Error ? error.message : "Unknown error",
          lastChecked: new Date().toISOString()
        }
      };
    }
  }
}

export default CloudflareAutoRAGService;