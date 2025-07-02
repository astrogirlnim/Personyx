/**
 * Personyx Main Process
 * Entry point for the Electron main process (Core)
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  nativeImage,
} from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { TrayManager } from './tray';
import { Logger } from './utils/logger';
import { AutoUpdater } from './utils/auto-updater';
import { initDatabase, closeDatabase } from './db/connection';
import { testTokenVault } from './security/tokenVault';
import { WorkflowOrchestrator } from './services/WorkflowOrchestrator';
import { PersonaLoader } from './services/PersonaLoader';
import { EmbeddingRetrievalService } from './services/EmbeddingRetrievalService';
import { SecureFileIngestService } from './services/SecureFileIngestService';
import { SettingsService } from './services/SettingsService';
import { PersonyxCloudService } from './services/PersonyxCloudService';
import { LangGraphService } from './services/LangGraphService';
import { IPC_CHANNELS, PATHS, UI, URL_SCHEMES } from '@shared/constants';
import type {
  IPCEvents,
  ImportResult,
  AIServiceProvider,
  AppSettings,
  AIServiceConfig,
} from '@shared/types';

// Environment detection for main process
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_MAC = process.platform === 'darwin';

class PersonyxApp {
  private mainWindow: BrowserWindow | null = null;
  private trayManager: TrayManager | null = null;
  private autoUpdater: AutoUpdater | null = null;
  private workflowOrchestrator: WorkflowOrchestrator | null = null;
  private personaLoader: PersonaLoader | null = null;
  private embeddingRetrievalService: EmbeddingRetrievalService | null = null;
  private secureFileIngestService: SecureFileIngestService | null = null;
  private settingsService: SettingsService | null = null;
  private cloudService: PersonyxCloudService | null = null;
  private langGraphService: LangGraphService | null = null;
  private logger: Logger;
  private isAppReady = false;

  constructor() {
    this.logger = new Logger('main');
    this.logger.info('🚀 Personyx starting up...');
    this.setupAppEventHandlers();
    this.setupIpcHandlers();
    this.logger.info('✅ Personyx ready');
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('🚀 Personyx starting up...');

      // Create necessary directories
      await this.createDirectories();

      // Initialize tray (primary UI for this app)
      this.trayManager = new TrayManager(this.logger);
      await this.trayManager.initialize();

      // Initialize auto-updater
      this.autoUpdater = new AutoUpdater(this.logger);
      await this.autoUpdater.initialize();

      // Set up protocol handlers if needed
      this.setupProtocols();

      // Initialize core services (will be added in later tasks)
      await this.initializeCoreServices();

      this.isAppReady = true;
      this.logger.info('✅ Personyx ready');

      // Notify renderer if window exists
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IPC_CHANNELS.APP_READY, {});
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize Personyx', error);
      this.handleError('Failed to initialize application', error);
    }
  }

  /**
   * Create main window (called from tray or other triggers)
   */
  public createMainWindow(): void {
    this.logger.info('📱 Creating main window');

    if (this.mainWindow) {
      this.mainWindow.focus();
      return;
    }

    // Create window icon with debug logging
    const iconPath = join(__dirname, '../icon.png');
    this.logger.debug(`🖼️ Attempting to load window icon from: ${iconPath}`);

    const windowIcon = nativeImage.createFromPath(iconPath);
    this.logger.debug(
      `🖼️ Window icon created - isEmpty: ${windowIcon.isEmpty()}, size: ${JSON.stringify(windowIcon.getSize())}`
    );

    // Set dock icon on macOS and app icon on other platforms
    this.setAppIcon(windowIcon, iconPath);

    this.mainWindow = new BrowserWindow({
      width: UI.MAIN_WINDOW_WIDTH,
      height: UI.MAIN_WINDOW_HEIGHT,
      minWidth: UI.MIN_WINDOW_WIDTH,
      minHeight: UI.MIN_WINDOW_HEIGHT,
      show: false,
      icon: windowIcon,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
      },
      titleBarStyle: IS_MAC ? 'hiddenInset' : 'default',
      vibrancy: IS_MAC ? 'under-window' : undefined,
    });

    // Load the renderer
    this.loadRenderer();

    // Window event handlers
    this.mainWindow.once('ready-to-show', () => {
      this.logger.info('🎨 Main window ready to show');
      if (this.mainWindow) {
        this.mainWindow.show();
        if (IS_DEV) {
          this.mainWindow.webContents.openDevTools();
        }

        // Set main window for workflow orchestrator IPC communication
        if (this.workflowOrchestrator) {
          this.workflowOrchestrator.setMainWindow(this.mainWindow);
        }

        // Set main window for secure file ingest service event emission
        if (this.secureFileIngestService) {
          this.secureFileIngestService.setMainWindow(this.mainWindow);
        }
      }
    });

    this.mainWindow.on('closed', () => {
      this.logger.info('🗂 Main window closed');
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  /**
   * Load the renderer process
   */
  private loadRenderer(): void {
    if (!this.mainWindow) return;

    const rendererUrl = IS_DEV
      ? URL_SCHEMES.RENDERER_DEV
      : `${URL_SCHEMES.RENDERER_PROD}${join(__dirname, '../renderer/index.html')}`;

    this.logger.debug(`📥 Loading renderer from: ${rendererUrl}`);
    this.mainWindow.loadURL(rendererUrl);
  }

  /**
   * Set app icon for dock (macOS) and taskbar (Windows/Linux)
   */
  private setAppIcon(icon: Electron.NativeImage, iconPath: string): void {
    try {
      if (IS_MAC && app.dock) {
        // Set dock icon on macOS
        app.dock.setIcon(icon);
        this.logger.debug(`🖼️ Dock icon set from: ${iconPath}`);
      } else {
        // For Windows/Linux, the window icon should be sufficient
        // but we can also try to set it at the app level
        this.logger.debug(
          `🖼️ App icon set for non-macOS platform from: ${iconPath}`
        );
      }

      this.logger.info('✅ App icon set successfully');
    } catch (error) {
      this.logger.error('❌ Failed to set app icon', error);
    }
  }

  /**
   * Set up application event handlers
   */
  private setupAppEventHandlers(): void {
    // App ready
    app.whenReady().then(() => {
      this.logger.info('⚡ Electron app ready');
      this.initialize();
    });

    // All windows closed
    app.on('window-all-closed', () => {
      this.logger.info('🔻 All windows closed');
      // On macOS, keep app running in tray
      if (!IS_MAC) {
        this.quit();
      }
    });

    // App activated (macOS)
    app.on('activate', () => {
      this.logger.info('🔆 App activated');
      if (!this.mainWindow) {
        this.createMainWindow();
      }
    });

    // Before quit
    app.on('before-quit', () => {
      this.logger.info('👋 App shutting down');
      this.cleanup();
    });
  }

  /**
   * Set up IPC event handlers
   */
  private setupIpcHandlers(): void {
    // Import PRD
    ipcMain.handle(
      IPC_CHANNELS.IMPORT_PRD,
      async (_, data: IPCEvents['import-prd']) => {
        this.logger.info(`📄 Import PRD request: ${data.filePath}`);
        return await this.handleImportPRD(data.filePath);
      }
    );

    // Get personas
    ipcMain.handle(IPC_CHANNELS.GET_PERSONAS, async () => {
      this.logger.info('👥 Get personas request');
      return await this.handleGetPersonas();
    });

    // Chat with persona
    ipcMain.handle(
      IPC_CHANNELS.CHAT_WITH_PERSONA,
      async (_, data: IPCEvents['chat-with-persona']) => {
        this.logger.info(`💬 Chat with persona: ${data.personaId}`);
        return await this.handleChatWithPersona(data);
      }
    );

    // Get evidence scores
    ipcMain.handle(
      IPC_CHANNELS.GET_EVIDENCE_SCORES,
      async (_, data: IPCEvents['get-evidence-scores']) => {
        this.logger.info(`📊 Get evidence scores: ${data.documentId}`);
        return await this.handleGetEvidenceScores(data.documentId);
      }
    );

    // Similarity search
    ipcMain.handle(
      'similarity-search',
      async (_, data: IPCEvents['similarity-search']) => {
        this.logger.info(
          `🔍 Similarity search: ${data.query.substring(0, 50)}...`
        );
        return await this.handleSimilaritySearch(data);
      }
    );

    // App quit
    ipcMain.on(IPC_CHANNELS.APP_QUIT, () => {
      this.logger.info('🛑 Quit request from renderer');
      this.quit();
    });

    // Handle file dialog requests from drop zone
    ipcMain.on('open-file-dialog', async _event => {
      this.logger.info('📁 File dialog requested from drop zone');
      if (this.trayManager) {
        // This will be handled by the tray manager
      }
    });

    // Check for updates
    ipcMain.handle('check-for-updates', async () => {
      this.logger.info('🔄 Manual update check requested');
      if (this.autoUpdater) {
        return await this.autoUpdater.checkForUpdates();
      }
      return null;
    });

    // Phase 2.5 - Feature 5 - Hybrid AI Key Management IPC Handlers

    // Get current settings
    ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
      this.logger.info('⚙️ Get settings request');
      return await this.handleGetSettings();
    });

    // Update settings
    ipcMain.handle(
      IPC_CHANNELS.UPDATE_SETTINGS,
      async (_, data: IPCEvents['update-settings']) => {
        this.logger.info('⚙️ Update settings request');
        return await this.handleUpdateSettings(data.settings);
      }
    );

    // Configure AI service
    ipcMain.handle(
      IPC_CHANNELS.CONFIGURE_AI_SERVICE,
      async (_, data: IPCEvents['configure-ai-service']) => {
        this.logger.info('🔧 Configure AI service request');
        return await this.handleConfigureAIService(data.config);
      }
    );

    // Test API key
    ipcMain.handle(
      IPC_CHANNELS.TEST_API_KEY,
      async (_, data: IPCEvents['test-api-key']) => {
        this.logger.info(`🔍 Test API key request: ${data.provider}`);
        return await this.handleTestAPIKey(data.provider, data.apiKey);
      }
    );

    // Get cloud subscription info
    ipcMain.handle(IPC_CHANNELS.GET_CLOUD_SUBSCRIPTION_INFO, async () => {
      this.logger.info('📊 Get cloud subscription info request');
      return await this.handleGetCloudSubscriptionInfo();
    });
  }

  /**
   * Set up protocol handlers
   */
  private setupProtocols(): void {
    // Handle deep links if needed
    app.setAsDefaultProtocolClient('personyx');
  }

  /**
   * Initialize core services
   */
  private async initializeCoreServices(): Promise<void> {
    this.logger.info('⚙️ Initializing core services...');

    try {
      // Initialize database (Phase 1.2)
      this.logger.info('🗄️ Initializing database...');
      initDatabase();
      this.logger.info('✅ Database initialized successfully');

      // Test token vault functionality (Phase 1.2)
      this.logger.info('🔐 Testing token vault...');
      const vaultTest = await testTokenVault();
      if (vaultTest) {
        this.logger.info('✅ Token vault test passed');
      } else {
        this.logger.warn('⚠️ Token vault test failed - continuing anyway');
      }

      // Initialize settings service (Phase 2.5 - Feature 5.2)
      this.logger.info('⚙️ Initializing settings service...');
      this.settingsService = new SettingsService();
      await this.settingsService.initialize();
      this.logger.info('✅ Settings service initialized');

      // Initialize Personyx Cloud service (Phase 2.5 - Feature 5.3)
      this.logger.info('☁️ Initializing Personyx Cloud service...');
      this.cloudService = new PersonyxCloudService();
      this.logger.info('✅ Personyx Cloud service initialized');

      // Initialize LangGraph service with hybrid AI support (Phase 2.5 - Feature 5.4)
      this.logger.info(
        '🧠 Initializing LangGraph service with hybrid AI support...'
      );
      this.langGraphService = new LangGraphService();
      await this.langGraphService.initialize();
      this.logger.info('✅ LangGraph service initialized');

      // Configure AI service based on current settings
      const currentSettings = this.settingsService.getSettings();
      if (
        currentSettings.aiService.provider === 'cloud' &&
        currentSettings.aiService.cloudSubscription?.apiKey
      ) {
        await this.cloudService.initialize(
          currentSettings.aiService.cloudSubscription.apiKey
        );
        this.logger.info('✅ Cloud AI service configured');
      } else {
        this.logger.info('ℹ️ Using local AI service configuration');
      }

      // Initialize workflow orchestrator (Phase 1.3)
      this.logger.info('🔄 Initializing workflow orchestrator...');
      this.workflowOrchestrator = new WorkflowOrchestrator();
      await this.workflowOrchestrator.initialize();
      this.logger.info('✅ Workflow orchestrator initialized');

      // Load personas configuration (Phase 1.4)
      this.logger.info('🎭 Loading personas from YAML configuration...');
      this.personaLoader = new PersonaLoader();
      const personaCount = await this.personaLoader.loadPersonas();
      this.logger.info(`✅ Loaded ${personaCount} personas from configuration`);

      // Initialize embedding retrieval service (Phase 2.2)
      this.logger.info('🔍 Initializing embedding retrieval service...');
      this.embeddingRetrievalService = new EmbeddingRetrievalService();
      this.logger.info('✅ Embedding retrieval service initialized');

      // Initialize secure file ingest service (Phase 2.3)
      this.logger.info('📄 Initializing secure file ingest service...');
      this.secureFileIngestService = new SecureFileIngestService();
      this.logger.info('✅ Secure file ingest service initialized');

      this.logger.info('✅ Core services initialized with hybrid AI support');
    } catch (error) {
      this.logger.error('❌ Failed to initialize core services', error);
      throw error;
    }
  }

  /**
   * Create necessary directories
   */
  private async createDirectories(): Promise<void> {
    const userDataPath = app.getPath('userData');
    const directories = [
      join(userDataPath, PATHS.LOGS),
      join(userDataPath, PATHS.INTERVIEWS),
      join(userDataPath, PATHS.SAMPLES),
      join(userDataPath, PATHS.TEMP),
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        this.logger.debug(`📁 Created directory: ${dir}`);
      }
    }
  }

  /**
   * Handle PRD import (Phase 2.3 - Secure File Ingest)
   */
  private async handleImportPRD(filePath: string): Promise<ImportResult> {
    try {
      this.logger.info(`📥 Processing PRD import: ${filePath}`);

      if (!this.secureFileIngestService) {
        this.logger.warn('⚠️ SecureFileIngestService not initialized');
        throw new Error('Secure file ingest service not available');
      }

      // Use the new secure file ingest service (Phase 2.3)
      const ingestResult =
        await this.secureFileIngestService.ingestPRDFile(filePath);

      if (ingestResult.success) {
        this.logger.info('✅ PRD import completed successfully', {
          documentId: ingestResult.documentId,
          fileName: ingestResult.fileName,
          processingTimeMs: ingestResult.processingTimeMs,
          sectionsExtracted: ingestResult.sectionsExtracted,
          chunksCreated: ingestResult.chunksCreated,
          embeddingsGenerated: ingestResult.embeddingsGenerated,
          evidenceScoresCount: ingestResult.evidenceScores?.length || 0,
        });

        return {
          success: true,
          documentId: ingestResult.documentId,
          evidenceScores: ingestResult.evidenceScores || [],
        };
      } else {
        this.logger.warn('⚠️ PRD import failed', {
          error: ingestResult.error,
          validationErrors: ingestResult.validationErrors,
        });

        return {
          success: false,
          error: ingestResult.error || 'File ingest failed',
        };
      }
    } catch (error) {
      this.logger.error('❌ PRD import failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle get personas request
   */
  private async handleGetPersonas() {
    try {
      this.logger.info('👥 Fetching personas');

      if (!this.personaLoader) {
        this.logger.warn(
          '⚠️ PersonaLoader not initialized, creating new instance'
        );
        this.personaLoader = new PersonaLoader();
        await this.personaLoader.loadPersonas();
      }

      // Get personas from database via PersonaRepo
      const personaRepo = new (
        await import('./db/repositories/PersonaRepo')
      ).PersonaRepo();
      const personas = await personaRepo.list();

      this.logger.info(
        `✅ Retrieved ${personas.length} personas from database`
      );
      return personas;
    } catch (error) {
      this.logger.error('❌ Failed to get personas', error);
      throw error;
    }
  }

  /**
   * Handle chat with persona
   */
  private async handleChatWithPersona(data: IPCEvents['chat-with-persona']) {
    try {
      this.logger.info(
        `💬 Processing chat: ${data.personaId} - ${data.message}`
      );

      // TODO: Implement LangGraph RAG chat (Phase 4.1)
      // For now, return a placeholder response

      return {
        message: `Hello! This is a placeholder response for persona ${data.personaId}`,
        sources: [],
        persona: null,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Chat failed', error);
      throw error;
    }
  }

  /**
   * Handle similarity search request
   */
  private async handleSimilaritySearch(data: IPCEvents['similarity-search']) {
    try {
      this.logger.info(
        `🔍 Processing similarity search: ${data.query.substring(0, 50)}...`
      );

      if (!this.embeddingRetrievalService) {
        this.logger.warn('⚠️ EmbeddingRetrievalService not initialized');
        throw new Error('Embedding retrieval service not available');
      }

      const searchQuery = {
        query: data.query,
        personaId: data.personaId,
        topN: data.topN || 10,
        minSimilarity: data.minSimilarity || 0.7,
      };

      const result =
        await this.embeddingRetrievalService.searchSimilar(searchQuery);

      this.logger.info('✅ Similarity search completed', {
        results: result.results.length,
        queryTime: result.queryTime,
        cached: result.cached,
      });

      return result;
    } catch (error) {
      this.logger.error('❌ Similarity search failed', error);
      throw error;
    }
  }

  /**
   * Handle get evidence scores
   */
  private async handleGetEvidenceScores(documentId: string) {
    try {
      this.logger.info(`📊 Fetching evidence scores for: ${documentId}`);

      // TODO: Implement evidence scoring (Phase 2.1)
      // For now, return placeholder data

      return [];
    } catch (error) {
      this.logger.error('❌ Failed to get evidence scores', error);
      throw error;
    }
  }

  /**
   * Handle get settings request (Phase 2.5 - Feature 5.2)
   */
  private async handleGetSettings() {
    try {
      this.logger.info('⚙️ Fetching application settings');

      if (!this.settingsService) {
        this.logger.warn('⚠️ SettingsService not initialized');
        throw new Error('Settings service not available');
      }

      const settings = this.settingsService.getSettings();
      this.logger.debug('✅ Settings retrieved successfully');
      return settings;
    } catch (error) {
      this.logger.error('❌ Failed to get settings', error);
      throw error;
    }
  }

  /**
   * Handle update settings request (Phase 2.5 - Feature 5.2)
   */
  private async handleUpdateSettings(updates: Partial<AppSettings>) {
    try {
      this.logger.info('⚙️ Updating application settings', { updates });

      if (!this.settingsService) {
        this.logger.warn('⚠️ SettingsService not initialized');
        throw new Error('Settings service not available');
      }

      const updatedSettings =
        await this.settingsService.updateSettings(updates);

      // Emit settings updated event to renderer
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_UPDATED, {
          settings: updatedSettings,
        });
      }

      this.logger.info('✅ Settings updated successfully');
      return updatedSettings;
    } catch (error) {
      this.logger.error('❌ Failed to update settings', error);
      throw error;
    }
  }

  /**
   * Handle configure AI service request (Phase 2.5 - Feature 5.3 & 5.4)
   */
  private async handleConfigureAIService(config: AIServiceConfig) {
    try {
      this.logger.info('🔧 Configuring AI service', {
        provider: config.provider,
      });

      if (!this.settingsService) {
        this.logger.warn('⚠️ SettingsService not initialized');
        throw new Error('Settings service not available');
      }

      // Update AI service configuration through settings service
      await this.settingsService.configureAIService(config);

      // If switching to cloud provider, initialize cloud service
      if (config.provider === 'cloud' && config.cloudSubscription?.apiKey) {
        if (!this.cloudService) {
          this.logger.warn('⚠️ PersonyxCloudService not initialized');
          throw new Error('Cloud service not available');
        }
        await this.cloudService.initialize(config.cloudSubscription.apiKey);
        this.logger.info('✅ Cloud service configured with new API key');
      }

      // Update LangGraph service to use new provider
      if (this.langGraphService) {
        await this.langGraphService.switchProvider(config.provider);
        this.logger.info(
          `✅ LangGraph service switched to ${config.provider} provider`
        );
      }

      this.logger.info('✅ AI service configuration completed');
      return { success: true };
    } catch (error) {
      this.logger.error('❌ Failed to configure AI service', error);
      throw error;
    }
  }

  /**
   * Handle test API key request (Phase 2.5 - Feature 5.2 & 5.3)
   */
  private async handleTestAPIKey(provider: AIServiceProvider, apiKey?: string) {
    try {
      this.logger.info(`🔍 Testing API key for provider: ${provider}`);

      if (!this.settingsService) {
        this.logger.warn('⚠️ SettingsService not initialized');
        throw new Error('Settings service not available');
      }

      const result = await this.settingsService.testAPIKey(provider, apiKey);

      // Emit test result to renderer
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IPC_CHANNELS.API_KEY_TEST_RESULT, {
          provider,
          success: result.success,
          error: result.error,
          usage: result.usage,
        });
      }

      this.logger.info(`✅ API key test completed for ${provider}`, {
        success: result.success,
      });
      return result;
    } catch (error) {
      this.logger.error(`❌ API key test failed for ${provider}`, error);
      throw error;
    }
  }

  /**
   * Handle get cloud subscription info request (Phase 2.5 - Feature 5.3)
   */
  private async handleGetCloudSubscriptionInfo() {
    try {
      this.logger.info('📊 Fetching cloud subscription information');

      if (!this.cloudService) {
        this.logger.warn('⚠️ PersonyxCloudService not initialized');
        throw new Error('Cloud service not available');
      }

      const subscriptionInfo = await this.cloudService.getSubscriptionInfo();

      // Emit subscription info to renderer
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IPC_CHANNELS.CLOUD_SUBSCRIPTION_INFO, {
          subscription: subscriptionInfo,
        });
      }

      this.logger.debug('✅ Cloud subscription info retrieved');
      return subscriptionInfo;
    } catch (error) {
      this.logger.error('❌ Failed to get cloud subscription info', error);

      // Emit error to renderer
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IPC_CHANNELS.CLOUD_SUBSCRIPTION_INFO, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    }
  }

  /**
   * Handle application errors
   */
  private handleError(message: string, error: unknown): void {
    this.logger.error(message, error);

    // Show error dialog
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    dialog.showErrorBox('Personyx Error', `${message}\n\n${errorMessage}`);

    // Send error to renderer if available
    if (this.mainWindow) {
      this.mainWindow.webContents.send(IPC_CHANNELS.ERROR, {
        message,
        details: errorMessage,
      });
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    this.logger.info('🧹 Cleaning up resources');

    if (this.trayManager) {
      this.trayManager.destroy();
      this.trayManager = null;
    }

    if (this.autoUpdater) {
      this.autoUpdater.destroy();
      this.autoUpdater = null;
    }

    if (this.personaLoader) {
      this.personaLoader = null;
    }

    // Close database connections (Phase 1.2)
    try {
      closeDatabase();
      this.logger.info('✅ Database connection closed');
    } catch (error) {
      this.logger.error('❌ Failed to close database', error);
    }

    // Stop workflow orchestrator
    if (this.workflowOrchestrator) {
      try {
        await this.workflowOrchestrator.stop();
        this.workflowOrchestrator = null;
        this.logger.info('✅ Workflow orchestrator stopped');
      } catch (error) {
        this.logger.error('❌ Failed to stop workflow orchestrator', error);
      }
    }
  }

  /**
   * Quit the application
   */
  public quit(): void {
    this.logger.info('🛑 Quitting Personyx');
    app.quit();
  }

  /**
   * Get the main window instance
   */
  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Check if app is ready
   */
  public isReady(): boolean {
    return this.isAppReady;
  }

  /**
   * Get the auto-updater instance
   */
  public getAutoUpdater(): AutoUpdater | null {
    return this.autoUpdater;
  }
}

// Create and start the application
const personyxApp = new PersonyxApp();

// Export for other modules
export { personyxApp };
