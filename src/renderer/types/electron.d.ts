/**
 * Electron API Type Declarations for Renderer Process
 * Defines the electronAPI interface exposed via contextBridge
 */

interface ElectronAPI {
  // File operations
  openFileDialog: () => void;
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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
