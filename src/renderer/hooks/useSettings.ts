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

// Additional types for Phase 3.5.2
export interface TokenStatus {
  service: string;
  exists: boolean;
  lastUpdated?: Date;
}

export interface ThirdPartyTokenTestResult {
  service: string;
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

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
  // Phase 3.5.2: Third-party token state
  tokenStatus: TokenStatus[];
  isTestingThirdPartyToken: boolean;
  lastThirdPartyTestResult: ThirdPartyTokenTestResult | null;
  missingTokenWarnings: string[];
}

export interface SettingsActions {
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  configureAIService: (config: AIServiceConfig) => Promise<void>;
  testAPIKey: (provider: AIServiceProvider, apiKey?: string) => Promise<void>;
  getCloudSubscriptionInfo: () => Promise<void>;
  clearError: () => void;
  setTestResult: (result: {
    provider: AIServiceProvider;
    success: boolean;
    error?: string;
    usage?: { remaining: number; limit: number };
  }) => void;
  logSettingsActivity: (
    description: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  // Phase 3.5.2: Third-party token management actions
  setThirdPartyToken: (service: string, token: string) => Promise<void>;
  testThirdPartyToken: (service: string, token?: string) => Promise<void>;
  removeThirdPartyToken: (service: string) => Promise<void>;
  refreshTokenStatus: () => Promise<void>;
  loadMissingTokenWarnings: () => Promise<void>;
}

export function useSettings(): SettingsState & SettingsActions {
  const [state, setState] = useState<SettingsState>({
    settings: null,
    loading: false,
    error: null,
    isTestingApiKey: false,
    lastTestResult: null,
    cloudSubscriptionInfo: null,
    // Phase 3.5.2: Initialize third-party token state
    tokenStatus: [],
    isTestingThirdPartyToken: false,
    lastThirdPartyTestResult: null,
    missingTokenWarnings: [],
  });

  // Extract individual state values for backward compatibility
  const settings = state.settings;
  const loading = state.loading;
  const error = state.error;
  const isTestingApiKey = state.isTestingApiKey;
  const lastTestResult = state.lastTestResult;
  const cloudSubscriptionInfo = state.cloudSubscriptionInfo;

  /**
   * Load settings from main process
   */
  const loadSettings = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      console.log('🔧 Loading application settings...');
      const result = await window.electronAPI.getSettings();

      console.log('✅ Settings loaded successfully:', result);
      setState(prev => ({
        ...prev,
        settings: result as AppSettings,
        loading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load settings';
      console.error('❌ Failed to load settings:', err);
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  }, []);

  /**
   * Update settings
   */
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      console.log('🔧 Updating settings:', updates);
      const result = await window.electronAPI.updateSettings(updates);

      console.log('✅ Settings updated successfully:', result);
      setState(prev => ({ ...prev, settings: result as AppSettings }));

      // Log the settings update activity
      await logSettingsActivity('Settings updated', {
        updatedFields: Object.keys(updates),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update settings';
      console.error('❌ Failed to update settings:', err);
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err; // Re-throw so UI can handle it
    }
  }, []);

  /**
   * Configure AI service
   */
  const configureAIService = useCallback(
    async (config: AIServiceConfig) => {
      try {
        setState(prev => ({ ...prev, error: null }));

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
        setState(prev => ({ ...prev, error: errorMessage }));
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
        setState(prev => ({
          ...prev,
          isTestingApiKey: true,
          error: null,
          lastTestResult: null,
        }));

        console.log('🧪 Testing API key for provider:', provider);
        const result = await window.electronAPI.testAPIKey(provider, apiKey);

        console.log('✅ API key test completed:', result);
        setState(prev => ({
          ...prev,
          lastTestResult: result as SettingsState['lastTestResult'],
          isTestingApiKey: false,
        }));

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
        setState(prev => ({
          ...prev,
          error: errorMessage,
          lastTestResult: {
            provider,
            success: false,
            error: errorMessage,
          },
          isTestingApiKey: false,
        }));
      }
    },
    []
  );

  /**
   * Get cloud subscription info
   */
  const getCloudSubscriptionInfo = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      console.log('📊 Getting cloud subscription info...');
      const result = await window.electronAPI.getCloudSubscriptionInfo();

      console.log('✅ Cloud subscription info retrieved:', result);
      setState(prev => ({
        ...prev,
        cloudSubscriptionInfo: result as SettingsState['cloudSubscriptionInfo'],
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to get cloud subscription info';
      console.error('❌ Failed to get cloud subscription info:', err);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        cloudSubscriptionInfo: { error: errorMessage },
      }));
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Set test result manually (for frontend validation errors)
   */
  const setTestResult = useCallback(
    (result: {
      provider: AIServiceProvider;
      success: boolean;
      error?: string;
      usage?: { remaining: number; limit: number };
    }) => {
      setState(prev => ({ ...prev, lastTestResult: result }));
    },
    []
  );

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
        setState(prevState => ({
          ...prevState,
          settings: updateData.settings,
        }));
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

      setState(prev => ({ ...prev, lastTestResult: testData }));
      setState(prev => ({ ...prev, isTestingApiKey: false }));
    };

    // Listen for cloud subscription info
    const handleCloudSubscriptionInfo = (data: unknown) => {
      console.log('📢 Cloud subscription info received:', data);
      setState(prevState => ({
        ...prevState,
        cloudSubscriptionInfo: data as SettingsState['cloudSubscriptionInfo'],
      }));
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
    // Phase 3.5.2: Third-party token state
    tokenStatus: state.tokenStatus,
    isTestingThirdPartyToken: state.isTestingThirdPartyToken,
    lastThirdPartyTestResult: state.lastThirdPartyTestResult,
    missingTokenWarnings: state.missingTokenWarnings,

    // Actions
    loadSettings,
    updateSettings,
    configureAIService,
    testAPIKey,
    getCloudSubscriptionInfo,
    clearError,
    setTestResult,
    logSettingsActivity,
    // Phase 3.5.2: Third-party token actions (placeholder implementations)
    setThirdPartyToken: async (service: string, _token: string) => {
      console.log('🔐 setThirdPartyToken not yet implemented', { service });
    },
    testThirdPartyToken: async (service: string, _token?: string) => {
      console.log('🧪 testThirdPartyToken not yet implemented', { service });
    },
    removeThirdPartyToken: async (service: string) => {
      console.log('🗑️ removeThirdPartyToken not yet implemented', { service });
    },
    refreshTokenStatus: async () => {
      console.log('📊 refreshTokenStatus not yet implemented');
    },
    loadMissingTokenWarnings: async () => {
      console.log('⚠️ loadMissingTokenWarnings not yet implemented');
    },
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
