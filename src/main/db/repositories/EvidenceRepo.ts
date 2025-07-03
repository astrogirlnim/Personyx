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
      const parsedEvidence = this.convertDbEvidence(evidenceData);

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
          timestampValue: result.timestamp,
          isNumber: typeof result.timestamp === 'number',
          isDate: result.timestamp instanceof Date,
          dateGetTime:
            result.timestamp instanceof Date
              ? result.timestamp.getTime()
              : 'N/A',
          asMilliseconds:
            typeof result.timestamp === 'number'
              ? result.timestamp * 1000
              : 'N/A',
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
      const parsedEvidence: Evidence[] = result.map(item =>
        this.convertDbEvidence(item)
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
   * 🔧 COMPLETELY REWRITTEN to handle SQLite Unix seconds properly
   */
  private convertDbEvidence(
    dbEvidence: typeof evidence.$inferSelect
  ): Evidence {
    // 🔧 FIX: Convert Unix seconds to JavaScript milliseconds
    // Database stores Unix timestamps in seconds, but JavaScript Date expects milliseconds
    let timestamp: Date;

    logger.debug('🔧 TIMESTAMP CONVERSION START', {
      evidenceId: dbEvidence.id,
      originalTimestamp: dbEvidence.timestamp,
      timestampType: typeof dbEvidence.timestamp,
      isNumber: typeof dbEvidence.timestamp === 'number',
      isDate: dbEvidence.timestamp instanceof Date,
      dateGetTime:
        dbEvidence.timestamp instanceof Date
          ? dbEvidence.timestamp.getTime()
          : 'N/A',
    });

    // Handle different timestamp formats from Drizzle
    if (dbEvidence.timestamp instanceof Date) {
      // If Drizzle returns a Date object, check if it's valid
      const timeMs = dbEvidence.timestamp.getTime();
      logger.info('🐛 [DEBUG] Date object detected from Drizzle', {
        evidenceId: dbEvidence.id,
        timeMs: timeMs,
        isNaN: isNaN(timeMs),
        dateString: dbEvidence.timestamp.toString(),
      });

      if (!isNaN(timeMs)) {
        timestamp = dbEvidence.timestamp;
        logger.debug('✅ Valid Date object from Drizzle', {
          evidenceId: dbEvidence.id,
          timestamp: timestamp.toISOString(),
        });
      } else {
        // Invalid Date from Drizzle - this indicates the core issue
        logger.error('❌ Invalid Date object from Drizzle - this is the bug!', {
          evidenceId: dbEvidence.id,
          invalidDate: dbEvidence.timestamp,
          timeMs: timeMs,
        });
        // Fall back to current time
        timestamp = new Date();
      }
    } else if (typeof dbEvidence.timestamp === 'number') {
      // If Drizzle returns a number, treat as Unix seconds
      const timestampMs = dbEvidence.timestamp * 1000;
      timestamp = new Date(timestampMs);

      logger.debug('🔧 TIMESTAMP CONVERSION FROM NUMBER', {
        evidenceId: dbEvidence.id,
        unixSeconds: dbEvidence.timestamp,
        unixMilliseconds: timestampMs,
        convertedDate: timestamp,
        isValidDate: !isNaN(timestamp.getTime()),
        dateString: timestamp.toString(),
        isoString: timestamp.toISOString(),
      });
    } else if (typeof dbEvidence.timestamp === 'string') {
      // Try to parse as ISO string or Unix timestamp
      const asNumber = parseInt(dbEvidence.timestamp);
      if (!isNaN(asNumber)) {
        // Probably Unix timestamp as string
        const timestampMs = asNumber * 1000;
        timestamp = new Date(timestampMs);
        logger.debug('🔧 TIMESTAMP CONVERSION FROM STRING NUMBER', {
          evidenceId: dbEvidence.id,
          stringValue: dbEvidence.timestamp,
          parsedNumber: asNumber,
          timestampMs: timestampMs,
          convertedDate: timestamp,
          isValidDate: !isNaN(timestamp.getTime()),
        });
      } else {
        // Try as ISO string
        timestamp = new Date(dbEvidence.timestamp);
        logger.debug('🔧 TIMESTAMP CONVERSION FROM ISO STRING', {
          evidenceId: dbEvidence.id,
          isoString: dbEvidence.timestamp,
          convertedDate: timestamp,
          isValidDate: !isNaN(timestamp.getTime()),
        });
      }
    } else {
      // Fallback for unexpected types
      logger.warn('🔧 TIMESTAMP TYPE UNEXPECTED - USING CURRENT TIME', {
        evidenceId: dbEvidence.id,
        timestampValue: dbEvidence.timestamp,
        timestampType: typeof dbEvidence.timestamp,
      });
      timestamp = new Date(); // Use current time as fallback
    }

    // Validate the converted timestamp
    if (isNaN(timestamp.getTime())) {
      logger.error('🔧 TIMESTAMP CONVERSION FAILED - USING CURRENT TIME', {
        evidenceId: dbEvidence.id,
        originalTimestamp: dbEvidence.timestamp,
        convertedTimestamp: timestamp,
        fallbackToNow: true,
      });
      timestamp = new Date(); // Use current time as fallback
    }

    logger.info('🔧 TIMESTAMP CONVERSION COMPLETE', {
      evidenceId: dbEvidence.id,
      finalTimestamp: timestamp,
      finalISOString: timestamp.toISOString(),
      finalMs: timestamp.getTime(),
      isValid: !isNaN(timestamp.getTime()),
    });

    // Parse tags properly
    let tags: string[] = [];
    try {
      if (typeof dbEvidence.tags === 'string') {
        tags = JSON.parse(dbEvidence.tags);
      } else if (Array.isArray(dbEvidence.tags)) {
        tags = dbEvidence.tags;
      }
    } catch (error) {
      logger.warn('⚠️ Failed to parse tags, using empty array', {
        evidenceId: dbEvidence.id,
        tagsValue: dbEvidence.tags,
        error: error instanceof Error ? error.message : String(error),
      });
      tags = [];
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
      tags: tags,
      sentiment: dbEvidence.sentiment as
        | 'positive'
        | 'negative'
        | 'neutral'
        | undefined,
      importance: dbEvidence.importance,
    };
  }
}
