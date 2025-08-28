// AI Configuration for Cloudflare Workers AI
export interface AIConfig {
  // Text Generation Models
  textGeneration: {
    model: string;
    maxTokens: number;
    temperature: number;
  };
  
  // Embedding Models
  embeddings: {
    model: string;
    dimensions: number;
  };
  
  // Image Generation Models
  imageGeneration: {
    model: string;
    steps: number;
    width: number;
    height: number;
  };
  
  // Audio Processing
  audio: {
    model: string;
    responseFormat: 'json' | 'text' | 'srt' | 'vtt';
  };
  
  // Rate Limiting
  rateLimiting: {
    requestsPerMinute: number;
    maxConcurrent: number;
  };
}

// Default configuration
export const defaultAIConfig: AIConfig = {
  textGeneration: {
    model: "@cf/meta/llama-3-8b-instruct",
    maxTokens: 2048,
    temperature: 0.7,
  },
  embeddings: {
    model: "@cf/baai/bge-base-en-v1.5",
    dimensions: 768,
  },
  imageGeneration: {
    model: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    steps: 20,
    width: 1024,
    height: 1024,
  },
  audio: {
    model: "@cf/openai/whisper",
    responseFormat: "json",
  },
  rateLimiting: {
    requestsPerMinute: 60,
    maxConcurrent: 5,
  },
};

// Get AI configuration with environment overrides
export function getAIConfig(env: any = {}): AIConfig {
  return {
    textGeneration: {
      model: env.AI_TEXT_MODEL || defaultAIConfig.textGeneration.model,
      maxTokens: parseInt(env.AI_MAX_TOKENS || defaultAIConfig.textGeneration.maxTokens.toString()),
      temperature: parseFloat(env.AI_TEMPERATURE || defaultAIConfig.textGeneration.temperature.toString()),
    },
    embeddings: {
      model: env.AI_EMBEDDING_MODEL || defaultAIConfig.embeddings.model,
      dimensions: parseInt(env.AI_EMBEDDING_DIMENSIONS || defaultAIConfig.embeddings.dimensions.toString()),
    },
    imageGeneration: {
      model: env.AI_IMAGE_MODEL || defaultAIConfig.imageGeneration.model,
      steps: parseInt(env.AI_IMAGE_STEPS || defaultAIConfig.imageGeneration.steps.toString()),
      width: parseInt(env.AI_IMAGE_WIDTH || defaultAIConfig.imageGeneration.width.toString()),
      height: parseInt(env.AI_IMAGE_HEIGHT || defaultAIConfig.imageGeneration.height.toString()),
    },
    audio: {
      model: env.AI_AUDIO_MODEL || defaultAIConfig.audio.model,
      responseFormat: (env.AI_AUDIO_FORMAT || defaultAIConfig.audio.responseFormat) as any,
    },
    rateLimiting: {
      requestsPerMinute: parseInt(env.AI_RATE_LIMIT || defaultAIConfig.rateLimiting.requestsPerMinute.toString()),
      maxConcurrent: parseInt(env.AI_MAX_CONCURRENT || defaultAIConfig.rateLimiting.maxConcurrent.toString()),
    },
  };
}
