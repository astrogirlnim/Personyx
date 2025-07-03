/**
 * Global type declarations for renderer process
 */

import type { Persona, ChatResponse } from '../shared/types';

// ElectronAPI interface for renderer
interface ElectronAPI {
  // File operations
  openFileDialog: () => void;
  handleTrayFileDrop: (filePath: string) => void;
  handleTrayFileDropWithContent: (
    fileName: string,
    fileContent: string,
    fileSize: number
  ) => void;
  importPRD: (filePath: string) => Promise<unknown>;
  importTranscript: (filePath: string) => Promise<unknown>;

  // App operations
  getPersonas: () => Promise<Persona[]>;
  chatWithPersona: (
    personaId: string,
    message: string,
    context?: string
  ) => Promise<ChatResponse>;
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

  // Phase 3.5.2: Third-party token management
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
  // Phase 3.5.2: Third-party token event listeners
  onTokenStatusUpdated: (callback: (data: unknown) => void) => void;
  onThirdPartyTokenTestResult: (callback: (data: unknown) => void) => void;
  // Phase 3.5.3: Persona manager event listeners
  onPersonasUpdated: (callback: (data: unknown) => void) => void;
  onOpenPersonaManagerWindow: (callback: () => void) => void;

  // Phase 2.7: Persona evolution event listeners
  onPersonaEvolved: (callback: (data: unknown) => void) => void;
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

  // Cleanup
  removeAllListeners: (channel: string) => void;
}

// Augment the global Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// This is required to make the file a module
export {};
