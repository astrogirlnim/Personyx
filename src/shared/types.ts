/**
 * Shared TypeScript interfaces for PersonaPulse
 * Used across main and renderer processes
 */

// Core data structures
export interface Persona {
  id: string;
  name: string;
  description: string;
  primaryGoal: string;
  mainPainPoint: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Evidence {
  id: string;
  personaId: string;
  content: string;
  source: string;
  sourceType: 'interview' | 'prd' | 'feedback' | 'other';
  timestamp: Date;
  tags: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  importance: number; // 1-10 scale
}

export interface ProductDocument {
  id: string;
  title: string;
  content: string;
  filePath?: string;
  type: 'prd' | 'requirements' | 'spec';
  uploadedAt: Date;
  lastModified: Date;
  evidenceScore?: number;
}

export interface EvidenceScore {
  id: string;
  documentId: string;
  personaId: string;
  score: number; // 0-100
  evidenceCount: number;
  lastCalculated: Date;
  topQuotes: string[];
  breakdown: {
    recency: number;
    coverage: number;
    relevance: number;
  };
}

// IPC Event Types
export interface IPCEvents {
  // Main to Renderer
  'evidence-score-updated': {
    documentId: string;
    scores: EvidenceScore[];
  };
  'transcript-ingested': {
    evidenceId: string;
    personaId: string;
    content: string;
  };
  'prd-imported': {
    documentId: string;
    title: string;
    evidenceScores: EvidenceScore[];
  };
  'app-ready': Record<string, never>;
  error: {
    message: string;
    details?: unknown;
  };

  // Renderer to Main
  'import-prd': {
    filePath: string;
  };
  'get-evidence-scores': {
    documentId: string;
  };
  'chat-with-persona': {
    personaId: string;
    message: string;
    context?: string;
  };
  'get-personas': Record<string, never>;
  'app-quit': Record<string, never>;
}

// Configuration and settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoUpdate: boolean;
  notifications: boolean;
  evidenceRetentionDays: number;
  openAIApiKey?: string;
  notionToken?: string;
  slackBotToken?: string;
  linearApiKey?: string;
}

// API Response types
export interface ChatResponse {
  message: string;
  sources: Evidence[];
  persona: Persona;
  timestamp: Date;
}

export interface ImportResult {
  success: boolean;
  documentId?: string;
  error?: string;
  evidenceScores?: EvidenceScore[];
}

// Application state
export interface AppState {
  isReady: boolean;
  personas: Persona[];
  currentDocument?: ProductDocument;
  recentScores: EvidenceScore[];
  settings: AppSettings;
}

// Utility types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  source: 'main' | 'renderer';
  details?: unknown;
}

// Event callback types
export type IPCEventCallback<T extends keyof IPCEvents> = (
  data: IPCEvents[T]
) => void;

// Tray menu actions
export type TrayAction =
  | 'show-window'
  | 'import-prd'
  | 'view-scores'
  | 'open-settings'
  | 'quit-app';

export interface TrayMenuItem {
  id: TrayAction;
  label: string;
  enabled: boolean;
  accelerator?: string;
}
