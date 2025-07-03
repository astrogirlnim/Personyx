/**
 * Preload script for Personyx
 * Exposes secure APIs to renderer processes
 */

import { contextBridge, ipcRenderer } from 'electron';

// Define the electron API interface
interface ElectronAPI {
  // File operations
  openFileDialog: () => void;
  handleTrayFileDrop: (filePath: string) => void;
  handleTrayFileDropWithContent: (
    fileName: string,
    fileContent: string
  ) => void;
  importPRD: (filePath: string) => Promise<unknown>;
  importTranscript: (filePath: string) => Promise<unknown>;

  // App operations
  getPersonas: () => Promise<unknown>;
  chatWithPersona: (
    personaId: string,
    message: string,
    context?: string
  ) => Promise<unknown>;
  getEvidenceScores: (documentId: string) => Promise<unknown>;
  similaritySearch: (
    query: string,
    personaId?: string,
    topN?: number,
    minSimilarity?: number
  ) => Promise<unknown>;

  // Phase 3.5.1: Settings operations
  getSettings: () => Promise<unknown>;
  updateSettings: (updates: unknown) => Promise<unknown>;
  configureAIService: (config: unknown) => Promise<unknown>;
  testAPIKey: (provider: string, apiKey?: string) => Promise<unknown>;
  getCloudSubscriptionInfo: () => Promise<unknown>;

  // Phase 3.5.2: Third-party token management operations
  setThirdPartyToken: (service: string, token: string) => Promise<unknown>;
  getTokenStatus: () => Promise<unknown>;
  testThirdPartyToken: (service: string, token?: string) => Promise<unknown>;
  removeThirdPartyToken: (service: string) => Promise<unknown>;
  getMissingTokenWarnings: () => Promise<unknown>;

  // Phase 3.5.3: Persona manager operations
  getPersonasConfig: () => Promise<unknown>;
  savePersonasConfig: (yaml: string) => Promise<unknown>;
  reloadPersonas: () => Promise<unknown>;

  // Phase 3.1.6: Activity log operations
  getActivityLog: (options?: {
    page?: number;
    limit?: number;
    filter?: unknown;
  }) => Promise<unknown>;
  getActivityLogStats: () => Promise<unknown>;
  clearActivityLog: () => Promise<unknown>;
  exportActivityLog: (
    format: 'csv' | 'json',
    filter?: unknown
  ) => Promise<unknown>;

  // Phase 3.1.6: Log general activity
  logGeneralActivity: (data: {
    type: string;
    title: string;
    description?: string;
    source: string;
    metadata?: unknown;
  }) => Promise<unknown>;

  // Event listeners
  onEvidenceScoreUpdated: (callback: (data: unknown) => void) => void;
  onTranscriptIngested: (callback: (data: unknown) => void) => void;
  onPRDImported: (callback: (data: unknown) => void) => void;
  onAppReady: (callback: () => void) => void;
  onError: (callback: (error: unknown) => void) => void;
  // Phase 3.1.4: Global error toast listener
  onGlobalError: (callback: (error: unknown) => void) => void;
  // Phase 3.1.7: Success toast listener
  onTranscriptSuccessToast: (callback: (data: unknown) => void) => void;
  // Phase 3.1.6: Activity log listener
  onActivityLogUpdated: (callback: (data: unknown) => void) => void;
  // Phase 3.5.1: Settings event listeners
  onSettingsUpdated: (callback: (data: unknown) => void) => void;
  onApiKeyTestResult: (callback: (data: unknown) => void) => void;
  onCloudSubscriptionInfo: (callback: (data: unknown) => void) => void;
  onOpenSettingsWindow: (callback: () => void) => void;
  onOpenChatWindow: (callback: () => void) => void;
  onOpenImportModalWithFile: (
    callback: (data: { filePath: string }) => void
  ) => void;
  onOpenImportModalWithFileContent: (
    callback: (data: {
      fileName: string;
      fileContent: string;
      fileSize: number;
    }) => void
  ) => void;
  onOpenImportTranscriptModalWithFile: (
    callback: (data: { filePath: string }) => void
  ) => void;
  onOpenImportTranscriptModalWithFileContent: (
    callback: (data: {
      fileName: string;
      fileContent: string;
      fileSize: number;
    }) => void
  ) => void;

  // Phase 3.5.2: Third-party token management event listeners
  onTokenStatusUpdated: (callback: (data: unknown) => void) => void;
  onThirdPartyTokenTestResult: (callback: (data: unknown) => void) => void;

  // Phase 3.5.3: Persona manager event listeners
  onPersonasUpdated: (callback: (data: unknown) => void) => void;
  onOpenPersonaManagerWindow: (callback: () => void) => void;

  // Cleanup
  removeAllListeners: (channel: string) => void;
}

// Expose secure APIs to renderer
const electronAPI: ElectronAPI = {
  // File operations
  openFileDialog: () => {
    console.log('📂 Opening file dialog from drop zone');
    ipcRenderer.send('open-file-dialog');
  },

  handleTrayFileDrop: (filePath: string) => {
    console.log('🗂️ Tray file drop:', filePath);
    ipcRenderer.send('tray-file-drop', { filePath });
  },

  handleTrayFileDropWithContent: (fileName: string, fileContent: string) => {
    console.log('🗂️ Tray file drop with content:', fileName);
    ipcRenderer.send('tray-file-drop-with-content', { fileName, fileContent });
  },

  importPRD: (filePath: string) => {
    console.log('📄 Importing PRD:', filePath);
    return ipcRenderer.invoke('import-prd', { filePath });
  },

  importTranscript: (filePath: string) => {
    console.log('📄 Importing transcript:', filePath);
    return ipcRenderer.invoke('import-transcript', { filePath });
  },

  // App operations
  getPersonas: () => {
    console.log('👥 Getting personas');
    return ipcRenderer.invoke('get-personas');
  },

  chatWithPersona: (personaId: string, message: string, context?: string) => {
    console.log('💬 Chat with persona:', personaId);
    return ipcRenderer.invoke('chat-with-persona', {
      personaId,
      message,
      context,
    });
  },

  getEvidenceScores: (documentId: string) => {
    console.log('📊 Getting evidence scores for:', documentId);
    return ipcRenderer.invoke('get-evidence-scores', { documentId });
  },

  similaritySearch: (
    query: string,
    personaId?: string,
    topN?: number,
    minSimilarity?: number
  ) => {
    console.log(
      '🔍 Performing similarity search:',
      query.substring(0, 50) + '...'
    );
    return ipcRenderer.invoke('similarity-search', {
      query,
      personaId,
      topN,
      minSimilarity,
    });
  },

  // Phase 3.5.1: Settings operations
  getSettings: () => {
    console.log('📋 Getting settings');
    return ipcRenderer.invoke('get-settings');
  },

  updateSettings: (updates: unknown) => {
    console.log('📋 Updating settings');
    return ipcRenderer.invoke('update-settings', { settings: updates });
  },

  configureAIService: (config: unknown) => {
    console.log('📋 Configuring AI service');
    return ipcRenderer.invoke('configure-ai-service', { config });
  },

  testAPIKey: (provider: string, apiKey?: string) => {
    console.log('📋 Testing API key');
    return ipcRenderer.invoke('test-api-key', { provider, apiKey });
  },

  getCloudSubscriptionInfo: () => {
    console.log('📋 Getting cloud subscription info');
    return ipcRenderer.invoke('get-cloud-subscription-info');
  },

  // Phase 3.5.2: Third-party token management operations
  setThirdPartyToken: (service: string, token: string) => {
    console.log('🔐 Setting third-party token', { service });
    return ipcRenderer.invoke('set-third-party-token', { service, token });
  },

  getTokenStatus: () => {
    console.log('📊 Getting token status');
    return ipcRenderer.invoke('get-token-status');
  },

  testThirdPartyToken: (service: string, token?: string) => {
    console.log('🧪 Testing third-party token', { service });
    return ipcRenderer.invoke('test-third-party-token', { service, token });
  },

  removeThirdPartyToken: (service: string) => {
    console.log('🗑️ Removing third-party token', { service });
    return ipcRenderer.invoke('remove-third-party-token', { service });
  },

  getMissingTokenWarnings: () => {
    console.log('⚠️ Getting missing token warnings');
    return ipcRenderer.invoke('get-missing-token-warnings');
  },

  // Phase 3.5.3: Persona manager operations
  getPersonasConfig: () => {
    console.log('📋 Getting personas configuration');
    return ipcRenderer.invoke('get-personas-config');
  },

  savePersonasConfig: (yaml: string) => {
    console.log('💾 Saving personas configuration');
    return ipcRenderer.invoke('save-personas-config', { yaml });
  },

  reloadPersonas: () => {
    console.log('🔄 Reloading personas');
    return ipcRenderer.invoke('reload-personas');
  },

  // Phase 3.1.6: Activity log operations
  getActivityLog: (options?: {
    page?: number;
    limit?: number;
    filter?: unknown;
  }) => {
    console.log('📋 Getting activity log');
    return ipcRenderer.invoke('get-activity-log', options || {});
  },

  getActivityLogStats: () => {
    console.log('📊 Getting activity log stats');
    return ipcRenderer.invoke('activity-log-stats');
  },

  clearActivityLog: () => {
    console.log('🗑️ Clearing activity log');
    return ipcRenderer.invoke('clear-activity-log');
  },

  exportActivityLog: (format: 'csv' | 'json', filter?: unknown) => {
    console.log('📤 Exporting activity log');
    return ipcRenderer.invoke('export-activity-log', { format, filter });
  },

  // Phase 3.1.6: Log general activity
  logGeneralActivity: (data: {
    type: string;
    title: string;
    description?: string;
    source: string;
    metadata?: unknown;
  }) => {
    console.log('📤 Logging general activity');
    return ipcRenderer.invoke('log-general-activity', data);
  },

  // Event listeners
  onEvidenceScoreUpdated: (callback: (data: unknown) => void) => {
    ipcRenderer.on('evidence-score-updated', (_, data) => callback(data));
  },

  onTranscriptIngested: (callback: (data: unknown) => void) => {
    ipcRenderer.on('transcript-ingested', (_, data) => callback(data));
  },

  onPRDImported: (callback: (data: unknown) => void) => {
    ipcRenderer.on('prd-imported', (_, data) => callback(data));
  },

  onAppReady: (callback: () => void) => {
    ipcRenderer.on('app-ready', () => callback());
  },

  onError: (callback: (error: unknown) => void) => {
    ipcRenderer.on('error', (_, error) => callback(error));
  },

  // Phase 3.1.4: Global error toast listener
  onGlobalError: (callback: (error: unknown) => void) => {
    ipcRenderer.on('global-error', (_, error) => callback(error));
  },

  // Phase 3.1.7: Success toast listener
  onTranscriptSuccessToast: (callback: (data: unknown) => void) => {
    ipcRenderer.on('transcript-success-toast', (_, data) => callback(data));
  },

  // Phase 3.1.6: Activity log listener
  onActivityLogUpdated: (callback: (data: unknown) => void) => {
    ipcRenderer.on('activity-log-updated', (_, data) => callback(data));
  },

  // Phase 3.5.1: Settings event listeners
  onSettingsUpdated: (callback: (data: unknown) => void) => {
    ipcRenderer.on('settings-updated', (_, data) => callback(data));
  },

  onApiKeyTestResult: (callback: (data: unknown) => void) => {
    ipcRenderer.on('api-key-test-result', (_, data) => callback(data));
  },

  onCloudSubscriptionInfo: (callback: (data: unknown) => void) => {
    ipcRenderer.on('cloud-subscription-info', (_, data) => callback(data));
  },

  // Phase 3.5.2: Third-party token management event listeners
  onTokenStatusUpdated: (callback: (data: unknown) => void) => {
    ipcRenderer.on('token-status-updated', (_, data) => callback(data));
  },

  onThirdPartyTokenTestResult: (callback: (data: unknown) => void) => {
    ipcRenderer.on('third-party-token-test-result', (_, data) =>
      callback(data)
    );
  },

  // Phase 3.5.3: Persona manager event listeners
  onPersonasUpdated: (callback: (data: unknown) => void) => {
    ipcRenderer.on('personas-updated', (_, data) => callback(data));
  },

  onOpenPersonaManagerWindow: (callback: () => void) => {
    ipcRenderer.on('open-persona-manager-window', () => callback());
  },

  onOpenSettingsWindow: (callback: () => void) => {
    ipcRenderer.on('open-settings-window', () => callback());
  },

  onOpenChatWindow: (callback: () => void) => {
    ipcRenderer.on('open-chat-window', () => callback());
  },

  onOpenImportModalWithFile: (
    callback: (data: { filePath: string }) => void
  ) => {
    ipcRenderer.on('open-import-modal-with-file', (_, data) => callback(data));
  },

  onOpenImportModalWithFileContent: (
    callback: (data: {
      fileName: string;
      fileContent: string;
      fileSize: number;
    }) => void
  ) => {
    ipcRenderer.on('open-import-modal-with-file-content', (_, data) =>
      callback(data)
    );
  },

  onOpenImportTranscriptModalWithFile: (
    callback: (data: { filePath: string }) => void
  ) => {
    ipcRenderer.on('open-import-transcript-modal-with-file', (_, data) =>
      callback(data)
    );
  },

  onOpenImportTranscriptModalWithFileContent: (
    callback: (data: {
      fileName: string;
      fileContent: string;
      fileSize: number;
    }) => void
  ) => {
    ipcRenderer.on(
      'open-import-transcript-modal-with-file-content',
      (_, data) => callback(data)
    );
  },

  // Cleanup
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declarations for the renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

console.log('🔌 Preload script loaded successfully');
