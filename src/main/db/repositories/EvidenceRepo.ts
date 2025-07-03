/**
 * Evidence Repository - CRUD operations for evidence
 * Repository pattern for clean data access layer
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import { evidence, type NewEvidence } from '@main/db/schema';
import type { Evidence } from '@shared/types';
import { Logger } from '@main/utils/logger';

const logger = new Logger('evidence-repo');

// Application-level interface for creating evidence (with proper tags type)
export interface CreateEvidenceData {
  personaId: string;
  content: string;
  source: string;
  sourceType: 'interview' | 'prd' | 'feedback' | 'other';
  timestamp: Date;
  tags: string[]; // Application level expects array
  sentiment?: 'positive' | 'negative' | 'neutral' | null;
  importance: number;
}

export class EvidenceRepo {
  /**
   * Create new evidence
   */
  async create(data: CreateEvidenceData): Promise<Evidence> {
    try {
      logger.info('➕ Creating new evidence', {
        personaId: data.personaId,
        sourceType: data.sourceType,
      });

      const db = getDatabase();
      const evidenceId = `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newEvidence: NewEvidence = {
        id: evidenceId,
        personaId: data.personaId,
        content: data.content,
        source: data.source,
        sourceType: data.sourceType,
        timestamp: data.timestamp,
        tags: JSON.stringify(data.tags || []),
        sentiment: data.sentiment,
        importance: data.importance,
      };

      await db.insert(evidence).values(newEvidence);

      // Retrieve the created evidence
      const created = await this.findById(evidenceId);
      if (!created) {
        throw new Error('Failed to retrieve created evidence');
      }

      logger.info('✅ Evidence created successfully', { id: evidenceId });
      return created;
    } catch (error) {
      logger.error('❌ Failed to create evidence', error);
      throw error;
    }
  }

  /**
   * Find evidence by ID
   */
  async findById(id: string): Promise<Evidence | null> {
    try {
      logger.debug('🔍 Finding evidence by ID', { id });

      const db = getDatabase();
      const result = await db
        .select()
        .from(evidence)
        .where(eq(evidence.id, id))
        .limit(1);

      if (result.length === 0) {
        logger.debug('📭 Evidence not found', { id });
        return null;
      }

      const evidenceData = result[0];
      // Parse JSON fields and cast types
      const parsedEvidence: Evidence = {
        ...evidenceData,
        tags: JSON.parse(evidenceData.tags),
        sourceType: evidenceData.sourceType as Evidence['sourceType'],
        sentiment: evidenceData.sentiment as Evidence['sentiment'],
      };

      logger.debug('✅ Evidence found', { id });
      return parsedEvidence;
    } catch (error) {
      logger.error('❌ Failed to find evidence by ID', error);
      throw error;
    }
  }

  /**
   * Get all evidence for a specific persona
   */
  async findByPersonaId(personaId: string): Promise<Evidence[]> {
    try {
      logger.debug('🔍 Finding evidence by persona ID', { personaId });

      const db = getDatabase();
      const results = await db
        .select()
        .from(evidence)
        .where(eq(evidence.personaId, personaId));

      // 🐛🐛🐛 ENHANCED DEBUG LOGGING FOR DATABASE EVIDENCE 🐛🐛🐛
      logger.info('🐛 [DEBUG] RAW DATABASE EVIDENCE RESULTS', {
        personaId,
        resultCount: results.length,
        rawResults: results.map(result => ({
          id: result.id,
          timestamp: result.timestamp,
          timestampType: typeof result.timestamp,
          timestampConstructor: result.timestamp?.constructor?.name,
          isDate: result.timestamp instanceof Date,
          timestampValue: result.timestamp,
          timestampString: result.timestamp
            ? result.timestamp.toString()
            : 'NULL',
        })),
      });

      logger.debug('✅ Found evidence items', {
        personaId,
        count: results.length,
      });

      // Convert each result using the fixed timestamp conversion method
      const convertedResults: Evidence[] = [];
      for (const result of results) {
        try {
          logger.info('🐛 [DEBUG] CONVERTING DATABASE EVIDENCE', {
            evidenceId: result.id,
            rawTimestamp: result.timestamp,
            timestampType: typeof result.timestamp,
          });

          // Use the fixed convertDbEvidence method with proper timestamp conversion
          const converted = this.convertDbEvidence(result);

          logger.info('🐛 [DEBUG] EVIDENCE CONVERTED IN REPO', {
            evidenceId: result.id,
            timestampInConverted: converted.timestamp,
            timestampTypeInConverted: typeof converted.timestamp,
            timestampISO: converted.timestamp.toISOString(),
            isValidTimestamp: !isNaN(converted.timestamp.getTime()),
          });

          convertedResults.push(converted);
        } catch (conversionError) {
          logger.error('🐛 [DEBUG] EVIDENCE CONVERSION ERROR IN REPO', {
            evidenceId: result.id,
            error:
              conversionError instanceof Error
                ? conversionError.message
                : String(conversionError),
            rawResult: result,
          });
        }
      }

      logger.info('🐛 [DEBUG] FINAL EVIDENCE REPO RESULTS', {
        personaId,
        convertedCount: convertedResults.length,
        originalCount: results.length,
        timestamps: convertedResults.map(r => ({
          id: r.id,
          timestamp: r.timestamp,
          timestampType: typeof r.timestamp,
        })),
      });

      return convertedResults;
    } catch (error) {
      logger.error('❌ Failed to find evidence by persona ID', error);
      throw error;
    }
  }

  /**
   * List all evidence
   */
  async list(): Promise<Evidence[]> {
    try {
      logger.debug('📋 Listing all evidence');

      const db = getDatabase();
      const result = await db.select().from(evidence);

      // Parse JSON fields for all evidence and cast types
      const parsedEvidence: Evidence[] = result.map(
        (item: typeof evidence.$inferSelect) => ({
          ...item,
          tags: JSON.parse(item.tags),
          sourceType: item.sourceType as Evidence['sourceType'],
          sentiment: item.sentiment as Evidence['sentiment'],
        })
      );

      logger.debug(`✅ Found ${parsedEvidence.length} evidence items`);
      return parsedEvidence;
    } catch (error) {
      logger.error('❌ Failed to list evidence', error);
      throw error;
    }
  }

  /**
   * Delete evidence
   */
  async delete(id: string): Promise<boolean> {
    try {
      logger.info('🗑️ Deleting evidence', { id });

      const db = getDatabase();
      const result = await db.delete(evidence).where(eq(evidence.id, id));

      const deleted = result.changes > 0;

      if (deleted) {
        logger.info('✅ Evidence deleted successfully', { id });
      } else {
        logger.warn('⚠️ Evidence not found for deletion', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('❌ Failed to delete evidence', error);
      throw error;
    }
  }

  /**
   * Get evidence count for a persona
   */
  async countByPersona(personaId: string): Promise<number> {
    try {
      logger.debug('🔢 Counting evidence for persona', { personaId });

      const evidenceItems = await this.findByPersonaId(personaId);
      const count = evidenceItems.length;

      logger.debug(`✅ Evidence count for persona: ${count}`, { personaId });
      return count;
    } catch (error) {
      logger.error('❌ Failed to count evidence for persona', error);
      throw error;
    }
  }

  /**
   * Convert database evidence to domain model
   */
  private convertDbEvidence(
    dbEvidence: typeof evidence.$inferSelect
  ): Evidence {
    // 🔧 FIX: Convert Unix seconds to JavaScript milliseconds
    // Database stores Unix timestamps in seconds, but JavaScript Date expects milliseconds
    let timestamp: Date;

    if (typeof dbEvidence.timestamp === 'number') {
      // Convert seconds to milliseconds for JavaScript Date
      timestamp = new Date(dbEvidence.timestamp * 1000);
      logger.debug('🔧 TIMESTAMP CONVERSION', {
        evidenceId: dbEvidence.id,
        unixSeconds: dbEvidence.timestamp,
        unixMilliseconds: dbEvidence.timestamp * 1000,
        convertedDate: timestamp.toISOString(),
        isValidDate: !isNaN(timestamp.getTime()),
      });
    } else if (dbEvidence.timestamp instanceof Date) {
      timestamp = dbEvidence.timestamp;
      logger.debug('🔧 TIMESTAMP ALREADY DATE', {
        evidenceId: dbEvidence.id,
        existingDate: timestamp.toISOString(),
        isValidDate: !isNaN(timestamp.getTime()),
      });
    } else {
      // Fallback for unexpected types
      logger.warn('🔧 TIMESTAMP TYPE UNEXPECTED', {
        evidenceId: dbEvidence.id,
        timestampValue: dbEvidence.timestamp,
        timestampType: typeof dbEvidence.timestamp,
      });
      timestamp = new Date(); // Use current time as fallback
    }

    // Validate the converted timestamp
    if (isNaN(timestamp.getTime())) {
      logger.error('🔧 TIMESTAMP CONVERSION FAILED', {
        evidenceId: dbEvidence.id,
        originalTimestamp: dbEvidence.timestamp,
        convertedTimestamp: timestamp,
        fallbackToNow: true,
      });
      timestamp = new Date(); // Use current time as fallback
    }

    return {
      id: dbEvidence.id,
      personaId: dbEvidence.personaId,
      content: dbEvidence.content,
      source: dbEvidence.source,
      sourceType: dbEvidence.sourceType as
        | 'interview'
        | 'prd'
        | 'feedback'
        | 'other',
      timestamp: timestamp, // Now properly converted timestamp
      tags: JSON.parse(dbEvidence.tags),
      sentiment: dbEvidence.sentiment as
        | 'positive'
        | 'negative'
        | 'neutral'
        | undefined,
      importance: dbEvidence.importance,
    };
  }
}
