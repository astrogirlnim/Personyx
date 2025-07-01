/**
 * Persona Configuration Loader
 * Loads and validates personas from personas.yml configuration file
 * Phase 1, Feature 2 - Persona Config Loader
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { load as loadYaml, YAMLException } from 'js-yaml';
import { app } from 'electron';
import { Logger } from '@main/utils/logger';
import { PATHS } from '@shared/constants';
import type { Persona } from '@shared/types';
import { PersonaRepo } from '@main/db/repositories/PersonaRepo';

const logger = new Logger('persona-config-loader');

interface PersonaConfigFile {
  personas: Array<{
    id: string;
    name: string;
    description: string;
    primaryGoal: string;
    mainPainPoint: string;
    keywords: string[];
  }>;
}

export class PersonaConfigLoader {
  private personas: Persona[] = [];
  private personaRepo: PersonaRepo;
  private isLoaded = false;

  constructor() {
    this.personaRepo = new PersonaRepo();
  }

  /**
   * Load personas from configuration file and database
   */
  public async loadPersonas(): Promise<Persona[]> {
    logger.info('👥 Loading personas configuration...');

    try {
      // First, try to load from database
      const dbPersonas = await this.loadFromDatabase();

      // Then load from YAML file and sync to database
      const configPersonas = await this.loadFromYamlFile();

      // Merge configurations, preferring database entries
      const mergedPersonas = this.mergePersonas(dbPersonas, configPersonas);

      this.personas = mergedPersonas;
      this.isLoaded = true;

      logger.info(`✅ Loaded ${this.personas.length} personas successfully`);
      return this.personas;
    } catch (error) {
      logger.error('❌ Failed to load personas configuration', error);
      throw error;
    }
  }

  /**
   * Load personas from database
   */
  private async loadFromDatabase(): Promise<Persona[]> {
    try {
      logger.debug('🗄️ Loading personas from database...');
      const personas = await this.personaRepo.list();
      logger.debug(`📊 Found ${personas.length} personas in database`);
      return personas;
    } catch (error) {
      logger.warn(
        '⚠️ Failed to load personas from database, continuing...',
        error
      );
      return [];
    }
  }

  /**
   * Load personas from YAML configuration file
   */
  private async loadFromYamlFile(): Promise<Persona[]> {
    const configPath = this.getConfigPath();

    if (!existsSync(configPath)) {
      logger.warn(`⚠️ Personas config file not found at: ${configPath}`);
      return [];
    }

    try {
      logger.debug(`📄 Reading personas config from: ${configPath}`);
      const configContent = readFileSync(configPath, 'utf8');

      // Parse YAML
      const config = loadYaml(configContent) as PersonaConfigFile;

      // Validate schema
      this.validateConfigSchema(config);

      logger.info(
        `📋 Loaded ${config.personas.length} personas from config file`
      );

      // Sync to database and return the database personas
      const syncedPersonas = await this.syncToDatabase(config.personas);

      return syncedPersonas;
    } catch (error) {
      if (error instanceof YAMLException) {
        logger.error('❌ Invalid YAML syntax in personas config file', error);
        throw new Error(`YAML parsing error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate the personas configuration schema
   */
  private validateConfigSchema(
    config: unknown
  ): asserts config is PersonaConfigFile {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid personas config: must be an object');
    }

    const configObj = config as Record<string, unknown>;

    if (!Array.isArray(configObj.personas)) {
      throw new Error('Invalid personas config: "personas" must be an array');
    }

    for (const [index, persona] of configObj.personas.entries()) {
      if (!persona || typeof persona !== 'object') {
        throw new Error(`Invalid persona at index ${index}: must be an object`);
      }

      const personaObj = persona as Record<string, unknown>;
      const requiredFields = [
        'id',
        'name',
        'description',
        'primaryGoal',
        'mainPainPoint',
        'keywords',
      ];

      for (const field of requiredFields) {
        if (!personaObj[field]) {
          throw new Error(
            `Invalid persona at index ${index}: missing required field "${field}"`
          );
        }
      }

      if (typeof personaObj.id !== 'string' || personaObj.id.trim() === '') {
        throw new Error(
          `Invalid persona at index ${index}: "id" must be a non-empty string`
        );
      }

      if (!Array.isArray(personaObj.keywords)) {
        throw new Error(
          `Invalid persona at index ${index}: "keywords" must be an array`
        );
      }
    }

    logger.debug('✅ Personas config schema validation passed');
  }

  /**
   * Sync personas from config file to database
   */
  private async syncToDatabase(
    configPersonas: PersonaConfigFile['personas']
  ): Promise<Persona[]> {
    logger.debug('🔄 Syncing personas to database...');

    const syncedPersonas: Persona[] = [];

    for (const persona of configPersonas) {
      try {
        // Check if persona exists in database
        const existing = await this.personaRepo.findById(persona.id);

        let syncedPersona: Persona;

        if (existing) {
          // Update existing persona with config data
          syncedPersona =
            (await this.personaRepo.update(persona.id, {
              name: persona.name,
              description: persona.description,
              primaryGoal: persona.primaryGoal,
              mainPainPoint: persona.mainPainPoint,
              keywords: persona.keywords, // Repository handles JSON conversion
            })) || existing; // Fallback to existing if update returns null
          logger.debug(`📝 Updated persona: ${persona.name}`);
        } else {
          // Create new persona
          syncedPersona = await this.personaRepo.create({
            name: persona.name,
            description: persona.description,
            primaryGoal: persona.primaryGoal,
            mainPainPoint: persona.mainPainPoint,
            keywords: persona.keywords, // Repository handles JSON conversion
          });
          logger.debug(`➕ Created persona: ${persona.name}`);
        }

        syncedPersonas.push(syncedPersona);
      } catch (error) {
        logger.error(
          `❌ Failed to sync persona "${persona.name}" to database`,
          error
        );
      }
    }

    logger.debug('✅ Persona database sync completed');
    return syncedPersonas;
  }

  /**
   * Merge personas from database and config file
   */
  private mergePersonas(
    dbPersonas: Persona[],
    configPersonas: Persona[]
  ): Persona[] {
    const merged = new Map<string, Persona>();

    // Add database personas first
    for (const persona of dbPersonas) {
      merged.set(persona.id, persona);
    }

    // Add/update with config personas
    for (const persona of configPersonas) {
      merged.set(persona.id, persona);
    }

    const result = Array.from(merged.values());
    logger.debug(
      `🔀 Merged ${result.length} unique personas (${dbPersonas.length} from DB, ${configPersonas.length} from config)`
    );

    return result;
  }

  /**
   * Get the path to the personas configuration file
   */
  private getConfigPath(): string {
    // First try project root (development)
    const projectRoot = process.cwd();
    const devConfigPath = join(projectRoot, PATHS.PERSONAS_CONFIG);

    if (existsSync(devConfigPath)) {
      return devConfigPath;
    }

    // Fallback to user data directory (production)
    const userDataPath = app.getPath('userData');
    return join(userDataPath, PATHS.PERSONAS_CONFIG);
  }

  /**
   * Get loaded personas
   */
  public getPersonas(): Persona[] {
    if (!this.isLoaded) {
      logger.warn('⚠️ Personas not loaded yet, returning empty array');
      return [];
    }
    return [...this.personas];
  }

  /**
   * Find persona by ID
   */
  public findPersonaById(id: string): Persona | null {
    return this.personas.find(p => p.id === id) || null;
  }

  /**
   * Check if personas are loaded
   */
  public isPersonasLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Reload personas from configuration
   */
  public async reloadPersonas(): Promise<Persona[]> {
    logger.info('🔄 Reloading personas configuration...');
    this.isLoaded = false;
    this.personas = [];
    return this.loadPersonas();
  }

  /**
   * Get persona count
   */
  public getPersonaCount(): number {
    return this.personas.length;
  }
}
