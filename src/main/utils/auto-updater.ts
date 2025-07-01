/**
 * Auto-updater service for Personyx
 * Placeholder implementation for Phase 1.4
 */

import { app, dialog, Notification } from 'electron';
import { PROD } from '@shared/constants';
import type { Logger } from './logger';

export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  downloadUrl?: string;
  available: boolean;
}

export interface AutoUpdaterConfig {
  enabled: boolean;
  checkInterval: number; // in milliseconds
  autoDownload: boolean;
  autoInstall: boolean;
}

export class AutoUpdater {
  private logger: Logger;
  private config: AutoUpdaterConfig;
  private checkTimer: NodeJS.Timeout | null = null;
  private isChecking = false;
  private lastCheckTime: Date | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
    this.config = {
      enabled: true,
      checkInterval: PROD.AUTO_UPDATE_CHECK_INTERVAL,
      autoDownload: false,
      autoInstall: false,
    };
  }

  /**
   * Initialize the auto-updater
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('🔄 Initializing auto-updater service');

      if (!this.config.enabled) {
        this.logger.info('⏭️ Auto-update disabled');
        return;
      }

      // Start periodic update checks
      this.startPeriodicChecks();

      // Check for updates on startup (delayed)
      setTimeout(() => {
        this.checkForUpdates();
      }, 30000); // Wait 30 seconds after startup

      this.logger.info('✅ Auto-updater initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize auto-updater', error);
    }
  }

  /**
   * Check for updates manually
   */
  public async checkForUpdates(): Promise<UpdateInfo> {
    this.logger.info('🔍 Checking for updates...');

    if (this.isChecking) {
      this.logger.debug('⏳ Update check already in progress');
      return this.getNoUpdateInfo();
    }

    this.isChecking = true;
    this.lastCheckTime = new Date();

    try {
      // TODO: Implement actual update checking
      // For Phase 1.4, this is a placeholder that simulates the check
      const updateInfo = await this.performUpdateCheck();

      if (updateInfo.available) {
        this.logger.info(`🆕 Update available: ${updateInfo.version}`);
        await this.handleUpdateAvailable(updateInfo);
      } else {
        this.logger.info('✅ App is up to date');
      }

      return updateInfo;
    } catch (error) {
      this.logger.error('❌ Update check failed', error);
      return this.getNoUpdateInfo();
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Perform the actual update check (placeholder)
   */
  private async performUpdateCheck(): Promise<UpdateInfo> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // TODO: Replace with actual update server API call
    // For now, simulate no updates available
    const currentVersion = app.getVersion();

    // Simulate checking against a hypothetical update server
    const mockServerResponse = {
      latestVersion: currentVersion, // Same as current for now
      releaseNotes: 'No updates available at this time.',
      downloadUrl: null,
    };

    return {
      version: mockServerResponse.latestVersion,
      releaseNotes: mockServerResponse.releaseNotes,
      downloadUrl: mockServerResponse.downloadUrl || undefined,
      available: this.isNewerVersion(
        mockServerResponse.latestVersion,
        currentVersion
      ),
    };
  }

  /**
   * Handle when an update is available
   */
  private async handleUpdateAvailable(updateInfo: UpdateInfo): Promise<void> {
    try {
      // Show notification
      this.showUpdateNotification(updateInfo);

      // Show dialog if user is actively using the app
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Personyx Update Available',
        message: `Personyx ${updateInfo.version} is available`,
        detail: updateInfo.releaseNotes,
        buttons: ['Download & Install', 'Remind Me Later', 'Skip This Version'],
        defaultId: 0,
        cancelId: 1,
      });

      switch (result.response) {
        case 0: // Download & Install
          await this.downloadAndInstallUpdate(updateInfo);
          break;
        case 1: // Remind Me Later
          this.logger.info('⏰ User chose to be reminded later');
          break;
        case 2: // Skip This Version
          this.logger.info('⏭️ User chose to skip this version');
          // TODO: Store skipped version in settings
          break;
      }
    } catch (error) {
      this.logger.error('❌ Failed to handle update availability', error);
    }
  }

  /**
   * Download and install update (placeholder)
   */
  private async downloadAndInstallUpdate(
    updateInfo: UpdateInfo
  ): Promise<void> {
    try {
      this.logger.info(`⬇️ Starting download of version ${updateInfo.version}`);

      // TODO: Implement actual download and installation
      // For Phase 1.4, this is a placeholder

      // Simulate download progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        this.logger.debug(`📥 Download progress: ${progress}%`);
      }

      this.logger.info('📦 Update downloaded successfully');

      // Show installation dialog
      const installResult = await dialog.showMessageBox({
        type: 'question',
        title: 'Personyx Update Available',
        message: 'Update downloaded successfully',
        detail: 'Would you like to restart Personyx to install the update?',
        buttons: ['Restart Now', 'Install on Next Restart'],
        defaultId: 0,
      });

      if (installResult.response === 0) {
        this.logger.info('🔄 Restarting to install update');
        // TODO: Install update and restart
        app.relaunch();
        app.exit(0);
      } else {
        this.logger.info('⏰ Update will be installed on next restart');
        // TODO: Mark update for installation on next startup
      }
    } catch (error) {
      this.logger.error('❌ Failed to download/install update', error);
    }
  }

  /**
   * Show update notification
   */
  private showUpdateNotification(updateInfo: UpdateInfo): void {
    try {
      const notification = new Notification({
        title: 'Personyx Update Available',
        body: `Version ${updateInfo.version} is ready to download`,
        icon: undefined, // TODO: Add app icon
        silent: false,
      });

      notification.show();
      notification.on('click', () => {
        // TODO: Bring app to foreground and show update dialog
        this.logger.info('🔔 User clicked update notification');
      });
    } catch (error) {
      this.logger.error('❌ Failed to show update notification', error);
    }
  }

  /**
   * Start periodic update checks
   */
  private startPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);

    this.logger.debug(
      `⏰ Periodic update checks started (interval: ${this.config.checkInterval}ms)`
    );
  }

  /**
   * Stop periodic update checks
   */
  private stopPeriodicChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      this.logger.debug('⏹️ Periodic update checks stopped');
    }
  }

  /**
   * Compare version strings
   */
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    // Simple version comparison (works for semantic versioning)
    const parseVersion = (version: string) =>
      version.split('.').map(num => parseInt(num, 10));

    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }

    return false;
  }

  /**
   * Get no-update info object
   */
  private getNoUpdateInfo(): UpdateInfo {
    return {
      version: app.getVersion(),
      releaseNotes: 'No updates available',
      available: false,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AutoUpdaterConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('⚙️ Auto-updater configuration updated');

    if (config.enabled === false) {
      this.stopPeriodicChecks();
    } else if (config.enabled === true) {
      this.startPeriodicChecks();
    }

    if (config.checkInterval) {
      this.startPeriodicChecks(); // Restart with new interval
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): AutoUpdaterConfig {
    return { ...this.config };
  }

  /**
   * Get last check time
   */
  public getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  /**
   * Check if currently checking for updates
   */
  public isCheckingForUpdates(): boolean {
    return this.isChecking;
  }

  /**
   * Destroy the auto-updater
   */
  public destroy(): void {
    this.logger.info('🗑️ Destroying auto-updater');
    this.stopPeriodicChecks();
  }
}
