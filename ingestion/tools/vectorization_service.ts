// Vectorization service for chunking documents and storing embeddings

interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}

export class VectorizationService {
  private chunkSize: number;
  private overlap: number;

  constructor(chunkSize: number = 1000, overlap: number = 100) {
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }

  // Chunk text into smaller pieces for vectorization
  chunkText(text: string, documentId: string, metadata: Record<string, any> = {}): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += (this.chunkSize - this.overlap)) {
      const chunkWords = words.slice(i, i + this.chunkSize);
      const content = chunkWords.join(' ');
      
      if (content.trim().length > 0) {
        chunks.push({
          id: `${documentId}_chunk_${i / (this.chunkSize - this.overlap)}`,
          documentId,
          content,
          chunkIndex: i / (this.chunkSize - this.overlap),
          metadata: {
            ...metadata,
            chunkStart: i,
            chunkEnd: Math.min(i + this.chunkSize, words.length),
            wordCount: chunkWords.length
          }
        });
      }
    }
    
    return chunks;
  }

  // Generate embedding for text (simulated)
  async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, we would use Cloudflare AI Gateway or similar service
    // For now, we'll simulate embedding generation
    console.log(`Generating embedding for text: ${text.substring(0, 50)}...`);
    
    // Simple simulation - in reality this would call an AI model
    const embedding = new Array(384).fill(0);
    const words = text.split(/\s+/);
    
    // Simple hash-based simulation
    for (let i = 0; i < Math.min(words.length, 10); i++) {
      const hash = this.simpleHash(words[i]);
      embedding[hash % 384] = 1;
    }
    
    return embedding;
  }

  // Store chunks in vector database (simulated)
  async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    console.log(`Storing ${chunks.length} chunks in vector database`);
    
    // In a real implementation, we would store in Cloudflare Vectorize
    for (const chunk of chunks) {
      // Simulate storing in vector database
      console.log(`Stored chunk ${chunk.id} for document ${chunk.documentId}`);
    }
  }

  // Process document for vectorization
  async processDocument(documentId: string, content: string, metadata: Record<string, any> = {}): Promise<void> {
    console.log(`Processing document ${documentId} for vectorization`);
    
    try {
      // Chunk the document
      const chunks = this.chunkText(content, documentId, metadata);
      console.log(`Created ${chunks.length} chunks for document ${documentId}`);
      
      // Generate embeddings and store chunks
      for (const chunk of chunks) {
        // In a real implementation, we would generate actual embeddings
        // const embedding = await this.generateEmbedding(chunk.content);
        // For now, we'll skip actual embedding generation to save time
        console.log(`Processed chunk ${chunk.id}`);
      }
      
      // Store chunks in vector database
      await this.storeChunks(chunks);
      
      console.log(`Finished processing document ${documentId} for vectorization`);
    } catch (error) {
      console.error(`Error processing document ${documentId} for vectorization:`, error);
      throw error;
    }
  }

  // Simple hash function for simulation
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}