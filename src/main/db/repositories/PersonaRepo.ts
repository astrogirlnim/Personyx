/**
 * Persona Repository - CRUD operations for personas
 * Repository pattern for clean data access layer
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import { personas, type NewPersona } from '@main/db/schema';
import { type Persona } from '@shared/types';
import { Logger } from '@main/utils/logger';

// Input interface for create/update operations with proper array types
interface PersonaInput {
  id?: string; // Optional ID - if provided, use it instead of generating one
  name: string;
  description: string;
  primaryGoal: string;
  mainPainPoint: string;
  keywords?: string[];
}

const logger = new Logger('persona-repo');

// Enhanced interfaces for pagination and filtering
export interface PaginationOptions {
  offset?: number;
  limit?: number;
}

export interface PersonaFilters {
  name?: string;
  keyword?: string;
  searchTerm?: string; // Search across name, description, goal
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface PersonaSortOptions {
  field: 'name' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

export class PersonaRepo {
  /**
   * Create a new persona
   */
  async create(data: PersonaInput): Promise<Persona> {
    try {
      logger.info('➕ Creating new persona', {
        name: data.name,
        providedId: data.id,
      });

      const db = getDatabase();
      // Use provided ID or generate a new one
      const personaId =
        data.id ||
        `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      logger.info('🔑 Persona ID resolved', {
        providedId: data.id,
        finalId: personaId,
      });

      const newPersona: NewPersona = {
        id: personaId,
        name: data.name,
        description: data.description,
        primaryGoal: data.primaryGoal,
        mainPainPoint: data.mainPainPoint,
        keywords: JSON.stringify(data.keywords || []),
      };

      await db.insert(personas).values(newPersona);

      // Retrieve the created persona
      const created = await this.findById(personaId);
      if (!created) {
        throw new Error('Failed to retrieve created persona');
      }

      logger.info('✅ Persona created successfully', {
        id: personaId,
        name: data.name,
      });
      return created;
    } catch (error) {
      logger.error('❌ Failed to create persona', error);
      throw error;
    }
  }

  /**
   * Find persona by ID
   */
  async findById(id: string): Promise<Persona | null> {
    try {
      logger.debug('🔍 Finding persona by ID', { id });

      const db = getDatabase();
      const result = await db
        .select()
        .from(personas)
        .where(eq(personas.id, id))
        .limit(1);

      if (result.length === 0) {
        logger.debug('📭 Persona not found', { id });
        return null;
      }

      const persona = result[0];
      // Parse JSON fields
      const parsedPersona: Persona = {
        ...persona,
        keywords: JSON.parse(persona.keywords),
      };

      logger.debug('✅ Persona found', { id, name: parsedPersona.name });
      return parsedPersona;
    } catch (error) {
      logger.error('❌ Failed to find persona by ID', error);
      throw error;
    }
  }

  /**
   * List all personas
   */
  async list(): Promise<Persona[]> {
    try {
      logger.debug('📋 Listing all personas');

      const db = getDatabase();
      const result = await db.select().from(personas);

      // Parse JSON fields for all personas
      const parsedPersonas: Persona[] = result.map(
        (persona: typeof personas.$inferSelect) => ({
          ...persona,
          keywords: JSON.parse(persona.keywords),
        })
      );

      logger.debug(`✅ Found ${parsedPersonas.length} personas`);
      return parsedPersonas;
    } catch (error) {
      logger.error('❌ Failed to list personas', error);
      throw error;
    }
  }

  /**
   * Update persona
   */
  async update(
    id: string,
    data: Partial<PersonaInput>
  ): Promise<Persona | null> {
    try {
      logger.info('📝 Updating persona', { id, fields: Object.keys(data) });

      const db = getDatabase();

      // Prepare update data with JSON serialization
      const updateData: Record<string, unknown> = { ...data };
      if (data.keywords) {
        updateData.keywords = JSON.stringify(data.keywords);
      }
      updateData.updatedAt = new Date();

      await db.update(personas).set(updateData).where(eq(personas.id, id));

      // Retrieve updated persona
      const updated = await this.findById(id);

      if (updated) {
        logger.info('✅ Persona updated successfully', {
          id,
          name: updated.name,
        });
      } else {
        logger.warn('⚠️ Persona not found after update', { id });
      }

      return updated;
    } catch (error) {
      logger.error('❌ Failed to update persona', error);
      throw error;
    }
  }

  /**
   * Delete persona
   */
  async delete(id: string): Promise<boolean> {
    try {
      logger.info('🗑️ Deleting persona', { id });

      const db = getDatabase();
      const result = await db.delete(personas).where(eq(personas.id, id));

      const deleted = result.changes > 0;

      if (deleted) {
        logger.info('✅ Persona deleted successfully', { id });
      } else {
        logger.warn('⚠️ Persona not found for deletion', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('❌ Failed to delete persona', error);
      throw error;
    }
  }

  /**
   * Find personas by keyword
   */
  async findByKeyword(keyword: string): Promise<Persona[]> {
    try {
      logger.debug('🔍 Finding personas by keyword', { keyword });

      const allPersonas = await this.list();

      // Filter personas that contain the keyword
      const matchingPersonas = allPersonas.filter(persona => {
        const keywordsArray = Array.isArray(persona.keywords)
          ? persona.keywords
          : [];
        return keywordsArray.some((k: string) =>
          k.toLowerCase().includes(keyword.toLowerCase())
        );
      });

      logger.debug(
        `✅ Found ${matchingPersonas.length} personas with keyword`,
        { keyword }
      );
      return matchingPersonas;
    } catch (error) {
      logger.error('❌ Failed to find personas by keyword', error);
      throw error;
    }
  }

  /**
   * Get persona count
   */
  async count(): Promise<number> {
    try {
      logger.debug('🔢 Counting personas');

      const personas = await this.list();
      const count = personas.length;

      logger.debug(`✅ Persona count: ${count}`);
      return count;
    } catch (error) {
      logger.error('❌ Failed to count personas', error);
      throw error;
    }
  }

  /**
   * List personas with pagination and filtering
   */
  async listWithPagination(options?: {
    pagination?: PaginationOptions;
    filters?: PersonaFilters;
    sort?: PersonaSortOptions;
  }): Promise<PaginatedResult<Persona>> {
    try {
      logger.debug('📋 Listing personas with pagination/filtering', options);

      const {
        pagination = { offset: 0, limit: 10 },
        filters = {},
        sort = { field: 'name', direction: 'asc' },
      } = options || {};

      // Get all personas first (for now - can be optimized with SQL later)
      const allPersonas = await this.list();

      // Apply filters
      let filteredPersonas = allPersonas;

      if (filters.name) {
        filteredPersonas = filteredPersonas.filter(p =>
          p.name.toLowerCase().includes(filters.name!.toLowerCase())
        );
      }

      if (filters.keyword) {
        filteredPersonas = filteredPersonas.filter(p => {
          const keywords = Array.isArray(p.keywords) ? p.keywords : [];
          return keywords.some(k =>
            k.toLowerCase().includes(filters.keyword!.toLowerCase())
          );
        });
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredPersonas = filteredPersonas.filter(
          p =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower) ||
            p.primaryGoal.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      filteredPersonas.sort((a, b) => {
        let aVal, bVal;
        switch (sort.field) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'createdAt':
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
          case 'updatedAt':
            aVal = new Date(a.updatedAt).getTime();
            bVal = new Date(b.updatedAt).getTime();
            break;
          default:
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
        }

        if (sort.direction === 'desc') {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        } else {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
      });

      const total = filteredPersonas.length;
      const offset = pagination.offset || 0;
      const limit = pagination.limit || 10;

      // Apply pagination
      const paginatedData = filteredPersonas.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      const result: PaginatedResult<Persona> = {
        data: paginatedData,
        total,
        offset,
        limit,
        hasMore,
      };

      logger.debug(
        `✅ Found ${paginatedData.length}/${total} personas with pagination`,
        {
          offset,
          limit,
          hasMore,
        }
      );

      return result;
    } catch (error) {
      logger.error('❌ Failed to list personas with pagination', error);
      throw error;
    }
  }

  /**
   * Advanced search with multiple filters
   */
  async search(query: {
    text?: string;
    keywords?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    limit?: number;
  }): Promise<Persona[]> {
    try {
      logger.debug('🔍 Advanced persona search', query);

      const allPersonas = await this.list();
      let results = allPersonas;

      // Text search across multiple fields
      if (query.text) {
        const searchText = query.text.toLowerCase();
        results = results.filter(
          p =>
            p.name.toLowerCase().includes(searchText) ||
            p.description.toLowerCase().includes(searchText) ||
            p.primaryGoal.toLowerCase().includes(searchText) ||
            p.mainPainPoint.toLowerCase().includes(searchText)
        );
      }

      // Keyword matching
      if (query.keywords && query.keywords.length > 0) {
        results = results.filter(p => {
          const personaKeywords = Array.isArray(p.keywords) ? p.keywords : [];
          return query.keywords!.some(searchKeyword =>
            personaKeywords.some(pk =>
              pk.toLowerCase().includes(searchKeyword.toLowerCase())
            )
          );
        });
      }

      // Date range filtering
      if (query.createdAfter) {
        results = results.filter(
          p => new Date(p.createdAt) >= query.createdAfter!
        );
      }

      if (query.createdBefore) {
        results = results.filter(
          p => new Date(p.createdAt) <= query.createdBefore!
        );
      }

      // Apply limit
      if (query.limit && query.limit > 0) {
        results = results.slice(0, query.limit);
      }

      logger.debug(`✅ Advanced search found ${results.length} personas`);
      return results;
    } catch (error) {
      logger.error('❌ Failed to perform advanced persona search', error);
      throw error;
    }
  }
}
