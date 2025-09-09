// GovInfo BulkData Processor for AutoRAG
// Handles processing of bulkdata from govinfo.gov

import { existsSync, mkdirSync, writeFileSync, promises as fs } from 'fs';
import { join, basename, dirname } from 'path';
import fetch from 'node-fetch';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createWriteStream, createReadStream } from 'fs';
import { extract } from 'tar';
import { promisify } from 'util';
import stream from 'stream';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';

const pipelineAsync = promisify(stream.pipeline);
const CPU_COUNT = os.cpus().length;

interface BulkDataCollection {
  collection: string;
  publishedAt: string;
  granuleClass: string;
  title: string;
  packageId?: string;
  downloadUrl: string;
  mimeType: string;
  fileSize?: number;
  year?: number;
  month?: number;
  day?: number;
}

interface ProcessedFile {
  fileName: string;
  filePath: string;
  collection: string;
  mimeType: string;
  size: number;
  metadata: Record<string, any>;
  content: string;
}

export class GovInfoBulkDataProcessor {
  private config: any;
  private baseUrl: string;
  private downloadDir: string;
  private processedFiles: Map<string, boolean> = new Map();

  constructor(config: any) {
    this.config = config.govinfo;
    this.baseUrl = this.config.bulkDataUrl || 'https://www.govinfo.gov/bulkdata';
    this.downloadDir = this.config.downloadDir || join(process.cwd(), 'data', 'govinfo', 'bulkdata');
    
    // Ensure download directory exists
    this.ensureDirectoryExists(this.downloadDir);
  }

  // Ensure a directory exists, create it if it doesn't
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  // Add this method to process files in parallel using worker threads
  private async processInParallel<T, R>(
    items: T[],
    workerPath: string,
    workerCount = Math.min(CPU_COUNT, items.length)
  ): Promise<R[]> {
    if (!isMainThread) {
      throw new Error('This method should only be called from the main thread');
    }
    
    const chunkSize = Math.ceil(items.length / workerCount);
    const chunks = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    
    const workers = chunks.map(chunk => 
      new Promise<R[]>((resolve, reject) => {
        const worker = new Worker(workerPath, {
          workerData: chunk,
          execArgv: ['--max-old-space-size=4096']
        });
        
        const results: R[] = [];
        
        worker.on('message', (result: R) => {
          results.push(result);
        });
        
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code === 0) {
            resolve(results);
          } else {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      })
    );
    
    const results = await Promise.all(workers);
    return results.flat();
  }

  // Get available bulkdata collections
  async getAvailableCollections(): Promise<string[]> {
    return this.config.collections || [
      'BILLS', 'PLAW', 'STATUTE', 'FR', 'CFR', 'USCODE',
      'CREC', 'CHRG', 'ECONI', 'CDIR', 'CDOC', 'CPRT'
    ];
  }

  // List bulkdata files for a collection
  async listBulkDataFiles(
    collection: string,
    year?: number,
  ): Promise<BulkDataCollection[]> {
    try {
      console.log(`Fetching bulkdata files for collection: ${collection}${year ? ` (${year})` : ''}`);
      
      // In a production environment, we would fetch the actual file list
      // For now, we'll return mock data
      return this.generateMockFileList(collection, year);
      
    } catch (error) {
      console.error(`Error listing files for collection ${collection}:`, error);
      console.log(
        `Listing bulkdata files for collection: ${collection}${year ? ` (${year})` : ""}`,
      );

      // In a real implementation, we would fetch the actual bulkdata files
      // For now, we'll simulate some results
      return [
        {
          collection: collection,
          publishedAt: new Date().toISOString(),
          granuleClass: "PDF",
          title: `Sample ${collection} Document`,
          downloadUrl: `${this.baseUrl}/${collection}/sample.pdf`,
          mimeType: "application/pdf",
        },
        {
          collection: collection,
          publishedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          granuleClass: "XML",
          title: `Sample ${collection} Metadata`,
          downloadUrl: `${this.baseUrl}/${collection}/sample.xml`,
          mimeType: "application/xml",
        },
      ];
    } catch (error) {
      console.error(
        `Error listing bulkdata files for collection ${collection}:`,
        error,
      );
      throw error;
    }
  }
  
  // Download a file with retry logic
  private async downloadFile(url: string, destination: string): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.ingestion.timeout || 30000);
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        highWaterMark: 1024 * 1024, // 1MB chunks
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.statusText}`);
      }
      
      // Ensure directory exists
      await fs.mkdir(dirname(destination), { recursive: true });
      
      const fileStream = createWriteStream(destination, { highWaterMark: 1024 * 1024 });
      await pipelineAsync(response.body, fileStream);
      
      console.log(`Processing bulkdata file: ${fileInfo.title}`);

      // In a real implementation, we would:
      // 1. Download the file from fileInfo.downloadUrl
      // 2. Parse the content based on mimeType
      // 3. Extract text and metadata
      // 4. Chunk the document
      // 5. Generate embeddings
      // 6. Store in databases

      // Simulate processing
      const documentId = `doc_${Date.now()}`;
      const content = `This is simulated content from ${fileInfo.title}. In a real implementation, this would be the actual parsed content from the downloaded file.`;

      return {
        documentId: documentId,
        title: fileInfo.title,
        collection: fileInfo.collection,
        mimeType: fileInfo.mimeType,
        content: content,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Clean up partially downloaded file
      if (existsSync(destination)) {
        await fs.unlink(destination).catch(() => {});
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  
  // Extract a ZIP file
  private async extractZip(filePath: string, destination: string): Promise<void> {
    // In a real implementation, you would use a library like 'adm-zip' or 'yauzl'
    // For now, we'll just log the extraction
    console.log(`Would extract ${filePath} to ${destination}`);
    // Example with 'adm-zip':
    // const zip = new AdmZip(filePath);
    // zip.extractAllTo(destination, true);
  }
  
  // Process a single bulk data file
  async processBulkDataFile(file: BulkDataCollection): Promise<ProcessedFile> {
    const fileName = file.downloadUrl.split('/').pop() || 'unknown';
    const filePath = join(this.downloadDir, fileName);
    
    // Check if file already exists and is processed
    if (this.processedFiles.has(filePath)) {
      console.log(`File already processed: ${filePath}`);
      // In a real implementation, you would return the existing processed file
      return this.getProcessedFile(file, filePath);
    }
    
    try {
      // Download the file
      console.log(`Downloading ${file.downloadUrl} to ${filePath}`);
      await this.downloadFile(file.downloadUrl, filePath);
      
      // Process based on file type
      let extractedFiles: string[] = [];
      
      if (file.mimeType === 'application/zip') {
        const extractDir = join(this.downloadDir, 'extracted', fileName.replace(/\.\w+$/, ''));
        this.ensureDirectoryExists(extractDir);
        
        console.log(`Extracting ${filePath} to ${extractDir}`);
        await this.extractZip(filePath, extractDir);
        
        // In a real implementation, you would get the list of extracted files
        // For now, we'll just use the original file
        extractedFiles = [filePath];
      } else {
        extractedFiles = [filePath];
      }
      
      // Process each extracted file
      const processedFiles = await Promise.all(
        extractedFiles.map(extractedFile => this.processSingleFile(extractedFile, file))
      );
      
      // For now, return the first processed file
      // In a real implementation, you might want to aggregate or handle multiple files
      const result = processedFiles[0];
      
      // Mark as processed
      this.processedFiles.set(filePath, true);
      
      return result;
      
    } catch (error) {
      console.error(`Error processing file ${file.downloadUrl}:`, error);
      throw error;
    }
  }
  
  // Process a single file (XML, JSON, etc.)
  private async processSingleFile(filePath: string, fileInfo: BulkDataCollection): Promise<ProcessedFile> {
    console.log(`Processing file: ${filePath}`);
    
    // In a real implementation, you would parse the file based on its type
    // and extract the relevant information
    const content = ''; // Read and process file content
    
    return {
      fileName: filePath.split('/').pop() || 'unknown',
      filePath,
      collection: fileInfo.collection,
      mimeType: fileInfo.mimeType,
      size: 0, // Would get actual file size
      metadata: {
        ...fileInfo,
        processedAt: new Date().toISOString()
      },
      content // Processed content
    };
  }
  
  // Get a processed file (stub for existing file retrieval)
  private getProcessedFile(fileInfo: BulkDataCollection, filePath: string): ProcessedFile {
    return {
      fileName: filePath.split('/').pop() || 'unknown',
      filePath,
      collection: fileInfo.collection,
      mimeType: fileInfo.mimeType,
      size: 0, // Would get actual file size
      metadata: {
        ...fileInfo,
        processedAt: new Date().toISOString(),
        fromCache: true
      },
      content: '' // Would load from cache
    };
  }
  
  // Generate mock file list for testing
  private generateMockFileList(collection: string, year?: number): BulkDataCollection[] {
    const currentYear = year || new Date().getFullYear();
    const files: BulkDataCollection[] = [];
    
    // Generate some sample files based on collection type
    if (collection === 'BILLS') {
      // Bills are typically organized by Congress and bill type
      const congress = 117; // Current Congress
      const billTypes = ['hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres'];
      
      billTypes.forEach(type => {
        files.push({
          collection,
          publishedAt: new Date().toISOString(),
          granuleClass: 'XML',
          title: `${type.toUpperCase()} bills for ${congress}th Congress`,
          downloadUrl: `${this.baseUrl}/${collection}/${congress}/${type}.zip`,
          mimeType: 'application/zip',
          year: currentYear,
          packageId: `${collection}-${congress}-${type}`
        });
      });
    } else if (collection === 'FR') {
      // Federal Register documents by year/month
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0');
        files.push({
          collection,
          publishedAt: new Date(currentYear, month - 1, 1).toISOString(),
          granuleClass: 'XML',
          title: `Federal Register for ${currentYear}-${monthStr}`,
          downloadUrl: `${this.baseUrl}/${collection}/${currentYear}/${monthStr}.zip`,
          mimeType: 'application/zip',
          year: currentYear,
          month: month
        });
      }
    } else {
      // Default for other collections
      files.push({
        collection,
        publishedAt: new Date().toISOString(),
        granuleClass: 'ZIP',
        title: `${collection} Data`,
        downloadUrl: `${this.baseUrl}/${collection}/${collection}.zip`,
        mimeType: 'application/zip',
        year: currentYear
      });
    }
    
    return files;
  }

  // Process all bulkdata for a collection
  async processCollectionBulkData(
    collection: string,
    limit: number = 100,
  ): Promise<void> {
    try {
      console.log(`Processing bulkdata for collection: ${collection}`);

      // Get list of files
      const files = await this.listBulkDataFiles(collection);
      
      // Process files in parallel batches
      const batchSize = this.config.ingestion.batchSize || 10;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(
          batch.map(file => 
            this.processWithRetry(() => this.processFile(file.downloadUrl))
              .catch(error => {
                console.error(`Error processing ${file.downloadUrl}:`, error);
                return null;
              })
          )
        );
        
        // Small delay between batches to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      // Process files (up to limit)
      const processLimit = Math.min(files.length, limit);
      for (let i = 0; i < processLimit; i++) {
        const fileInfo = files[i];
        try {
          await this.processBulkDataFile(fileInfo);
          console.log(`Successfully processed file: ${fileInfo.title}`);
        } catch (error) {
          console.error(`Failed to process file ${fileInfo.title}:`, error);
        }
      }

      console.log(
        `Finished processing ${processLimit} files for collection: ${collection}`,
      );
    } catch (error) {
      console.error(
        `Error processing bulkdata for collection ${collection}:`,
        error,
      );
      throw error;
    }
  }

  // Process bulkdata for all collections
  async processAllCollectionsBulkData(
    limitPerCollection: number = 100,
  ): Promise<void> {
    try {
      console.log("Processing bulkdata for all collections");

      const collections = await this.getAvailableCollections();
      const bulkConfig = this.config.autorag?.bulkDataProcessing || {};
      const concurrentCollections = bulkConfig.concurrentCollections || 3;

      // Process collections with limited concurrency
      for (let i = 0; i < collections.length; i += concurrentCollections) {
        const batch = collections.slice(i, i + concurrentCollections);
        const promises = batch.map((collection) =>
          this.processCollectionBulkData(collection, limitPerCollection),
        );

        try {
          await Promise.all(promises);
        } catch (error) {
          console.error("Error processing collection batch:", error);
        }
      }

      console.log("Finished processing bulkdata for all collections");
    } catch (error) {
      console.error("Error processing all collections bulkdata:", error);
      throw error;
    }
  }
}
