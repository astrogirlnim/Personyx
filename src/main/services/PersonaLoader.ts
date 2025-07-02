/**
 * PersonaLoader - Service for loading personas from YAML configuration
 * Reads personas.yml and populates the database with persona definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PersonaRepo } from '@main/db/repositories/PersonaRepo';
import { Logger } from '@main/utils/logger';
import { PATHS } from '@shared/constants';

const logger = new Logger('persona-loader');

export interface PersonaYamlDefinition {
  id: string;
  name: string;
  description: string;
  primaryGoal: string;
  mainPainPoint: string;
  keywords: string[];
}

export interface PersonaYamlConfig {
  personas: PersonaYamlDefinition[];
}

export class PersonaLoader {
  private personaRepo: PersonaRepo;
  private yamlPath: string;

  constructor() {
    this.personaRepo = new PersonaRepo();
    // Look for personas.yml in the application root directory
    this.yamlPath = path.join(process.cwd(), PATHS.PERSONAS_CONFIG);
  }

  /**
   * Load personas from YAML file and sync to database
   * @returns Promise<number> Number of personas loaded
   */
  async loadPersonas(): Promise<number> {
    try {
      logger.info('🎭 Loading personas from YAML configuration');

      // Check if YAML file exists
      if (!fs.existsSync(this.yamlPath)) {
        logger.warn('⚠️ personas.yml not found, creating default file');
        await this.createDefaultPersonasFile();
      }

      // Read and parse YAML file
      const yamlContent = fs.readFileSync(this.yamlPath, 'utf8');
      const config = yaml.load(yamlContent) as PersonaYamlConfig;

      if (!config || !config.personas || !Array.isArray(config.personas)) {
        throw new Error('Invalid personas.yml format - missing personas array');
      }

      logger.info(`📋 Found ${config.personas.length} personas in YAML file`);

      // Validate persona definitions
      this.validatePersonaDefinitions(config.personas);

      // Sync personas to database
      let loadedCount = 0;
      for (const personaYaml of config.personas) {
        try {
          // Check if persona already exists by YAML ID
          const existing = await this.personaRepo.findById(personaYaml.id);

          if (existing) {
            // Update existing persona
            await this.personaRepo.update(personaYaml.id, {
              name: personaYaml.name,
              description: personaYaml.description,
              primaryGoal: personaYaml.primaryGoal,
              mainPainPoint: personaYaml.mainPainPoint,
              keywords: personaYaml.keywords || [],
            });
            logger.debug(
              `🔄 Updated existing persona: ${personaYaml.name} (${personaYaml.id})`
            );
          } else {
            // CRITICAL: Check if persona with same name but different ID exists
            const allPersonas = await this.personaRepo.list();
            const duplicateByName = allPersonas.find(
              p => p.name === personaYaml.name && p.id !== personaYaml.id
            );

            if (duplicateByName) {
              logger.warn(
                `⚠️ Skipping duplicate persona by name: ${personaYaml.name} (existing ID: ${duplicateByName.id}, YAML ID: ${personaYaml.id})`
              );
              continue;
            }

            // Create new persona with YAML ID
            const createData = {
              id: personaYaml.id, // Use the YAML ID instead of generating a random one
              name: personaYaml.name,
              description: personaYaml.description,
              primaryGoal: personaYaml.primaryGoal,
              mainPainPoint: personaYaml.mainPainPoint,
              keywords: personaYaml.keywords || [],
            };

            logger.info(`🎯 Creating persona with data:`, {
              id: createData.id,
              name: createData.name,
            });
            await this.personaRepo.create(createData);
            logger.debug(
              `➕ Created new persona: ${personaYaml.name} (${personaYaml.id})`
            );
          }

          loadedCount++;
        } catch (error) {
          logger.error(`❌ Failed to sync persona ${personaYaml.id}:`, error);
          // Continue with other personas even if one fails
        }
      }

      logger.info(`✅ Successfully loaded ${loadedCount} personas to database`);
      return loadedCount;
    } catch (error) {
      logger.error('❌ Failed to load personas from YAML:', error);
      throw error;
    }
  }

  /**
   * Validate persona definitions from YAML
   */
  private validatePersonaDefinitions(personas: PersonaYamlDefinition[]): void {
    const requiredFields = [
      'id',
      'name',
      'description',
      'primaryGoal',
      'mainPainPoint',
    ];
    const seenIds = new Set<string>();

    for (const persona of personas) {
      // Check required fields
      for (const field of requiredFields) {
        if (
          !persona[field as keyof PersonaYamlDefinition] ||
          typeof persona[field as keyof PersonaYamlDefinition] !== 'string' ||
          String(persona[field as keyof PersonaYamlDefinition]).trim() === ''
        ) {
          throw new Error(
            `Persona ${persona.id || 'unknown'} missing required field: ${field}`
          );
        }
      }

      // Check for duplicate IDs
      if (seenIds.has(persona.id)) {
        throw new Error(`Duplicate persona ID found: ${persona.id}`);
      }
      seenIds.add(persona.id);

      // Validate keywords array
      if (persona.keywords && !Array.isArray(persona.keywords)) {
        throw new Error(`Persona ${persona.id} keywords must be an array`);
      }

      // Ensure keywords are strings
      if (persona.keywords) {
        for (const keyword of persona.keywords) {
          if (typeof keyword !== 'string') {
            throw new Error(`Persona ${persona.id} keywords must be strings`);
          }
        }
      }
    }

    logger.debug(`✅ Validated ${personas.length} persona definitions`);
  }

  /**
   * Create default personas.yml file if it doesn't exist
   */
  private async createDefaultPersonasFile(): Promise<void> {
    const defaultConfig: PersonaYamlConfig = {
      personas: [
        {
          id: 'solo_founder',
          name: 'Solo Founder',
          description:
            'Independent entrepreneur building their first product with limited resources and time.',
          primaryGoal: 'Ship MVP fast with minimal tooling overhead',
          mainPainPoint:
            'Context switching between development and uncertain feature value',
          keywords: [
            'mvp',
            'validation',
            'lean startup',
            'product-market fit',
            'bootstrap',
            'time to market',
            'resource constraints',
            'feature priority',
          ],
        },
        {
          id: 'agency_marketer',
          name: 'Agency Marketer',
          description:
            'Marketing professional at a digital agency managing multiple client campaigns.',
          primaryGoal:
            'Optimize funnels and deliver measurable client reporting',
          mainPainPoint:
            'Copy iteration speed and proving return on investment',
          keywords: [
            'conversion optimization',
            'funnel analysis',
            'a/b testing',
            'roi reporting',
            'client management',
            'campaign performance',
            'lead generation',
            'copywriting',
          ],
        },
      ],
    };

    const yamlContent = yaml.dump(defaultConfig, {
      indent: 2,
      lineWidth: 80,
      quotingType: '"',
    });

    fs.writeFileSync(this.yamlPath, yamlContent, 'utf8');
    logger.info(`✅ Created default personas.yml at ${this.yamlPath}`);
  }

  /**
   * Reload personas from YAML (useful for hot-reloading during development)
   */
  async reloadPersonas(): Promise<number> {
    logger.info('🔄 Reloading personas from YAML');
    return await this.loadPersonas();
  }

  /**
   * Get the path to the personas YAML file
   */
  getPersonasPath(): string {
    return this.yamlPath;
  }

  /**
   * Check if personas.yml file exists
   */
  personasFileExists(): boolean {
    return fs.existsSync(this.yamlPath);
  }
}
