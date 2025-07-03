/**
 * PersonaEvolutionService - Orchestrates automatic persona evolution
 * Phase 2.7: Automatic Persona Evolution
 *
 * Manages the complete persona evolution pipeline:
 * - Analyzes transcript content for persona changes
 * - Decides whether to update existing personas or create new ones
 * - Records all changes in persona history
 * - Triggers UI updates and evidence score recalculation
 */

import { Logger } from '@main/utils/logger';
import { DeltaAnalyzer, EVOLUTION_CONFIG } from './DeltaAnalyzer';
import { PersonaHistoryRepo } from '@main/db/repositories/PersonaHistoryRepo';
import { PersonaRepo } from '@main/db/repositories/PersonaRepo';
import { EvidenceRepo } from '@main/db/repositories/EvidenceRepo';
import { PersonaManagerService } from './PersonaManagerService';
import { ActivityLogService } from './ActivityLogService';
import type { Persona } from '@shared/types';
import type { DeltaResult, ExtractedPhrases } from './DeltaAnalyzer';
import type { TranscriptIngestResult } from './TranscriptIngestService';

const logger = new Logger('persona-evolution-service');

export interface EvolutionOutcome {
  success: boolean;
  personasUpdated: string[];
  personasCreated: string[];
  changesDetected: DeltaResult[];
  totalChanges: number;
  error?: string;
  processingTime: number;
}

export interface PersonaEvolutionConfig {
  enableEvolution: boolean;
  deltaThreshold: number;
  newPersonaThreshold: number;
  maxPersonas: number;
  requireManualApproval: boolean;
}

export class PersonaEvolutionService {
  private deltaAnalyzer: DeltaAnalyzer;
  private personaHistoryRepo: PersonaHistoryRepo;
  private personaRepo: PersonaRepo;
  private evidenceRepo: EvidenceRepo;
  private personaManagerService: PersonaManagerService;
  private activityLogService: ActivityLogService;
  private isInitialized = false;

  // Default configuration
  private config: PersonaEvolutionConfig = {
    enableEvolution: true,
    deltaThreshold: EVOLUTION_CONFIG.deltaThreshold,
    newPersonaThreshold: EVOLUTION_CONFIG.newPersonaThreshold,
    maxPersonas: 10, // Reasonable limit for persona count
    requireManualApproval: false, // For MVP, auto-apply changes
  };

  constructor(
    personaManagerService: PersonaManagerService,
    activityLogService: ActivityLogService
  ) {
    this.deltaAnalyzer = new DeltaAnalyzer();
    this.personaHistoryRepo = new PersonaHistoryRepo();
    this.personaRepo = new PersonaRepo();
    this.evidenceRepo = new EvidenceRepo();
    this.personaManagerService = personaManagerService;
    this.activityLogService = activityLogService;

    logger.debug('🧬 PersonaEvolutionService initialized');
  }

  /**
   * Initialize the persona evolution service
   */
  async initialize(config?: Partial<PersonaEvolutionConfig>): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('🔧 Initializing PersonaEvolutionService...');

    try {
      // Apply custom configuration if provided
      if (config) {
        this.config = { ...this.config, ...config };
      }

      logger.info('✅ PersonaEvolutionService initialized successfully', {
        config: this.config,
      });

      this.isInitialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize PersonaEvolutionService', error);
      throw error;
    }
  }

  /**
   * Main entry point: Evolve personas based on transcript processing results
   * @param transcriptResult Results from transcript processing
   * @returns Promise<EvolutionOutcome> Summary of evolution changes
   */
  async evolveFromTranscript(
    transcriptResult: TranscriptIngestResult
  ): Promise<EvolutionOutcome> {
    const startTime = Date.now();

    logger.info('🧬 Starting persona evolution from transcript', {
      fileName: transcriptResult.transcriptFileName,
      evidenceCreated: transcriptResult.evidenceCreated.length,
      personasAffected: transcriptResult.personasAffected.length,
    });

    // Check if evolution is enabled
    if (!this.config.enableEvolution) {
      logger.info('⏸️ Persona evolution disabled by configuration');
      return this.createEmptyOutcome(
        startTime,
        'Evolution disabled by configuration'
      );
    }

    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get the transcript content for analysis
      // For MVP, we'll analyze the evidence content that was created
      const transcriptContent = await this.getTranscriptContentFromEvidence(
        transcriptResult.evidenceCreated
      );

      if (
        !transcriptContent ||
        transcriptContent.length < EVOLUTION_CONFIG.minContentLength
      ) {
        logger.warn(
          '⚠️ Insufficient transcript content for persona evolution',
          {
            contentLength: transcriptContent?.length || 0,
            minRequired: EVOLUTION_CONFIG.minContentLength,
          }
        );
        return this.createEmptyOutcome(
          startTime,
          'Insufficient content for analysis'
        );
      }

      // Step 1: Extract key phrases from transcript content
      const extractedPhrases =
        await this.deltaAnalyzer.extractKeyPhrases(transcriptContent);

      logger.debug('📊 Key phrases extracted for persona evolution', {
        goals: extractedPhrases.goals.length,
        painPoints: extractedPhrases.painPoints.length,
        terminology: extractedPhrases.terminology.length,
        confidence: extractedPhrases.confidence,
      });

      // Step 2: Get existing personas for comparison
      const existingPersonas = await this.personaRepo.list();

      if (existingPersonas.length === 0) {
        logger.warn('⚠️ No existing personas found for evolution analysis');
        return this.createEmptyOutcome(
          startTime,
          'No existing personas for comparison'
        );
      }

      // Step 3: Analyze changes for each persona
      const deltaResults: DeltaResult[] = [];
      for (const persona of existingPersonas) {
        const deltaResult = this.deltaAnalyzer.computeDiff(
          persona,
          extractedPhrases
        );
        deltaResults.push(deltaResult);

        logger.debug('🔍 Persona delta computed', {
          personaId: persona.id,
          personaName: persona.name,
          confidence: deltaResult.confidence,
          isSignificant: deltaResult.isSignificant,
        });
      }

      // Step 4: Apply evolution decisions
      const evolutionResult = await this.applyEvolutionDecisions(
        deltaResults,
        extractedPhrases,
        transcriptResult
      );

      const processingTime = Date.now() - startTime;

      logger.info('✅ Persona evolution completed', {
        ...evolutionResult,
        processingTime,
      });

      return {
        ...evolutionResult,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('❌ Persona evolution failed', {
        error: error instanceof Error ? error.message : String(error),
        processingTime,
      });

      return {
        success: false,
        personasUpdated: [],
        personasCreated: [],
        changesDetected: [],
        totalChanges: 0,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
      };
    }
  }

  /**
   * Apply evolution decisions based on delta analysis results
   * @private
   */
  private async applyEvolutionDecisions(
    deltaResults: DeltaResult[],
    extractedPhrases: ExtractedPhrases,
    transcriptResult: TranscriptIngestResult
  ): Promise<Omit<EvolutionOutcome, 'processingTime'>> {
    const personasUpdated: string[] = [];
    const personasCreated: string[] = [];
    const significantChanges = deltaResults.filter(d => d.isSignificant);

    logger.info('🎯 Applying persona evolution decisions', {
      totalAnalyzed: deltaResults.length,
      significantChanges: significantChanges.length,
      deltaThreshold: this.config.deltaThreshold,
      newPersonaThreshold: this.config.newPersonaThreshold,
    });

    try {
      // Step 1: Update existing personas with significant changes
      for (const deltaResult of significantChanges) {
        if (deltaResult.confidence >= this.config.deltaThreshold) {
          const updateSuccess = await this.updateExistingPersona(
            deltaResult,
            extractedPhrases
          );
          if (updateSuccess) {
            personasUpdated.push(deltaResult.personaId);
          }
        }
      }

      // Step 2: Consider creating new persona if confidence is very high
      if (extractedPhrases.confidence >= this.config.newPersonaThreshold) {
        const createSuccess = await this.considerNewPersona(
          extractedPhrases,
          transcriptResult
        );
        if (createSuccess) {
          personasCreated.push(`new-persona-${Date.now()}`);
        }
      }

      // Step 3: Reload personas if any changes were made
      if (personasUpdated.length > 0 || personasCreated.length > 0) {
        await this.reloadPersonasAndScores(
          personasUpdated.concat(personasCreated)
        );
      }

      // Step 4: Log evolution activity
      await this.logEvolutionActivity({
        transcriptResult,
        personasUpdated,
        personasCreated,
        significantChanges,
      });

      return {
        success: true,
        personasUpdated,
        personasCreated,
        changesDetected: deltaResults,
        totalChanges: personasUpdated.length + personasCreated.length,
      };
    } catch (error) {
      logger.error('❌ Failed to apply evolution decisions', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        personasUpdated,
        personasCreated,
        changesDetected: deltaResults,
        totalChanges: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update an existing persona based on delta results
   * @private
   */
  private async updateExistingPersona(
    deltaResult: DeltaResult,
    extractedPhrases: ExtractedPhrases
  ): Promise<boolean> {
    logger.info('📝 Updating existing persona', {
      personaId: deltaResult.personaId,
      confidence: deltaResult.confidence,
    });

    try {
      // Get current persona
      const currentPersona = await this.personaRepo.findById(
        deltaResult.personaId
      );
      if (!currentPersona) {
        logger.error('❌ Persona not found for update', {
          personaId: deltaResult.personaId,
        });
        return false;
      }

      // Create updated persona data
      const updatedData = this.mergePersonaChanges(
        currentPersona,
        deltaResult,
        extractedPhrases
      );

      // Record history before updating
      await this.personaHistoryRepo.create({
        personaId: deltaResult.personaId,
        previousData: JSON.stringify(currentPersona),
        newData: JSON.stringify(updatedData),
        changeType: 'update',
        confidence: deltaResult.confidence,
        timestamp: Date.now(),
      });

      // Update persona in database
      await this.personaRepo.update(deltaResult.personaId, updatedData);

      logger.info('✅ Persona updated successfully', {
        personaId: deltaResult.personaId,
        changes: {
          goalAdditions: deltaResult.changes.goalChanges.additions.length,
          painPointAdditions:
            deltaResult.changes.painPointChanges.additions.length,
          terminologyAdditions:
            deltaResult.changes.terminologyChanges.additions.length,
        },
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to update persona', {
        personaId: deltaResult.personaId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Consider creating a new persona based on extracted phrases
   * @private
   */
  private async considerNewPersona(
    extractedPhrases: ExtractedPhrases,
    transcriptResult: TranscriptIngestResult
  ): Promise<boolean> {
    logger.info('🆕 Considering new persona creation', {
      confidence: extractedPhrases.confidence,
      threshold: this.config.newPersonaThreshold,
    });

    try {
      // Check if we're at the persona limit
      const existingPersonas = await this.personaRepo.list();
      if (existingPersonas.length >= this.config.maxPersonas) {
        logger.warn(
          '⚠️ Maximum persona limit reached, skipping new persona creation',
          {
            existingCount: existingPersonas.length,
            maxAllowed: this.config.maxPersonas,
          }
        );
        return false;
      }

      // For MVP, we'll log the opportunity but not auto-create
      // This requires more sophisticated analysis to determine if it's truly a new persona
      logger.info(
        '💡 New persona opportunity detected (manual review recommended)',
        {
          confidence: extractedPhrases.confidence,
          goals: extractedPhrases.goals,
          painPoints: extractedPhrases.painPoints,
          terminology: extractedPhrases.terminology,
          transcriptFile: transcriptResult.transcriptFileName,
        }
      );

      // TODO: Implement sophisticated new persona detection logic
      // For now, return false to avoid creating unnecessary personas
      return false;
    } catch (error) {
      logger.error('❌ Failed to consider new persona creation', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Merge persona changes with existing persona data
   * @private
   */
  private mergePersonaChanges(
    currentPersona: Persona,
    deltaResult: DeltaResult,
    _extractedPhrases: ExtractedPhrases
  ): Partial<Persona> {
    const changes = deltaResult.changes;

    // Merge new keywords with existing ones
    const mergedKeywords = [
      ...currentPersona.keywords,
      ...changes.terminologyChanges.additions,
    ];

    // Remove duplicates and limit to max keywords
    const uniqueKeywords = Array.from(new Set(mergedKeywords)).slice(
      0,
      EVOLUTION_CONFIG.maxKeywords
    );

    // For MVP, keep the primary goal and main pain point unchanged
    // In a full implementation, we might update these based on goal/pain changes

    return {
      keywords: uniqueKeywords,
      updatedAt: new Date(),
    };
  }

  /**
   * Reload personas and trigger evidence score recalculation
   * @private
   */
  private async reloadPersonasAndScores(
    affectedPersonaIds: string[]
  ): Promise<void> {
    logger.info('🔄 Reloading personas and recalculating evidence scores', {
      affectedPersonas: affectedPersonaIds.length,
    });

    try {
      // Reload personas through PersonaManagerService (triggers hot-reload)
      const reloadResult = await this.personaManagerService.reload();

      if (!reloadResult.success) {
        logger.error('❌ Failed to reload personas after evolution', {
          error: reloadResult.error,
        });
      } else {
        logger.info('✅ Personas reloaded successfully after evolution', {
          personaCount: reloadResult.personas?.length || 0,
        });
      }
    } catch (error) {
      logger.error('❌ Failed to reload personas and scores', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Log persona evolution activity
   * @private
   */
  private async logEvolutionActivity(params: {
    transcriptResult: TranscriptIngestResult;
    personasUpdated: string[];
    personasCreated: string[];
    significantChanges: DeltaResult[];
  }): Promise<void> {
    try {
      // Log persona evolution activity using generic logging method
      await this.activityLogService.logActivity({
        type: 'general-activity',
        title: 'Persona Evolution Completed',
        description: `Analyzed transcript "${params.transcriptResult.transcriptFileName}" and evolved ${params.personasUpdated.length} personas`,
        source: 'transcript-import',
        timestamp: new Date(),
        metadata: {
          transcriptFileName: params.transcriptResult.transcriptFileName,
          personasUpdated: params.personasUpdated.length,
          personasCreated: params.personasCreated.length,
          changesDetected: params.significantChanges.length,
          updatedPersonaIds: params.personasUpdated,
          createdPersonaIds: params.personasCreated,
        },
      });
    } catch (error) {
      logger.error('❌ Failed to log evolution activity', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get transcript content from evidence IDs
   * @private
   */
  private async getTranscriptContentFromEvidence(
    evidenceIds: string[]
  ): Promise<string> {
    try {
      // Get evidence content for analysis
      const contents: string[] = [];

      for (const evidenceId of evidenceIds.slice(0, 10)) {
        // Limit to first 10 for performance
        try {
          const evidence = await this.evidenceRepo.findById(evidenceId);
          if (evidence && evidence.content) {
            contents.push(evidence.content);
          }
        } catch (error) {
          logger.warn('⚠️ Failed to get evidence content', {
            evidenceId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const combinedContent = contents.join('\n\n');

      logger.debug('📝 Combined transcript content for analysis', {
        evidenceCount: contents.length,
        totalLength: combinedContent.length,
      });

      return combinedContent;
    } catch (error) {
      logger.error('❌ Failed to get transcript content from evidence', {
        evidenceIds,
        error: error instanceof Error ? error.message : String(error),
      });
      return '';
    }
  }

  /**
   * Create empty evolution outcome for early returns
   * @private
   */
  private createEmptyOutcome(
    startTime: number,
    reason: string
  ): EvolutionOutcome {
    return {
      success: true,
      personasUpdated: [],
      personasCreated: [],
      changesDetected: [],
      totalChanges: 0,
      error: reason,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Get service configuration
   */
  getConfig(): PersonaEvolutionConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<PersonaEvolutionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('🔧 PersonaEvolutionService configuration updated', {
      config: this.config,
    });
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    config: PersonaEvolutionConfig;
    stats?: {
      evolutionsProcessed: number;
      personasUpdated: number;
      personasCreated: number;
    };
  } {
    return {
      initialized: this.isInitialized,
      config: this.config,
      // TODO: Add evolution statistics from persona history
    };
  }
}
