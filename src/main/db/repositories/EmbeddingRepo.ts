/**
 * Embedding Repository
 * Handles CRUD operations for vector embeddings
 * Phase 1, Feature 3 - LangGraph + n8n Workflow
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import { embeddings, type Embedding, type NewEmbedding } from '@main/db/schema';
import { Logger } from '@main/utils/logger';
import { randomUUID } from 'crypto';

const logger = new Logger('embedding-repo');

// Enhanced interfaces for pagination and filtering
export interface EmbeddingPaginationOptions {
  offset?: number;
  limit?: number;
}

export interface EmbeddingFilters {
  model?: string;
  evidenceId?: string;
  minDimensions?: number;
  maxDimensions?: number;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface EmbeddingPaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface EmbeddingSortOptions {
  field: 'createdAt' | 'dimensions' | 'chunkIndex';
  direction: 'asc' | 'desc';
}

export class EmbeddingRepo {
  /**
   * Create a new embedding record
   */
  async create(
    embeddingData: Omit<NewEmbedding, 'id' | 'createdAt'>
  ): Promise<Embedding> {
    logger.debug('💾 Creating new embedding record...');

    const newEmbedding: NewEmbedding = {
      id: randomUUID(),
      ...embeddingData,
    };

    try {
      const db = getDatabase();
      const [result] = await db
        .insert(embeddings)
        .values(newEmbedding)
        .returning();

      logger.debug(
        `✅ Created embedding: ${result.id} for evidence: ${result.evidenceId}`
      );
      return result;
    } catch (error) {
      logger.error('❌ Failed to create embedding', error);
      throw error;
    }
  }

  /**
   * Find embedding by ID
   */
  async findById(id: string): Promise<Embedding | null> {
    logger.debug(`🔍 Finding embedding by ID: ${id}`);

    try {
      const db = getDatabase();
      const result = await db
        .select()
        .from(embeddings)
        .where(eq(embeddings.id, id))
        .limit(1);

      if (result.length === 0) {
        logger.debug(`📭 No embedding found with ID: ${id}`);
        return null;
      }

      logger.debug(`✅ Found embedding: ${result[0].id}`);
      return result[0];
    } catch (error) {
      logger.error('❌ Failed to find embedding by ID', error);
      throw error;
    }
  }

  /**
   * Find all embeddings for a specific evidence ID
   */
  async findByEvidenceId(evidenceId: string): Promise<Embedding[]> {
    logger.debug(`🔍 Finding embeddings for evidence ID: ${evidenceId}`);

    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(embeddings)
        .where(eq(embeddings.evidenceId, evidenceId));

      logger.debug(
        `✅ Found ${results.length} embeddings for evidence: ${evidenceId}`
      );
      return results;
    } catch (error) {
      logger.error('❌ Failed to find embeddings by evidence ID', error);
      throw error;
    }
  }

  /**
   * Get all embeddings with advanced pagination and filtering
   */
  async listWithPagination(options?: {
    pagination?: EmbeddingPaginationOptions;
    filters?: EmbeddingFilters;
    sort?: EmbeddingSortOptions;
  }): Promise<EmbeddingPaginatedResult<Embedding>> {
    logger.debug('📋 Listing embeddings with pagination/filtering', options);

    try {
      const {
        pagination = { offset: 0, limit: 50 },
        filters = {},
        sort = { field: 'createdAt', direction: 'desc' },
      } = options || {};

      // Get all embeddings first (for now - can be optimized with SQL later)
      const allEmbeddings = await this.list();

      // Apply filters
      let filteredEmbeddings = allEmbeddings;

      if (filters.model) {
        filteredEmbeddings = filteredEmbeddings.filter(
          e => e.model === filters.model
        );
      }

      if (filters.evidenceId) {
        filteredEmbeddings = filteredEmbeddings.filter(
          e => e.evidenceId === filters.evidenceId
        );
      }

      if (filters.minDimensions) {
        filteredEmbeddings = filteredEmbeddings.filter(
          e => e.dimensions >= filters.minDimensions!
        );
      }

      if (filters.maxDimensions) {
        filteredEmbeddings = filteredEmbeddings.filter(
          e => e.dimensions <= filters.maxDimensions!
        );
      }

      if (filters.createdAfter) {
        filteredEmbeddings = filteredEmbeddings.filter(
          e => new Date(e.createdAt) >= filters.createdAfter!
        );
      }

      if (filters.createdBefore) {
        filteredEmbeddings = filteredEmbeddings.filter(
          e => new Date(e.createdAt) <= filters.createdBefore!
        );
      }

      // Apply sorting
      filteredEmbeddings.sort((a, b) => {
        let aVal, bVal;
        switch (sort.field) {
          case 'createdAt':
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
          case 'dimensions':
            aVal = a.dimensions;
            bVal = b.dimensions;
            break;
          case 'chunkIndex':
            aVal = a.chunkIndex;
            bVal = b.chunkIndex;
            break;
          default:
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
        }

        if (sort.direction === 'desc') {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        } else {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
      });

      const total = filteredEmbeddings.length;
      const offset = pagination.offset || 0;
      const limit = pagination.limit || 50;

      // Apply pagination
      const paginatedData = filteredEmbeddings.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      const result: EmbeddingPaginatedResult<Embedding> = {
        data: paginatedData,
        total,
        offset,
        limit,
        hasMore,
      };

      logger.debug(
        `✅ Found ${paginatedData.length}/${total} embeddings with pagination`,
        {
          offset,
          limit,
          hasMore,
        }
      );

      return result;
    } catch (error) {
      logger.error('❌ Failed to list embeddings with pagination', error);
      throw error;
    }
  }

  /**
   * Get embeddings by model with pagination
   */
  async findByModelPaginated(
    model: string,
    options?: EmbeddingPaginationOptions
  ): Promise<EmbeddingPaginatedResult<Embedding>> {
    logger.debug(
      `🔍 Finding embeddings by model with pagination: ${model}`,
      options
    );

    return this.listWithPagination({
      pagination: options,
      filters: { model },
    });
  }

  /**
   * Get embedding statistics
   */
  async getStatistics(): Promise<{
    totalEmbeddings: number;
    uniqueModels: string[];
    averageDimensions: number;
    totalEvidence: number;
    oldestEmbedding?: Date;
    newestEmbedding?: Date;
  }> {
    logger.debug('📊 Getting embedding statistics...');

    try {
      const allEmbeddings = await this.list();

      if (allEmbeddings.length === 0) {
        return {
          totalEmbeddings: 0,
          uniqueModels: [],
          averageDimensions: 0,
          totalEvidence: 0,
        };
      }

      const uniqueModels = [...new Set(allEmbeddings.map(e => e.model))];
      const averageDimensions =
        allEmbeddings.reduce((sum, e) => sum + e.dimensions, 0) /
        allEmbeddings.length;
      const uniqueEvidence = [...new Set(allEmbeddings.map(e => e.evidenceId))];

      const dates = allEmbeddings.map(e => new Date(e.createdAt));
      const oldestEmbedding = new Date(
        Math.min(...dates.map(d => d.getTime()))
      );
      const newestEmbedding = new Date(
        Math.max(...dates.map(d => d.getTime()))
      );

      const stats = {
        totalEmbeddings: allEmbeddings.length,
        uniqueModels,
        averageDimensions: Math.round(averageDimensions),
        totalEvidence: uniqueEvidence.length,
        oldestEmbedding,
        newestEmbedding,
      };

      logger.debug('✅ Embedding statistics calculated', stats);
      return stats;
    } catch (error) {
      logger.error('❌ Failed to get embedding statistics', error);
      throw error;
    }
  }

  /**
   * Get all embeddings with optional filtering
   */
  async list(options?: {
    model?: string;
    limit?: number;
  }): Promise<Embedding[]> {
    logger.debug('📋 Listing embeddings...');

    try {
      const db = getDatabase();

      // Build query based on options
      let results;
      if (options?.model && options?.limit) {
        results = await db
          .select()
          .from(embeddings)
          .where(eq(embeddings.model, options.model))
          .limit(options.limit);
      } else if (options?.model) {
        results = await db
          .select()
          .from(embeddings)
          .where(eq(embeddings.model, options.model));
      } else if (options?.limit) {
        results = await db.select().from(embeddings).limit(options.limit);
      } else {
        results = await db.select().from(embeddings);
      }

      logger.debug(`✅ Listed ${results.length} embeddings`);
      return results;
    } catch (error) {
      logger.error('❌ Failed to list embeddings', error);
      throw error;
    }
  }

  /**
   * Delete embedding by ID
   */
  async deleteById(id: string): Promise<boolean> {
    logger.debug(`🗑️ Deleting embedding: ${id}`);

    try {
      const db = getDatabase();
      const result = await db.delete(embeddings).where(eq(embeddings.id, id));

      const deleted = result.changes > 0;
      if (deleted) {
        logger.debug(`✅ Deleted embedding: ${id}`);
      } else {
        logger.debug(`📭 No embedding found to delete: ${id}`);
      }

      return deleted;
    } catch (error) {
      logger.error('❌ Failed to delete embedding', error);
      throw error;
    }
  }

  /**
   * Delete all embeddings for a specific evidence ID
   */
  async deleteByEvidenceId(evidenceId: string): Promise<number> {
    logger.debug(`🗑️ Deleting embeddings for evidence: ${evidenceId}`);

    try {
      const db = getDatabase();
      const result = await db
        .delete(embeddings)
        .where(eq(embeddings.evidenceId, evidenceId));

      logger.debug(
        `✅ Deleted ${result.changes} embeddings for evidence: ${evidenceId}`
      );
      return result.changes;
    } catch (error) {
      logger.error('❌ Failed to delete embeddings by evidence ID', error);
      throw error;
    }
  }

  /**
   * Get embeddings count
   */
  async count(): Promise<number> {
    logger.debug('📊 Counting embeddings...');

    try {
      const db = getDatabase();
      const results = await db.select().from(embeddings);
      const count = results.length;

      logger.debug(`✅ Total embeddings count: ${count}`);
      return count;
    } catch (error) {
      logger.error('❌ Failed to count embeddings', error);
      throw error;
    }
  }

  /**
   * Parse embedding vector from JSON string
   */
  parseEmbedding(embeddingStr: string): number[] {
    try {
      const parsed = JSON.parse(embeddingStr);
      if (!Array.isArray(parsed)) {
        throw new Error('Embedding must be an array');
      }
      return parsed;
    } catch (error) {
      logger.error('❌ Failed to parse embedding vector', error);
      throw new Error('Invalid embedding format');
    }
  }

  /**
   * Serialize embedding vector to JSON string
   */
  serializeEmbedding(embedding: number[]): string {
    return JSON.stringify(embedding);
  }
}
