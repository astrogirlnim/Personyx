/**
 * PersonaManagerService - Manages persona YAML configuration file operations
 * Phase 3.5.3 - Persona Manager Implementation
 *
 * Provides functionality for:
 * - Reading personas.yml configuration
 * - Validating YAML content and persona definitions
 * - Writing updated YAML configurations
 * - Hot-reloading persona data without app restart
 * - Triggering evidence score recalculation when personas change
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from '@main/utils/logger';
import { PATHS } from '@shared/constants';
import { PersonaLoader } from './PersonaLoader';
import { PersonaConfigLoader } from './PersonaConfigLoader';
import { ActivityLogService } from './ActivityLogService';
import { EvidenceScoreService } from './EvidenceScoreService';
import { ProductDocumentRepo } from '@main/db/repositories/ProductDocumentRepo';
import type { Persona } from '@shared/types';

const logger = new Logger('persona-manager-service');

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

export interface PersonaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  duplicateIds: string[];
  duplicateNames: string[];
}

export interface PersonaManagerResult {
  success: boolean;
  personas?: Persona[];
  error?: string;
  validationResult?: PersonaValidationResult;
}

export class PersonaManagerService {
  private yamlPath: string;
  private personaLoader: PersonaLoader;
  private personaConfigLoader: PersonaConfigLoader;
  private activityLogService: ActivityLogService;
  private evidenceScoreService: EvidenceScoreService;
  private productDocumentRepo: ProductDocumentRepo;

  constructor(
    activityLogService: ActivityLogService,
    evidenceScoreService: EvidenceScoreService
  ) {
    this.yamlPath = path.join(process.cwd(), PATHS.PERSONAS_CONFIG);
    this.personaLoader = new PersonaLoader();
    this.personaConfigLoader = new PersonaConfigLoader();
    this.activityLogService = activityLogService;
    this.evidenceScoreService = evidenceScoreService;
    this.productDocumentRepo = new ProductDocumentRepo();

    logger.info('🎭 PersonaManagerService initialized');
    logger.debug(`📄 YAML path: ${this.yamlPath}`);
  }

  /**
   * Get current YAML configuration as string
   * @returns Promise<string> Raw YAML content
   */
  async getYaml(): Promise<string> {
    try {
      logger.info('📖 Reading personas YAML configuration');

      // Ensure file exists
      if (!fs.existsSync(this.yamlPath)) {
        logger.warn('⚠️ personas.yml not found, creating default file');
        await this.createDefaultPersonasFile();
      }

      const yamlContent = fs.readFileSync(this.yamlPath, 'utf8');
      logger.debug(`📋 Read ${yamlContent.length} characters from YAML file`);
      return yamlContent;
    } catch (error) {
      logger.error('❌ Failed to read personas YAML file', error);
      throw new Error(
        `Failed to read personas configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate YAML content and persona definitions
   * @param yamlContent Raw YAML string to validate
   * @returns PersonaValidationResult Validation result with errors and warnings
   */
  validateYaml(yamlContent: string): PersonaValidationResult {
    const result: PersonaValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      duplicateIds: [],
      duplicateNames: [],
    };

    try {
      logger.info('🔍 Validating personas YAML content');

      // Parse YAML
      let config: unknown;
      try {
        config = yaml.load(yamlContent);
      } catch (yamlError) {
        result.valid = false;
        result.errors.push(
          `Invalid YAML syntax: ${yamlError instanceof Error ? yamlError.message : 'Unknown YAML error'}`
        );
        return result;
      }

      // Validate structure
      if (!config || typeof config !== 'object') {
        result.valid = false;
        result.errors.push('Configuration must be an object');
        return result;
      }

      const configObj = config as Record<string, unknown>;

      if (!Array.isArray(configObj.personas)) {
        result.valid = false;
        result.errors.push('Configuration must have a "personas" array');
        return result;
      }

      // Validate personas
      const personas = configObj.personas as unknown[];
      if (personas.length === 0) {
        result.warnings.push('No personas defined in configuration');
      }

      const seenIds = new Set<string>();
      const seenNames = new Set<string>();

      for (const [index, persona] of personas.entries()) {
        if (!persona || typeof persona !== 'object') {
          result.valid = false;
          result.errors.push(`Persona at index ${index} must be an object`);
          continue;
        }

        const personaObj = persona as Record<string, unknown>;

        // Validate required fields
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
            result.valid = false;
            result.errors.push(
              `Persona at index ${index} missing required field: ${field}`
            );
          }
        }

        // Validate field types
        if (typeof personaObj.id !== 'string' || personaObj.id.trim() === '') {
          result.valid = false;
          result.errors.push(
            `Persona at index ${index}: "id" must be a non-empty string`
          );
        } else {
          const id = personaObj.id as string;
          if (seenIds.has(id)) {
            result.valid = false;
            result.duplicateIds.push(id);
            result.errors.push(`Duplicate persona ID: ${id}`);
          } else {
            seenIds.add(id);
          }
        }

        if (
          typeof personaObj.name !== 'string' ||
          personaObj.name.trim() === ''
        ) {
          result.valid = false;
          result.errors.push(
            `Persona at index ${index}: "name" must be a non-empty string`
          );
        } else {
          const name = personaObj.name as string;
          if (seenNames.has(name.toLowerCase())) {
            result.warnings.push(`Duplicate persona name: ${name}`);
            result.duplicateNames.push(name);
          } else {
            seenNames.add(name.toLowerCase());
          }
        }

        if (!Array.isArray(personaObj.keywords)) {
          result.valid = false;
          result.errors.push(
            `Persona at index ${index}: "keywords" must be an array`
          );
        } else {
          const keywords = personaObj.keywords as unknown[];
          if (keywords.some(k => typeof k !== 'string')) {
            result.valid = false;
            result.errors.push(
              `Persona at index ${index}: all keywords must be strings`
            );
          }
        }

        // Validate string field lengths
        const stringFields = [
          'name',
          'description',
          'primaryGoal',
          'mainPainPoint',
        ];
        for (const field of stringFields) {
          if (typeof personaObj[field] === 'string') {
            const value = personaObj[field] as string;
            if (value.length > 1000) {
              result.warnings.push(
                `Persona at index ${index}: "${field}" is very long (${value.length} characters)`
              );
            }
          }
        }

        // Validate ID format (alphanumeric + underscore + dash)
        if (typeof personaObj.id === 'string') {
          const id = personaObj.id as string;
          if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
            result.warnings.push(
              `Persona ID "${id}" contains special characters. Recommended: alphanumeric, underscore, dash only`
            );
          }
        }
      }

      logger.info(
        `✅ YAML validation completed - Valid: ${result.valid}, Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`
      );
      return result;
    } catch (error) {
      logger.error('❌ Unexpected error during YAML validation', error);
      result.valid = false;
      result.errors.push(
        `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Save YAML content to file and reload personas
   * @param yamlContent YAML string to save
   * @returns Promise<PersonaManagerResult> Result with updated personas or error
   */
  async saveYaml(yamlContent: string): Promise<PersonaManagerResult> {
    try {
      logger.info('💾 Saving personas YAML configuration');

      // Validate content first
      const validationResult = this.validateYaml(yamlContent);
      if (!validationResult.valid) {
        logger.warn(
          '⚠️ YAML validation failed, not saving',
          validationResult.errors
        );
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.join(', ')}`,
          validationResult,
        };
      }

      // Create backup of current file
      const backupPath = `${this.yamlPath}.backup.${Date.now()}`;
      if (fs.existsSync(this.yamlPath)) {
        fs.copyFileSync(this.yamlPath, backupPath);
        logger.debug(`📋 Created backup at ${backupPath}`);
      }

      // Write new content
      fs.writeFileSync(this.yamlPath, yamlContent, 'utf8');
      logger.info('✅ YAML file saved successfully');

      // Reload personas
      const reloadResult = await this.reload();
      if (!reloadResult.success) {
        // Restore backup if reload fails
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, this.yamlPath);
          logger.warn('⚠️ Restored backup due to reload failure');
        }
        return reloadResult;
      }

      // Log activity
      await this.activityLogService.logPersonaConfigUpdated({
        personaCount: reloadResult.personas?.length || 0,
        validationWarnings: validationResult.warnings,
      });

      // Clean up backup (keep only recent ones)
      this.cleanupBackups();

      logger.info('🎉 Personas configuration updated successfully');
      return {
        success: true,
        personas: reloadResult.personas,
        validationResult,
      };
    } catch (error) {
      logger.error('❌ Failed to save personas YAML', error);
      return {
        success: false,
        error: `Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Reload personas from YAML file and sync to database
   * @returns Promise<PersonaManagerResult> Result with reloaded personas or error
   */
  async reload(): Promise<PersonaManagerResult> {
    try {
      logger.info('🔄 Reloading personas from YAML');

      // Use PersonaLoader for reload (matches existing app behavior)
      const loadedCount = await this.personaLoader.reloadPersonas();

      // Get updated personas from PersonaConfigLoader
      const personas = await this.personaConfigLoader.reloadPersonas();

      // Phase 3.5.3: Trigger evidence score recalculation for all personas
      // Since persona characteristics (keywords, descriptions) affect scoring
      logger.info(
        '📊 Triggering evidence score recalculation after persona reload'
      );
      await this.recalculateEvidenceScores(personas.map(p => p.id));

      // Log activity
      await this.activityLogService.logPersonaReloaded({
        personaCount: personas.length,
        loadedCount,
      });

      logger.info(
        `✅ Successfully reloaded ${personas.length} personas with updated evidence scores`
      );
      return {
        success: true,
        personas,
      };
    } catch (error) {
      logger.error('❌ Failed to reload personas', error);
      return {
        success: false,
        error: `Failed to reload personas: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Recalculate evidence scores for affected personas after configuration changes
   * @private
   */
  private async recalculateEvidenceScores(personaIds: string[]): Promise<void> {
    logger.info('📊 Recalculating evidence scores for updated personas', {
      affectedPersonas: personaIds.length,
      personaIds,
    });

    try {
      // Get all PRDs to recalculate scores for
      const productDocuments = await this.productDocumentRepo.list();

      let recalculatedCount = 0;
      let failedCount = 0;

      for (const personaId of personaIds) {
        for (const document of productDocuments) {
          try {
            // Recalculate score for this PRD-persona combination
            await this.evidenceScoreService.calculateAndPersistScore(
              document.id,
              personaId
            );

            recalculatedCount++;
            logger.debug('✅ Evidence score recalculated', {
              documentId: document.id,
              personaId,
              documentTitle: document.title,
            });
          } catch (error) {
            failedCount++;
            logger.error('❌ Failed to recalculate evidence score', {
              documentId: document.id,
              personaId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      logger.info('✅ Evidence score recalculation complete', {
        affectedPersonas: personaIds.length,
        affectedDocuments: productDocuments.length,
        recalculatedCount,
        failedCount,
      });

      // Log the recalculation activity
      await this.activityLogService.logEvidenceScoreUpdate(
        'persona-update', // Use as document ID placeholder
        personaIds,
        undefined // No old/new score comparison for persona updates
      );
    } catch (error) {
      logger.error('❌ Evidence score recalculation failed', {
        personaIds,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get the path to the personas YAML file
   * @returns string Full path to personas.yml
   */
  getPersonasPath(): string {
    return this.yamlPath;
  }

  /**
   * Check if personas.yml file exists
   * @returns boolean True if file exists
   */
  personasFileExists(): boolean {
    return fs.existsSync(this.yamlPath);
  }

  /**
   * Create default personas.yml file
   * @private
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
   * Clean up old backup files (keep last 5)
   * @private
   */
  private cleanupBackups(): void {
    try {
      const backupPattern = path.basename(this.yamlPath) + '.backup.';
      const dir = path.dirname(this.yamlPath);
      const files = fs.readdirSync(dir);

      const backupFiles = files
        .filter(f => f.startsWith(backupPattern))
        .map(f => ({
          name: f,
          path: path.join(dir, f),
          time: parseInt(f.split('.').pop() || '0'),
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only the 5 most recent backups
      for (const backup of backupFiles.slice(5)) {
        fs.unlinkSync(backup.path);
        logger.debug(`🗑️ Cleaned up old backup: ${backup.name}`);
      }
    } catch (error) {
      logger.warn('⚠️ Failed to cleanup backup files', error);
    }
  }
}
