/**
 * TrayManager - Handles system tray functionality for PersonaPulse
 */

import { Tray, Menu, nativeImage, dialog } from 'electron';
import { join } from 'path';
import { personaPulseApp } from './main';
import { TRAY_MENU, FILE_FILTERS } from '@shared/constants';
import type { Logger } from './utils/logger';
import type { TrayAction } from '@shared/types';

export class TrayManager {
  private tray: Tray | null = null;
  private logger: Logger;

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

    // Handle left click (show window)
    this.tray.on('click', () => {
      this.handleAction('show-window');
    });

    // Handle right click (show context menu) - handled automatically by Electron
  }

  /**
   * Handle tray menu actions
   */
  private async handleAction(action: TrayAction): Promise<void> {
    this.logger.debug(`🔧 Tray action: ${action}`);

    switch (action) {
      case 'show-window':
        personaPulseApp.createMainWindow();
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

      case 'quit-app':
        personaPulseApp.quit();
        break;

      default:
        this.logger.warn(`Unknown tray action: ${action}`);
    }
  }

  /**
   * Handle PRD import via file dialog
   */
  private async handleImportPRD(): Promise<void> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import PRD',
        filters: [{
          name: FILE_FILTERS.PRD.name,
          extensions: [...FILE_FILTERS.PRD.extensions]
        }],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        this.logger.info(`📥 Importing PRD: ${filePath}`);
        // TODO: Trigger import process
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
    this.logger.debug(`🎯 Tray status updated: ${hasLowScores ? 'warning' : 'normal'}`);
  }

  /**
   * Destroy the tray
   */
  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      this.logger.info('🗑 Tray destroyed');
    }
  }
} 