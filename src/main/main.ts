/**
 * Personyx Main Process
 * Entry point for the Electron main process (Core)
 */

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
import { IPC_CHANNELS, PATHS, UI, URL_SCHEMES } from '@shared/constants';
import type { IPCEvents, ImportResult } from '@shared/types';

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
    // Set up IPC handlers
    ipcMain.handle('get-personas', async () => {
      return await this.handleGetPersonas();
    });

    ipcMain.handle('import-prd', async (_, data: IPCEvents['import-prd']) => {
      this.logger.info(`📄 Import PRD request: ${data.filePath}`);
      return await this.handleImportPRD(data.filePath);
    });

    ipcMain.handle(
      'chat-with-persona',
      async (_, data: IPCEvents['chat-with-persona']) => {
        this.logger.info(`💬 Chat with persona: ${data.personaId}`);
        return await this.handleChatWithPersona(data);
      }
    );

    ipcMain.handle(
      'get-evidence-scores',
      async (_, data: IPCEvents['get-evidence-scores']) => {
        this.logger.info(`📊 Get evidence scores: ${data.documentId}`);
        return await this.handleGetEvidenceScores(data.documentId);
      }
    );

    ipcMain.handle('check-api-key-status', async () => {
      this.logger.info('🔑 Checking API key status');
      return await this.handleCheckAPIKeyStatus();
    });

    ipcMain.handle(
      'similarity-search',
      async (_, data: IPCEvents['similarity-search']) => {
        this.logger.info(`🔍 Similarity search: ${data.query}`);
        return await this.handleSimilaritySearch(data);
      }
    );

    // Handle file dialog for PRD import
    ipcMain.handle('open-file-dialog', async () => {
      return await this.handleOpenFileDialog();
    });

    ipcMain.on('app-quit', () => {
      this.logger.info('🚪 App quit requested');
      this.quit();
    });

    this.logger.info('✅ IPC handlers registered');
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

      this.logger.info('✅ Core services initialized');
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

      // Get the persona details for a more personalized response
      const personaRepo = new (
        await import('./db/repositories/PersonaRepo')
      ).PersonaRepo();

      let persona;
      try {
        persona = await personaRepo.findById(data.personaId);
      } catch (error) {
        this.logger.warn(`⚠️ Could not find persona ${data.personaId}`, error);
      }

      // TODO: Implement LangGraph RAG chat (Phase 4.1)
      // For now, return a development placeholder response that's more helpful

      const personaName = persona?.name || 'Unknown Persona';
      const responses = [
        `Hi! I'm ${personaName}. While my full AI capabilities are still being developed, I'm here and ready to help with evidence-based product insights.`,
        `As ${personaName}, I'd love to analyze your PRD and provide evidence-based feedback. The full chat feature is coming soon in Phase 4!`,
        `Great question! As ${personaName}, I can see you're thinking strategically. My advanced analysis capabilities will be available soon.`,
        `That's an interesting point about your PRD. As ${personaName}, I'm still learning but will have full evidence analysis capabilities in Phase 4.`,
      ];

      // Return a random but contextual response
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      return {
        response: randomResponse,
        sources: [],
        persona: persona?.name || null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Chat failed', error);

      // Return a user-friendly error response
      return {
        response:
          "I apologize, but I couldn't generate a response at this time. Please try again later.",
        sources: [],
        persona: null,
        timestamp: new Date().toISOString(),
      };
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

      if (!this.secureFileIngestService) {
        this.logger.warn('⚠️ SecureFileIngestService not initialized');
        return [];
      }

      // Check if we have evidence scores for this document
      const evidenceScoreRepo = new (
        await import('./db/repositories/EvidenceScoreRepo')
      ).EvidenceScoreRepo();

      const scores = await evidenceScoreRepo.findByDocumentId(documentId);

      this.logger.info(
        `📊 Found ${scores.length} evidence scores for document ${documentId}`
      );
      return scores;
    } catch (error) {
      this.logger.error('❌ Failed to get evidence scores', error);
      return [];
    }
  }

  /**
   * Handle API key status check
   */
  private async handleCheckAPIKeyStatus() {
    try {
      this.logger.info('🔑 Checking OpenAI API key status');

      const { getToken } = await import('./security/tokenVault');
      const apiKey = await getToken('openai');

      const hasKey = !!apiKey;
      this.logger.info(
        `🔑 API key status: ${hasKey ? 'configured' : 'missing'}`
      );

      return {
        hasOpenAIKey: hasKey,
        isLangGraphReady:
          this.workflowOrchestrator?.getStatus().langGraphReady || false,
      };
    } catch (error) {
      this.logger.error('❌ Failed to check API key status', error);
      return {
        hasOpenAIKey: false,
        isLangGraphReady: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle file dialog for PRD selection
   */
  private async handleOpenFileDialog() {
    try {
      this.logger.info('📂 Opening file dialog for PRD selection');

      if (!this.mainWindow) {
        throw new Error('Main window not available');
      }

      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog(this.mainWindow, {
        title: 'Select PRD Document',
        filters: [
          {
            name: 'Documents',
            extensions: ['md', 'txt', 'markdown'],
          },
          {
            name: 'Markdown',
            extensions: ['md', 'markdown'],
          },
          {
            name: 'Text',
            extensions: ['txt'],
          },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        this.logger.info('📂 File dialog canceled');
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      this.logger.info(`📂 File selected: ${filePath}`);

      // Automatically trigger import
      const importResult = await this.handleImportPRD(filePath);

      return {
        canceled: false,
        filePath,
        importResult,
      };
    } catch (error) {
      this.logger.error('❌ File dialog failed', error);
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
