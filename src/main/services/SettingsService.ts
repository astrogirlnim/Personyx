/**
 * Settings Service
 * Manages application settings including hybrid AI service configuration
 * Phase 2.5, Feature 5.2 - Implement secure local storage for user-provided keys
 * Phase 2.5, Feature 5.5 - Update onboarding and settings UI to guide user through both options
 */

import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { Logger } from '@main/utils/logger';
import {
  storeToken,
  getToken,
  removeToken,
  validateToken,
  isTokenStored,
  type ApiService,
} from '@main/security/tokenVault';
import { PATHS, DEFAULT_SETTINGS } from '@shared/constants';
import type {
  AppSettings,
  AIServiceConfig,
  AIServiceProvider,
} from '@shared/types';

// Conditionally import Electron app (may not be available in CI/test environments)
let electronApp: { getPath: (path: string) => string } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  electronApp = require('electron').app;
} catch {
  // Electron not available - running in Node.js environment (CI/tests)
  electronApp = null;
}

const logger = new Logger('settings-service');

export class SettingsService {
  private settings: AppSettings;
  private settingsPath: string;
  private isInitialized = false;

  constructor() {
    // Initialize settings with defaults
    this.settings = {
      ...DEFAULT_SETTINGS,
      // Ensure aiService is properly initialized
      aiService: {
        provider: 'local' as AIServiceProvider,
        localApiKey: undefined,
        cloudSubscription: undefined,
      },
    };

    // Set up settings file path
    let userDataPath: string;
    if (electronApp) {
      // Running in Electron environment
      userDataPath = electronApp.getPath('userData');
    } else {
      // Running in Node.js environment (CI/tests) - use current working directory
      userDataPath = join(process.cwd(), 'test-settings');
    }
    this.settingsPath = join(userDataPath, PATHS.SETTINGS);
  }

  /**
   * Initialize the settings service
   */
  async initialize(): Promise<void> {
    logger.info('🔧 Initializing Settings service...');

    try {
      // Ensure user data directory exists
      let userDataPath: string;
      if (electronApp) {
        userDataPath = electronApp.getPath('userData');
      } else {
        userDataPath = join(process.cwd(), 'test-settings');
      }

      if (!existsSync(userDataPath)) {
        mkdirSync(userDataPath, { recursive: true });
        logger.debug('📁 Created user data directory');
      }

      // Load existing settings or create defaults
      await this.loadSettings();

      // Migrate legacy settings if needed
      await this.migrateLegacySettings();

      this.isInitialized = true;
      logger.info('✅ Settings service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Settings service', error);
      throw error;
    }
  }

  /**
   * Load settings from file
   */
  private async loadSettings(): Promise<void> {
    try {
      if (existsSync(this.settingsPath)) {
        logger.debug('📖 Loading settings from file');
        const settingsData = readFileSync(this.settingsPath, 'utf8');
        const parsedSettings = JSON.parse(settingsData);

        // Merge with defaults to ensure all required fields exist
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
          // Ensure aiService is properly initialized
          aiService: {
            ...DEFAULT_SETTINGS.aiService,
            ...parsedSettings.aiService,
          },
        };

        logger.info('✅ Settings loaded from file');
      } else {
        logger.info('📝 No settings file found, using defaults');
        // Save defaults to file
        await this.saveSettings();
      }
    } catch (error) {
      logger.error('❌ Failed to load settings, using defaults', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save settings to file
   */
  private async saveSettings(): Promise<void> {
    try {
      // Don't save sensitive data to the settings file
      const settingsToSave = {
        ...this.settings,
        // Remove sensitive fields - they're stored in the token vault
        openAIApiKey: undefined,
        notionToken: undefined,
        slackBotToken: undefined,
        linearApiKey: undefined,
        aiService: {
          ...this.settings.aiService,
          localApiKey: undefined, // Don't save API key to settings file
        },
      };

      const settingsData = JSON.stringify(settingsToSave, null, 2);
      writeFileSync(this.settingsPath, settingsData, 'utf8');
      logger.debug('💾 Settings saved to file');
    } catch (error) {
      logger.error('❌ Failed to save settings', error);
      throw error;
    }
  }

  /**
   * Migrate legacy settings to new format
   */
  private async migrateLegacySettings(): Promise<void> {
    try {
      let needsMigration = false;

      // Check if legacy OpenAI API key exists in settings
      if (this.settings.openAIApiKey) {
        logger.info('🔄 Migrating legacy OpenAI API key to secure token vault');

        // Store in token vault
        await storeToken('openai', this.settings.openAIApiKey);

        // Update AI service configuration
        this.settings.aiService.provider = 'local';
        this.settings.aiService.localApiKey = 'stored-in-vault';

        // Remove from settings
        this.settings.openAIApiKey = undefined;
        needsMigration = true;
      }

      // Check if AI service configuration is missing
      if (!this.settings.aiService) {
        logger.info('🔄 Migrating to new AI service configuration');
        this.settings.aiService = {
          provider: 'local',
          localApiKey: undefined,
          cloudSubscription: undefined,
        };
        needsMigration = true;
      }

      if (needsMigration) {
        await this.saveSettings();
        logger.info('✅ Settings migration completed');
      }
    } catch (error) {
      logger.error('❌ Failed to migrate legacy settings', error);
      // Don't fail initialization for migration errors
    }
  }

  /**
   * Get current settings
   */
  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  public async updateSettings(
    updates: Partial<AppSettings>
  ): Promise<AppSettings> {
    logger.info('⚙️ Updating settings', { updates });

    try {
      // Merge updates with current settings
      this.settings = {
        ...this.settings,
        ...updates,
        // Handle AI service configuration carefully
        aiService: updates.aiService
          ? {
              ...this.settings.aiService,
              ...updates.aiService,
            }
          : this.settings.aiService,
      };

      // Save to file
      await this.saveSettings();

      logger.info('✅ Settings updated successfully');
      return this.getSettings();
    } catch (error) {
      logger.error('❌ Failed to update settings', error);
      throw error;
    }
  }

  /**
   * Configure AI service
   */
  public async configureAIService(config: AIServiceConfig): Promise<void> {
    logger.info(`🔧 Configuring AI service: ${config.provider}`);

    try {
      // Handle local API key storage
      if (config.provider === 'local' && config.localApiKey) {
        // Store API key securely in token vault
        await storeToken('openai', config.localApiKey);
        logger.debug('🔐 Local API key stored in token vault');

        // Update configuration (without storing the actual key)
        this.settings.aiService = {
          provider: 'local',
          localApiKey: 'stored-in-vault',
          cloudSubscription: undefined,
        };
      } else if (config.provider === 'cloud' && config.cloudSubscription) {
        // Store cloud API key in token vault
        await storeToken('firebase-cloud', config.cloudSubscription.apiKey);
        logger.debug('🔐 Cloud API key stored in token vault');

        // Update configuration (without storing the actual key)
        this.settings.aiService = {
          provider: 'cloud',
          localApiKey: undefined,
          cloudSubscription: {
            ...config.cloudSubscription,
            apiKey: 'stored-in-vault',
          },
        };
      }

      // Save settings
      await this.saveSettings();

      logger.info('✅ AI service configured successfully');
    } catch (error) {
      logger.error('❌ Failed to configure AI service', error);
      throw error;
    }
  }

  /**
   * Get AI service configuration with actual API keys
   */
  public async getAIServiceConfig(): Promise<AIServiceConfig> {
    const config = { ...this.settings.aiService };

    try {
      // Retrieve actual API keys from token vault
      if (
        config.provider === 'local' &&
        config.localApiKey === 'stored-in-vault'
      ) {
        const apiKey = await getToken('openai');
        config.localApiKey = apiKey || undefined;
      } else if (
        config.provider === 'cloud' &&
        config.cloudSubscription?.apiKey === 'stored-in-vault'
      ) {
        const apiKey = await getToken('firebase-cloud');
        if (config.cloudSubscription && apiKey) {
          config.cloudSubscription.apiKey = apiKey;
        }
      }

      return config;
    } catch (error) {
      logger.error('❌ Failed to get AI service configuration', error);
      return config;
    }
  }

  /**
   * Test API key for a specific provider
   */
  public async testAPIKey(
    provider: AIServiceProvider,
    apiKey?: string
  ): Promise<{
    success: boolean;
    error?: string;
    usage?: { remaining: number; limit: number };
  }> {
    logger.info(`🧪 Testing API key for provider: ${provider}`);

    try {
      if (provider === 'local') {
        // Test OpenAI API key
        const keyToTest = apiKey || (await getToken('openai'));
        if (!keyToTest) {
          return { success: false, error: 'No API key provided' };
        }

        // Import OpenAI dynamically to test
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: keyToTest });

        // Test with a simple embedding request
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: 'test connection',
        });

        if (response.data.length > 0) {
          logger.info('✅ Local API key test successful');
          return { success: true };
        } else {
          return { success: false, error: 'Empty response from OpenAI API' };
        }
      } else if (provider === 'cloud') {
        // Test Firebase Cloud API key (simulated for now)
        const keyToTest = apiKey || (await getToken('firebase-cloud'));
        if (!keyToTest) {
          return { success: false, error: 'No API key provided' };
        }

        // Simulate cloud API test
        await new Promise(resolve => setTimeout(resolve, 500));

        logger.info('✅ Cloud API key test successful (simulated)');
        return {
          success: true,
          usage: {
            remaining: 950,
            limit: 1000,
          },
        };
      }

      return { success: false, error: 'Unknown provider' };
    } catch (error) {
      logger.error(`❌ API key test failed for ${provider}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove API key for a provider
   */
  public async removeAPIKey(provider: AIServiceProvider): Promise<void> {
    logger.info(`🗑 Removing API key for provider: ${provider}`);

    try {
      if (provider === 'local') {
        await removeToken('openai');
        this.settings.aiService.localApiKey = undefined;
      } else if (provider === 'cloud') {
        await removeToken('firebase-cloud');
        this.settings.aiService.cloudSubscription = undefined;
      }

      // Reset provider to local if removing current provider
      if (this.settings.aiService.provider === provider) {
        this.settings.aiService.provider = 'local';
      }

      await this.saveSettings();
      logger.info('✅ API key removed successfully');
    } catch (error) {
      logger.error('❌ Failed to remove API key', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  public getStatus(): {
    initialized: boolean;
    settingsPath: string;
    currentProvider: AIServiceProvider;
    hasLocalKey: boolean;
    hasCloudKey: boolean;
  } {
    return {
      initialized: this.isInitialized,
      settingsPath: this.settingsPath,
      currentProvider: this.settings.aiService.provider,
      hasLocalKey: this.settings.aiService.localApiKey === 'stored-in-vault',
      hasCloudKey:
        this.settings.aiService.cloudSubscription?.apiKey === 'stored-in-vault',
    };
  }

  /**
   * Reset settings to defaults
   */
  public async resetToDefaults(): Promise<AppSettings> {
    logger.info('🔄 Resetting settings to defaults');

    try {
      // Remove stored API keys
      await this.removeAPIKey('local').catch(() => {}); // Don't fail if key doesn't exist
      await this.removeAPIKey('cloud').catch(() => {}); // Don't fail if key doesn't exist

      // Reset to defaults
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();

      logger.info('✅ Settings reset to defaults');
      return this.getSettings();
    } catch (error) {
      logger.error('❌ Failed to reset settings', error);
      throw error;
    }
  }

  /**
   * Configure third-party token (Phase 3.5.2)
   */
  public async configureThirdPartyToken(
    service: ApiService,
    token: string
  ): Promise<void> {
    logger.info(`🔐 Configuring third-party token for service: ${service}`);

    try {
      // Validate token format
      if (!validateToken(service, token)) {
        throw new Error(
          `Invalid token format for ${service}. Please check the token and try again.`
        );
      }

      // Store token securely in vault
      await storeToken(service, token);

      logger.info(
        `✅ Third-party token configured successfully for service: ${service}`
      );
    } catch (error) {
      logger.error(
        `❌ Failed to configure third-party token for ${service}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get token status for all services (Phase 3.5.2)
   */
  public async getTokenStatus(): Promise<
    Array<{
      service: ApiService;
      exists: boolean;
      lastUpdated?: Date;
    }>
  > {
    logger.debug('📊 Getting token status for all services');

    try {
      const services: ApiService[] = [
        'openai',
        'notion',
        'slack',
        'linear',
        'firebase-cloud',
      ];
      const status = [];

      for (const service of services) {
        const exists = await isTokenStored(service);

        // For now, we don't track lastUpdated in the database schema
        // This could be enhanced in the future with database timestamps
        status.push({
          service,
          exists,
          lastUpdated: exists ? new Date() : undefined, // Placeholder
        });
      }

      logger.debug(`✅ Token status retrieved for ${status.length} services`);
      return status;
    } catch (error) {
      logger.error('❌ Failed to get token status', error);
      throw error;
    }
  }

  /**
   * Remove third-party token (Phase 3.5.2)
   */
  public async removeThirdPartyToken(service: ApiService): Promise<void> {
    logger.info(`🗑️ Removing third-party token for service: ${service}`);

    try {
      await removeToken(service);
      logger.info(
        `✅ Third-party token removed successfully for service: ${service}`
      );
    } catch (error) {
      logger.error(
        `❌ Failed to remove third-party token for ${service}`,
        error
      );
      throw error;
    }
  }

  /**
   * Test third-party token connectivity (Phase 3.5.2)
   */
  public async testThirdPartyToken(
    service: ApiService,
    token?: string
  ): Promise<{
    success: boolean;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    logger.info(`🧪 Testing third-party token for service: ${service}`);

    try {
      const tokenToTest = token || (await getToken(service));
      if (!tokenToTest) {
        return { success: false, error: 'No token provided or stored' };
      }

      // Validate token format first
      if (!validateToken(service, tokenToTest)) {
        return {
          success: false,
          error: `Invalid token format for ${service}`,
        };
      }

      // Service-specific testing logic
      switch (service) {
        case 'notion':
          // TODO: Implement actual Notion API test when integration is ready
          // For now, simulate a test
          await new Promise(resolve => setTimeout(resolve, 500));
          return {
            success: true,
            details: { message: 'Token format valid (full test pending)' },
          };

        case 'slack':
          // TODO: Implement actual Slack API test when integration is ready
          await new Promise(resolve => setTimeout(resolve, 500));
          return {
            success: true,
            details: { message: 'Token format valid (full test pending)' },
          };

        case 'linear':
          // TODO: Implement actual Linear API test when integration is ready
          await new Promise(resolve => setTimeout(resolve, 500));
          return {
            success: true,
            details: { message: 'Token format valid (full test pending)' },
          };

        default:
          return {
            success: false,
            error: `Testing not implemented for service: ${service}`,
          };
      }
    } catch (error) {
      logger.error(`❌ Third-party token test failed for ${service}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if any required third-party providers are missing tokens (Phase 3.5.2)
   */
  public async getMissingTokenWarnings(): Promise<string[]> {
    logger.debug('🔍 Checking for missing token warnings');

    try {
      const warnings: string[] = [];

      // Define which services are "required" for certain features
      // This can be customized based on actual app requirements
      const optionalServices: ApiService[] = ['notion', 'slack', 'linear'];

      for (const service of optionalServices) {
        const exists = await isTokenStored(service);
        if (!exists) {
          const serviceName =
            service.charAt(0).toUpperCase() + service.slice(1);
          warnings.push(`${serviceName} integration not configured`);
        }
      }

      return warnings;
    } catch (error) {
      logger.error('❌ Failed to check missing token warnings', error);
      return [];
    }
  }
}
