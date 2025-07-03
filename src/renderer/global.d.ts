/**
 * Global type declarations for renderer process
 */

import type { Persona, ChatResponse } from '../shared/types';

// ElectronAPI interface for renderer
interface ElectronAPI {
  // File operations
  openFileDialog: () => void;
  handleTrayFileDrop: (filePath: string) => void;
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

  // Event listeners
  onEvidenceScoreUpdated: (callback: (data: unknown) => void) => void;
  onTranscriptIngested: (callback: (data: unknown) => void) => void;
  onPRDImported: (callback: (data: unknown) => void) => void;
  onAppReady: (callback: () => void) => void;
  onError: (callback: (error: unknown) => void) => void;
  // Phase 3.1.4: Global error toast listener
  onGlobalError: (callback: (error: unknown) => void) => void;
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
