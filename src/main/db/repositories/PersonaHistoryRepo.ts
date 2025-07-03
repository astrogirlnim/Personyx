/**
 * PersonaHistoryRepo - Repository for persona evolution history tracking
 * Phase 2.7: Automatic Persona Evolution
 */

import { eq, desc, lt } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import { personaHistory } from '@main/db/schema';
import type { PersonaHistory, NewPersonaHistory } from '@main/db/schema';
import { Logger } from '@main/utils/logger';

const logger = new Logger('persona-history-repo');

export interface PersonaHistoryFilter {
  personaId?: string;
  changeType?: 'update' | 'create';
  fromTimestamp?: number;
  toTimestamp?: number;
}

export interface PersonaHistoryStats {
  totalChanges: number;
  updateCount: number;
  createCount: number;
  lastChangeTimestamp?: number;
  avgConfidence: number;
}

export class PersonaHistoryRepo {
  constructor() {
    logger.debug('🏗️ PersonaHistoryRepo initialized');
  }

  /**
   * Create a new persona history record
   * @param data Persona history data to create
   * @returns Promise<PersonaHistory> Created history record
   */
  async create(
    data: Omit<NewPersonaHistory, 'historyId'>
  ): Promise<PersonaHistory> {
    const historyId = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const historyData: NewPersonaHistory = {
      historyId,
      ...data,
    };

    logger.info('📝 Creating persona history record', {
      historyId,
      personaId: data.personaId,
      changeType: data.changeType,
      confidence: data.confidence,
    });

    try {
      const db = getDatabase();
      const result = await db
        .insert(personaHistory)
        .values(historyData)
        .returning();
      const created = result[0];

      logger.debug('✅ Persona history record created successfully', {
        historyId: created.historyId,
        personaId: created.personaId,
      });

      return created;
    } catch (error) {
      logger.error('❌ Failed to create persona history record', {
        historyId,
        personaId: data.personaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find persona history records for a specific persona
   * @param personaId Persona ID to find history for
   * @param limit Maximum number of records to return
   * @returns Promise<PersonaHistory[]> History records for the persona
   */
  async findByPersonaId(
    personaId: string,
    limit = 20
  ): Promise<PersonaHistory[]> {
    logger.debug('🔍 Finding persona history records by persona ID', {
      personaId,
      limit,
    });

    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(personaHistory)
        .where(eq(personaHistory.personaId, personaId))
        .orderBy(desc(personaHistory.timestamp))
        .limit(limit);

      logger.debug('✅ Persona history records found', {
        count: results.length,
        personaId,
      });

      return results;
    } catch (error) {
      logger.error('❌ Failed to find persona history records', {
        personaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find the most recent history record for a persona
   * @param personaId Persona ID
   * @returns Promise<PersonaHistory | null> Most recent history record or null
   */
  async findLatestByPersonaId(
    personaId: string
  ): Promise<PersonaHistory | null> {
    logger.debug('🔍 Finding latest history record for persona', { personaId });

    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(personaHistory)
        .where(eq(personaHistory.personaId, personaId))
        .orderBy(desc(personaHistory.timestamp))
        .limit(1);

      const result = results[0] || null;
      logger.debug('✅ Latest history record found', {
        personaId,
        found: !!result,
        historyId: result?.historyId,
      });

      return result;
    } catch (error) {
      logger.error('❌ Failed to find latest history record', {
        personaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List all persona history records
   * @returns Promise<PersonaHistory[]> All history records
   */
  async list(): Promise<PersonaHistory[]> {
    logger.debug('📋 Listing all persona history records');

    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(personaHistory)
        .orderBy(desc(personaHistory.timestamp));

      logger.debug(`✅ Found ${results.length} persona history records`);
      return results;
    } catch (error) {
      logger.error('❌ Failed to list persona history records', error);
      throw error;
    }
  }

  /**
   * Get persona history statistics
   * @param personaId Optional persona ID to filter stats
   * @returns Promise<PersonaHistoryStats> Statistics summary
   */
  async getStats(personaId?: string): Promise<PersonaHistoryStats> {
    logger.debug('📊 Getting persona history statistics', { personaId });

    try {
      let allRecords: PersonaHistory[];

      if (personaId) {
        allRecords = await this.findByPersonaId(personaId, 1000); // Get more records for stats
      } else {
        allRecords = await this.list();
      }

      const stats: PersonaHistoryStats = {
        totalChanges: allRecords.length,
        updateCount: allRecords.filter(
          (r: PersonaHistory) => r.changeType === 'update'
        ).length,
        createCount: allRecords.filter(
          (r: PersonaHistory) => r.changeType === 'create'
        ).length,
        lastChangeTimestamp:
          allRecords.length > 0
            ? Math.max(...allRecords.map((r: PersonaHistory) => r.timestamp))
            : undefined,
        avgConfidence:
          allRecords.length > 0
            ? allRecords.reduce(
                (sum: number, r: PersonaHistory) => sum + r.confidence,
                0
              ) / allRecords.length
            : 0,
      };

      logger.debug('✅ Persona history statistics calculated', {
        personaId,
        stats,
      });

      return stats;
    } catch (error) {
      logger.error('❌ Failed to calculate history statistics', {
        personaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete old history records beyond retention period
   * @param retentionDays Number of days to retain history
   * @returns Promise<number> Number of records deleted
   */
  async pruneOldRecords(retentionDays = 90): Promise<number> {
    const cutoffTimestamp = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    logger.info('🧹 Pruning old persona history records', {
      retentionDays,
      cutoffTimestamp: new Date(cutoffTimestamp).toISOString(),
    });

    try {
      const db = getDatabase();
      const result = await db
        .delete(personaHistory)
        .where(lt(personaHistory.timestamp, cutoffTimestamp));

      const deletedCount = result.changes || 0;
      logger.info('✅ Old persona history records pruned', {
        deletedCount,
        retentionDays,
      });

      return deletedCount;
    } catch (error) {
      logger.error('❌ Failed to prune old history records', {
        retentionDays,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Parse persona data from JSON strings in history records
   * @param historyRecord History record with JSON data
   * @returns Object with parsed previous and new data
   */
  parsePersonaData(historyRecord: PersonaHistory): {
    previousData: unknown;
    newData: unknown;
  } {
    try {
      return {
        previousData: JSON.parse(historyRecord.previousData),
        newData: JSON.parse(historyRecord.newData),
      };
    } catch (error) {
      logger.error('❌ Failed to parse persona data from history record', {
        historyId: historyRecord.historyId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Invalid JSON data in history record');
    }
  }
}
