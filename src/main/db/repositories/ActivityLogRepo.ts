/**
 * Activity Log Repository - CRUD operations for activity logs
 * Repository pattern for clean data access layer
 * Phase 3.1.6: Activity Log Implementation
 */

import { eq, desc, asc, and, like, gte, lte } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import { activityLog, type NewActivityLog } from '@main/db/schema';
import type {
  ActivityLog,
  ActivityLogType,
  ActivityLogSource,
  ActivityLogMetadata,
  ActivityLogFilter,
  ActivityLogStats,
} from '@shared/types';
import { Logger } from '@main/utils/logger';

const logger = new Logger('activity-log-repo');

// Application-level interface for creating activity log entries
export interface CreateActivityLogData {
  type: ActivityLogType;
  title: string;
  description?: string;
  source: ActivityLogSource;
  metadata?: ActivityLogMetadata;
  timestamp: Date;
}

export class ActivityLogRepo {
  /**
   * Create new activity log entry
   */
  async create(data: CreateActivityLogData): Promise<ActivityLog> {
    try {
      logger.info('➕ Creating new activity log entry', {
        type: data.type,
        source: data.source,
        title: data.title,
      });

      const db = getDatabase();
      const activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newActivity: NewActivityLog = {
        id: activityId,
        type: data.type,
        title: data.title,
        description: data.description || null,
        source: data.source,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        timestamp: Math.floor(data.timestamp.getTime() / 1000), // Convert Date to Unix seconds
      };

      await db.insert(activityLog).values(newActivity);

      // Retrieve the created activity log entry
      const created = await this.findById(activityId);
      if (!created) {
        throw new Error('Failed to retrieve created activity log entry');
      }

      logger.info('✅ Activity log entry created successfully', {
        id: activityId,
      });
      return created;
    } catch (error) {
      logger.error('❌ Failed to create activity log entry', error);
      throw error;
    }
  }

  /**
   * Find activity log entry by ID
   */
  async findById(id: string): Promise<ActivityLog | null> {
    try {
      logger.debug('🔍 Finding activity log entry by ID', { id });

      const db = getDatabase();
      const result = await db
        .select()
        .from(activityLog)
        .where(eq(activityLog.id, id))
        .limit(1);

      if (result.length === 0) {
        logger.debug('📭 Activity log entry not found', { id });
        return null;
      }

      const activityData = result[0];
      const parsedActivity = this.convertDbActivity(activityData);

      logger.debug('✅ Activity log entry found', { id });
      return parsedActivity;
    } catch (error) {
      logger.error('❌ Failed to find activity log entry by ID', error);
      throw error;
    }
  }

  /**
   * Get activity log entries with filtering, pagination, and sorting
   */
  async findMany(
    options: {
      page?: number;
      limit?: number;
      filter?: ActivityLogFilter;
      sortBy?: 'timestamp' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    entries: ActivityLog[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 50,
        filter = {},
        sortBy = 'timestamp',
        sortOrder = 'desc',
      } = options;

      logger.debug('🔍 Finding activity log entries with options', {
        page,
        limit,
        filter,
        sortBy,
        sortOrder,
      });

      const db = getDatabase();

      // Build WHERE conditions
      const conditions = [];

      if (filter.type) {
        conditions.push(eq(activityLog.type, filter.type));
      }

      if (filter.source) {
        conditions.push(eq(activityLog.source, filter.source));
      }

      if (filter.search) {
        conditions.push(like(activityLog.title, `%${filter.search}%`));
      }

      if (filter.dateFrom) {
        const fromTimestamp = Math.floor(filter.dateFrom.getTime() / 1000);
        conditions.push(gte(activityLog.timestamp, fromTimestamp));
      }

      if (filter.dateTo) {
        const toTimestamp = Math.floor(filter.dateTo.getTime() / 1000);
        conditions.push(lte(activityLog.timestamp, toTimestamp));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: activityLog.id })
        .from(activityLog)
        .where(whereClause);
      const totalCount = countResult.length;

      // Get paginated results
      const sortColumn =
        sortBy === 'timestamp' ? activityLog.timestamp : activityLog.createdAt;
      const sortDirection =
        sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

      const offset = (page - 1) * limit;
      const results = await db
        .select()
        .from(activityLog)
        .where(whereClause)
        .orderBy(sortDirection)
        .limit(limit)
        .offset(offset);

      // Convert database results to application types
      const convertedResults: ActivityLog[] = results.map(result =>
        this.convertDbActivity(result)
      );

      const totalPages = Math.ceil(totalCount / limit);

      logger.debug('✅ Found activity log entries', {
        resultCount: convertedResults.length,
        totalCount,
        page,
        totalPages,
      });

      return {
        entries: convertedResults,
        totalCount,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('❌ Failed to find activity log entries', error);
      throw error;
    }
  }

  /**
   * Get activity log statistics
   */
  async getStats(): Promise<ActivityLogStats> {
    try {
      logger.debug('📊 Calculating activity log statistics');

      const db = getDatabase();

      // Get all activities
      const allActivities = await db.select().from(activityLog);
      const totalActivities = allActivities.length;

      // Get today's activities
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayTimestamp = Math.floor(startOfToday.getTime() / 1000);

      const todayActivities = allActivities.filter(
        activity => activity.timestamp >= todayTimestamp
      );

      // Calculate success rate
      const errorActivities = allActivities.filter(
        activity => activity.type === 'import-error'
      );
      const successActivities = allActivities.filter(
        activity =>
          activity.type === 'import-success' || activity.type === 'score-update'
      );

      const successRate =
        totalActivities > 0
          ? (successActivities.length / totalActivities) * 100
          : 0;

      // Get last activity
      const lastActivity =
        allActivities.length > 0
          ? new Date(Math.max(...allActivities.map(a => a.timestamp)) * 1000)
          : undefined;

      const stats: ActivityLogStats = {
        totalActivities,
        todayActivities: todayActivities.length,
        successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
        errorCount: errorActivities.length,
        lastActivity,
      };

      logger.debug('✅ Activity log statistics calculated', stats);
      return stats;
    } catch (error) {
      logger.error('❌ Failed to calculate activity log statistics', error);
      throw error;
    }
  }

  /**
   * Delete activity log entries older than specified days
   */
  async deleteOlderThan(days: number): Promise<number> {
    try {
      logger.info('🗑️ Deleting activity log entries older than days', { days });

      const db = getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const result = await db
        .delete(activityLog)
        .where(lte(activityLog.timestamp, cutoffTimestamp));

      const deletedCount = result.changes;

      logger.info('✅ Activity log entries deleted', {
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
      });

      return deletedCount;
    } catch (error) {
      logger.error('❌ Failed to delete old activity log entries', error);
      throw error;
    }
  }

  /**
   * Clear all activity log entries
   */
  async clear(): Promise<number> {
    try {
      logger.info('🗑️ Clearing all activity log entries');

      const db = getDatabase();
      const result = await db.delete(activityLog);

      const deletedCount = result.changes;

      logger.info('✅ All activity log entries cleared', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('❌ Failed to clear activity log entries', error);
      throw error;
    }
  }

  /**
   * Convert database activity log to domain model
   */
  private convertDbActivity(
    dbActivity: typeof activityLog.$inferSelect
  ): ActivityLog {
    // Convert Unix timestamp to JavaScript Date
    let timestamp: Date;
    let createdAt: Date;

    // Handle timestamp conversion (stored as Unix seconds)
    if (typeof dbActivity.timestamp === 'number') {
      timestamp = new Date(dbActivity.timestamp * 1000);
    } else {
      logger.warn('⚠️ Unexpected timestamp type, using current time', {
        activityId: dbActivity.id,
        timestamp: dbActivity.timestamp,
      });
      timestamp = new Date();
    }

    // Handle createdAt conversion - it can be Date, number, or string from SQLite
    if (dbActivity.createdAt instanceof Date) {
      createdAt = dbActivity.createdAt;
    } else if (typeof dbActivity.createdAt === 'number') {
      createdAt = new Date(dbActivity.createdAt * 1000);
    } else if (typeof dbActivity.createdAt === 'string') {
      createdAt = new Date(dbActivity.createdAt);
    } else {
      logger.warn('⚠️ Unexpected createdAt type, using current time', {
        activityId: dbActivity.id,
        createdAt: dbActivity.createdAt,
        createdAtType: typeof dbActivity.createdAt,
      });
      createdAt = new Date();
    }

    // Parse metadata
    let metadata: ActivityLogMetadata | undefined;
    try {
      if (dbActivity.metadata && typeof dbActivity.metadata === 'string') {
        metadata = JSON.parse(dbActivity.metadata);
      }
    } catch (error) {
      logger.warn('⚠️ Failed to parse activity log metadata', {
        activityId: dbActivity.id,
        metadata: dbActivity.metadata,
        error: error instanceof Error ? error.message : String(error),
      });
      metadata = undefined;
    }

    return {
      id: dbActivity.id,
      type: dbActivity.type as ActivityLogType,
      title: dbActivity.title,
      description: dbActivity.description || undefined,
      source: dbActivity.source as ActivityLogSource,
      metadata: metadata,
      timestamp: timestamp,
      createdAt: createdAt,
    };
  }
}
