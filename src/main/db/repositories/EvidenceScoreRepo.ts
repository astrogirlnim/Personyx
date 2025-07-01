/**
 * Evidence Score Repository - CRUD operations for evidence scores
 * Repository pattern for clean data access layer
 */

import { eq, and } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import {
  evidenceScores,
  type EvidenceScore,
  type NewEvidenceScore,
} from '@main/db/schema';
import { Logger } from '@main/utils/logger';

const logger = new Logger('evidence-score-repo');

export class EvidenceScoreRepo {
  /**
   * Create new evidence score
   */
  async create(data: Omit<NewEvidenceScore, 'id'>): Promise<EvidenceScore> {
    try {
      logger.info('➕ Creating new evidence score', {
        documentId: data.documentId,
        personaId: data.personaId,
        score: data.score,
      });

      const db = getDatabase();
      const scoreId = `score-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newScore: NewEvidenceScore = {
        id: scoreId,
        documentId: data.documentId,
        personaId: data.personaId,
        score: data.score,
        evidenceCount: data.evidenceCount,
        topQuotes: JSON.stringify(data.topQuotes || []),
        breakdownRecency: data.breakdownRecency,
        breakdownCoverage: data.breakdownCoverage,
        breakdownRelevance: data.breakdownRelevance,
      };

      await db.insert(evidenceScores).values(newScore);

      // Retrieve the created score
      const created = await this.findById(scoreId);
      if (!created) {
        throw new Error('Failed to retrieve created evidence score');
      }

      logger.info('✅ Evidence score created successfully', {
        id: scoreId,
        score: data.score,
      });
      return created;
    } catch (error) {
      logger.error('❌ Failed to create evidence score', error);
      throw error;
    }
  }

  /**
   * Find evidence score by ID
   */
  async findById(id: string): Promise<EvidenceScore | null> {
    try {
      logger.debug('🔍 Finding evidence score by ID', { id });

      const db = getDatabase();
      const result = await db
        .select()
        .from(evidenceScores)
        .where(eq(evidenceScores.id, id))
        .limit(1);

      if (result.length === 0) {
        logger.debug('📭 Evidence score not found', { id });
        return null;
      }

      const scoreData = result[0];
      // Parse JSON fields
      const parsedScore: EvidenceScore = {
        ...scoreData,
        topQuotes: JSON.parse(scoreData.topQuotes),
      };

      logger.debug('✅ Evidence score found', { id, score: parsedScore.score });
      return parsedScore;
    } catch (error) {
      logger.error('❌ Failed to find evidence score by ID', error);
      throw error;
    }
  }

  /**
   * Find evidence score by document and persona
   */
  async findByDocumentAndPersona(
    documentId: string,
    personaId: string
  ): Promise<EvidenceScore | null> {
    try {
      logger.debug('🔍 Finding evidence score by document and persona', {
        documentId,
        personaId,
      });

      const db = getDatabase();
      const result = await db
        .select()
        .from(evidenceScores)
        .where(
          and(
            eq(evidenceScores.documentId, documentId),
            eq(evidenceScores.personaId, personaId)
          )
        )
        .limit(1);

      if (result.length === 0) {
        logger.debug('📭 Evidence score not found', { documentId, personaId });
        return null;
      }

      const scoreData = result[0];
      // Parse JSON fields
      const parsedScore: EvidenceScore = {
        ...scoreData,
        topQuotes: JSON.parse(scoreData.topQuotes),
      };

      logger.debug('✅ Evidence score found', {
        documentId,
        personaId,
        score: parsedScore.score,
      });
      return parsedScore;
    } catch (error) {
      logger.error(
        '❌ Failed to find evidence score by document and persona',
        error
      );
      throw error;
    }
  }

  /**
   * Find all evidence scores for a document
   */
  async findByDocumentId(documentId: string): Promise<EvidenceScore[]> {
    try {
      logger.debug('🔍 Finding evidence scores by document ID', { documentId });

      const db = getDatabase();
      const result = await db
        .select()
        .from(evidenceScores)
        .where(eq(evidenceScores.documentId, documentId));

      // Parse JSON fields for all scores
      const parsedScores: EvidenceScore[] = result.map(
        (item: typeof evidenceScores.$inferSelect) => ({
          ...item,
          topQuotes: JSON.parse(item.topQuotes),
        })
      );

      logger.debug(
        `✅ Found ${parsedScores.length} evidence scores for document`,
        { documentId }
      );
      return parsedScores;
    } catch (error) {
      logger.error('❌ Failed to find evidence scores by document ID', error);
      throw error;
    }
  }

  /**
   * Find all evidence scores for a persona
   */
  async findByPersonaId(personaId: string): Promise<EvidenceScore[]> {
    try {
      logger.debug('🔍 Finding evidence scores by persona ID', { personaId });

      const db = getDatabase();
      const result = await db
        .select()
        .from(evidenceScores)
        .where(eq(evidenceScores.personaId, personaId));

      // Parse JSON fields for all scores
      const parsedScores: EvidenceScore[] = result.map(
        (item: typeof evidenceScores.$inferSelect) => ({
          ...item,
          topQuotes: JSON.parse(item.topQuotes),
        })
      );

      logger.debug(
        `✅ Found ${parsedScores.length} evidence scores for persona`,
        { personaId }
      );
      return parsedScores;
    } catch (error) {
      logger.error('❌ Failed to find evidence scores by persona ID', error);
      throw error;
    }
  }

  /**
   * Update evidence score
   */
  async update(
    id: string,
    data: Partial<Omit<NewEvidenceScore, 'id'>>
  ): Promise<EvidenceScore | null> {
    try {
      logger.info('📝 Updating evidence score', {
        id,
        fields: Object.keys(data),
      });

      const db = getDatabase();

      // Prepare update data with JSON serialization where needed
      const updateData: Partial<Omit<NewEvidenceScore, 'id'>> = { ...data };
      if (data.topQuotes) {
        updateData.topQuotes = JSON.stringify(data.topQuotes);
      }
      updateData.lastCalculated = new Date();

      await db
        .update(evidenceScores)
        .set(updateData)
        .where(eq(evidenceScores.id, id));

      // Retrieve updated score
      const updated = await this.findById(id);

      if (updated) {
        logger.info('✅ Evidence score updated successfully', {
          id,
          score: updated.score,
        });
      } else {
        logger.warn('⚠️ Evidence score not found after update', { id });
      }

      return updated;
    } catch (error) {
      logger.error('❌ Failed to update evidence score', error);
      throw error;
    }
  }

  /**
   * Delete evidence score
   */
  async delete(id: string): Promise<boolean> {
    try {
      logger.info('🗑️ Deleting evidence score', { id });

      const db = getDatabase();
      const result = await db
        .delete(evidenceScores)
        .where(eq(evidenceScores.id, id));

      const deleted = result.changes > 0;

      if (deleted) {
        logger.info('✅ Evidence score deleted successfully', { id });
      } else {
        logger.warn('⚠️ Evidence score not found for deletion', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('❌ Failed to delete evidence score', error);
      throw error;
    }
  }

  /**
   * List all evidence scores
   */
  async list(): Promise<EvidenceScore[]> {
    try {
      logger.debug('📋 Listing all evidence scores');

      const db = getDatabase();
      const result = await db.select().from(evidenceScores);

      // Parse JSON fields for all scores
      const parsedScores: EvidenceScore[] = result.map(
        (item: typeof evidenceScores.$inferSelect) => ({
          ...item,
          topQuotes: JSON.parse(item.topQuotes),
        })
      );

      logger.debug(`✅ Found ${parsedScores.length} evidence scores`);
      return parsedScores;
    } catch (error) {
      logger.error('❌ Failed to list evidence scores', error);
      throw error;
    }
  }

  /**
   * Delete all scores for a document (for cleanup)
   */
  async deleteByDocumentId(documentId: string): Promise<number> {
    try {
      logger.info('🗑️ Deleting all evidence scores for document', {
        documentId,
      });

      const db = getDatabase();
      const result = await db
        .delete(evidenceScores)
        .where(eq(evidenceScores.documentId, documentId));

      const deletedCount = result.changes;

      logger.info(`✅ Deleted ${deletedCount} evidence scores for document`, {
        documentId,
      });

      return deletedCount;
    } catch (error) {
      logger.error('❌ Failed to delete evidence scores for document', error);
      throw error;
    }
  }
}
