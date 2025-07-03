/**
 * Activity Log Service - Tracks all application activities
 * Phase 3.1.6: Activity Log Implementation
 */

import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import {
  ActivityLogRepo,
  CreateActivityLogData,
} from '@main/db/repositories/ActivityLogRepo';
import type {
  ActivityLog,
  ActivityLogMetadata,
  ActivityLogFilter,
  ActivityLogStats,
} from '@shared/types';
import { Logger } from '@main/utils/logger';

const logger = new Logger('activity-log-service');

export class ActivityLogService extends EventEmitter {
  private activityLogRepo: ActivityLogRepo;
  private mainWindow: BrowserWindow | null = null;
  private isInitialized = false;

  constructor() {
    super();
    this.activityLogRepo = new ActivityLogRepo();
  }

  /**
   * Initialize the activity log service
   */
  async initialize(mainWindow: BrowserWindow): Promise<void> {
    try {
      logger.info('🚀 Initializing ActivityLogService');

      this.mainWindow = mainWindow;
      this.isInitialized = true;

      // Set up activity log cleanup on initialization
      await this.performMaintenance();

      logger.info('✅ ActivityLogService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize ActivityLogService', error);
      throw error;
    }
  }

  /**
   * Log a new activity
   */
  async logActivity(data: CreateActivityLogData): Promise<ActivityLog> {
    try {
      if (!this.isInitialized) {
        logger.warn(
          '⚠️ ActivityLogService not initialized, skipping activity log'
        );
        // Return a mock activity log to prevent errors
        return {
          id: 'temp-' + Date.now(),
          type: data.type,
          title: data.title,
          description: data.description,
          source: data.source,
          metadata: data.metadata,
          timestamp: data.timestamp,
          createdAt: new Date(),
        };
      }

      logger.info('📝 Logging new activity', {
        type: data.type,
        source: data.source,
        title: data.title,
      });

      // Create the activity log entry
      const activityEntry = await this.activityLogRepo.create(data);

      // Emit the activity log event to update UI
      this.broadcastActivityUpdate();

      // Emit internal event for other services
      this.emit('activity-logged', activityEntry);

      logger.debug('✅ Activity logged successfully', {
        id: activityEntry.id,
        type: activityEntry.type,
      });

      return activityEntry;
    } catch (error) {
      logger.error('❌ Failed to log activity', error);
      throw error;
    }
  }

  /**
   * Log PRD import success
   */
  async logPRDImportSuccess(
    fileName: string,
    documentId: string,
    processingTime?: number
  ): Promise<ActivityLog> {
    return this.logActivity({
      type: 'import-success',
      title: 'PRD Imported Successfully',
      description: `Product Requirements Document "${fileName}" has been processed and analyzed`,
      source: 'prd-import',
      metadata: {
        fileName,
        documentId,
        processingTime,
        operation: 'prd-import',
      },
      timestamp: new Date(),
    });
  }

  /**
   * Log PRD import error
   */
  async logPRDImportError(
    fileName: string,
    errorMessage: string,
    operation?: string
  ): Promise<ActivityLog> {
    return this.logActivity({
      type: 'import-error',
      title: 'PRD Import Failed',
      description: `Failed to import PRD "${fileName}": ${errorMessage}`,
      source: 'prd-import',
      metadata: {
        fileName,
        errorMessage,
        operation: operation || 'prd-import',
      },
      timestamp: new Date(),
    });
  }

  /**
   * Log transcript import success
   */
  async logTranscriptImportSuccess(
    fileName: string,
    evidenceCount: number,
    personasAffected: string[],
    processingTime?: number
  ): Promise<ActivityLog> {
    return this.logActivity({
      type: 'import-success',
      title: 'Transcript Analyzed',
      description: `Interview transcript "${fileName}" processed - ${evidenceCount} evidence items created for ${personasAffected.length} personas`,
      source: 'transcript-import',
      metadata: {
        fileName,
        evidenceCount,
        personasAffected,
        processingTime,
        operation: 'transcript-import',
      },
      timestamp: new Date(),
    });
  }

  /**
   * Phase 3.1.8: Log interview import with detailed persona evidence counts
   */
  async logInterviewImported(
    fileName: string,
    evidenceCountByPersona: Record<string, number>,
    processingTime?: number
  ): Promise<ActivityLog> {
    try {
      logger.info('📝 Logging interview import with detailed evidence counts', {
        fileName,
        evidenceCountByPersona,
        processingTime,
      });

      // Get persona names for display
      const personaNames = await this.getPersonaNames(
        Object.keys(evidenceCountByPersona)
      );

      // Create readable description with persona names
      const evidenceDetails = personaNames
        .map(persona => {
          const count = evidenceCountByPersona[persona.id] || 0;
          return `${count} evidence for ${persona.name}`;
        })
        .join(', ');

      const totalEvidenceCount = Object.values(evidenceCountByPersona).reduce(
        (sum, count) => sum + count,
        0
      );
      const description = `Interview "${fileName}" imported - ${evidenceDetails}`;

      return this.logActivity({
        type: 'import-success',
        title: 'Interview Imported',
        description,
        source: 'transcript-import',
        metadata: {
          fileName,
          evidenceCountByPersona,
          personaNames: personaNames.map(p => ({ id: p.id, name: p.name })),
          totalEvidenceCount,
          personasAffectedCount: Object.keys(evidenceCountByPersona).length,
          processingTime,
          operation: 'interview-import',
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(
        '❌ Failed to log interview import with detailed evidence counts',
        error
      );
      // Fallback to basic logging
      const totalEvidenceCount = Object.values(evidenceCountByPersona).reduce(
        (sum, count) => sum + count,
        0
      );
      return this.logActivity({
        type: 'import-success',
        title: 'Interview Imported',
        description: `Interview "${fileName}" imported - ${totalEvidenceCount} evidence items created`,
        source: 'transcript-import',
        metadata: {
          fileName,
          evidenceCountByPersona,
          totalEvidenceCount,
          personasAffectedCount: Object.keys(evidenceCountByPersona).length,
          processingTime,
          operation: 'interview-import',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Phase 3.1.8: Get persona names for given persona IDs
   */
  private async getPersonaNames(
    personaIds: string[]
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      logger.debug('🎭 Getting persona names for IDs', { personaIds });

      // Import PersonaRepo to get persona details
      const { PersonaRepo } = await import('@main/db/repositories/PersonaRepo');
      const personaRepo = new PersonaRepo();

      const personaNames: Array<{ id: string; name: string }> = [];

      for (const personaId of personaIds) {
        try {
          const persona = await personaRepo.findById(personaId);
          if (persona) {
            personaNames.push({ id: persona.id, name: persona.name });
          } else {
            logger.warn('⚠️ Persona not found for ID', { personaId });
            // Fallback to ID as name
            personaNames.push({ id: personaId, name: personaId });
          }
        } catch (error) {
          logger.warn('⚠️ Failed to fetch persona', {
            personaId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Fallback to ID as name
          personaNames.push({ id: personaId, name: personaId });
        }
      }

      logger.debug('✅ Persona names retrieved', { personaNames });
      return personaNames;
    } catch (error) {
      logger.error('❌ Failed to get persona names', error);
      // Fallback to using IDs as names
      return personaIds.map(id => ({ id, name: id }));
    }
  }

  /**
   * Log transcript import error
   */
  async logTranscriptImportError(
    fileName: string,
    errorMessage: string,
    operation?: string
  ): Promise<ActivityLog> {
    return this.logActivity({
      type: 'import-error',
      title: 'Transcript Import Failed',
      description: `Failed to process transcript "${fileName}": ${errorMessage}`,
      source: 'transcript-import',
      metadata: {
        fileName,
        errorMessage,
        operation: operation || 'transcript-import',
      },
      timestamp: new Date(),
    });
  }

  /**
   * Log evidence score update
   */
  async logEvidenceScoreUpdate(
    documentId: string,
    personasAffected: string[],
    scoreChanges?: { personaId: string; oldScore: number; newScore: number }[]
  ): Promise<ActivityLog> {
    const description = scoreChanges
      ? `Evidence scores updated for ${personasAffected.length} personas`
      : `Evidence scores recalculated for ${personasAffected.length} personas`;

    return this.logActivity({
      type: 'score-update',
      title: 'Evidence Scores Updated',
      description,
      source: 'evidence-score',
      metadata: {
        documentId,
        personasAffected,
        scoreChanges,
        operation: 'score-update',
      },
      timestamp: new Date(),
    });
  }

  /**
   * Log general activity
   */
  async logGeneralActivity(
    title: string,
    description?: string,
    metadata?: ActivityLogMetadata
  ): Promise<ActivityLog> {
    return this.logActivity({
      type: 'general-activity',
      title,
      description,
      source: 'general',
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Get activity log entries with pagination and filtering
   */
  async getActivityLog(
    options: {
      page?: number;
      limit?: number;
      filter?: ActivityLogFilter;
    } = {}
  ): Promise<{
    entries: ActivityLog[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      logger.debug('📋 Getting activity log entries', options);

      const result = await this.activityLogRepo.findMany(options);

      logger.debug('✅ Activity log entries retrieved', {
        count: result.entries.length,
        totalCount: result.totalCount,
      });

      return result;
    } catch (error) {
      logger.error('❌ Failed to get activity log entries', error);
      throw error;
    }
  }

  /**
   * Get activity log statistics
   */
  async getActivityStats(): Promise<ActivityLogStats> {
    try {
      logger.debug('📊 Getting activity log statistics');

      const stats = await this.activityLogRepo.getStats();

      logger.debug('✅ Activity log statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('❌ Failed to get activity log statistics', error);
      throw error;
    }
  }

  /**
   * Clear all activity log entries
   */
  async clearActivityLog(): Promise<number> {
    try {
      logger.info('🗑️ Clearing all activity log entries');

      const deletedCount = await this.activityLogRepo.clear();

      // Broadcast the update to UI
      this.broadcastActivityUpdate();

      logger.info('✅ Activity log cleared', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('❌ Failed to clear activity log', error);
      throw error;
    }
  }

  /**
   * Export activity log entries
   */
  async exportActivityLog(
    format: 'csv' | 'json',
    filter?: ActivityLogFilter
  ): Promise<string> {
    try {
      logger.info('📤 Exporting activity log', { format, filter });

      // Get all entries matching the filter
      const result = await this.activityLogRepo.findMany({
        limit: 10000, // Large limit for export
        filter,
      });

      let exportData: string;

      if (format === 'csv') {
        // Generate CSV format
        const headers = [
          'ID',
          'Type',
          'Title',
          'Description',
          'Source',
          'Timestamp',
          'Metadata',
        ];
        const csvRows = [headers.join(',')];

        result.entries.forEach(entry => {
          const row = [
            entry.id,
            entry.type,
            `"${entry.title.replace(/"/g, '""')}"`, // Escape quotes in CSV
            `"${(entry.description || '').replace(/"/g, '""')}"`,
            entry.source,
            entry.timestamp.toISOString(),
            `"${JSON.stringify(entry.metadata || {}).replace(/"/g, '""')}"`,
          ];
          csvRows.push(row.join(','));
        });

        exportData = csvRows.join('\n');
      } else {
        // Generate JSON format
        exportData = JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            totalEntries: result.entries.length,
            filter: filter || {},
            entries: result.entries,
          },
          null,
          2
        );
      }

      logger.info('✅ Activity log exported', {
        format,
        entriesCount: result.entries.length,
        dataSize: exportData.length,
      });

      return exportData;
    } catch (error) {
      logger.error('❌ Failed to export activity log', error);
      throw error;
    }
  }

  /**
   * Perform maintenance tasks (cleanup old entries)
   */
  async performMaintenance(retentionDays: number = 30): Promise<void> {
    try {
      logger.info('🔧 Performing activity log maintenance', { retentionDays });

      const deletedCount =
        await this.activityLogRepo.deleteOlderThan(retentionDays);

      if (deletedCount > 0) {
        logger.info('✅ Activity log maintenance completed', { deletedCount });
        // Broadcast update if entries were deleted
        this.broadcastActivityUpdate();
      } else {
        logger.debug(
          '✅ Activity log maintenance completed - no old entries to delete'
        );
      }
    } catch (error) {
      logger.error('❌ Failed to perform activity log maintenance', error);
      // Don't throw error for maintenance - just log it
    }
  }

  /**
   * Broadcast activity log update to renderer process
   */
  private async broadcastActivityUpdate(): Promise<void> {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        // Get recent activity entries and stats
        const recentActivities = await this.activityLogRepo.findMany({
          limit: 100, // Get recent 100 entries
        });
        const stats = await this.activityLogRepo.getStats();

        // Send update to renderer
        this.mainWindow.webContents.send('activity-log-updated', {
          entries: recentActivities.entries,
          totalCount: recentActivities.totalCount,
          stats,
        });

        logger.debug('📢 Activity log update broadcast to renderer', {
          entriesCount: recentActivities.entries.length,
          totalCount: recentActivities.totalCount,
        });
      } else {
        logger.warn(
          '⚠️ Cannot broadcast activity update - main window not available'
        );
      }
    } catch (error) {
      logger.error('❌ Failed to broadcast activity log update', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down ActivityLogService');

      this.mainWindow = null;
      this.isInitialized = false;
      this.removeAllListeners();

      logger.info('✅ ActivityLogService shutdown completed');
    } catch (error) {
      logger.error('❌ Failed to shutdown ActivityLogService', error);
    }
  }
}
