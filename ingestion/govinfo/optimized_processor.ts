import { existsSync, mkdirSync, promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import fetch from 'node-fetch';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createWriteStream, createReadStream } from 'fs';
import { extract } from 'tar';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';
import { promisify } from 'util';
import stream from 'stream';

const pipelineAsync = promisify(stream.pipeline);
const CPU_COUNT = os.cpus().length;

interface BulkDataFile {
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

interface IngestionConfig {
  chunkSize: number;
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  concurrentDownloads: number;
  useStreaming: boolean;
  memoryCacheSize: number;
  timeout: number;
  rateLimit: {
    maxRequests: number;
    perMilliseconds: number;
    maxRPS: number;
  };
}

export class OptimizedGovInfoBulkDataProcessor {
  private config: any;
  private baseUrl: string;
  private downloadDir: string;
  private processedFiles: Map<string, boolean> = new Map();
  private ingestionConfig: IngestionConfig;
  private activeDownloads: Set<Promise<any>> = new Set();
  private rateLimitQueue: Array<() => Promise<void>> = [];
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: any) {
    this.config = config.govinfo || {};
    this.baseUrl = this.config.bulkDataUrl || 'https://www.govinfo.gov/bulkdata';
    this.downloadDir = this.config.downloadDir || join(process.cwd(), 'data', 'govinfo', 'bulkdata');
    
    // Set default ingestion config
    this.ingestionConfig = {
      chunkSize: 2000,
      batchSize: 100,
      maxRetries: 2,
      retryDelay: 500,
      concurrentDownloads: 15,
      useStreaming: true,
      memoryCacheSize: 50 * 1024 * 1024, // 50MB
      timeout: 30000,
      rateLimit: {
        maxRequests: 100,
        perMilliseconds: 60000,
        maxRPS: 30
      }
    };
    
    // Override with any provided config
    if (config.ingestion) {
      this.ingestionConfig = { ...this.ingestionConfig, ...config.ingestion };
    }
    
    // Ensure download directory exists
    this.ensureDirectoryExists(this.downloadDir);
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    
    // Reset counter if we're in a new window
    if (now - this.lastResetTime > this.ingestionConfig.rateLimit.perMilliseconds) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // Enforce rate limiting
    if (this.requestCount >= this.ingestionConfig.rateLimit.maxRequests) {
      const waitTime = this.ingestionConfig.rateLimit.perMilliseconds - (now - this.lastResetTime);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.lastResetTime = Date.now();
      }
    }
    
    // Enforce RPS limit
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minRequestInterval = 1000 / this.ingestionConfig.rateLimit.maxRPS;
    
    if (timeSinceLastRequest < minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, minRequestInterval - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    return fn();
  }

  private async downloadWithRetry(url: string, destination: string, retries = this.ingestionConfig.maxRetries): Promise<void> {
    try {
      await this.downloadFile(url, destination);
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, this.ingestionConfig.retryDelay));
      return this.downloadWithRetry(url, destination, retries - 1);
    }
  }

  private async downloadFile(url: string, destination: string): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.ingestionConfig.timeout);
    
    try {
      const response = await this.withRateLimit(() => 
        fetch(url, { 
          signal: controller.signal,
          highWaterMark: 1024 * 1024, // 1MB chunks
        })
      );
      
      if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.statusText}`);
      }
      
      // Ensure directory exists
      await this.ensureDirectoryExists(dirname(destination));
      
      const fileStream = createWriteStream(destination, { highWaterMark: 1024 * 1024 });
      await pipelineAsync(response.body, fileStream);
      
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

  async processCollection(collection: string, year?: number): Promise<void> {
    const files = await this.listBulkDataFiles(collection, year);
    const batchSize = this.ingestionConfig.batchSize;
    
    // Process files in parallel batches
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
    }
  }
  
  private async processWithRetry<T>(fn: () => Promise<T>, retries = this.ingestionConfig.maxRetries): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      const delay = this.ingestionConfig.retryDelay * (this.ingestionConfig.maxRetries - retries + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.processWithRetry(fn, retries - 1);
    }
  }

  async listBulkDataFiles(collection: string, year?: number): Promise<BulkDataFile[]> {
    // Implementation depends on the actual API response format
    // This is a simplified version that would need to be adapted
    try {
      const url = year 
        ? `${this.baseUrl}/${collection}/${year}`
        : `${this.baseUrl}/${collection}`;
      
      const response = await this.withRateLimit(() => fetch(url));
      
      if (!response.ok) {
        throw new Error(`Failed to list files for ${collection}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.files || [];
      
    } catch (error) {
      console.error(`Error listing files for collection ${collection}:`, error);
      throw error;
    }
  }

  async processFile(url: string): Promise<ProcessedFile> {
    const fileName = basename(url);
    const filePath = join(this.downloadDir, fileName);
    
    // Skip if already processed
    if (this.processedFiles.has(filePath)) {
      console.log(`Skipping already processed file: ${fileName}`);
      return null;
    }
    
    try {
      // Download the file
      await this.downloadWithRetry(url, filePath);
      
      // Process based on file type
      const fileExt = fileName.split('.').pop().toLowerCase();
      let content = '';
      
      if (fileExt === 'zip') {
        await this.extractZip(filePath, this.downloadDir);
        // Process extracted files
        content = 'Extracted and processed ZIP content';
      } else if (fileExt === 'xml') {
        content = await fs.readFile(filePath, 'utf-8');
        // Process XML content
      } else if (fileExt === 'json') {
        content = await fs.readFile(filePath, 'utf-8');
        // Process JSON content
      } else {
        // Handle other file types
        content = await fs.readFile(filePath, 'utf-8');
      }
      
      const result: ProcessedFile = {
        fileName,
        filePath,
        collection: '', // Extract from file path or metadata
        mimeType: this.getMimeType(fileExt),
        size: (await fs.stat(filePath)).size,
        metadata: {},
        content
      };
      
      // Mark as processed
      this.processedFiles.set(filePath, true);
      
      return result;
      
    } catch (error) {
      console.error(`Error processing file ${url}:`, error);
      throw error;
    }
  }
  
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'xml': 'application/xml',
      'json': 'application/json',
      'zip': 'application/zip',
      'txt': 'text/plain',
      'html': 'text/html',
      'htm': 'text/html',
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
  
  private async extractZip(filePath: string, destination: string): Promise<void> {
    // Implementation for ZIP extraction
    // This is a placeholder - you would use a library like 'adm-zip' or 'yauzl'
    console.log(`Extracting ${filePath} to ${destination}`);
    // Actual implementation would go here
  }

  // Process all collections in parallel with controlled concurrency
  async processAllCollections(limitPerCollection?: number): Promise<void> {
    const collections = await this.getAvailableCollections();
    const concurrentCollections = Math.min(CPU_COUNT, collections.length);
    
    // Process collections in parallel with controlled concurrency
    for (let i = 0; i < collections.length; i += concurrentCollections) {
      const batch = collections.slice(i, i + concurrentCollections);
      await Promise.all(
        batch.map(collection => 
          this.processWithRetry(() => this.processCollection(collection, limitPerCollection))
            .catch(error => {
              console.error(`Error processing collection ${collection}:`, error);
              return null;
            })
        )
      );
    }
  }
  
  private async getAvailableCollections(): Promise<string[]> {
    // This would fetch available collections from the API
    // For now, return a default set
    return [
      'BILLS', 'PLAW', 'STATUTE', 'FR', 'CFR', 'USCODE',
      'CREC', 'CHRG', 'ECONI', 'CDIR', 'CDOC', 'CPRT'
    ];
  }
}

// Worker thread implementation for parallel processing
if (!isMainThread && parentPort) {
  const processFileInWorker = async (fileUrl: string): Promise<ProcessedFile> => {
    // This would be the worker implementation
    // You would need to create a new instance of the processor in the worker
    // and process the file
    return null as any;
  };
  
  parentPort.on('message', async (fileUrl: string) => {
    try {
      const result = await processFileInWorker(fileUrl);
      parentPort?.postMessage({ success: true, result });
    } catch (error) {
      parentPort?.postMessage({ success: false, error: error.message });
    }
  });
}
