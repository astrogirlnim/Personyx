/**
 * TrayManager - Handles system tray functionality for PersonaPulse
 */

import { Tray, Menu, nativeImage, dialog, BrowserWindow } from 'electron';
import { join } from 'path';
import { readFileSync, statSync } from 'fs';
import { personaPulseApp } from './main';
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

      // Create tray icon
      const icon = this.createTrayIcon();
      this.tray = new Tray(icon);

      // Set tray tooltip
      this.tray.setToolTip('PersonaPulse - Evidence-based PRD analysis');

      // Create context menu
      this.updateContextMenu();

      // Handle click events
      this.setupEventHandlers();

      this.logger.info('✅ System tray initialized');
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
    const iconPath = join(__dirname, '../../assets/tray-icon.png');

    try {
      return nativeImage.createFromPath(iconPath);
    } catch {
      // Fallback: create a simple icon programmatically
      const canvas = nativeImage.createEmpty();
      return canvas.resize({ width: 16, height: 16 });
    }
  }

  /**
   * Update the context menu
   */
  private updateContextMenu(): void {
    if (!this.tray) return;

    const menu = Menu.buildFromTemplate([
      {
        label: 'Show PersonaPulse',
        click: () => this.handleAction('show-window'),
      },
      { type: 'separator' },
      {
        label: 'Drop PRD Zone',
        accelerator: 'CmdOrCtrl+D',
        click: () => this.handleAction('show-drop-zone'),
      },
      {
        label: 'Import PRD...',
        accelerator: 'CmdOrCtrl+O',
        click: () => this.handleAction('import-prd'),
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
        label: 'Quit PersonaPulse',
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
    if (!this.tray) return;

    // Handle left click (show drop zone)
    this.tray.on('click', () => {
      this.handleAction('show-drop-zone');
    });

    // Handle right click (show context menu) - handled automatically by Electron
  }

  /**
   * Handle tray menu actions
   */
  private async handleAction(
    action: TrayAction | 'show-drop-zone'
  ): Promise<void> {
    this.logger.debug(`🔧 Tray action: ${action}`);

    switch (action) {
      case 'show-window':
        personaPulseApp.createMainWindow();
        break;

      case 'show-drop-zone':
        await this.showDropZone();
        break;

      case 'import-prd':
        await this.handleImportPRD();
        break;

      case 'view-scores':
        // TODO: Implement evidence scores view
        this.logger.info('📊 View scores - not implemented yet');
        break;

      case 'open-settings':
        // TODO: Implement settings window
        this.logger.info('⚙️ Open settings - not implemented yet');
        break;

      case 'check-updates':
        await this.handleCheckForUpdates();
        break;

      case 'quit-app':
        personaPulseApp.quit();
        break;

      default:
        this.logger.warn(`Unknown tray action: ${action}`);
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

      // Set up drag and drop handlers
      this.setupDropZoneHandlers();

      this.dropZoneWindow.once('ready-to-show', () => {
        if (this.dropZoneWindow) {
          this.dropZoneWindow.show();
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
          <title>Drop PRD Files</title>
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
            .drop-zone {
              border: 2px dashed rgba(255, 255, 255, 0.5);
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
            }
            .drop-zone.drag-over {
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
          <div class="drop-zone" id="dropZone">
            <div class="icon">📄</div>
            <div class="title">Drop PRD Files Here</div>
            <div class="subtitle">Drag and drop your Product Requirements Documents</div>
            <div class="supported-formats">Supports: .md, .txt, .markdown</div>
          </div>
          
          <script>
            const dropZone = document.getElementById('dropZone');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
              dropZone.addEventListener(eventName, preventDefaults, false);
              document.body.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
              dropZone.addEventListener(eventName, highlight, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
              dropZone.addEventListener(eventName, unhighlight, false);
            });
            
            dropZone.addEventListener('drop', handleDrop, false);
            
            function preventDefaults(e) {
              e.preventDefault();
              e.stopPropagation();
            }
            
            function highlight(e) {
              dropZone.classList.add('drag-over');
            }
            
            function unhighlight(e) {
              dropZone.classList.remove('drag-over');
            }
            
            function handleDrop(e) {
              const dt = e.dataTransfer;
              const files = dt.files;
              
              if (files.length > 0) {
                const file = files[0];
                const validExtensions = ['md', 'txt', 'markdown'];
                const fileExtension = file.name.split('.').pop().toLowerCase();
                
                if (validExtensions.includes(fileExtension)) {
                  // Send file path to main process
                  window.electronAPI?.handleFileDrop(file.path);
                } else {
                  alert('Please drop a valid PRD file (.md, .txt, .markdown)');
                }
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

    // Handle file drops from the drop zone window
    this.dropZoneWindow.webContents.on(
      'ipc-message',
      async (event, channel, ...args) => {
        if (channel === 'file-dropped') {
          const filePath = args[0] as string;
          await this.processDroppedFile(filePath);

          // Close drop zone after successful drop
          if (this.dropZoneWindow) {
            this.dropZoneWindow.close();
          }
        }
      }
    );
  }

  /**
   * Process a dropped PRD file
   */
  private async processDroppedFile(filePath: string): Promise<void> {
    try {
      this.logger.info(`📄 Processing dropped file: ${filePath}`);

      // Validate file
      const validation = this.validatePRDFile(filePath);
      if (!validation.valid) {
        this.logger.error(`❌ Invalid file: ${validation.error}`);
        return;
      }

      // Show notification
      this.showDropNotification(filePath, true);

      // TODO: In Phase 2, this will trigger the actual PRD processing pipeline
      // For now, just log the successful drop
      this.logger.info(`✅ PRD file accepted: ${filePath}`);
    } catch (error) {
      this.logger.error('❌ Failed to process dropped file', error);
      this.showDropNotification(filePath, false);
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

      const autoUpdater = personaPulseApp.getAutoUpdater();
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
