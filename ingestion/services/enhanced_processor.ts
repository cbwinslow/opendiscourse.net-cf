import { OptimizedGovInfoBulkDataProcessor } from '../govinfo/optimized_processor';
import { DocumentProcessor, DocumentChunk } from './document_processor';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class EnhancedGovInfoProcessor extends OptimizedGovInfoBulkDataProcessor {
  private documentProcessor: DocumentProcessor;
  private processedChunks: Map<string, DocumentChunk[]> = new Map();

  constructor(config: any) {
    super(config);
    
    // Initialize document processor with config
    this.documentProcessor = new DocumentProcessor({
      database: {
        path: join(this.downloadDir, 'documents.db')
      },
      openai: config.openai,
      concurrency: config.ingestion?.concurrency || 5,
      useOpenAIEmbeddings: config.ingestion?.useOpenAIEmbeddings || false
    });

    // Ensure download directory exists
    if (!existsSync(this.downloadDir)) {
      mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async processFile(url: string): Promise<any> {
    const result = await super.processFile(url);
    
    if (result && result.content) {
      try {
        console.log(`Processing document: ${result.fileName}`);
        
        // Process document with NLP and vectorization
        const chunks = await this.documentProcessor.processDocument({
          id: result.fileName,
          content: result.content,
          sourceUrl: url,
          title: result.fileName,
          metadata: {
            collection: result.collection,
            mimeType: result.mimeType,
            size: result.size
          }
        });
        
        this.processedChunks.set(result.fileName, chunks);
        console.log(`Processed ${chunks.length} chunks from ${result.fileName}`);
        
        // Add chunk information to result
        return {
          ...result,
          chunks: chunks.length,
          processedAt: new Date().toISOString()
        };
        
      } catch (error) {
        console.error(`Error processing document ${url}:`, error);
        throw error;
      }
    }
    
    return result;
  }

  async searchDocuments(query: string, limit = 10) {
    return this.documentProcessor.search(query, limit);
  }

  async getProcessedChunks(documentId: string): Promise<DocumentChunk[] | undefined> {
    return this.processedChunks.get(documentId);
  }

  async close() {
    await this.documentProcessor.close();
    // Close any other resources if needed
  }
}
