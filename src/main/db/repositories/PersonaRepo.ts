/**
 * Persona Repository - CRUD operations for personas
 * Repository pattern for clean data access layer
 */

import { eq } from 'drizzle-orm';
import { getDatabase } from '@main/db/connection';
import { personas, type NewPersona } from '@main/db/schema';
import { type Persona } from '@shared/types';
import { Logger } from '@main/utils/logger';

// Application-level interfaces for repository operations
interface PersonaCreateData {
  name: string;
  description: string;
  primaryGoal: string;
  mainPainPoint: string;
  keywords: string[];
}

interface PersonaUpdateData {
  name?: string;
  description?: string;
  primaryGoal?: string;
  mainPainPoint?: string;
  keywords?: string[];
}

const logger = new Logger('persona-repo');

export class PersonaRepo {
  /**
   * Create a new persona
   */
  async create(data: PersonaCreateData): Promise<Persona> {
    try {
      logger.info('➕ Creating new persona', { name: data.name });

      const db = getDatabase();
      const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
  async update(id: string, data: PersonaUpdateData): Promise<Persona | null> {
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
}
