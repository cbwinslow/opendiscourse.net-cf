
  // GovInfo BulkData Processor for AutoRAG
  // Handles processing of bulkdata from govinfo.gov

  import { existsSync, mkdirSync, writeFileSync, promises as fs } from "fs";
  import { join, basename, dirname } from "path";
  import fetch from "node-fetch";
  import { createGunzip } from "zlib";
  import { pipeline } from "stream/promises";
  import { createWriteStream, createReadStream } from "fs";
  import { extract } from "tar";
  import { promisify } from "util";
  import stream from "stream";
  import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
  import os from "os";

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
      console.log("DEBUG: GovInfoBulkDataProcessor constructor called.");
      this.config = config.govinfo;
      this.baseUrl = this.config.bulkDataUrl || "https://www.govinfo.gov/bulkdata";
      this.downloadDir = this.config.downloadDir || join(process.cwd(), "data", "govinfo", "bulkdata");
      
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
      workerCount = Math.min(CPU_COUNT, items.length),
    ): Promise<R[]> {
      if (!isMainThread) {
        throw new Error("This method should only be called from the main thread");
      }
      
      const chunkSize = Math.ceil(items.length / workerCount);
      const chunks = [];
      
      for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
      }
      
      const workers = chunks.map((chunk) => {
        return new Promise<R[]>((resolve, reject) => {
          const worker = new Worker(workerPath, {
            workerData: chunk,
            execArgv: ["--max-old-space-size=4096"],
          });
          
          const results: R[] = [];
          
          worker.on("message", (result: R) => {
            results.push(result);
          });
          
          worker.on("error", reject);
          worker.on("exit", (code) => {
            if (code === 0) {
              resolve(results);
            } else {
              reject(new Error(`Worker stopped with exit code ${code}`));
            }
          });
        });
      });
      
      const results = await Promise.all(workers);
      return results.flat();
    }

    // Get available bulkdata collections
    async getAvailableCollections(): Promise<string[]> {
      console.log("DEBUG: getAvailableCollections called.");
      return (this.config.collections || [
        "BILLS", 
        "PLAW", 
        "STATUTE", 
        "FR", 
        "CFR", 
        "USCODE",
        "CREC", 
        "CHRG", 
        "ECONI", 
        "CDIR", 
        "CDOC", 
        "CPRT"
      ]);
    }

    // List bulkdata files for a collection
    async listBulkDataFiles(collection: string, year?: number): Promise<BulkDataCollection[]> {
      console.log(`DEBUG: listBulkDataFiles called for collection: ${collection}${year ? ` (${year})` : ''}`);
      try {
        console.log(`Fetching bulkdata files for collection
