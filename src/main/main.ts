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
import { testTokenVault, getToken } from './security/tokenVault';
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
  Evidence,
  Persona,
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
  private fileToImportOnReady: {
    fileName: string;
    fileContent: string;
  } | null = null;

  constructor() {
    this.logger = new Logger('main');
    this.logger.info('🚀 Personyx starting up...');

    // DEBUG: Ensure fileToImportOnReady starts clean
    this.fileToImportOnReady = null;
    this.logger.info(
      `🐛 [DEBUG] Initialized fileToImportOnReady cache as null`
    );

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
        webSecurity: true,
        preload: join(__dirname, 'preload.js'),
        // Enable file access for drag and drop
        sandbox: false,
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

        // If a file was dropped on the tray, send it to the modal now
        if (this.fileToImportOnReady) {
          this.logger.warn(
            `🐛 [CONTENT CORRUPTION TRACKING] About to send cached file content to renderer:`,
            {
              fileName: this.fileToImportOnReady.fileName,
              contentLength: this.fileToImportOnReady.fileContent.length,
              contentPreview: this.fileToImportOnReady.fileContent.substring(
                0,
                100
              ),
              event: 'open-import-modal-with-file-content',
            }
          );

          this.mainWindow.webContents.send(
            'open-import-modal-with-file-content',
            {
              fileName: this.fileToImportOnReady.fileName,
              fileContent: this.fileToImportOnReady.fileContent,
              fileSize: this.fileToImportOnReady.fileContent.length,
            }
          );

          this.logger.info(
            '🐛 [DEBUG] Clearing cached file content after sending to renderer'
          );
          this.fileToImportOnReady = null; // Clear after sending
        } else {
          this.logger.info(
            '🐛 [DEBUG] No cached file content to send on window ready'
          );
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

    // Enable drag and drop file operations
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);

      // Allow navigation to our own renderer and dev server
      if (
        parsedUrl.origin !== URL_SCHEMES.RENDERER_DEV.replace(/\/$/, '') &&
        !navigationUrl.startsWith('file://')
      ) {
        event.preventDefault();
      }
    });

    // Prevent new window creation from drag and drop
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
        this.logger.info(`📄 Import PRD request`);
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

    // Handle file drops from tray drop zone
    ipcMain.on('tray-file-drop', async (_event, data: { filePath: string }) => {
      this.logger.info(`🗂️ File dropped on tray zone: ${data.filePath}`);

      try {
        // Close the drop zone window first
        if (this.trayManager) {
          this.trayManager.closeDropZone();
        }

        // Ensure main window is open and focused
        this.createMainWindow();
        const mainWindow = this.getMainWindow();

        if (mainWindow) {
          // Wait a bit for window to be ready
          await new Promise(resolve => setTimeout(resolve, 100));

          // Send message to renderer to open import modal with the dropped file
          mainWindow.webContents.send('open-import-modal-with-file', {
            filePath: data.filePath,
          });
          this.logger.info('✅ Main window notified to open import modal');

          // Focus the main window and bring to front
          mainWindow.show();
          mainWindow.focus();
          mainWindow.moveTop();

          // On macOS, also activate the app
          if (process.platform === 'darwin') {
            app.focus({ steal: true });
          }
        } else {
          this.logger.error('❌ Could not create main window for file drop');
        }
      } catch (error) {
        this.logger.error('❌ Error handling tray file drop:', error);
      }
    });

    // Handle file drops from tray drop zone with content
    ipcMain.on(
      'tray-file-drop-with-content',
      async (_event, data: { fileName: string; fileContent: string }) => {
        this.logger.warn(
          `🐛 [CONTENT CORRUPTION TRACKING] Setting cached file content from tray drop:`,
          {
            fileName: data.fileName,
            contentLength: data.fileContent.length,
            contentPreview: data.fileContent.substring(0, 100),
            event: 'tray-file-drop-with-content',
          }
        );

        try {
          // Close the drop zone window first
          if (this.trayManager) {
            this.trayManager.closeDropZone();
          }

          // Defer sending file content until the window is ready
          this.fileToImportOnReady = {
            fileName: data.fileName,
            fileContent: data.fileContent,
          };
          this.logger.warn(
            `🐛 [CONTENT CORRUPTION TRACKING] Cached content set - will be sent when window is ready!`
          );

          // Ensure main window is open and focused.
          // The 'ready-to-show' event will handle sending the data.
          this.createMainWindow();
          const mainWindow = this.getMainWindow();

          if (mainWindow) {
            // Focus the main window and bring to front
            mainWindow.show();
            mainWindow.focus();
            mainWindow.moveTop();

            // On macOS, also activate the app
            if (process.platform === 'darwin') {
              app.focus({ steal: true });
            }
          } else {
            this.logger.error('❌ Could not create main window for file drop');
          }
        } catch (error) {
          this.logger.error(
            '❌ Error handling tray file drop with content:',
            error
          );
        }
      }
    );

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

      // Load OpenAI API key from .env if not already in token vault
      await this.loadEnvironmentAPIKeys();

      // Initialize settings service (Phase 2.5 - Feature 5.2)
      this.logger.info('⚙️ Initializing settings service...');
      this.settingsService = new SettingsService();
      await this.settingsService.initialize();
      this.logger.info('✅ Settings service initialized');

      // Initialize Firebase Cloud service (Phase 2.5 - Feature 5.3)
      this.logger.info('☁️ Initializing Firebase Cloud service...');
      this.cloudService = new PersonyxCloudService();
      this.logger.info('✅ Firebase Cloud service initialized');

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

      // Clean and reload personas to ensure correct YAML IDs
      await this.cleanAndReloadPersonas();

      // Initialize embedding retrieval service (Phase 2.2)
      this.logger.info('🔍 Initializing embedding retrieval service...');
      this.embeddingRetrievalService = new EmbeddingRetrievalService();
      this.logger.info('✅ Embedding retrieval service initialized');

      // Initialize secure file ingest service (Phase 2.3)
      this.logger.info('📄 Initializing secure file ingest service...');
      this.secureFileIngestService = new SecureFileIngestService();
      this.logger.info('✅ Secure file ingest service initialized');

      // Clean and reload personas to ensure correct YAML IDs
      await this.cleanAndReloadPersonas();

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
  private async handleImportPRD(
    filePathOrContent: string
  ): Promise<ImportResult> {
    try {
      this.logger.info(`📥 Processing PRD import`);

      // DEBUG: Log initial input to trace content corruption
      this.logger.info(`🐛 [DEBUG] Initial input received:`, {
        inputType: typeof filePathOrContent,
        inputLength: filePathOrContent.length,
        firstChars: filePathOrContent.substring(0, 100),
        lastChars: filePathOrContent.substring(
          Math.max(0, filePathOrContent.length - 100)
        ),
        hasNewlines: filePathOrContent.includes('\n'),
        isLikelyPath:
          !filePathOrContent.includes('\n') && filePathOrContent.length <= 500,
      });

      // DEBUG: Check if we have cached file content that might be interfering
      if (this.fileToImportOnReady) {
        this.logger.warn(
          `🐛 [CONTENT CORRUPTION BUG] Detected cached file content from previous operation:`,
          {
            cachedFileName: this.fileToImportOnReady.fileName,
            cachedContentLength: this.fileToImportOnReady.fileContent.length,
            cachedContentPreview:
              this.fileToImportOnReady.fileContent.substring(0, 100),
            willClearCache: true,
          }
        );

        // CRITICAL FIX: Clear the cached content to prevent corruption
        this.fileToImportOnReady = null;
        this.logger.info(
          `🐛 [FIX] Cleared cached file content to prevent corruption`
        );
      }

      if (!this.secureFileIngestService) {
        this.logger.warn('⚠️ SecureFileIngestService not initialized');
        throw new Error('Secure file ingest service not available');
      }

      let filePath: string;
      let isTemporaryFile = false;

      // Check if the input is a file path or file content
      if (filePathOrContent.includes('\n') || filePathOrContent.length > 500) {
        // Likely file content, create a temporary file
        this.logger.info(
          `🐛 [DEBUG] Detected as file content, creating temporary file`
        );

        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        const tempDir = os.tmpdir();
        const tempFileName = `temp_prd_${Date.now()}.md`;
        filePath = path.join(tempDir, tempFileName);

        // DEBUG: Log what we're writing to the temp file
        this.logger.info(`🐛 [DEBUG] Writing content to temporary file:`, {
          tempFilePath: filePath,
          contentLength: filePathOrContent.length,
          contentPreview:
            filePathOrContent.substring(0, 200) +
            (filePathOrContent.length > 200 ? '...' : ''),
        });

        fs.writeFileSync(filePath, filePathOrContent, 'utf8');
        isTemporaryFile = true;
        this.logger.info(`📝 Created temporary file: ${filePath}`);

        // DEBUG: Verify what we actually wrote to the file
        try {
          const verifyContent = fs.readFileSync(filePath, 'utf8');
          this.logger.info(
            `🐛 [DEBUG] Verification - content written to temp file:`,
            {
              writtenLength: verifyContent.length,
              writtenPreview:
                verifyContent.substring(0, 200) +
                (verifyContent.length > 200 ? '...' : ''),
              matches: verifyContent === filePathOrContent,
            }
          );
        } catch (verifyError) {
          this.logger.error(
            `🐛 [DEBUG] Failed to verify temp file content:`,
            verifyError
          );
        }
      } else {
        // Assume it's a file path
        filePath = filePathOrContent;
        this.logger.info(`📂 Using file path: ${filePath}`);

        // DEBUG: If it's a file path, let's see what's in that file
        try {
          const fs = await import('fs');
          const fileContent = fs.readFileSync(filePath, 'utf8');
          this.logger.info(`🐛 [DEBUG] Content from provided file path:`, {
            filePath,
            contentLength: fileContent.length,
            contentPreview:
              fileContent.substring(0, 200) +
              (fileContent.length > 200 ? '...' : ''),
          });
        } catch (readError) {
          this.logger.error(
            `🐛 [DEBUG] Failed to read provided file path:`,
            readError
          );
        }
      }

      // Use the new secure file ingest service (Phase 2.3)
      const ingestResult =
        await this.secureFileIngestService.ingestPRDFile(filePath);

      // Clean up temporary file if created
      if (isTemporaryFile) {
        try {
          const fs = await import('fs');
          fs.unlinkSync(filePath);
          this.logger.info(`🗑️ Cleaned up temporary file: ${filePath}`);
        } catch (error) {
          this.logger.warn(`⚠️ Failed to clean up temporary file: ${error}`);
        }
      }

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

      // Get the persona data
      const personas = await this.handleGetPersonas();
      const persona = personas.find((p: Persona) => p.id === data.personaId);

      if (!persona) {
        throw new Error(`Persona ${data.personaId} not found`);
      }

      this.logger.info(`🎭 Found persona: ${persona.name} (${persona.id})`);

      // Try to use LangGraph service for AI-powered responses
      let response = '';
      let sources: Evidence[] = [];

      if (this.langGraphService && (await this.isLangGraphServiceReady())) {
        this.logger.info('🤖 Using LangGraph service for AI response');
        try {
          // Generate AI response using LangGraph service
          response = await this.generateAIResponse(data.message, persona);

          // Try to get relevant evidence sources (skip for very short queries)
          if (
            this.embeddingRetrievalService &&
            data.message.trim().length > 10
          ) {
            this.logger.info(
              '🔍 Searching for evidence sources to support response'
            );
            try {
              const searchResult =
                await this.embeddingRetrievalService.searchSimilar({
                  query: data.message,
                  personaId: data.personaId,
                  topN: 3,
                  minSimilarity: 0.6,
                });
              sources = searchResult.results.map(r => r.evidence).slice(0, 3);
              this.logger.info(
                `📚 Found ${sources.length} relevant evidence sources`
              );
            } catch (error) {
              this.logger.warn(
                '⚠️ Evidence search failed, continuing without sources',
                error
              );
            }
          } else {
            this.logger.info('🔍 Skipping evidence search for short query');
          }
        } catch (error) {
          this.logger.warn(
            '⚠️ AI response failed, falling back to template',
            error
          );
          response = this.generateTemplateResponse(data.message, persona);
        }
      } else {
        this.logger.info(
          '💡 LangGraph service not ready, using template response'
        );
        response = this.generateTemplateResponse(data.message, persona);
      }

      return {
        message: response,
        sources,
        persona,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Chat failed', error);
      throw error;
    }
  }

  /**
   * Check if LangGraph service is ready for AI responses
   */
  private async isLangGraphServiceReady(): Promise<boolean> {
    if (!this.langGraphService) {
      return false;
    }

    try {
      // Check if we have an API key available
      const hasOpenAIKey = await getToken('openai');
      return !!hasOpenAIKey;
    } catch (error) {
      this.logger.debug('🔑 No OpenAI API key available');
      return false;
    }
  }

  /**
   * Generate AI-powered response using OpenAI
   */
  private async generateAIResponse(
    message: string,
    persona: Persona
  ): Promise<string> {
    const openaiKey = await getToken('openai');
    if (!openaiKey) {
      throw new Error('No OpenAI API key available');
    }

    // Initialize OpenAI client for chat
    const OpenAI = await import('openai');
    const openai = new OpenAI.default({
      apiKey: openaiKey,
    });

    const systemPrompt = `You are ${persona.name}, a ${persona.description}

Your primary goal is: ${persona.primaryGoal}
Your main pain point is: ${persona.mainPainPoint}

Key characteristics and interests: ${persona.keywords?.join(', ') || 'N/A'}

Respond as this persona would, drawing from their specific perspective, goals, and challenges. Keep your response conversational, helpful, and authentic to the persona's voice. Aim for 2-3 paragraphs that provide valuable insights based on the persona's experience.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('Empty response from OpenAI');
    }

    this.logger.info('✅ Generated AI response using OpenAI');
    return aiResponse;
  }

  /**
   * Generate template response as fallback
   */
  private generateTemplateResponse(message: string, persona: Persona): string {
    // Use the original template logic as fallback
    if (
      persona.id === 'solo_founder' ||
      persona.name?.toLowerCase().includes('solo founder')
    ) {
      return this.generateSoloFounderResponse(message, persona);
    } else if (
      persona.id === 'agency_marketer' ||
      persona.name?.toLowerCase().includes('agency marketer')
    ) {
      return this.generateAgencyMarketerResponse(message, persona);
    } else {
      return `Hi! I'm ${persona.name}. ${persona.description} 

My main goal is: ${persona.primaryGoal}
My biggest pain point: ${persona.mainPainPoint}

Regarding your question: "${message}"

I'd be happy to share insights based on my experience. What specific aspect would you like to explore further?`;
    }
  }

  /**
   * Generate contextual response for Solo Founder persona
   */
  private generateSoloFounderResponse(
    message: string,
    persona: Persona
  ): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('feature') || lowerMessage.includes('build')) {
      return `As a ${persona.name}, I'm always thinking about ROI and speed to market. 

When considering new features, I ask myself:
- Will this move the needle on my core metrics?
- Can I validate this with minimal investment?
- Does this align with my users' most critical pain points?

For your question about "${message}", I'd recommend starting with the simplest version that proves value. Remember, as a solo founder, every hour counts - focus on features that directly impact user retention or revenue.

What's the specific outcome you're hoping to achieve with this feature?`;
    }

    if (lowerMessage.includes('user') || lowerMessage.includes('feedback')) {
      return `User feedback is gold for me as a ${persona.name}. I've learned that users often ask for features, but what they really need is solutions to their problems.

My approach:
- Listen for the pain point behind the feature request
- Look for patterns across multiple user conversations
- Validate with quick experiments before building

Regarding "${message}" - have you noticed multiple users mentioning similar pain points? That's usually my signal that something is worth exploring.

What patterns are you seeing in your user feedback?`;
    }

    return `Hi! I'm a ${persona.name} - ${persona.description}

My biggest challenge is ${persona.mainPainPoint}, and I'm constantly focused on ${persona.primaryGoal}.

About your question: "${message}"

From my experience bootstrapping products, I've learned that every decision needs to be weighed against limited time and resources. I prioritize ruthlessly and always ask "What's the minimum viable version of this?"

What specific challenge are you trying to solve? I'd love to share what's worked (and what hasn't) in my journey.`;
  }

  /**
   * Generate contextual response for Agency Marketer persona
   */
  private generateAgencyMarketerResponse(
    message: string,
    persona: Persona
  ): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('campaign') ||
      lowerMessage.includes('marketing')
    ) {
      return `As an ${persona.name}, I'm all about measurable results and client satisfaction. 

When planning campaigns, I focus on:
- Clear KPIs that align with client business goals
- Multi-channel strategies that reinforce each other
- Regular testing and optimization
- Transparent reporting to build trust

For your question about "${message}", I'd want to understand:
- What's the primary business objective?
- Who's the target audience?
- What channels are already performing well?

Data-driven decisions are what separate good agencies from great ones. What metrics are you currently tracking?`;
    }

    if (lowerMessage.includes('client') || lowerMessage.includes('report')) {
      return `Client relationships are everything in my world as an ${persona.name}. 

My approach to client success:
- Set clear expectations upfront
- Provide regular, transparent updates
- Focus on business impact, not just vanity metrics
- Proactively suggest optimizations

Regarding "${message}" - client communication is often about translating marketing performance into business language. They want to know how our work impacts their bottom line.

How are you currently measuring and communicating campaign success to stakeholders?`;
    }

    return `Hey! I'm an ${persona.name} - ${persona.description}

My main focus is ${persona.primaryGoal}, and my biggest frustration is ${persona.mainPainPoint}.

About your question: "${message}"

In my agency work, I've learned that success comes from understanding both the marketing mechanics AND the client's business goals. Every campaign needs to be tied to measurable business outcomes.

I'd love to help you think through this from both a strategic and tactical perspective. What's the bigger picture you're trying to achieve?`;
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
        this.logger.warn('⚠️ FirebaseCloudService not initialized');
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

  /**
   * Load OpenAI API key from .env if not already in token vault
   */
  private async loadEnvironmentAPIKeys(): Promise<void> {
    try {
      // Import token vault functions
      const { getToken, storeToken } = await import('./security/tokenVault');

      // Check if OpenAI API key already exists in token vault
      const existingToken = await getToken('openai');
      if (existingToken) {
        this.logger.info('✅ OpenAI API key already exists in token vault');
        return;
      }

      // Check for OpenAI API key in environment variables
      const envApiKey = process.env.OPENAI_API_KEY;
      if (envApiKey && envApiKey.trim() !== '') {
        this.logger.info(
          '🔑 Loading OpenAI API key from .env into token vault'
        );
        await storeToken('openai', envApiKey.trim());
        this.logger.info('✅ OpenAI API key loaded successfully from .env');
      } else {
        this.logger.info(
          'ℹ️ No OpenAI API key found in .env - user will need to configure manually'
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to load environment API keys', error);
      // Don't fail startup for this - just log the error
    }
  }

  /**
   * Clean and reload personas to ensure correct YAML IDs
   */
  private async cleanAndReloadPersonas(): Promise<void> {
    try {
      this.logger.info(
        '🧹 Cleaning and reloading personas to ensure correct IDs'
      );

      // Import PersonaRepo
      const { PersonaRepo } = await import('./db/repositories/PersonaRepo');
      const personaRepo = new PersonaRepo();

      // Get current personas to check for issues
      const currentPersonas = await personaRepo.list();
      const hasRandomIds = currentPersonas.some(
        p => p.id.includes('persona-') && p.id.includes('-')
      );

      if (hasRandomIds) {
        this.logger.info(
          '🔧 Found personas with random IDs, cleaning database'
        );

        // Clear all personas from database
        const { getDatabase } = await import('./db/connection');
        const db = getDatabase();
        const { personas } = await import('./db/schema');
        await db.delete(personas);

        this.logger.info('🗑️ Cleared persona table');

        // Reload personas from YAML (this will use correct IDs)
        if (this.personaLoader) {
          const reloadedCount = await this.personaLoader.loadPersonas();
          this.logger.info(
            `✅ Reloaded ${reloadedCount} personas with correct YAML IDs`
          );
        }
      } else {
        this.logger.info(
          '✅ Personas already have correct IDs, no cleanup needed'
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to clean and reload personas', error);
      // Don't fail startup - just log the error
    }
  }
}

// Create and start the application
const personyxApp = new PersonyxApp();

// Export for other modules
export { personyxApp };
