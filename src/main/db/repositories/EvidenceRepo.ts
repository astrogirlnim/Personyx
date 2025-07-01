/**
 * Evidence Repository - CRUD operations for evidence
 * Repository pattern for clean data access layer
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import { evidence, type Evidence, type NewEvidence } from '@main/db/schema';
import { Logger } from '@main/utils/logger';

const logger = new Logger('evidence-repo');

export class EvidenceRepo {
  /**
   * Create new evidence
   */
  async create(data: Omit<NewEvidence, 'id'>): Promise<Evidence> {
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
      // Parse JSON fields
      const parsedEvidence: Evidence = {
        ...evidenceData,
        tags: JSON.parse(evidenceData.tags),
      };

      logger.debug('✅ Evidence found', { id });
      return parsedEvidence;
    } catch (error) {
      logger.error('❌ Failed to find evidence by ID', error);
      throw error;
    }
  }

  /**
   * Find evidence by persona ID
   */
  async findByPersonaId(personaId: string): Promise<Evidence[]> {
    try {
      logger.debug('🔍 Finding evidence by persona ID', { personaId });

      const db = getDatabase();
      const result = await db
        .select()
        .from(evidence)
        .where(eq(evidence.personaId, personaId));

      // Parse JSON fields for all evidence
      const parsedEvidence: Evidence[] = result.map(
        (item: typeof evidence.$inferSelect) => ({
          ...item,
          tags: JSON.parse(item.tags),
        })
      );

      logger.debug(
        `✅ Found ${parsedEvidence.length} evidence items for persona`,
        { personaId }
      );
      return parsedEvidence;
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

      // Parse JSON fields for all evidence
      const parsedEvidence: Evidence[] = result.map(
        (item: typeof evidence.$inferSelect) => ({
          ...item,
          tags: JSON.parse(item.tags),
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
}
