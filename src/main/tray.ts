/**
 * TrayManager - Handles system tray functionality for Personyx
 */

import { Tray, Menu, nativeImage, dialog, BrowserWindow } from 'electron';
import { join } from 'path';
import { readFileSync, statSync } from 'fs';
import { personyxApp } from './main';
import { FILE_FILTERS } from '@shared/constants';
import type { Logger } from './utils/logger';
import type { TrayAction } from '@shared/types';

export class TrayManager {
  private tray: Tray | null = null;
  private logger: Logger;
  private dropZoneWindow: BrowserWindow | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Initialize the system tray
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('🎯 Initializing system tray');

      // Create tray icon with enhanced logging
      const icon = this.createTrayIcon();
      this.logger.debug(
        `📱 Tray icon created - Size: ${icon.getSize()}, isEmpty: ${icon.isEmpty()}`
      );

      this.tray = new Tray(icon);
      this.logger.debug('📱 Tray object created successfully');

      // Set tray tooltip and title for visual confirmation
      this.tray.setToolTip('Personyx - Evidence-based PRD analysis');
      this.tray.setTitle('PY'); // Visual confirmation - shows text in macOS menu bar
      this.logger.debug('📱 Tray tooltip and title set');

      // Create context menu
      this.updateContextMenu();
      this.logger.debug('📱 Context menu updated');

      // Handle click events with enhanced debugging
      this.setupEventHandlers();
      this.logger.debug('📱 Event handlers attached');

      this.logger.info('✅ System tray initialized successfully');
      this.logger.info(`📱 Tray available: ${this.tray !== null}`);
      this.logger.info(`📱 Platform: ${process.platform}`);
    } catch (error) {
      this.logger.error('❌ Failed to initialize tray', error);
      throw error;
    }
  }

  /**
   * Create tray icon with fallback
   */
  private createTrayIcon(): Electron.NativeImage {
    // Try to load icon from assets, fall back to generated icon
    const iconPath = join(__dirname, '../../assets/tray-icon-20.png');

    this.logger.debug(`📱 Attempting to load tray icon from: ${iconPath}`);

    try {
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) {
        this.logger.info('✅ Loaded tray icon from assets');
        return icon;
      }
      this.logger.warn(
        '⚠️ Asset icon file exists but is empty, using fallback'
      );
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to load asset icon: ${error}, using fallback`
      );
    }

    // Fallback: create a visible icon programmatically
    this.logger.info('🎨 Creating fallback tray icon');
    return this.createFallbackIcon();
  }

  /**
   * Create a visible fallback tray icon
   */
  private createFallbackIcon(): Electron.NativeImage {
    // Create a simple colored square icon (better than empty)
    const size = process.platform === 'darwin' ? 22 : 16; // macOS prefers 22px

    // Create a simple bitmap - red circle with white "P"
    const canvas = Buffer.alloc(size * size * 4); // RGBA

    // Fill with a visible pattern (simple red background)
    for (let i = 0; i < canvas.length; i += 4) {
      canvas[i] = 255; // Red
      canvas[i + 1] = 100; // Green
      canvas[i + 2] = 100; // Blue
      canvas[i + 3] = 255; // Alpha (fully opaque)
    }

    const image = nativeImage.createFromBuffer(canvas, {
      width: size,
      height: size,
    });
    this.logger.debug(
      `🎨 Fallback icon created - Size: ${size}x${size}, isEmpty: ${image.isEmpty()}`
    );

    return image;
  }

  /**
   * Update the context menu
   */
  private updateContextMenu(): void {
    if (!this.tray) return;

    const menu = Menu.buildFromTemplate([
      {
        label: 'Show Personyx',
        click: () => this.handleAction('show-window'),
      },
      { type: 'separator' },
      {
        label: 'Select PRD File...',
        accelerator: 'CmdOrCtrl+D',
        click: () => this.handleAction('show-drop-zone'),
      },
      {
        label: 'Import PRD...',
        accelerator: 'CmdOrCtrl+O',
        click: () => this.handleAction('import-prd'),
      },
      {
        label: 'Chat with Persona...',
        accelerator: 'CmdOrCtrl+K',
        click: () => this.handleAction('chat-persona'),
      },
      {
        label: 'View Evidence Scores',
        click: () => this.handleAction('view-scores'),
      },
      { type: 'separator' },
      {
        label: 'Settings...',
        accelerator: 'CmdOrCtrl+,',
        click: () => this.handleAction('open-settings'),
      },
      { type: 'separator' },
      {
        label: 'Check for Updates...',
        click: () => this.handleAction('check-updates'),
      },
      { type: 'separator' },
      {
        label: 'Quit Personyx',
        accelerator: 'CmdOrCtrl+Q',
        click: () => this.handleAction('quit-app'),
      },
    ]);

    this.tray.setContextMenu(menu);
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    if (!this.tray) {
      this.logger.error('❌ Cannot setup event handlers - tray is null!');
      return;
    }

    this.logger.debug('📱 Setting up tray event handlers...');

    // Handle left click (show drop zone)
    this.tray.on('click', (event, bounds) => {
      this.logger.info('👆 Tray LEFT CLICK detected!');
      this.logger.debug(`👆 Click event details:`, {
        bounds,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      });
      this.handleAction('show-drop-zone');
    });

    // Handle right click - add explicit handler for debugging
    this.tray.on('right-click', (event, bounds) => {
      this.logger.info('👆 Tray RIGHT CLICK detected!');
      this.logger.debug(`👆 Right-click event details:`, {
        bounds,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      });
      // Context menu will still show automatically
    });

    // Handle double click
    this.tray.on('double-click', (event, bounds) => {
      this.logger.info('👆 Tray DOUBLE CLICK detected!');
      this.logger.debug(`👆 Double-click event details:`, {
        bounds,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      });
      this.handleAction('show-window');
    });

    // Handle drag enter (for drag-and-drop debugging)
    this.tray.on('drag-enter', () => {
      this.logger.info('🗂 Tray DRAG ENTER detected!');
    });

    // Handle drag leave
    this.tray.on('drag-leave', () => {
      this.logger.info('🗂 Tray DRAG LEAVE detected!');
    });

    // Handle drop (this might not work on all platforms)
    this.tray.on('drop', () => {
      this.logger.info('🗂 Tray DROP detected!');
    });

    // Handle drop files
    this.tray.on('drop-files', (event, files) => {
      this.logger.info('🗂 Tray DROP FILES detected!');
      this.logger.debug(`🗂 Dropped files:`, files);
      if (files.length > 0) {
        this.processDroppedFile(files[0]);
      }
    });

    this.logger.info('✅ All tray event handlers attached successfully');
  }

  /**
   * Handle tray menu actions
   */
  private async handleAction(
    action: TrayAction | 'show-drop-zone'
  ): Promise<void> {
    this.logger.info(`🔧 Tray action START: ${action}`);
    this.logger.debug(`🔧 Action timestamp: ${new Date().toISOString()}`);

    try {
      switch (action) {
        case 'show-window':
          this.logger.debug('🔧 Executing: show-window');
          personyxApp.createMainWindow();
          this.logger.info('✅ show-window completed');
          break;

        case 'show-drop-zone':
          this.logger.debug('🔧 Executing: show-drop-zone');
          await this.showDropZone();
          this.logger.info('✅ show-drop-zone completed');
          break;

        case 'import-prd':
          this.logger.debug('🔧 Executing: import-prd');
          await this.handleImportPRD();
          this.logger.info('✅ import-prd completed');
          break;

        case 'chat-persona': {
          this.logger.debug('🔧 Executing: chat-persona');
          personyxApp.createMainWindow();
          // Send a message to the renderer to open the chat window
          const mainWindow = personyxApp.getMainWindow();
          if (mainWindow) {
            mainWindow.webContents.send('open-chat-window');
          }
          this.logger.info('✅ chat-persona completed');
          break;
        }

        case 'view-scores':
          this.logger.debug('🔧 Executing: view-scores');
          // TODO: Implement evidence scores view
          this.logger.info('📊 View scores - not implemented yet');
          break;

        case 'open-settings': {
          this.logger.debug('🔧 Executing: open-settings');
          personyxApp.createMainWindow();

          // Send message to renderer to open settings modal
          const mainWindow = personyxApp.getMainWindow();
          if (mainWindow) {
            mainWindow.webContents.send('open-settings-window');
            this.logger.info('📢 Sent open-settings-window IPC to renderer');
          } else {
            this.logger.warn(
              '⚠️ Could not send open-settings-window - main window not available'
            );
          }
          this.logger.info('✅ open-settings completed');
          break;
        }

        case 'check-updates':
          this.logger.debug('🔧 Executing: check-updates');
          await this.handleCheckForUpdates();
          this.logger.info('✅ check-updates completed');
          break;

        case 'quit-app':
          this.logger.debug('🔧 Executing: quit-app');
          personyxApp.quit();
          this.logger.info('✅ quit-app completed');
          break;

        default:
          this.logger.error(`❌ Unknown tray action: ${action}`);
      }

      this.logger.info(`🔧 Tray action END: ${action}`);
    } catch (error) {
      this.logger.error(`❌ Tray action FAILED: ${action}`, error);
      throw error;
    }
  }

  /**
   * Show drop zone window for PRD files
   */
  private async showDropZone(): Promise<void> {
    try {
      this.logger.info('📂 Opening PRD drop zone');

      if (this.dropZoneWindow) {
        this.dropZoneWindow.focus();
        return;
      }

      this.dropZoneWindow = new BrowserWindow({
        width: 400,
        height: 300,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        title: 'Drop PRD Files Here',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: join(__dirname, 'preload.js'),
        },
        show: false,
      });

      // Create drop zone HTML content
      const dropZoneHTML = this.createDropZoneHTML();
      this.dropZoneWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(dropZoneHTML)}`
      );

      // Position window near tray (simplified - you might want to calculate tray position)
      this.dropZoneWindow.center();

      // Set up drag and drop handlers using Electron's native API
      this.setupDropZoneHandlers();

      this.dropZoneWindow.once('ready-to-show', () => {
        if (this.dropZoneWindow) {
          this.dropZoneWindow.show();
          this.logger.info('📂 Drop zone window is now visible');
        }
      });

      this.dropZoneWindow.on('closed', () => {
        this.dropZoneWindow = null;
        this.logger.info('📂 Drop zone closed');
      });

      this.dropZoneWindow.on('blur', () => {
        // Auto-close when focus lost (after a small delay)
        setTimeout(() => {
          if (this.dropZoneWindow) {
            this.dropZoneWindow.close();
          }
        }, 3000);
      });
    } catch (error) {
      this.logger.error('❌ Failed to show drop zone', error);
    }
  }

  /**
   * Create HTML content for drop zone
   */
  private createDropZoneHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Select PRD File</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: calc(100vh - 40px);
              user-select: none;
            }
            .select-zone {
              border: 2px solid rgba(255, 255, 255, 0.5);
              border-radius: 12px;
              padding: 40px;
              text-align: center;
              transition: all 0.3s ease;
              width: 100%;
              max-width: 300px;
              min-height: 150px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            }
            .select-zone:hover {
              border-color: rgba(255, 255, 255, 0.9);
              background: rgba(255, 255, 255, 0.1);
              transform: scale(1.02);
            }

            .icon {
              font-size: 48px;
              margin-bottom: 16px;
              opacity: 0.8;
            }
            .title {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 14px;
              opacity: 0.8;
            }
            .supported-formats {
              margin-top: 16px;
              font-size: 12px;
              opacity: 0.6;
            }
          </style>
        </head>
        <body>
          <div class="select-zone" id="selectZone">
            <div class="icon">📄</div>
            <div class="title">Select PRD File</div>
            <div class="subtitle">Click to browse for files</div>
            <div class="supported-formats">Supports: .md, .txt, .markdown</div>
          </div>
          
          <script>
            
            // Debug function to check if electronAPI is available
            function checkElectronAPI() {
              console.log('🔍 Checking electronAPI availability:', !!window.electronAPI);
              if (window.electronAPI) {
                console.log('✅ ElectronAPI functions available:', Object.keys(window.electronAPI));
              } else {
                console.error('❌ ElectronAPI not available in tray drop zone');
              }
            }
            
            // Check API availability when page loads
            document.addEventListener('DOMContentLoaded', function() {
              console.log('🚀 Tray drop zone page loaded');
              checkElectronAPI();
              setupEventListeners();
            });
            
            function setupEventListeners() {
              const selectZone = document.getElementById('selectZone');
              if (!selectZone) {
                console.error('❌ Select zone element not found');
                return;
              }
              
              // Set up click event listener on the select zone
              selectZone.addEventListener('click', openFileDialog);
              
              console.log('✅ Click event listener set up for tray drop zone');
            }
            
            function openFileDialog() {
              console.log('📂 Opening file dialog from tray drop zone...');
              checkElectronAPI();
              if (window.electronAPI && window.electronAPI.openFileDialog) {
                window.electronAPI.openFileDialog();
              } else {
                console.error('❌ Cannot open file dialog - electronAPI not available');
              }
            }
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Set up drop zone event handlers
   */
  private setupDropZoneHandlers(): void {
    if (!this.dropZoneWindow) return;

    this.logger.debug('🔧 Setting up drop zone IPC handlers...');

    // Handle console messages from drop zone for debugging
    this.dropZoneWindow.webContents.on(
      'console-message',
      (event, level, message, _line, _sourceId) => {
        // Forward console messages from drop zone to main logger
        this.logger.debug(`📱 [Tray Drop Zone] ${message}`);
      }
    );

    // Handle file dialog requests from the drop zone
    this.dropZoneWindow.webContents.on(
      'ipc-message',
      async (_event, channel, ...args) => {
        this.logger.debug(`📱 IPC message from drop zone: ${channel}`, args);

        if (channel === 'open-file-dialog') {
          this.logger.info('📁 File dialog requested from drop zone');

          // Close drop zone first
          if (this.dropZoneWindow) {
            this.dropZoneWindow.close();
          }

          // Open file dialog
          await this.handleImportPRD();
        }
      }
    );

    this.logger.info('✅ Drop zone IPC handlers set up successfully');
  }

  /**
   * Process a dropped PRD file (Phase 2.3 - Secure File Ingest)
   */
  private async processDroppedFile(filePath: string): Promise<void> {
    try {
      this.logger.info(`📄 Processing dropped file: ${filePath}`);

      // Validate file
      const validation = this.validatePRDFile(filePath);
      if (!validation.valid) {
        this.logger.error(`❌ Invalid file: ${validation.error}`);
        this.showDropNotification(filePath, false);

        // Emit global error toast for validation failures
        personyxApp.emitGlobalError({
          type: 'validation-error',
          title: 'PRD Import Failed',
          message: `${validation.error}`,
          fileName: filePath.split('/').pop() || 'Unknown file',
          operation: 'prd-import',
          timestamp: new Date(),
          dismissible: true,
          autoDismissMs: 5000,
        });
        return;
      }

      // Close drop zone first
      this.closeDropZone();

      // Trigger the actual PRD processing pipeline through main process
      this.logger.info(`🚀 Sending file to secure ingest service: ${filePath}`);

      // Ensure main window is open and get it
      personyxApp.createMainWindow();
      const mainWindow = personyxApp.getMainWindow();

      if (mainWindow) {
        // Wait a bit for window to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Send message to renderer to open import modal with the file
        mainWindow.webContents.send('open-import-modal-with-file', {
          filePath,
        });

        // Focus the main window and bring to front
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();

        this.logger.info('✅ Main window opened and focused with import modal');
      } else {
        this.logger.error(
          '❌ Could not create main window for file processing'
        );
      }

      // Show initial notification (final result will come from main process)
      this.showDropNotification(filePath, true);

      this.logger.info(`✅ PRD file sent to processing pipeline: ${filePath}`);
    } catch (error) {
      this.logger.error('❌ Failed to process dropped file', error);
      this.showDropNotification(filePath, false);

      // Emit global error toast for processing failures
      personyxApp.emitGlobalError({
        type: 'ingest-error',
        title: 'PRD Import Failed',
        message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fileName: filePath.split('/').pop() || 'Unknown file',
        operation: 'prd-import',
        timestamp: new Date(),
        dismissible: true,
        autoDismissMs: 8000,
      });
    }
  }

  /**
   * Validate PRD file
   */
  private validatePRDFile(filePath: string): {
    valid: boolean;
    error?: string;
  } {
    try {
      // Check file existence and basic properties
      const stats = statSync(filePath);

      if (!stats.isFile()) {
        return { valid: false, error: 'Not a file' };
      }

      // Check file size (max 10MB)
      const maxSizeBytes = 10 * 1024 * 1024;
      if (stats.size > maxSizeBytes) {
        return { valid: false, error: 'File too large (max 10MB)' };
      }

      // Check file extension
      const validExtensions = FILE_FILTERS.PRD.extensions;
      const fileExtension = filePath.split('.').pop()?.toLowerCase();

      if (
        !fileExtension ||
        !validExtensions.includes(
          fileExtension as (typeof validExtensions)[number]
        )
      ) {
        return { valid: false, error: 'Invalid file type' };
      }

      // Basic content validation (ensure it's text)
      try {
        const content = readFileSync(filePath, 'utf-8');
        if (content.length === 0) {
          return { valid: false, error: 'Empty file' };
        }
      } catch {
        return { valid: false, error: 'Could not read file as text' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `File access error: ${error}` };
    }
  }

  /**
   * Show notification for file drop
   */
  private showDropNotification(filePath: string, success: boolean): void {
    const fileName = filePath.split('/').pop() || 'Unknown file';

    if (success) {
      this.logger.info(`✅ PRD imported: ${fileName}`);
      // TODO: Show system notification when available
    } else {
      this.logger.error(`❌ Failed to import: ${fileName}`);
      // TODO: Show error notification when available
    }
  }

  /**
   * Handle check for updates
   */
  private async handleCheckForUpdates(): Promise<void> {
    try {
      this.logger.info('🔄 Manual update check from tray');

      const autoUpdater = personyxApp.getAutoUpdater();
      if (autoUpdater) {
        await autoUpdater.checkForUpdates();
      } else {
        this.logger.warn('⚠️ Auto-updater not available');
      }
    } catch (error) {
      this.logger.error('❌ Update check failed', error);
    }
  }

  /**
   * Handle PRD import via file dialog
   */
  private async handleImportPRD(): Promise<void> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import PRD',
        filters: [
          {
            name: FILE_FILTERS.PRD.name,
            extensions: [...FILE_FILTERS.PRD.extensions],
          },
        ],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        this.logger.info(`📥 Importing PRD via dialog: ${filePath}`);
        await this.processDroppedFile(filePath);
      }
    } catch (error) {
      this.logger.error('❌ PRD import dialog failed', error);
    }
  }

  /**
   * Close the drop zone window if it's open
   */
  public closeDropZone(): void {
    if (this.dropZoneWindow) {
      this.dropZoneWindow.close();
      this.dropZoneWindow = null;
      this.logger.info('📂 Drop zone window closed');
    }
  }

  /**
   * Update tray icon to show status
   */
  public updateStatus(hasLowScores: boolean): void {
    if (!this.tray) return;

    // TODO: Change icon color/overlay based on evidence scores
    this.logger.debug(
      `🎯 Tray status updated: ${hasLowScores ? 'warning' : 'normal'}`
    );
  }

  /**
   * Destroy the tray
   */
  public destroy(): void {
    if (this.dropZoneWindow) {
      this.dropZoneWindow.close();
      this.dropZoneWindow = null;
    }

    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      this.logger.info('🗑 Tray destroyed');
    }
  }
}
