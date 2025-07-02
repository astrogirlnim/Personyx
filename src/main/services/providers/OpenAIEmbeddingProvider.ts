/**
 * OpenAI Embedding Provider
 * Extracted from LangGraphService for provider abstraction
 * Phase 2.5.2 - Hybrid AI Key Management & Cloud Option
 */

import OpenAI from 'openai';
import { Logger } from '@main/utils/logger';
import { getToken } from '@main/security/tokenVault';
import type {
  EmbeddingProvider,
  EmbeddingResult,
  ProviderStatus,
} from './IEmbeddingProvider';

const logger = new Logger('openai-embedding-provider');

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'openai';
  private openai: OpenAI | null = null;
  private readonly MODEL = 'text-embedding-3-small';
  private readonly DIMENSIONS = 1536;
  private readonly MAX_TOKENS = 8191;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  private initialized = false;
  private lastError?: string;
  private rateLimit = {
    remaining: 1000,
    resetTime: new Date(Date.now() + 60000),
  };

  async initialize(): Promise<void> {
    logger.info('🔧 Initializing OpenAI embedding provider...');

    try {
      const apiKey = await getToken('openai');
      if (!apiKey) {
        throw new Error('OpenAI API key not found in TokenVault');
      }

      this.openai = new OpenAI({ apiKey });

      // Test connection with a small embedding
      await this.testConnection();

      this.initialized = true;
      this.lastError = undefined;
      logger.info('✅ OpenAI embedding provider initialized successfully');
    } catch (error) {
      this.lastError = String(error);
      logger.error('❌ Failed to initialize OpenAI embedding provider', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.initialized && this.openai !== null;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.isReady()) {
      throw new Error('OpenAI provider not ready');
    }

    const startTime = Date.now();

    try {
      logger.debug('🧠 Generating OpenAI embedding', {
        textLength: text.length,
        model: this.MODEL,
      });

      const response = await this.retryWithBackoff(async () => {
        return await this.openai!.embeddings.create({
          model: this.MODEL,
          input: text,
        });
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Empty response from OpenAI API');
      }

      const embedding = response.data[0];
      const processingTime = Date.now() - startTime;

      // Update rate limit info if available
      this.updateRateLimit(response);

      const result: EmbeddingResult = {
        embedding: embedding.embedding,
        model: this.MODEL,
        dimensions: this.DIMENSIONS,
        tokens: response.usage?.total_tokens || 0,
        processingTime,
      };

      logger.debug('✅ OpenAI embedding generated', {
        dimensions: result.dimensions,
        tokens: result.tokens,
        processingTime: result.processingTime,
      });

      return result;
    } catch (error) {
      this.lastError = String(error);
      logger.error('❌ Failed to generate OpenAI embedding', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    logger.info('🧠 Generating batch OpenAI embeddings', {
      count: texts.length,
    });

    const results: EmbeddingResult[] = [];
    const batchSize = 10; // Process in smaller batches to avoid rate limits

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      logger.debug(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`
      );

      for (const text of batch) {
        try {
          const result = await this.generateEmbedding(text);
          results.push(result);
        } catch (error) {
          logger.error(
            `❌ Failed to generate embedding for batch item ${i}`,
            error
          );
          // Continue with other items instead of failing entire batch
        }
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('✅ Batch embedding generation completed', {
      requested: texts.length,
      successful: results.length,
    });

    return results;
  }

  getStatus(): ProviderStatus {
    return {
      initialized: this.initialized,
      authenticated: this.openai !== null,
      rateLimit: this.rateLimit,
      lastError: this.lastError,
    };
  }

  getSupportedModels(): string[] {
    return [this.MODEL];
  }

  getMaxTokens(): number {
    return this.MAX_TOKENS;
  }

  private async testConnection(): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      logger.debug('🔍 Testing OpenAI connection...');

      const testResponse = await this.openai.embeddings.create({
        model: this.MODEL,
        input: 'test connection',
      });

      if (!testResponse.data || testResponse.data.length === 0) {
        throw new Error('Empty response from OpenAI API');
      }

      logger.debug('✅ OpenAI connection test successful');
    } catch (error) {
      logger.error('❌ OpenAI connection test failed', error);
      throw new Error(`OpenAI API connection failed: ${error}`);
    }
  }

  private async retryWithBackoff<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        if (attempt === this.MAX_RETRIES) {
          break;
        }

        // Check if error is retryable
        if (this.isRetryableError(error)) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
          logger.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms`, {
            error: error.message,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Non-retryable error, fail immediately
          throw error;
        }
      }
    }

    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, rate limits, and temporary server errors
    const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    const retryableHttpCodes = [429, 500, 502, 503, 504];

    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }

    if (error.status && retryableHttpCodes.includes(error.status)) {
      return true;
    }

    return false;
  }

  private updateRateLimit(response: any): void {
    // Extract rate limit information from response headers if available
    const headers = response.headers || {};

    if (headers['x-ratelimit-remaining']) {
      this.rateLimit.remaining = parseInt(headers['x-ratelimit-remaining'], 10);
    }

    if (headers['x-ratelimit-reset']) {
      this.rateLimit.resetTime = new Date(
        parseInt(headers['x-ratelimit-reset'], 10) * 1000
      );
    }
  }
}
