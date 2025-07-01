/**
 * PersonaPulse Main Process
 * Entry point for the Electron main process (Core)
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { TrayManager } from './tray';
import { Logger } from './utils/logger';
import { 
  IPC_CHANNELS, 
  PATHS, 
  UI, 
  URL_SCHEMES,
  DEV 
} from '@shared/constants';
import type { 
  IPCEvents, 
  AppSettings, 
  ImportResult 
} from '@shared/types';

// Environment detection for main process
const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PROD = process.env.NODE_ENV === 'production';
const IS_MAC = process.platform === 'darwin';

class PersonaPulseApp {
  private mainWindow: BrowserWindow | null = null;
  private trayManager: TrayManager | null = null;
  private logger: Logger;
  private isAppReady = false;

  constructor() {
    this.logger = new Logger('main');
    this.setupAppEventHandlers();
    this.setupIpcHandlers();
  }

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('🚀 PersonaPulse starting up...');
      
      // Create necessary directories
      await this.createDirectories();
      
      // Initialize tray (primary UI for this app)
      this.trayManager = new TrayManager(this.logger);
      await this.trayManager.initialize();
      
      // Set up protocol handlers if needed
      this.setupProtocols();
      
      // Initialize core services (will be added in later tasks)
      await this.initializeCoreServices();
      
      this.isAppReady = true;
      this.logger.info('✅ PersonaPulse ready');
      
      // Notify renderer if window exists
      if (this.mainWindow) {
        this.mainWindow.webContents.send(IPC_CHANNELS.APP_READY, {});
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize PersonaPulse', error);
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

    this.mainWindow = new BrowserWindow({
      width: UI.MAIN_WINDOW_WIDTH,
      height: UI.MAIN_WINDOW_HEIGHT,
      minWidth: UI.MIN_WINDOW_WIDTH,
      minHeight: UI.MIN_WINDOW_HEIGHT,
      show: false,
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
    ipcMain.handle(IPC_CHANNELS.IMPORT_PRD, async (_, data: IPCEvents['import-prd']) => {
      this.logger.info(`📄 Import PRD request: ${data.filePath}`);
      return await this.handleImportPRD(data.filePath);
    });

    // Get personas
    ipcMain.handle(IPC_CHANNELS.GET_PERSONAS, async () => {
      this.logger.info('👥 Get personas request');
      return await this.handleGetPersonas();
    });

    // Chat with persona
    ipcMain.handle(IPC_CHANNELS.CHAT_WITH_PERSONA, async (_, data: IPCEvents['chat-with-persona']) => {
      this.logger.info(`💬 Chat with persona: ${data.personaId}`);
      return await this.handleChatWithPersona(data);
    });

    // Get evidence scores
    ipcMain.handle(IPC_CHANNELS.GET_EVIDENCE_SCORES, async (_, data: IPCEvents['get-evidence-scores']) => {
      this.logger.info(`📊 Get evidence scores: ${data.documentId}`);
      return await this.handleGetEvidenceScores(data.documentId);
    });

    // App quit
    ipcMain.on(IPC_CHANNELS.APP_QUIT, () => {
      this.logger.info('🛑 Quit request from renderer');
      this.quit();
    });
  }

  /**
   * Set up protocol handlers
   */
  private setupProtocols(): void {
    // Handle deep links if needed
    app.setAsDefaultProtocolClient('personapulse');
  }

  /**
   * Initialize core services (placeholder for now)
   */
  private async initializeCoreServices(): Promise<void> {
    this.logger.info('⚙️ Initializing core services...');
    
    // TODO: Initialize database (Phase 1.2)
    // TODO: Initialize LangGraph service (Phase 1.3)
    // TODO: Initialize n8n workflow manager (Phase 1.3)
    // TODO: Load personas configuration (Phase 1.4)
    
    this.logger.info('✅ Core services initialized');
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
   * Handle PRD import
   */
  private async handleImportPRD(filePath: string): Promise<ImportResult> {
    try {
      this.logger.info(`📥 Processing PRD import: ${filePath}`);
      
      // TODO: Implement PRD parsing and processing (Phase 2.3)
      // For now, return a placeholder response
      
      return {
        success: true,
        documentId: `doc_${Date.now()}`,
        evidenceScores: [],
      };
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
      
      // TODO: Load from personas.yml and database (Phase 1.4)
      // For now, return placeholder data
      
      return [];
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
      this.logger.info(`💬 Processing chat: ${data.personaId} - ${data.message}`);
      
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
   * Handle application errors
   */
  private handleError(message: string, error: any): void {
    this.logger.error(message, error);
    
    // Show error dialog
    dialog.showErrorBox('PersonaPulse Error', `${message}\n\n${error?.message || 'Unknown error'}`);
    
    // Send error to renderer if available
    if (this.mainWindow) {
      this.mainWindow.webContents.send(IPC_CHANNELS.ERROR, {
        message,
        details: error?.message || 'Unknown error',
      });
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.logger.info('🧹 Cleaning up resources');
    
    if (this.trayManager) {
      this.trayManager.destroy();
      this.trayManager = null;
    }
    
    // TODO: Close database connections
    // TODO: Stop background services
  }

  /**
   * Quit the application
   */
  public quit(): void {
    this.logger.info('🛑 Quitting PersonaPulse');
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
}

// Create and start the application
const personaPulseApp = new PersonaPulseApp();

// Export for other modules
export { personaPulseApp }; 