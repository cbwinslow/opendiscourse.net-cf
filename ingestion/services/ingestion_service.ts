import { R1DatabaseClient } from '../../lib/r1/db';
import { AIService } from '../../services/ai';
import { Chunk, Document, DocumentProcessor } from '../types';
import { Readable } from 'stream';

export class IngestionService {
  constructor(
    private db: R1DatabaseClient,
    private aiService: AIService,
    private chunkSize: number = 1000,
    private chunkOverlap: number = 200
  ) {}

  async processDocument(
    file: {
      name: string;
      buffer: Buffer;
      contentType: string;
    },
    metadata: Record<string, unknown> = {},
    source: string = 'upload'
  ): Promise<{ documentId: string; chunks: number }> {
    // Generate a unique document ID
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Create document record
    await this.db.createDocument({
      id: documentId,
      title: file.name,
      source,
      content_type: file.contentType,
      file_size: file.buffer.length,
      metadata: {
        ...metadata,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      // Process the file based on content type
      const text = await this.extractText(file);
      
      // Split text into chunks
      const chunks = this.splitTextIntoChunks(text);
      
      // Generate embeddings for chunks
      const embeddings = await this.generateEmbeddings(chunks.map(c => c.text));
      
      // Store chunks with embeddings
      await this.db.insertChunks({
        documentId,
        chunks: chunks.map((chunk, index) => ({
          text: chunk.text,
          index,
          metadata: {
            ...chunk.metadata,
            documentId,
            chunkIndex: index,
          },
        })),
        embeddings,
      });

      // Mark document as processed
      await this.db.markDocumentAsProcessed(documentId);
      
      return { documentId, chunks: chunks.length };
    } catch (error) {
      // Update document with error
      await this.db.updateDocument(documentId, {
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async extractText(file: {
    buffer: Buffer;
    contentType: string;
  }): Promise<string> {
    // Handle different file types
    if (file.contentType.startsWith('text/plain')) {
      return file.buffer.toString('utf-8');
    } else if (file.contentType === 'application/pdf') {
      return this.extractTextFromPdf(file.buffer);
    } else if (
      file.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this.extractTextFromDocx(file.buffer);
    } else {
      throw new Error(`Unsupported file type: ${file.contentType}`);
    }
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    // Use a PDF parsing library like pdf-parse
    try {
      const { default: pdf } = await import('pdf-parse');
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    // Use a DOCX parsing library like mammoth
    try {
      const { default: mammoth } = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  private splitTextIntoChunks(
    text: string,
    chunkSize: number = this.chunkSize,
    chunkOverlap: number = this.chunkOverlap
  ): Array<{ text: string; metadata: Record<string, unknown> }> {
    // Simple implementation - can be enhanced with more sophisticated chunking
    const chunks: Array<{ text: string; metadata: Record<string, unknown> }> = [];
    
    // Split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let currentChunkStart = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (!paragraph) continue;
      
      // If adding this paragraph would exceed chunk size, finalize current chunk
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            chunkStart: currentChunkStart,
            chunkEnd: currentChunkStart + currentChunk.length,
          },
        });
        
        // Start new chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
        currentChunk = currentChunk.substring(overlapStart) + '\n\n' + paragraph;
        currentChunkStart += overlapStart;
      } else {
        // Add to current chunk
        if (currentChunk) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
    }
    
    // Add the last chunk if not empty
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          chunkStart: currentChunkStart,
          chunkEnd: currentChunkStart + currentChunk.length,
        },
      });
    }
    
    return chunks;
  }

  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await Promise.all(
        texts.map(text => this.aiService.generateEmbedding(text))
      );
      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  // Queue processing
  async processQueue(concurrency: number = 3): Promise<void> {
    // Get next batch of items from the queue
    const items = await this.db.getNextBatchFromQueue(concurrency);
    
    if (items.length === 0) {
      console.log('No items to process in the queue');
      return;
    }
    
    console.log(`Processing ${items.length} items from the queue`);
    
    // Process items in parallel with limited concurrency
    await Promise.all(
      items.map(async (item) => {
        try {
          const document = await this.db.getDocument(item.document_id);
          if (!document) {
            throw new Error(`Document ${item.document_id} not found`);
          }
          
          // Process the document
          await this.processDocument(
            {
              name: document.title || `document-${document.id}`,
              buffer: Buffer.from(''), // Need to load actual file content
              contentType: document.content_type,
            },
            document.metadata,
            document.source
          );
          
          // Mark as complete
          await this.db.markQueueItemComplete(item.id);
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          await this.db.markQueueItemFailed(
            item.id,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      })
    );
  }
}

// Helper function to create a readable stream from a buffer
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Signal end of stream
  return stream;
}
