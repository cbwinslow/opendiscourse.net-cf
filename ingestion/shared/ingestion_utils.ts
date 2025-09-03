i// Shared utilities for data ingestion across different data sources

import fetch, { RequestInit as NodeRequestInit } from 'node-fetch';

// Make better-sqlite3 optional as it may not be available in all environments
let Database: any;
try {
  Database = require('better-sqlite3').Database;
} catch {
  // Handle gracefully if better-sqlite3 is not available
  console.warn('better-sqlite3 not available, database operations will be limited');
}

export interface RateLimitConfig {
  maxRequests: number;
  perMilliseconds: number;
  maxRPS: number;
}

export interface IngestionConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  rateLimit: RateLimitConfig;
}

export interface FetchResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  statusCode?: number;
}

export interface DatabaseStorageOptions {
  tableName: string;
  conflictResolution?: 'ignore' | 'update' | 'replace';
  fields: Record<string, any>;
}

export class IngestionUtils {
  private static rateLimitQueue: Array<() => Promise<void>> = [];
  private static lastRequestTime: number = 0;
  private static requestCount: number = 0;
  private static lastResetTime: number = Date.now();
  private static currentRateLimit: RateLimitConfig = {
    maxRequests: 100,
    perMilliseconds: 60000,
    maxRPS: 30
  };

  /**
   * Set global rate limit configuration
   */
  static setRateLimit(config: RateLimitConfig): void {
    this.currentRateLimit = { ...this.currentRateLimit, ...config };
  }

  /**
   * Rate-limited fetch with retry logic
   */
  static async fetchWithRateLimit<T = any>(
    url: string,
    options: any = {},
    retries: number = 3,
    timeoutMillis: number = 30000
  ): Promise<FetchResult<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMillis);

    try {
      await this.enforceRateLimit();

      const fetchOptions: any = {
        signal: controller.signal,
        ...options
      };

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: true,
        data: data as T,
        statusCode: response.status
      };

    } catch (error) {
      clearTimeout(timeout);

      if (retries > 0) {
        const delay = this.calculateRetryDelay(retries);
        await this.delay(delay);
        return this.fetchWithRateLimit<T>(url, options, retries - 1, timeoutMillis);
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Enforce rate limiting
   */
  private static async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counter if we're in a new window
    if (now - this.lastResetTime > this.currentRateLimit.perMilliseconds) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // Enforce rate limiting
    if (this.requestCount >= this.currentRateLimit.maxRequests) {
      const waitTime = this.currentRateLimit.perMilliseconds - (now - this.lastResetTime);
      if (waitTime > 0) {
        await this.delay(waitTime);
        this.requestCount = 0;
        this.lastResetTime = Date.now();
      }
    }

    // Enforce RPS limit
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minRequestInterval = 1000 / this.currentRateLimit.maxRPS;

    if (timeSinceLastRequest < minRequestInterval) {
      await this.delay(minRequestInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private static calculateRetryDelay(remainingRetries: number): number {
    const baseDelay = 1000; // 1 second base delay
    const maxDelay = 30000; // 30 seconds max delay
    const delay = baseDelay * Math.pow(2, 3 - remainingRetries);
    return Math.min(delay, maxDelay);
  }

  /**
   * Utility delay function
   */
  private static delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * Enhanced error handling with logging
   */
  static handleError(error: unknown, context: string, logError: boolean = true): Error {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    if (logError) {
      console.error(`[${context}] Error: ${errorObj.message}`);
      if (errorObj.stack) {
        console.error(`[${context}] Stack: ${errorObj.stack}`);
      }
    }

    return errorObj;
  }

  /**
   * Process data in batches
   */
  static async processInBatches<T>(
    items: T[],
    batchSize: number,
    processFn: (batch: T[]) => Promise<void>,
    onBatchComplete?: (completed: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await processFn(batch);

      if (onBatchComplete) {
        onBatchComplete(Math.min(i + batchSize, items.length), items.length);
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < items.length) {
        await this.delay(100);
      }
    }
  }

  /**
   * Database storage utility
   */
  static storeInDatabase<T extends Record<string, any>>(
    db: any,
    options: DatabaseStorageOptions & { data: T[] }
  ): Array<{ success: boolean; error?: Error; id?: string }> {
    const results: Array<{ success: boolean; error?: Error; id?: string }> = [];

    for (const record of options.data) {
      try {
        const { conflictClauses, updateFields, insertFields, insertValues } = this.buildSqlComponents(
          record,
          options.fields
        );

        let sql: string;
        let params: any[];

        if (options.conflictResolution === 'update' && conflictClauses) {
          sql = `
            INSERT INTO ${options.tableName} (${insertFields})
            VALUES (${insertValues.map(() => '?').join(', ')})
            ON CONFLICT ${conflictClauses}
            DO UPDATE SET ${updateFields}
          `;
          params = [...insertValues, ...insertValues];
        } else if (options.conflictResolution === 'ignore') {
          sql = `
            INSERT OR IGNORE INTO ${options.tableName} (${insertFields})
            VALUES (${insertValues.map(() => '?').join(', ')})
          `;
          params = insertValues;
        } else {
          sql = `
            INSERT INTO ${options.tableName} (${insertFields})
            VALUES (${insertValues.map(() => '?').join(', ')})
          `;
          params = insertValues;
        }

        const stmt = db.prepare(sql);
        const result = stmt.run(...params);

        results.push({
          success: true,
          id: result.lastInsertRowid ? String(result.lastInsertRowid) : undefined
        });

      } catch (error) {
        results.push({
          success: false,
          error: this.handleError(error, `Database storage for ${options.tableName}`, true)
        });
      }
    }

    return results;
  }

  /**
   * Build SQL components for dynamic queries
   */
  private static buildSqlComponents(
    record: Record<string, any>,
    fields: Record<string, any>
  ): {
    conflictClauses: string;
    updateFields: string;
    insertFields: string;
    insertValues: any[];
  } {
    const fieldNames = Object.keys(fields);
    const insertFields = fieldNames.join(', ');
    const insertValues: any[] = fieldNames.map(field => record[field] ?? null);

    const updateFields = fieldNames
      .filter(field => fields[field] !== 'pk')
      .map(field => `${field} = ?`)
      .join(', ');

    const conflictClauses = fieldNames
      .filter(field => fields[field] === 'pk')
      .map(field => `${field}`)
      .join(', ');

    return {
      conflictClauses: conflictClauses ? `(${conflictClauses})` : '',
      updateFields,
      insertFields,
      insertValues
    };
  }

  /**
   * Pagination utility
   */
  static *paginate(totalItems: number, pageSize: number): Generator<{ offset: number; limit: number }> {
    let offset = 0;
    while (offset < totalItems) {
      const limit = Math.min(pageSize, totalItems - offset);
      yield { offset, limit };
      offset += pageSize;
    }
  }

  /**
   * Parallel processing utility
   */
  static async processInParallel<T, R>(
    items: T[],
    maxConcurrency: number,
    processFn: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    const chunks = this.chunkArray(items, Math.ceil(items.length / maxConcurrency));

    for (const chunk of chunks) {
      const promises = chunk.map(processFn);
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Chunk array into smaller arrays
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Retry utility for async functions
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000,
    shouldRetry?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) break;

        if (shouldRetry && !shouldRetry(lastError)) break;

        const delay = retryDelay * Math.pow(2, attempt);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }
}
