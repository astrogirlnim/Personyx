/**
 * Workflow Orchestrator
 * Connects Interview Folder Watcher with LangGraph Service and TranscriptIngestService
 * Phase 1, Feature 3.4 - Emit "TranscriptIngested" IPC event to the Tray process
 * Phase 2, Feature 6 - Complete interview evidence generation pipeline
 */

import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { Logger } from '@main/utils/logger';
import {
  InterviewFolderWatcher,
  type TranscriptFileEvent,
} from './InterviewFolderWatcher';
import { LangGraphService } from './LangGraphService';
import { TranscriptIngestService } from './TranscriptIngestService';
import { PersonaConfigLoader } from './PersonaConfigLoader';
import type { TranscriptIngestResult } from './TranscriptIngestService';
import type { IPCEvents } from '@shared/types';

const logger = new Logger('workflow-orchestrator');

/**
 * Result type for manual transcript processing
 */
export interface TranscriptProcessingResult {
  success: boolean;
  result?: {
    fileName: string;
    contentLength: number;
    timestamp: Date;
    evidenceCreated?: string[];
    personasAffected?: string[];
    processingTime?: number;
    evidenceCountByPersona?: Record<string, number>;
  };
  error?: string;
}

export class WorkflowOrchestrator extends EventEmitter {
  private interviewWatcher: InterviewFolderWatcher;
  private langGraphService: LangGraphService;
  private transcriptIngestService: TranscriptIngestService;
  private personaConfigLoader: PersonaConfigLoader;
  private mainWindow: BrowserWindow | null = null;
  private isRunning = false;

  constructor() {
    super();
    this.interviewWatcher = new InterviewFolderWatcher();
    this.langGraphService = new LangGraphService();
    this.transcriptIngestService = new TranscriptIngestService();
    this.personaConfigLoader = new PersonaConfigLoader();

    this.setupEventHandlers();
  }

  /**
   * Set the main window for IPC communication
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    this.transcriptIngestService = new TranscriptIngestService(window); // Update with window reference
    logger.debug('📢 Main window set for IPC communication');
  }

  /**
   * Start the workflow orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠️ Workflow orchestrator already running');
      return;
    }

    logger.info('🚀 Starting workflow orchestrator');

    try {
      // Initialize services
      await this.personaConfigLoader.loadPersonas();
      await this.langGraphService.initialize();

      // Start watching for interview files
      this.interviewWatcher.startWatching();

      this.isRunning = true;
      logger.info('✅ Workflow orchestrator started successfully');

      this.emitToRenderer('app-ready', {});
    } catch (error) {
      logger.error('❌ Failed to start workflow orchestrator', error);
      throw error;
    }
  }

  /**
   * Stop the workflow orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('⚠️ Workflow orchestrator not running');
      return;
    }

    logger.info('🛑 Stopping workflow orchestrator');

    try {
      await this.interviewWatcher.stopWatching();
      this.isRunning = false;
      logger.info('✅ Workflow orchestrator stopped successfully');
    } catch (error) {
      logger.error('❌ Error stopping workflow orchestrator', error);
      throw error;
    }
  }

  /**
   * Setup event handlers for interview processing pipeline
   */
  private setupEventHandlers(): void {
    // Feature 6.1: Interview file added - use new TranscriptIngestService
    this.interviewWatcher.on(
      'transcript-added',
      async (transcriptEvent: TranscriptFileEvent) => {
        logger.info(
          '📄 New transcript detected, starting evidence generation pipeline',
          {
            fileName: transcriptEvent.fileName,
          }
        );

        await this.processTranscriptWithIngestService(transcriptEvent, 'added');
      }
    );

    // Interview file updated - use new TranscriptIngestService
    this.interviewWatcher.on(
      'transcript-updated',
      async (transcriptEvent: TranscriptFileEvent) => {
        logger.info('📝 Updated transcript detected, regenerating evidence', {
          fileName: transcriptEvent.fileName,
        });

        await this.processTranscriptWithIngestService(
          transcriptEvent,
          'updated'
        );
      }
    );

    // Interview file manually processed - use new TranscriptIngestService
    this.interviewWatcher.on(
      'transcript-manual',
      async (transcriptEvent: TranscriptFileEvent) => {
        logger.info('🔧 Manual transcript processing requested', {
          fileName: transcriptEvent.fileName,
        });

        await this.processTranscriptWithIngestService(
          transcriptEvent,
          'manual'
        );
      }
    );

    // File processing errors
    this.interviewWatcher.on(
      'file-error',
      (data: { filePath: string; error: unknown }) => {
        logger.error('❌ File processing error', data);
        this.emitToRenderer('error', {
          message: `Failed to process interview file: ${data.filePath}`,
          details: data.error,
        });
      }
    );

    // Interview watcher errors
    this.interviewWatcher.on('error', (error: Error) => {
      logger.error('❌ Interview folder watcher error', error);
      this.emitToRenderer('error', {
        message: 'Interview folder watcher encountered an error',
        details: error,
      });
    });

    // Interview watcher ready
    this.interviewWatcher.on('ready', () => {
      logger.info('✅ Interview folder watcher is ready');
    });
  }

  /**
   * Feature 6: Process transcript using the new TranscriptIngestService
   * This replaces the legacy LangGraphService processing with the complete evidence generation pipeline
   */
  private async processTranscriptWithIngestService(
    transcriptEvent: TranscriptFileEvent,
    trigger: 'added' | 'updated' | 'manual'
  ): Promise<void> {
    try {
      logger.info('🎤 Starting transcript evidence generation', {
        fileName: transcriptEvent.fileName,
        trigger,
        contentLength: transcriptEvent.content.length,
      });

      // Process transcript through the complete pipeline
      const result =
        await this.transcriptIngestService.processTranscript(transcriptEvent);

      logger.info('✅ Transcript evidence generation completed', {
        fileName: result.transcriptFileName,
        evidenceCreated: result.evidenceCreated.length,
        personasAffected: result.personasAffected.length,
        processingTime: result.processingTime,
        successRate: `${result.processedChunks}/${result.totalChunks}`,
      });

      // Emit completion event to renderer
      this.emitToRenderer('transcript-ingested', {
        evidenceId: result.evidenceCreated[0] || '', // Use first evidence ID
        personaId: result.personasAffected[0] || '', // Use first persona ID
        content: `Generated ${result.evidenceCreated.length} evidence items from ${result.transcriptFileName}`,
      });

      // Phase 3.1.7: Emit success toast event for transcript analysis completion
      this.emitToRenderer('transcript-success-toast', {
        type: 'transcript-success' as const,
        title: 'Transcript Analysed',
        message: `Evidence added • ${result.evidenceCreated.length} items • ${result.personasAffected.length} personas affected`,
        fileName: result.transcriptFileName,
        evidenceCount: result.evidenceCreated.length,
        personasAffected: result.personasAffected,
        processingTime: result.processingTime,
        timestamp: new Date(),
        dismissible: true,
        autoDismissMs: 6000, // 6 seconds for transcript success
      });

      // Success message
      this.emit('transcript-processed', {
        fileName: transcriptEvent.fileName,
        result,
        trigger,
      });
    } catch (error) {
      logger.error('❌ Transcript evidence generation failed', {
        fileName: transcriptEvent.fileName,
        trigger,
        error: error instanceof Error ? error.message : String(error),
      });

      this.emitToRenderer('error', {
        message: `Failed to generate evidence from transcript: ${transcriptEvent.fileName}`,
        details: error,
      });

      this.emit('transcript-error', {
        fileName: transcriptEvent.fileName,
        error,
        trigger,
      });
    }
  }

  /**
   * Helper method to emit IPC events to renderer
   */
  private emitToRenderer<T extends keyof IPCEvents>(
    event: T,
    data: IPCEvents[T]
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);
      logger.debug(`📢 Emitted IPC event: ${event}`);
    } else {
      logger.warn(`⚠️ Cannot emit ${event} - main window not available`);
    }
  }

  /**
   * Manually trigger processing of an existing transcript file
   */
  async processExistingTranscript(fileName: string): Promise<boolean> {
    logger.info('🔧 Manual transcript processing requested', { fileName });

    try {
      const result = await this.interviewWatcher.processExistingFile(fileName);
      return result !== null;
    } catch (error) {
      logger.error('❌ Failed to manually process transcript', error);
      return false;
    }
  }

  /**
   * Manually process a transcript file or content for Phase 3.1.5
   * This method handles both file paths and content strings
   */
  async processTranscriptManual(
    filePathOrContent: string
  ): Promise<TranscriptProcessingResult> {
    logger.info('🔧 Manual transcript processing requested via IPC', {
      inputType: typeof filePathOrContent,
      inputLength: filePathOrContent.length,
      isLikelyPath:
        !filePathOrContent.includes('\n') && filePathOrContent.length <= 500,
    });

    try {
      let transcriptEvent: TranscriptFileEvent;

      // Check if the input is a file path or file content
      if (filePathOrContent.includes('\n') || filePathOrContent.length > 500) {
        // Likely file content, create a TranscriptFileEvent from content
        logger.info('📝 Processing content as transcript text');

        const { writeFileSync, mkdtempSync } = await import('fs');
        const { join } = await import('path');
        const { tmpdir } = await import('os');

        // Create a temporary file for the content
        const tempDir = mkdtempSync(join(tmpdir(), 'personyx-transcript-'));
        const tempFileName = `manual_transcript_${Date.now()}.md`;
        const tempFilePath = join(tempDir, tempFileName);

        writeFileSync(tempFilePath, filePathOrContent, 'utf8');

        transcriptEvent = {
          filePath: tempFilePath,
          fileName: tempFileName,
          content: filePathOrContent,
          fileSize: Buffer.byteLength(filePathOrContent, 'utf8'),
          timestamp: new Date(),
          sourceType: 'interview',
        };

        logger.info('🗂️ Created temporary transcript event from content', {
          fileName: tempFileName,
          contentLength: filePathOrContent.length,
        });
      } else {
        // Assume it's a file path, create TranscriptFileEvent from file
        logger.info('📂 Processing as file path');

        const { readFileSync, statSync } = await import('fs');
        const { basename } = await import('path');

        const content = readFileSync(filePathOrContent, 'utf8');
        const stats = statSync(filePathOrContent);

        transcriptEvent = {
          filePath: filePathOrContent,
          fileName: basename(filePathOrContent),
          content: content.trim(),
          fileSize: stats.size,
          timestamp: new Date(),
          sourceType: 'interview',
        };

        logger.info('🗂️ Created transcript event from file path', {
          fileName: transcriptEvent.fileName,
          contentLength: content.length,
        });
      }

      // Phase 3.1.8: Process transcript and capture detailed results
      // Process transcript through the complete pipeline
      const ingestResult =
        await this.transcriptIngestService.processTranscript(transcriptEvent);

      // Calculate evidence counts by persona
      logger.info('🔢 About to calculate evidence counts by persona', {
        evidenceCreated: ingestResult.evidenceCreated.length,
        personasAffected: ingestResult.personasAffected.length,
      });

      const evidenceCountByPersona =
        await this.calculateEvidenceCountsByPersona(ingestResult);

      logger.info('✅ Manual transcript processing completed successfully', {
        fileName: transcriptEvent.fileName,
        evidenceCreated: ingestResult.evidenceCreated.length,
        personasAffected: ingestResult.personasAffected.length,
        evidenceCountByPersona,
        processingTime: ingestResult.processingTime,
      });

      // Phase 3.1.7 + 3.1.8: Emit success toast event for enhanced transcript processing
      logger.info(
        '🎉 Emitting success toast for enhanced transcript processing'
      );
      this.emitToRenderer('transcript-success-toast', {
        type: 'transcript-success' as const,
        title: 'Transcript Analysed',
        message: `Evidence added • ${ingestResult.evidenceCreated.length} items • ${ingestResult.personasAffected.length} personas affected`,
        fileName: ingestResult.transcriptFileName,
        evidenceCount: ingestResult.evidenceCreated.length,
        personasAffected: ingestResult.personasAffected,
        processingTime: ingestResult.processingTime,
        timestamp: new Date(),
        dismissible: true,
        autoDismissMs: 6000, // 6 seconds for transcript success
      });

      return {
        success: true,
        result: {
          fileName: transcriptEvent.fileName,
          contentLength: transcriptEvent.content.length,
          timestamp: transcriptEvent.timestamp,
          evidenceCreated: ingestResult.evidenceCreated,
          personasAffected: ingestResult.personasAffected,
          processingTime: ingestResult.processingTime,
          evidenceCountByPersona,
        },
      };
    } catch (error) {
      logger.error('❌ Manual transcript processing failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Phase 3.1.8: Calculate evidence counts by persona
   * Updated to get persona counts directly from TranscriptIngestResult to avoid timing issues
   */
  private async calculateEvidenceCountsByPersona(
    ingestResult: TranscriptIngestResult
  ): Promise<Record<string, number>> {
    try {
      logger.debug(
        '🔢 Calculating evidence counts by persona from ingest result',
        {
          evidenceCreated: ingestResult.evidenceCreated.length,
          personasAffected: ingestResult.personasAffected.length,
        }
      );

      const evidenceCountByPersona: Record<string, number> = {};

      // Initialize counts for all affected personas
      for (const personaId of ingestResult.personasAffected) {
        evidenceCountByPersona[personaId] = 0;
      }

      // Get the evidence-to-persona mapping from TranscriptIngestService
      // Since evidence creation might still be in progress, we'll wait a short time
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

      // Import the EvidenceRepo to query evidence
      const { EvidenceRepo } = await import(
        '@main/db/repositories/EvidenceRepo'
      );
      const evidenceRepo = new EvidenceRepo();

      // Count evidence for each persona with retry logic
      for (const evidenceId of ingestResult.evidenceCreated) {
        let evidence = null;
        let retries = 3;

        while (retries > 0 && !evidence) {
          try {
            evidence = await evidenceRepo.findById(evidenceId);
            if (!evidence) {
              logger.debug('⏳ Evidence not found, retrying...', {
                evidenceId,
                retries,
              });
              await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
              retries--;
            }
          } catch (error) {
            logger.warn(
              '⚠️ Failed to fetch evidence for counting, retrying...',
              {
                evidenceId,
                retries,
                error: error instanceof Error ? error.message : String(error),
              }
            );
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
            }
          }
        }

        if (evidence && evidence.personaId) {
          evidenceCountByPersona[evidence.personaId] =
            (evidenceCountByPersona[evidence.personaId] || 0) + 1;
        } else {
          logger.warn('⚠️ Could not find evidence after retries', {
            evidenceId,
          });
        }
      }

      logger.info(
        '✅ Evidence counts calculated successfully',
        evidenceCountByPersona
      );
      return evidenceCountByPersona;
    } catch (error) {
      logger.error('❌ Failed to calculate evidence counts by persona', error);
      // Return empty counts as fallback
      const fallbackCounts: Record<string, number> = {};
      for (const personaId of ingestResult.personasAffected || []) {
        fallbackCounts[personaId] = 0;
      }
      return fallbackCounts;
    }
  }

  /**
   * Get list of existing transcript files
   */
  getExistingTranscripts(): string[] {
    return this.interviewWatcher.getExistingTranscripts();
  }

  /**
   * Get interviews directory path
   */
  getInterviewsDirectory(): string {
    return this.interviewWatcher.getInterviewsDirectory();
  }

  /**
   * Get workflow status
   */
  getStatus(): {
    running: boolean;
    watcherActive: boolean;
    langGraphReady: boolean;
    transcriptIngestReady: boolean;
    personasLoaded: boolean;
    interviewsDirectory: string;
    existingTranscripts: number;
  } {
    return {
      running: this.isRunning,
      watcherActive: this.interviewWatcher.isCurrentlyWatching(),
      langGraphReady: this.langGraphService.isReady(),
      transcriptIngestReady:
        this.transcriptIngestService.getProcessingStats().isReady,
      personasLoaded: this.personaConfigLoader.isPersonasLoaded(),
      interviewsDirectory: this.interviewWatcher.getInterviewsDirectory(),
      existingTranscripts:
        this.interviewWatcher.getExistingTranscripts().length,
    };
  }

  /**
   * Force reload personas from configuration
   */
  async reloadPersonas(): Promise<void> {
    logger.info('🔄 Reloading personas configuration');
    await this.personaConfigLoader.loadPersonas();
    logger.info('✅ Personas reloaded successfully');
  }
}
