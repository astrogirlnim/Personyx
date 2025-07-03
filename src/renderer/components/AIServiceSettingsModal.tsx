/**
 * AI Service Settings Modal Component
 * Phase 3.5.1 - AI Service Settings Modal
 *
 * Provides UI for managing AI service configuration including:
 * - Provider selection (Local vs Cloud vs Auto)
 * - OpenAI API key management
 * - Personyx Cloud subscription status
 * - Connectivity testing
 * - Evidence Gate design compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  useSettings,
  getCurrentAIProvider,
  hasLocalAPIKey,
  hasCloudSubscription,
  isProviderReady,
} from '../hooks/useSettings';
import type { AIServiceProvider, AIServiceConfig } from '../../shared/types';

interface AIServiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIServiceSettingsModal({
  isOpen,
  onClose,
}: AIServiceSettingsModalProps): JSX.Element | null {
  const {
    settings,
    loading,
    error,
    isTestingApiKey,
    lastTestResult,
    cloudSubscriptionInfo,
    configureAIService,
    testAPIKey,
    getCloudSubscriptionInfo,
    clearError,
    setTestResult,
    logSettingsActivity,
  } = useSettings();

  // Local component state
  const [selectedProvider, setSelectedProvider] =
    useState<AIServiceProvider>('local');
  const [localApiKey, setLocalApiKey] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setLocalApiKey('');
      setHasUnsavedChanges(false);
      setShowApiKey(false);
      clearError();
    } else if (settings) {
      setSelectedProvider(getCurrentAIProvider(settings));
      // Load cloud subscription info when modal opens
      if (getCurrentAIProvider(settings) === 'cloud') {
        getCloudSubscriptionInfo().catch(err =>
          console.warn('Failed to load cloud subscription info:', err)
        );
      }
    }
  }, [isOpen, settings, clearError, getCloudSubscriptionInfo]);

  // Track changes for unsaved state
  useEffect(() => {
    if (settings) {
      const currentProvider = getCurrentAIProvider(settings);
      const hasProviderChanged = selectedProvider !== currentProvider;
      const hasKeyChanged =
        localApiKey.trim() !== '' && selectedProvider === 'local';

      setHasUnsavedChanges(hasProviderChanged || hasKeyChanged);
    }
  }, [selectedProvider, localApiKey, settings]);

  const validateApiKey = useCallback((key: string): boolean => {
    if (!key || key.trim() === '') return false;

    // Basic OpenAI API key validation
    const trimmedKey = key.trim();
    if (!trimmedKey.startsWith('sk-')) return false;
    if (trimmedKey.length < 40) return false;

    return true;
  }, []);

  const handleProviderChange = useCallback(
    (provider: AIServiceProvider) => {
      setSelectedProvider(provider);
      clearError();

      // Clear API key when switching away from local
      if (provider !== 'local') {
        setLocalApiKey('');
      }

      // Load cloud info when switching to cloud
      if (provider === 'cloud') {
        getCloudSubscriptionInfo().catch(err =>
          console.warn('Failed to load cloud subscription info:', err)
        );
      }
    },
    [clearError, getCloudSubscriptionInfo]
  );

  const handleApiKeyChange = useCallback(
    (value: string) => {
      setLocalApiKey(value);
      clearError();
    },
    [clearError]
  );

  const handleTestConnection = useCallback(async () => {
    setIsValidatingKey(true);
    clearError();

    console.log('🧪 Testing connection for provider:', selectedProvider);

    try {
      if (selectedProvider === 'local') {
        if (!localApiKey.trim()) {
          throw new Error('Please enter an API key to test');
        }
        if (!validateApiKey(localApiKey)) {
          throw new Error(
            'Invalid API key format. OpenAI keys should start with "sk-" and be at least 40 characters'
          );
        }
        // Let testAPIKey handle the actual API validation and error setting
        await testAPIKey('local', localApiKey.trim());
      } else if (selectedProvider === 'cloud') {
        await testAPIKey('cloud');
      }

      console.log('✅ Connection test completed');
    } catch (err) {
      console.error('❌ Connection test failed:', err);
      // Handle validation errors by setting the test result directly
      const errorMessage =
        err instanceof Error ? err.message : 'Connection test failed';

      setTestResult({
        provider: selectedProvider,
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsValidatingKey(false);
    }
  }, [
    selectedProvider,
    localApiKey,
    validateApiKey,
    testAPIKey,
    clearError,
    setTestResult,
  ]);

  const handleSave = useCallback(async () => {
    try {
      clearError();

      console.log('💾 Saving AI service configuration...');

      // Prepare configuration
      const config: AIServiceConfig = {
        provider: selectedProvider,
      };

      // Add local API key if provided
      if (selectedProvider === 'local' && localApiKey.trim()) {
        if (!validateApiKey(localApiKey)) {
          throw new Error(
            'Invalid API key format. OpenAI keys should start with "sk-" and be at least 40 characters'
          );
        }
        config.localApiKey = localApiKey.trim();
      }

      // Configure the AI service
      await configureAIService(config);

      // Log the configuration activity
      await logSettingsActivity('AI service configured', {
        provider: selectedProvider,
        hasLocalKey: selectedProvider === 'local' && !!localApiKey.trim(),
        timestamp: new Date().toISOString(),
      });

      console.log('✅ AI service configuration saved successfully');

      // Reset local state
      setLocalApiKey('');
      setHasUnsavedChanges(false);

      // Close modal after brief delay to show success
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('❌ Failed to save AI service configuration:', err);
      // Error is handled by the hook
    }
  }, [
    selectedProvider,
    localApiKey,
    validateApiKey,
    configureAIService,
    logSettingsActivity,
    onClose,
    clearError,
  ]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (
        confirm('You have unsaved changes. Are you sure you want to close?')
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (
          hasUnsavedChanges &&
          !loading &&
          !isTestingApiKey &&
          !isValidatingKey
        ) {
          handleSave();
        }
      }
    },
    [
      handleClose,
      handleSave,
      hasUnsavedChanges,
      loading,
      isTestingApiKey,
      isValidatingKey,
    ]
  );

  // Don't render if modal is not open
  if (!isOpen) return null;

  const currentProvider = getCurrentAIProvider(settings);
  const hasLocalKey = hasLocalAPIKey(settings);
  const hasCloudSub = hasCloudSubscription(settings);
  const isLocalReady = isProviderReady(settings, 'local');
  const isCloudReady = isProviderReady(settings, 'cloud');

  return (
    <div
      className="fixed inset-0 bg-slate/50 dark:bg-slate-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-paper dark:bg-paper-dark rounded-lg shadow-md border border-graphite dark:border-graphite-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-graphite dark:border-graphite-dark">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-evidence/10 dark:bg-evidence-dark/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-evidence dark:text-evidence-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-h2 text-slate dark:text-slate-dark font-semibold">
                AI Service Settings
              </h2>
              <p className="text-caption text-steel dark:text-steel-dark">
                Configure your AI provider and API keys
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
            aria-label="Close settings"
          >
            <svg
              className="w-5 h-5 text-slate dark:text-slate-dark"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          {settings && (
            <div className="bg-mist dark:bg-mist-dark/20 rounded-lg p-4 border border-graphite/20 dark:border-graphite-dark/20">
              <h3 className="text-body font-medium text-slate dark:text-slate-dark mb-2">
                Current Configuration
              </h3>
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isLocalReady || isCloudReady
                      ? 'bg-persona'
                      : 'bg-steel dark:bg-steel-dark'
                  }`}
                />
                <span className="text-body text-slate dark:text-slate-dark">
                  {currentProvider === 'local'
                    ? `OpenAI API (${hasLocalKey ? 'Configured' : 'Not Configured'})`
                    : `Personyx Cloud (${hasCloudSub ? 'Active' : 'Not Configured'})`}
                </span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-body text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-4">
            <h3 className="text-body font-medium text-slate dark:text-slate-dark">
              AI Provider
            </h3>

            <div className="space-y-3">
              {/* Local Provider */}
              <label className="flex items-start space-x-3 p-4 border border-graphite dark:border-graphite-dark rounded-lg hover:border-evidence dark:hover:border-evidence-dark transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value="local"
                  checked={selectedProvider === 'local'}
                  onChange={e =>
                    handleProviderChange(e.target.value as AIServiceProvider)
                  }
                  className="mt-1 w-4 h-4 text-evidence dark:text-evidence-dark focus:ring-evidence dark:focus:ring-evidence-dark border-graphite dark:border-graphite-dark"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-body font-medium text-slate dark:text-slate-dark">
                      Local (OpenAI API)
                    </span>
                    {isLocalReady && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-persona/10 text-persona">
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-steel dark:text-steel-dark mt-1">
                    Use your own OpenAI API key. Data stays secure and private.
                  </p>
                </div>
              </label>

              {/* Cloud Provider */}
              <label className="flex items-start space-x-3 p-4 border border-graphite dark:border-graphite-dark rounded-lg hover:border-evidence dark:hover:border-evidence-dark transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value="cloud"
                  checked={selectedProvider === 'cloud'}
                  onChange={e =>
                    handleProviderChange(e.target.value as AIServiceProvider)
                  }
                  className="mt-1 w-4 h-4 text-evidence dark:text-evidence-dark focus:ring-evidence dark:focus:ring-evidence-dark border-graphite dark:border-graphite-dark"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-body font-medium text-slate dark:text-slate-dark">
                      Personyx Cloud
                    </span>
                    {isCloudReady && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-persona/10 text-persona">
                        Active
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-insight/10 text-insight">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-caption text-steel dark:text-steel-dark mt-1">
                    Managed AI service with automatic updates and scaling.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Local API Key Configuration */}
          {selectedProvider === 'local' && (
            <div className="space-y-4">
              <h3 className="text-body font-medium text-slate dark:text-slate-dark">
                OpenAI API Key
              </h3>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={localApiKey}
                    onChange={e => handleApiKeyChange(e.target.value)}
                    placeholder="sk-..."
                    className="w-full p-3 pr-12 border border-graphite dark:border-graphite-dark rounded-lg bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:border-evidence dark:focus:border-evidence-dark focus:outline-none"
                    disabled={loading || isTestingApiKey}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-steel dark:text-steel-dark hover:text-slate dark:hover:text-slate-dark"
                  >
                    {showApiKey ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <p className="text-caption text-steel dark:text-steel-dark">
                  Your API key is encrypted and stored securely on your device.
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-evidence dark:text-evidence-dark hover:underline ml-1"
                  >
                    Get your API key from OpenAI
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Cloud Subscription Info */}
          {selectedProvider === 'cloud' && cloudSubscriptionInfo && (
            <div className="space-y-4">
              <h3 className="text-body font-medium text-slate dark:text-slate-dark">
                Cloud Subscription
              </h3>

              {cloudSubscriptionInfo.error ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-body text-yellow-700 dark:text-yellow-300">
                    {cloudSubscriptionInfo.error}
                  </p>
                </div>
              ) : cloudSubscriptionInfo.subscription ? (
                <div className="space-y-3">
                  <div className="bg-mist dark:bg-mist-dark/20 rounded-lg p-4 border border-graphite/20 dark:border-graphite-dark/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-body text-slate dark:text-slate-dark">
                        Plan: {cloudSubscriptionInfo.subscription.tier}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-persona/10 text-persona">
                        Active
                      </span>
                    </div>

                    {cloudSubscriptionInfo.subscription.usageLimit && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-caption text-steel dark:text-steel-dark">
                          <span>Usage</span>
                          <span>
                            {cloudSubscriptionInfo.subscription
                              .usageRemaining || 0}{' '}
                            / {cloudSubscriptionInfo.subscription.usageLimit}
                          </span>
                        </div>
                        <div className="w-full bg-graphite/20 dark:bg-graphite-dark/20 rounded-full h-2">
                          <div
                            className="bg-persona h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  ((cloudSubscriptionInfo.subscription
                                    .usageRemaining || 0) /
                                    cloudSubscriptionInfo.subscription
                                      .usageLimit) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      window.open('https://personyx.com/billing', '_blank')
                    }
                    className="text-evidence dark:text-evidence-dark hover:underline text-body"
                  >
                    Manage Subscription →
                  </button>
                </div>
              ) : (
                <div className="bg-mist dark:bg-mist-dark/20 rounded-lg p-4 border border-graphite/20 dark:border-graphite-dark/20">
                  <p className="text-body text-slate dark:text-slate-dark mb-2">
                    No active subscription
                  </p>
                  <button
                    onClick={() =>
                      window.open('https://personyx.com/pricing', '_blank')
                    }
                    className="text-evidence dark:text-evidence-dark hover:underline text-body"
                  >
                    View Pricing →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Test Connection */}
          <div className="space-y-4">
            <h3 className="text-body font-medium text-slate dark:text-slate-dark">
              Test Connection
            </h3>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleTestConnection}
                disabled={
                  loading ||
                  isTestingApiKey ||
                  isValidatingKey ||
                  (selectedProvider === 'local' && !localApiKey.trim())
                }
                className="flex items-center space-x-2 px-4 py-2 bg-evidence dark:bg-evidence-dark text-paper dark:text-paper-dark rounded-lg hover:bg-evidence/90 dark:hover:bg-evidence-dark/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTestingApiKey || isValidatingKey ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper dark:border-paper-dark"></div>
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              {lastTestResult && (
                <div
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                    lastTestResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  }`}
                >
                  {lastTestResult.success ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                  <span className="text-caption">
                    {lastTestResult.success
                      ? 'Connected successfully'
                      : lastTestResult.error || 'Connection failed'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-graphite dark:border-graphite-dark bg-mist/30 dark:bg-mist-dark/10">
          <div className="flex items-center space-x-2 text-caption text-steel dark:text-steel-dark">
            {hasUnsavedChanges && (
              <>
                <div className="w-2 h-2 bg-evidence dark:bg-evidence-dark rounded-full"></div>
                <span>Unsaved changes</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-slate dark:text-slate-dark hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                !hasUnsavedChanges ||
                loading ||
                isTestingApiKey ||
                isValidatingKey
              }
              className="px-4 py-2 bg-evidence dark:bg-evidence-dark text-paper dark:text-paper-dark rounded-lg hover:bg-evidence/90 dark:hover:bg-evidence-dark/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper dark:border-paper-dark"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
