// Cloudflare Workers Type Definitions
// These types are provided by @cloudflare/workers-types but need to be explicitly declared

declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }

  interface ScheduledController {
    readonly scheduledTime: number;
    readonly cron: string;
  }

  interface MessageBatch<T = unknown> {
    readonly messages: readonly Message<T>[];
    ackAll(): void;
    retryAll(): void;
  }

  interface Message<T = unknown> {
    id: string;
    timestamp: Date;
    body: T;
    ack(): void;
    retry(): void;
  }

  // Extend existing Cloudflare types
  interface D1Database {
    // D1Database is already defined in @cloudflare/workers-types
  }

  interface KVNamespace {
    // KVNamespace is already defined in @cloudflare/workers-types
  }

  interface R2Bucket {
    // R2Bucket is already defined in @cloudflare/workers-types
  }

  interface VectorizeIndex {
    // VectorizeIndex is already defined in @cloudflare/workers-types
  }

  interface Queue {
    // Queue is already defined in @cloudflare/workers-types
  }
}

export {};
