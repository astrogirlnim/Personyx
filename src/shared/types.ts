/**
 * Shared TypeScript interfaces for Personyx
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
  // Settings Management Events
  'settings-updated': {
    settings: AppSettings;
  };
  'api-key-test-result': {
    provider: AIServiceProvider;
    success: boolean;
    error?: string;
    usage?: {
      remaining: number;
      limit: number;
    };
  };
  'cloud-subscription-info': {
    subscription?: AIServiceConfig['cloudSubscription'];
    error?: string;
  };
  error: {
    message: string;
    details?: unknown;
  };
  // Phase 3.1.4: Enhanced error events for global error toast
  'global-error': {
    type: 'ingest-error' | 'validation-error' | 'general-error';
    title: string;
    message: string;
    fileName?: string; // For file-related errors
    operation?: 'prd-import' | 'transcript-import' | 'general'; // Operation that failed
    timestamp: Date;
    dismissible?: boolean;
    autoDismissMs?: number;
  };

  // Renderer to Main
  'import-prd': {
    filePath: string; // Can be either a file path or file content
  };
  'import-transcript': {
    filePath: string; // Can be either a file path or file content
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
  'similarity-search': {
    query: string;
    personaId?: string;
    topN?: number;
    minSimilarity?: number;
  };
  // Settings and API Key Management
  'get-settings': Record<string, never>;
  'update-settings': {
    settings: Partial<AppSettings>;
  };
  'configure-ai-service': {
    config: AIServiceConfig;
  };
  'test-api-key': {
    provider: AIServiceProvider;
    apiKey?: string;
  };
  'get-cloud-subscription-info': Record<string, never>;
  'app-quit': Record<string, never>;
}

// AI Service Provider Configuration
export type AIServiceProvider = 'local' | 'cloud';

export interface AIServiceConfig {
  provider: AIServiceProvider;
  localApiKey?: string; // Encrypted and stored locally
  cloudSubscription?: {
    userId: string;
    apiKey: string; // Firebase Cloud API key
    tier: 'free' | 'pro' | 'enterprise';
    usageLimit: number;
    usageRemaining: number;
    expiresAt: Date;
  };
}

// Configuration and settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoUpdate: boolean;
  notifications: boolean;
  evidenceRetentionDays: number;
  // Legacy fields for backward compatibility
  openAIApiKey?: string;
  notionToken?: string;
  slackBotToken?: string;
  linearApiKey?: string;
  // New hybrid AI configuration
  aiService: AIServiceConfig;
}

// API Response types
export interface ChatResponse {
  message: string;
  sources: Evidence[];
  persona: Persona | null; // Allow null for user messages
  timestamp: Date;
  isUser?: boolean; // Optional flag to distinguish user vs persona messages
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
  currentEvidenceScores: EvidenceScore[];
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
  | 'chat-persona'
  | 'view-scores'
  | 'open-settings'
  | 'check-updates'
  | 'quit-app';

export interface TrayMenuItem {
  id: TrayAction;
  label: string;
  enabled: boolean;
  accelerator?: string;
}
