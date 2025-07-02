/**
 * Embedding Provider Interface
 * Abstraction layer for different embedding services (OpenAI, Personyx Cloud)
 * Phase 2.5.2 - Hybrid AI Key Management & Cloud Option
 */

export interface EmbeddingProvider {
  name: string;
  initialize(): Promise<void>;
  isReady(): boolean;
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
  getStatus(): ProviderStatus;
  getSupportedModels(): string[];
  getMaxTokens(): number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  tokens: number;
  processingTime: number;
}

export interface ProviderStatus {
  initialized: boolean;
  authenticated: boolean;
  rateLimit: {
    remaining: number;
    resetTime: Date;
  };
  lastError?: string;
}

export type EmbeddingProviderType = 'openai' | 'firebase-cloud';

export type EmbeddingError =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_API_KEY'
  | 'NETWORK_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_NOT_AVAILABLE';

export interface EmbeddingErrorInfo {
  code: EmbeddingError;
  message: string;
  provider: string;
  retryable: boolean;
  fallbackUsed?: boolean;
}
