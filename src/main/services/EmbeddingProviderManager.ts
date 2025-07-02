/**
 * Embedding Provider Manager
 * Orchestrates between different embedding providers (OpenAI, Firebase Cloud)
 * Phase 2.5.2 - Hybrid AI Key Management & Cloud Option
 */

import { Logger } from '@main/utils/logger';
import { OpenAIEmbeddingProvider } from './providers/OpenAIEmbeddingProvider';
import { FirebaseEmbeddingProvider } from './providers/FirebaseEmbeddingProvider';
import { getToken } from '@main/security/tokenVault';
import type {
  EmbeddingProvider,
  EmbeddingResult,
  ProviderStatus,
  EmbeddingProviderType,
  EmbeddingErrorInfo,
  EmbeddingError,
} from './providers/IEmbeddingProvider';

const logger = new Logger('embedding-provider-manager');

export class EmbeddingProviderManager {
  private providers = new Map<EmbeddingProviderType, EmbeddingProvider>();
  private activeProvider: EmbeddingProvider | null = null;
  private activeProviderType: EmbeddingProviderType | null = null;
  private fallbackEnabled = true;

  constructor() {
    this.registerProvider('openai', new OpenAIEmbeddingProvider());
    this.registerProvider('firebase-cloud', new FirebaseEmbeddingProvider());
  }

  /**
   * Register a new embedding provider
   */
  private registerProvider(
    type: EmbeddingProviderType,
    provider: EmbeddingProvider
  ): void {
    this.providers.set(type, provider);
    logger.debug(`📋 Registered embedding provider: ${type}`);
  }

  /**
   * Set the active embedding provider
   */
  async setActiveProvider(type: EmbeddingProviderType): Promise<void> {
    logger.info(`🔄 Setting active embedding provider: ${type}`);

    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider ${type} not found`);
    }

    try {
      await provider.initialize();
      this.activeProvider = provider;
      this.activeProviderType = type;

      logger.info(`✅ Active embedding provider set to: ${type}`);
    } catch (error) {
      logger.error(`❌ Failed to initialize provider ${type}`, error);
      throw error;
    }
  }

  /**
   * Get the currently active provider type
   */
  getActiveProviderType(): EmbeddingProviderType | null {
    return this.activeProviderType;
  }

  /**
   * Generate embedding using active provider with fallback
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.activeProvider) {
      throw new Error('No active embedding provider configured');
    }

    try {
      const result = await this.activeProvider.generateEmbedding(text);
      logger.debug(`✅ Embedding generated using ${this.activeProvider.name}`);
      return result;
    } catch (error) {
      logger.warn(
        `⚠️ Active provider (${this.activeProvider.name}) failed`,
        error
      );

      if (this.fallbackEnabled) {
        const fallbackProvider = await this.getFallbackProvider();
        if (fallbackProvider) {
          logger.info(`🔄 Using fallback provider: ${fallbackProvider.name}`);
          try {
            const result = await fallbackProvider.generateEmbedding(text);
            logger.info(
              `✅ Fallback successful using ${fallbackProvider.name}`
            );
            return result;
          } catch (fallbackError) {
            logger.error(`❌ Fallback provider also failed`, fallbackError);
          }
        }
      }

      throw this.createEmbeddingError(error, this.activeProvider.name);
    }
  }

  /**
   * Generate batch embeddings using active provider with fallback
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.activeProvider) {
      throw new Error('No active embedding provider configured');
    }

    try {
      const results = await this.activeProvider.generateBatchEmbeddings(texts);
      logger.debug(
        `✅ Batch embeddings generated using ${this.activeProvider.name}`,
        {
          requested: texts.length,
          generated: results.length,
        }
      );
      return results;
    } catch (error) {
      logger.warn(
        `⚠️ Active provider (${this.activeProvider.name}) batch failed`,
        error
      );

      if (this.fallbackEnabled) {
        const fallbackProvider = await this.getFallbackProvider();
        if (fallbackProvider) {
          logger.info(
            `🔄 Using fallback provider for batch: ${fallbackProvider.name}`
          );
          try {
            const results =
              await fallbackProvider.generateBatchEmbeddings(texts);
            logger.info(
              `✅ Batch fallback successful using ${fallbackProvider.name}`
            );
            return results;
          } catch (fallbackError) {
            logger.error(
              `❌ Fallback provider batch also failed`,
              fallbackError
            );
          }
        }
      }

      throw this.createEmbeddingError(error, this.activeProvider.name);
    }
  }

  /**
   * Get status of all providers
   */
  getProviderStatus(): Record<EmbeddingProviderType, ProviderStatus> {
    const status = {} as Record<EmbeddingProviderType, ProviderStatus>;

    for (const [type, provider] of this.providers) {
      status[type] = provider.getStatus();
    }

    return status;
  }

  /**
   * Get available providers that are ready
   */
  getAvailableProviders(): EmbeddingProviderType[] {
    const available: EmbeddingProviderType[] = [];

    for (const [type, provider] of this.providers) {
      if (provider.isReady()) {
        available.push(type);
      }
    }

    return available;
  }

  /**
   * Auto-select the best available provider
   */
  async autoSelectProvider(): Promise<EmbeddingProviderType> {
    logger.info('🤖 Auto-selecting best available embedding provider');

    // Check for user preference first
    const userPreference = await this.getUserEmbeddingPreference();
    if (userPreference && userPreference !== 'auto') {
      logger.debug(`👤 User preference: ${userPreference}`);

      if (await this.isProviderAvailable(userPreference)) {
        await this.setActiveProvider(userPreference);
        return userPreference;
      } else {
        logger.warn(
          `⚠️ User preferred provider ${userPreference} not available`
        );
      }
    }

    // Auto-select based on availability
    if (await this.isProviderAvailable('firebase-cloud')) {
      logger.info('🌥️ Selecting Firebase Cloud (managed service)');
      await this.setActiveProvider('firebase-cloud');
      return 'firebase-cloud';
    } else if (await this.isProviderAvailable('openai')) {
      logger.info('🤖 Selecting OpenAI (user API key)');
      await this.setActiveProvider('openai');
      return 'openai';
    } else {
      throw new Error(
        'No embedding providers available. Please configure API keys.'
      );
    }
  }

  /**
   * Enable or disable fallback behavior
   */
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
    logger.info(`🔄 Fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Test connectivity for all providers
   */
  async testAllProviders(): Promise<Record<EmbeddingProviderType, boolean>> {
    const results = {} as Record<EmbeddingProviderType, boolean>;

    for (const [type, provider] of this.providers) {
      try {
        await provider.initialize();
        results[type] = provider.isReady();
      } catch (error) {
        logger.debug(`❌ Provider ${type} test failed`, error);
        results[type] = false;
      }
    }

    return results;
  }

  private async getFallbackProvider(): Promise<EmbeddingProvider | null> {
    // Try providers in order of preference, excluding the currently active one
    const fallbackOrder: EmbeddingProviderType[] = ['firebase-cloud', 'openai'];

    for (const type of fallbackOrder) {
      if (type === this.activeProviderType) {
        continue; // Skip active provider
      }

      const provider = this.providers.get(type);
      if (provider && (await this.isProviderAvailable(type))) {
        try {
          await provider.initialize();
          if (provider.isReady()) {
            return provider;
          }
        } catch (error) {
          logger.debug(
            `❌ Fallback provider ${type} failed to initialize`,
            error
          );
        }
      }
    }

    return null;
  }

  private async isProviderAvailable(
    type: EmbeddingProviderType
  ): Promise<boolean> {
    try {
      switch (type) {
        case 'openai': {
          const openaiKey = await getToken('openai');
          return openaiKey !== null;
        }

        case 'firebase-cloud': {
          const cloudCredentials = await getToken('firebase-cloud');
          return cloudCredentials !== null && cloudCredentials !== '';
        }

        default:
          return false;
      }
    } catch (error) {
      logger.debug(`❌ Failed to check availability for ${type}`, error);
      return false;
    }
  }

  private async getUserEmbeddingPreference(): Promise<
    EmbeddingProviderType | 'auto' | null
  > {
    // TODO: Implement user preference storage
    // For now, return 'auto' to use auto-selection
    return 'auto';
  }

  private createEmbeddingError(
    originalError: unknown,
    providerName: string
  ): EmbeddingErrorInfo {
    let errorCode: EmbeddingError = 'NETWORK_ERROR';
    let retryable = false;

    // Classify the error
    const errorMessage =
      originalError instanceof Error
        ? originalError.message
        : String(originalError);

    if (
      errorMessage.includes('API key') ||
      errorMessage.includes('authentication')
    ) {
      errorCode = 'AUTHENTICATION_FAILED';
    } else if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429')
    ) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
      retryable = true;
    } else if (
      errorMessage.includes('quota') ||
      errorMessage.includes('billing')
    ) {
      errorCode = 'QUOTA_EXCEEDED';
    } else if (
      errorMessage.includes('model') ||
      errorMessage.includes('not available')
    ) {
      errorCode = 'MODEL_NOT_AVAILABLE';
    } else if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout')
    ) {
      errorCode = 'NETWORK_ERROR';
      retryable = true;
    }

    return {
      code: errorCode,
      message: errorMessage,
      provider: providerName,
      retryable,
      fallbackUsed: this.fallbackEnabled,
    };
  }

  /**
   * Get manager status and configuration
   */
  getManagerStatus(): {
    activeProvider: EmbeddingProviderType | null;
    fallbackEnabled: boolean;
    providersStatus: Record<EmbeddingProviderType, ProviderStatus>;
    availableProviders: EmbeddingProviderType[];
  } {
    return {
      activeProvider: this.activeProviderType,
      fallbackEnabled: this.fallbackEnabled,
      providersStatus: this.getProviderStatus(),
      availableProviders: this.getAvailableProviders(),
    };
  }
}
