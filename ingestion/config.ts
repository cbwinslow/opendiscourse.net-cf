interface IngestionConfig {
  // Chunking configuration
  chunking: {
    chunkSize: number;
    chunkOverlap: number;
    // Characters that force a chunk split
    separators: string[];
    // Minimum chunk size (in characters)
    minChunkSize: number;
  };
  
  // Embedding configuration
  embedding: {
    // Maximum number of retries for embedding generation
    maxRetries: number;
    // Delay between retries in milliseconds
    retryDelay: number;
    // Batch size for embedding generation
    batchSize: number;
  };
  
  // Queue processing
  queue: {
    // Number of items to process in parallel
    concurrency: number;
    // Maximum number of retries for failed items
    maxRetries: number;
    // Delay between retries in milliseconds
    retryDelay: number;
  };
  
  // File processing
  files: {
    // Maximum file size in bytes (default: 50MB)
    maxFileSize: number;
    // Allowed file types
    allowedTypes: string[];
  };
}

// Default configuration
export const defaultConfig: IngestionConfig = {
  chunking: {
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', ' ', ''],
    minChunkSize: 100,
  },
  embedding: {
    maxRetries: 3,
    retryDelay: 1000,
    batchSize: 10,
  },
  queue: {
    concurrency: 3,
    maxRetries: 3,
    retryDelay: 5000,
  },
  files: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/csv',
      'application/json',
    ],
  },
};

// Merge user configuration with defaults
export function getConfig(overrides: Partial<IngestionConfig> = {}): IngestionConfig {
  return {
    ...defaultConfig,
    ...overrides,
    chunking: {
      ...defaultConfig.chunking,
      ...overrides.chunking,
    },
    embedding: {
      ...defaultConfig.embedding,
      ...overrides.embedding,
    },
    queue: {
      ...defaultConfig.queue,
      ...overrides.queue,
    },
    files: {
      ...defaultConfig.files,
      ...overrides.files,
    },
  };
}

// Validate configuration
export function validateConfig(config: IngestionConfig): string[] {
  const errors: string[] = [];
  
  if (config.chunking.chunkSize <= 0) {
    errors.push('chunkSize must be greater than 0');
  }
  
  if (config.chunking.chunkOverlap < 0) {
    errors.push('chunkOverlap cannot be negative');
  }
  
  if (config.chunking.chunkOverlap >= config.chunking.chunkSize) {
    errors.push('chunkOverlap must be less than chunkSize');
  }
  
  if (config.chunking.minChunkSize <= 0) {
    errors.push('minChunkSize must be greater than 0');
  }
  
  if (config.embedding.maxRetries < 0) {
    errors.push('maxRetries cannot be negative');
  }
  
  if (config.embedding.retryDelay < 0) {
    errors.push('retryDelay cannot be negative');
  }
  
  if (config.embedding.batchSize <= 0) {
    errors.push('batchSize must be greater than 0');
  }
  
  if (config.queue.concurrency <= 0) {
    errors.push('concurrency must be greater than 0');
  }
  
  if (config.queue.maxRetries < 0) {
    errors.push('maxRetries cannot be negative');
  }
  
  if (config.queue.retryDelay < 0) {
    errors.push('retryDelay cannot be negative');
  }
  
  if (config.files.maxFileSize <= 0) {
    errors.push('maxFileSize must be greater than 0');
  }
  
  return errors;
}

// Create a configuration instance
export const config = getConfig({
  // Override default values with environment variables if needed
  ...(process.env.CHUNK_SIZE && { chunking: { chunkSize: parseInt(process.env.CHUNK_SIZE, 10) } }),
  ...(process.env.CHUNK_OVERLAP && { chunking: { chunkOverlap: parseInt(process.env.CHUNK_OVERLAP, 10) } }),
  ...(process.env.EMBEDDING_BATCH_SIZE && { embedding: { batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE, 10) } }),
  ...(process.env.QUEUE_CONCURRENCY && { queue: { concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) } }),
  ...(process.env.MAX_FILE_SIZE && { files: { maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) } }),
});

// Validate the configuration on load
const configErrors = validateConfig(config);
if (configErrors.length > 0) {
  console.error('Invalid configuration:', configErrors.join('; '));
  process.exit(1);
}
