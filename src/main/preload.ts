/**
 * Preload script for Personyx
 * Exposes secure APIs to renderer processes
 */

import { contextBridge, ipcRenderer } from 'electron';

// Define the electron API interface
interface ElectronAPI {
  // File operations
  openFileDialog: () => Promise<unknown>;
  importPRD: (filePath: string) => Promise<unknown>;

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

  // Event listeners
  onEvidenceScoreUpdated: (callback: (data: unknown) => void) => void;
  onTranscriptIngested: (callback: (data: unknown) => void) => void;
  onPRDImported: (callback: (data: unknown) => void) => void;
  onAppReady: (callback: () => void) => void;
  onError: (callback: (error: unknown) => void) => void;

  // Cleanup
  removeAllListeners: (channel: string) => void;
}

// Expose secure APIs to renderer
const electronAPI: ElectronAPI = {
  // File operations
  openFileDialog: () => {
    console.log('📂 Opening file dialog from drop zone');
    return ipcRenderer.invoke('open-file-dialog');
  },

  importPRD: (filePath: string) => {
    console.log('📄 Importing PRD:', filePath);
    return ipcRenderer.invoke('import-prd', { filePath });
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
