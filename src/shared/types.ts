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

// Activity Log - Phase 3.1.6
export interface ActivityLog {
  id: string;
  type: ActivityLogType;
  title: string;
  description?: string;
  source: ActivityLogSource;
  metadata?: ActivityLogMetadata;
  timestamp: Date;
  createdAt: Date;
}

export type ActivityLogType =
  | 'import-success'
  | 'import-error'
  | 'score-update'
  | 'general-activity';

export type ActivityLogSource =
  | 'prd-import'
  | 'transcript-import'
  | 'evidence-score'
  | 'general';

export interface ActivityLogMetadata {
  fileName?: string;
  evidenceCount?: number;
  personasAffected?: string[];
  processingTime?: number;
  errorMessage?: string;
  scores?: EvidenceScore[];
  documentId?: string;

  // Phase 3.1.8: Enhanced interview import metadata
  evidenceCountByPersona?: Record<string, number>;
  personaNames?: Array<{ id: string; name: string }>;
  totalEvidenceCount?: number;
  personasAffectedCount?: number;

  [key: string]: unknown; // Allow additional metadata
}

export interface ActivityLogFilter {
  type?: ActivityLogType;
  source?: ActivityLogSource;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface ActivityLogStats {
  totalActivities: number;
  todayActivities: number;
  successRate: number;
  errorCount: number;
  lastActivity?: Date;
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
  'transcript-success': {
    id: string;
    fileName: string;
    evidenceCount: number;
    personasAffected: string[];
    processingTime: number;
    timestamp: Date;
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
  // Phase 3.5.2: Third-party token management events
  'token-status-updated': {
    status: Array<{
      service: string;
      exists: boolean;
      lastUpdated?: Date;
    }>;
  };
  'third-party-token-test-result': {
    service: string;
    success: boolean;
    error?: string;
    details?: Record<string, unknown>;
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
  // Phase 3.1.7: Success toast events
  'transcript-success-toast': {
    type: 'transcript-success' | 'evidence-success' | 'general-success';
    title: string;
    message: string;
    fileName?: string;
    evidenceCount?: number;
    personasAffected?: string[];
    processingTime?: number;
    timestamp: Date;
    dismissible?: boolean;
    autoDismissMs?: number;
  };
  // Phase 3.1.6: Activity log events
  'activity-log-updated': {
    entries: ActivityLog[];
    totalCount: number;
    stats: ActivityLogStats;
  };
  // Phase 3.5.3: Persona manager events
  'personas-updated': {
    personas: Persona[];
    success: boolean;
    error?: string;
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
  // Phase 3.5.2: Third-party token management
  'set-third-party-token': {
    service: string;
    token: string;
  };
  'get-token-status': Record<string, never>;
  'test-third-party-token': {
    service: string;
    token?: string;
  };
  'remove-third-party-token': {
    service: string;
  };
  'get-missing-token-warnings': Record<string, never>;
  // Phase 3.5.3: Persona manager requests
  'get-personas-config': Record<string, never>;
  'save-personas-config': {
    yaml: string;
  };
  'reload-personas': Record<string, never>;
  'app-quit': Record<string, never>;
  // Phase 3.1.6: Activity log requests
  'get-activity-log': {
    page?: number;
    limit?: number;
    filter?: ActivityLogFilter;
  };
  'activity-log-stats': Record<string, never>;
  'clear-activity-log': Record<string, never>;
  'export-activity-log': {
    format: 'csv' | 'json';
    filter?: ActivityLogFilter;
  };
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
