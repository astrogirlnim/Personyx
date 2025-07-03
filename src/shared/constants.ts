/**
 * Shared constants for Personyx
 * Used across main and renderer processes
 */

// Application information
export const APP_NAME = 'Personyx';
export const APP_VERSION = '0.1.0';
export const APP_IDENTIFIER = 'com.personyx.app';

// IPC Channels
export const IPC_CHANNELS = {
  // Main to Renderer
  EVIDENCE_SCORE_UPDATED: 'evidence-score-updated',
  TRANSCRIPT_INGESTED: 'transcript-ingested',
  TRANSCRIPT_SUCCESS: 'transcript-success',
  PRD_IMPORTED: 'prd-imported',
  APP_READY: 'app-ready',
  SETTINGS_UPDATED: 'settings-updated',
  API_KEY_TEST_RESULT: 'api-key-test-result',
  CLOUD_SUBSCRIPTION_INFO: 'cloud-subscription-info',
  ERROR: 'error',
  GLOBAL_ERROR: 'global-error', // Phase 3.1.4: Global error toast events
  TRANSCRIPT_SUCCESS_TOAST: 'transcript-success-toast', // Phase 3.1.7: Success toast events
  ACTIVITY_LOG_UPDATED: 'activity-log-updated', // Phase 3.1.6: Activity log events

  // Renderer to Main
  IMPORT_PRD: 'import-prd',
  IMPORT_TRANSCRIPT: 'import-transcript',
  GET_EVIDENCE_SCORES: 'get-evidence-scores',
  CHAT_WITH_PERSONA: 'chat-with-persona',
  GET_PERSONAS: 'get-personas',
  GET_SETTINGS: 'get-settings',
  UPDATE_SETTINGS: 'update-settings',
  CONFIGURE_AI_SERVICE: 'configure-ai-service',
  TEST_API_KEY: 'test-api-key',
  GET_CLOUD_SUBSCRIPTION_INFO: 'get-cloud-subscription-info',
  APP_QUIT: 'app-quit',
  // Phase 3.1.6: Activity log channels
  GET_ACTIVITY_LOG: 'get-activity-log',
  ACTIVITY_LOG_STATS: 'activity-log-stats',
  CLEAR_ACTIVITY_LOG: 'clear-activity-log',
  EXPORT_ACTIVITY_LOG: 'export-activity-log',
  LOG_GENERAL_ACTIVITY: 'log-general-activity', // Phase 3.1.6: Log general activity
} as const;

// File paths and directories
export const PATHS = {
  USER_DATA: 'userData',
  DATABASE: 'personyx.db',
  SETTINGS: 'settings.json',
  LOGS: 'logs',
  INTERVIEWS: 'interviews',
  SAMPLES: 'samples',
  PERSONAS_CONFIG: 'personas.yml',
  TEMP: 'temp',
} as const;

// Database configuration
export const DATABASE = {
  NAME: 'personyx.db',
  VERSION: 1,
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  BACKUP_RETENTION_DAYS: 7,
} as const;

// Evidence scoring configuration
export const SCORING = {
  MAX_SCORE: 100,
  MIN_SCORE: 0,
  RECENCY_WEIGHT: 0.4,
  COVERAGE_WEIGHT: 0.3,
  RELEVANCE_WEIGHT: 0.3,
  RECENCY_DECAY_DAYS: 60,
  MIN_EVIDENCE_COUNT: 3,
  TOP_QUOTES_LIMIT: 5,
} as const;

// UI configuration
export const UI = {
  TRAY_WINDOW_WIDTH: 380,
  TRAY_WINDOW_HEIGHT: 600,
  MAIN_WINDOW_WIDTH: 1200,
  MAIN_WINDOW_HEIGHT: 800,
  MIN_WINDOW_WIDTH: 800,
  MIN_WINDOW_HEIGHT: 600,
  TRAY_ICON_SIZE: 16,
  NOTIFICATION_DURATION: 5000,
} as const;

// Development configuration
export const DEV = {
  RENDERER_PORT: 3000,
  RELOAD_ON_CHANGE: true,
  SHOW_DEV_TOOLS: true,
  LOG_LEVEL: 'debug' as const,
} as const;

// Production configuration
export const PROD = {
  LOG_LEVEL: 'info' as const,
  AUTO_UPDATE_CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours in ms
  CRASH_REPORTING: false,
  ANALYTICS: false,
} as const;

// File type filters
export const FILE_FILTERS = {
  MARKDOWN: {
    name: 'Markdown Files',
    extensions: ['md', 'markdown'],
  },
  TEXT: {
    name: 'Text Files',
    extensions: ['txt'],
  },
  PRD: {
    name: 'PRD Files',
    extensions: ['md', 'txt', 'markdown'],
  },
} as const;

// API configuration
export const API = {
  OPENAI: {
    MODEL: 'gpt-4',
    EMBEDDING_MODEL: 'text-embedding-3-small',
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.1,
  },
  RATE_LIMITS: {
    OPENAI_REQUESTS_PER_MINUTE: 60,
    EMBEDDINGS_BATCH_SIZE: 100,
  },
  // Hybrid AI Service Configuration
  PERSONYX_CLOUD: {
    BASE_URL: 'https://api.personyx.com',
    EMBEDDING_ENDPOINT: '/v1/embeddings',
    CLASSIFY_ENDPOINT: '/v1/classify',
    AUTH_ENDPOINT: '/v1/auth',
    SUBSCRIPTION_ENDPOINT: '/v1/subscription',
    DEFAULT_TIMEOUT: 10000, // 10 seconds
  },
  SERVICE_PROVIDERS: {
    LOCAL: 'local',
    CLOUD: 'cloud',
  },
} as const;

// Logging configuration
export const LOGGING = {
  LEVELS: ['debug', 'info', 'warn', 'error'] as const,
  MAX_LOG_FILES: 10,
  MAX_LOG_SIZE_MB: 10,
  LOG_ROTATION_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Security configuration
export const SECURITY = {
  TOKEN_ENCRYPTION_KEY_LENGTH: 32,
  AES_IV_LENGTH: 16,
  KEYCHAIN_SERVICE_NAME: 'Personyx',
  SESSION_TIMEOUT_MINUTES: 60,
} as const;

// Default application settings
export const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  autoUpdate: true,
  notifications: true,
  evidenceRetentionDays: 30,
  aiService: {
    provider: 'local' as const,
    localApiKey: undefined,
    cloudSubscription: undefined,
  },
} as const;

// Tray menu configuration
export const TRAY_MENU = {
  ITEMS: [
    {
      id: 'show-window',
      label: 'Show Personyx',
      accelerator: 'CmdOrCtrl+Shift+P',
    },
    {
      id: 'import-prd',
      label: 'Import PRD...',
      accelerator: 'CmdOrCtrl+O',
    },
    {
      id: 'view-scores',
      label: 'View Evidence Scores',
    },
    {
      id: 'open-settings',
      label: 'Settings...',
      accelerator: 'CmdOrCtrl+,',
    },
    {
      id: 'quit-app',
      label: 'Quit Personyx',
      accelerator: 'CmdOrCtrl+Q',
    },
  ],
} as const;

// URL schemes
export const URL_SCHEMES = {
  RENDERER_DEV: `http://localhost:${DEV.RENDERER_PORT}`,
  RENDERER_PROD: 'file://',
} as const;

// Note: Environment detection (IS_DEV, IS_PROD, IS_MAC, etc.) moved to main process files
// since renderer process doesn't have access to process object
