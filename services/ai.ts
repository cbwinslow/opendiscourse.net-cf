import { getAIConfig } from "../config/ai";

type AITextGenerationOptions = {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
};

type AIEmbeddingOptions = {
  input: string | string[];
  model?: string;
};

type AIImageGenerationOptions = {
  prompt: string;
  negativePrompt?: string;
  steps?: number;
  width?: number;
  height?: number;
};

type AITranscriptionOptions = {
  audio: ArrayBuffer;
  model?: string;
  responseFormat?: "json" | "text" | "srt" | "vtt";
};

export class AIService {
  private config: ReturnType<typeof getAIConfig>;
  private ai: any; // Cloudflare AI binding
  private rateLimit: {
    queue: Promise<any>[];
    lastRequest: number;
    requestsInMinute: number;
  };

  constructor(env: any = {}) {
    this.config = getAIConfig(env);
    this.ai = env.AI; // Cloudflare AI binding

    // Initialize rate limiting
    this.rateLimit = {
      queue: [],
      lastRequest: 0,
      requestsInMinute: 0,
    };
  }

  private async rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Reset counter if more than a minute has passed
    if (now - this.rateLimit.lastRequest > 60000) {
      this.rateLimit.requestsInMinute = 0;
      this.rateLimit.lastRequest = now;
    }

    // If we've hit the rate limit, wait until we can make another request
    if (
      this.rateLimit.requestsInMinute >=
      this.config.rateLimiting.requestsPerMinute
    ) {
      const waitTime = 60000 - (now - this.rateLimit.lastRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.rateLimit.requestsInMinute = 0;
      this.rateLimit.lastRequest = Date.now();
    }

    // Make the request
    this.rateLimit.requestsInMinute++;
    return await fn();
  }

  async generateText(options: AITextGenerationOptions): Promise<string> {
    const { prompt, maxTokens, temperature } = {
      ...this.config.textGeneration,
      ...options,
    };

    const response = await this.rateLimitedCall(() =>
      this.ai.run(this.config.textGeneration.model, {
        prompt,
        max_tokens: maxTokens,
        temperature,
      }),
    );

    return response?.response || "";
  }

  async generateEmbedding(options: AIEmbeddingOptions): Promise<number[][]> {
    const { input, model } = {
      model: this.config.embeddings.model,
      ...options,
    };

    const response = await this.rateLimitedCall(() =>
      this.ai.run(model, {
        text: input,
      }),
    );

    return Array.isArray(input) ? response.data : [response.data[0]];
  }

  async generateImage(options: AIImageGenerationOptions): Promise<ArrayBuffer> {
    const { prompt, negativePrompt, steps, width, height } = {
      ...this.config.imageGeneration,
      ...options,
    };

    const response = await this.rateLimitedCall(() =>
      this.ai.run(this.config.imageGeneration.model, {
        prompt,
        negative_prompt: negativePrompt,
        num_steps: steps,
        width,
        height,
      }),
    );

    return response;
  }

  async transcribeAudio(options: AITranscriptionOptions): Promise<any> {
    const { audio, model, responseFormat } = {
      model: this.config.audio.model,
      responseFormat: this.config.audio.responseFormat,
      ...options,
    };

    const response = await this.rateLimitedCall(() =>
      this.ai.run(model, {
        audio: [...new Uint8Array(audio)],
        model: model,
        response_format: responseFormat,
      }),
    );

    return response;
  }

  // Batch processing for multiple inputs
  async batchProcess<T, R>(
    items: T[],
    processFn: (item: T) => Promise<R>,
    batchSize: number = this.config.rateLimiting.maxConcurrent,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item) => processFn(item)),
      );
      results.push(...batchResults);

      // Add a small delay between batches
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}
