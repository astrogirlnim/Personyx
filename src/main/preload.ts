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
