/**
 * Settings Hook
 * Phase 3.5.1 - AI Service Settings Modal
 *
 * Manages application settings state and provides methods for settings operations
 * Supports caching, real-time updates, and secure API key management
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  AppSettings,
  AIServiceConfig,
  AIServiceProvider,
} from '../../shared/types';

export interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  isTestingApiKey: boolean;
  lastTestResult: {
    provider: AIServiceProvider;
    success: boolean;
    error?: string;
    usage?: { remaining: number; limit: number };
  } | null;
  cloudSubscriptionInfo: {
    subscription?: AIServiceConfig['cloudSubscription'];
    error?: string;
  } | null;
}

export interface SettingsActions {
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  configureAIService: (config: AIServiceConfig) => Promise<void>;
  testAPIKey: (provider: AIServiceProvider, apiKey?: string) => Promise<void>;
  getCloudSubscriptionInfo: () => Promise<void>;
  clearError: () => void;
  logSettingsActivity: (
    description: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
}

export function useSettings(): SettingsState & SettingsActions {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [lastTestResult, setLastTestResult] =
    useState<SettingsState['lastTestResult']>(null);
  const [cloudSubscriptionInfo, setCloudSubscriptionInfo] =
    useState<SettingsState['cloudSubscriptionInfo']>(null);

  /**
   * Load settings from main process
   */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔧 Loading application settings...');
      const result = await window.electronAPI.getSettings();

      console.log('✅ Settings loaded successfully:', result);
      setSettings(result as AppSettings);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load settings';
      console.error('❌ Failed to load settings:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update settings
   */
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      setError(null);

      console.log('🔧 Updating settings:', updates);
      const result = await window.electronAPI.updateSettings(updates);

      console.log('✅ Settings updated successfully:', result);
      setSettings(result as AppSettings);

      // Log the settings update activity
      await logSettingsActivity('Settings updated', {
        updatedFields: Object.keys(updates),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update settings';
      console.error('❌ Failed to update settings:', err);
      setError(errorMessage);
      throw err; // Re-throw so UI can handle it
    }
  }, []);

  /**
   * Configure AI service
   */
  const configureAIService = useCallback(
    async (config: AIServiceConfig) => {
      try {
        setError(null);

        console.log('🔧 Configuring AI service:', {
          provider: config.provider,
        });
        const result = await window.electronAPI.configureAIService(config);

        console.log('✅ AI service configured successfully:', result);

        // Reload settings to get updated state
        await loadSettings();

        // Log the AI service configuration activity
        await logSettingsActivity('AI service configured', {
          provider: config.provider,
          hasLocalKey: !!config.localApiKey,
          hasCloudSubscription: !!config.cloudSubscription,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to configure AI service';
        console.error('❌ Failed to configure AI service:', err);
        setError(errorMessage);
        throw err; // Re-throw so UI can handle it
      }
    },
    [loadSettings]
  );

  /**
   * Test API key
   */
  const testAPIKey = useCallback(
    async (provider: AIServiceProvider, apiKey?: string) => {
      try {
        setIsTestingApiKey(true);
        setError(null);
        setLastTestResult(null);

        console.log('🧪 Testing API key for provider:', provider);
        const result = await window.electronAPI.testAPIKey(provider, apiKey);

        console.log('✅ API key test completed:', result);
        setLastTestResult(result as SettingsState['lastTestResult']);

        // Log the API key test activity
        await logSettingsActivity('API key tested', {
          provider,
          success: Boolean((result as { success?: boolean }).success),
          hasUsageInfo: Boolean((result as { usage?: unknown }).usage),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to test API key';
        console.error('❌ Failed to test API key:', err);
        setError(errorMessage);
        setLastTestResult({
          provider,
          success: false,
          error: errorMessage,
        });
      } finally {
        setIsTestingApiKey(false);
      }
    },
    []
  );

  /**
   * Get cloud subscription info
   */
  const getCloudSubscriptionInfo = useCallback(async () => {
    try {
      setError(null);

      console.log('📊 Getting cloud subscription info...');
      const result = await window.electronAPI.getCloudSubscriptionInfo();

      console.log('✅ Cloud subscription info retrieved:', result);
      setCloudSubscriptionInfo(
        result as SettingsState['cloudSubscriptionInfo']
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to get cloud subscription info';
      console.error('❌ Failed to get cloud subscription info:', err);
      setError(errorMessage);
      setCloudSubscriptionInfo({ error: errorMessage });
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Log settings-related activity
   */
  const logSettingsActivity = useCallback(
    async (description: string, metadata?: Record<string, unknown>) => {
      try {
        await window.electronAPI.logGeneralActivity({
          type: 'general-activity',
          title: 'Settings Activity',
          description,
          source: 'settings',
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.warn('⚠️ Failed to log settings activity:', err);
        // Don't throw - activity logging is not critical
      }
    },
    []
  );

  /**
   * Set up event listeners for real-time updates
   */
  useEffect(() => {
    console.log('🔧 Setting up settings event listeners...');

    // Listen for settings updates from main process
    const handleSettingsUpdated = (data: unknown) => {
      console.log('📢 Settings updated event received:', data);
      const updateData = data as { settings: AppSettings };
      if (updateData?.settings) {
        setSettings(updateData.settings);
      }
    };

    // Listen for API key test results
    const handleApiKeyTestResult = (data: unknown) => {
      console.log('📢 API key test result received:', data);
      const testData = data as {
        provider: AIServiceProvider;
        success: boolean;
        error?: string;
        usage?: { remaining: number; limit: number };
      };

      setLastTestResult(testData);
      setIsTestingApiKey(false);
    };

    // Listen for cloud subscription info
    const handleCloudSubscriptionInfo = (data: unknown) => {
      console.log('📢 Cloud subscription info received:', data);
      setCloudSubscriptionInfo(data as SettingsState['cloudSubscriptionInfo']);
    };

    // Register event listeners
    window.electronAPI.onSettingsUpdated(handleSettingsUpdated);
    window.electronAPI.onApiKeyTestResult(handleApiKeyTestResult);
    window.electronAPI.onCloudSubscriptionInfo(handleCloudSubscriptionInfo);

    // Load initial settings
    loadSettings();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up settings event listeners');
      window.electronAPI.removeAllListeners('settings-updated');
      window.electronAPI.removeAllListeners('api-key-test-result');
      window.electronAPI.removeAllListeners('cloud-subscription-info');
    };
  }, [loadSettings]);

  return {
    // State
    settings,
    loading,
    error,
    isTestingApiKey,
    lastTestResult,
    cloudSubscriptionInfo,

    // Actions
    loadSettings,
    updateSettings,
    configureAIService,
    testAPIKey,
    getCloudSubscriptionInfo,
    clearError,
    logSettingsActivity,
  };
}

/**
 * Helper function to get current AI provider from settings
 */
export function getCurrentAIProvider(
  settings: AppSettings | null
): AIServiceProvider {
  return settings?.aiService?.provider || 'local';
}

/**
 * Helper function to check if local API key is configured
 */
export function hasLocalAPIKey(settings: AppSettings | null): boolean {
  return !!(
    settings?.aiService?.localApiKey &&
    settings.aiService.localApiKey !== 'stored-in-vault'
  );
}

/**
 * Helper function to check if cloud subscription is configured
 */
export function hasCloudSubscription(settings: AppSettings | null): boolean {
  return !!settings?.aiService?.cloudSubscription?.apiKey;
}

/**
 * Helper function to check if provider is ready
 */
export function isProviderReady(
  settings: AppSettings | null,
  provider: AIServiceProvider
): boolean {
  if (!settings) return false;

  switch (provider) {
    case 'local':
      return hasLocalAPIKey(settings);
    case 'cloud':
      return hasCloudSubscription(settings);
    default:
      return false;
  }
}
