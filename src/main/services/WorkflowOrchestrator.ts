/**
 * Workflow Orchestrator
 * Connects Interview Folder Watcher with LangGraph Service and handles IPC events
 * Phase 1, Feature 3.4 - Emit "TranscriptIngested" IPC event to the Tray process
 */

import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { Logger } from '@main/utils/logger';
import {
  InterviewFolderWatcher,
  type TranscriptFileEvent,
} from './InterviewFolderWatcher';
import {
  LangGraphService,
  type ProcessingResult,
  type PersonaClassification,
} from './LangGraphService';
import { PersonaConfigLoader } from './PersonaConfigLoader';
import type { IPCEvents } from '@shared/types';

const logger = new Logger('workflow-orchestrator');

export class WorkflowOrchestrator extends EventEmitter {
  private interviewWatcher: InterviewFolderWatcher;
  private langGraphService: LangGraphService;
  private personaConfigLoader: PersonaConfigLoader;
  private mainWindow: BrowserWindow | null = null;
  private isRunning = false;

  constructor() {
    super();
    this.interviewWatcher = new InterviewFolderWatcher();
    this.langGraphService = new LangGraphService();
    this.personaConfigLoader = new PersonaConfigLoader();

    this.setupEventHandlers();
  }

  /**
   * Initialize the workflow orchestrator
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Workflow Orchestrator...');

    try {
      // Step 1: Load personas configuration
      await this.personaConfigLoader.loadPersonas();
      logger.info('✅ Personas loaded');

      // Step 2: Initialize LangGraph service
      await this.langGraphService.initialize();
      logger.info('✅ LangGraph service initialized');

      // Step 3: Start interview folder watcher
      this.interviewWatcher.startWatching();
      logger.info('✅ Interview folder watcher started');

      this.isRunning = true;
      logger.info('🎯 Workflow Orchestrator ready for transcript processing');

      this.emit('ready');
    } catch (error) {
      logger.error('❌ Failed to initialize Workflow Orchestrator', error);
      throw error;
    }
  }

  /**
   * Set the main window for IPC communication
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    logger.debug('🪟 Main window set for IPC communication');
  }

  /**
   * Setup event handlers for interview processing pipeline
   */
  private setupEventHandlers(): void {
    // Interview file added
    this.interviewWatcher.on(
      'transcript-added',
      async (transcriptEvent: TranscriptFileEvent) => {
        logger.info(
          '📄 New transcript detected, starting processing pipeline',
          {
            fileName: transcriptEvent.fileName,
          }
        );

        await this.processTranscript(transcriptEvent, 'added');
      }
    );

    // Interview file updated
    this.interviewWatcher.on(
      'transcript-updated',
      async (transcriptEvent: TranscriptFileEvent) => {
        logger.info('📝 Updated transcript detected, reprocessing', {
          fileName: transcriptEvent.fileName,
        });

        await this.processTranscript(transcriptEvent, 'updated');
      }
    );

    // Interview file manually processed
    this.interviewWatcher.on(
      'transcript-manual',
      async (transcriptEvent: TranscriptFileEvent) => {
        logger.info('🔧 Manual transcript processing requested', {
          fileName: transcriptEvent.fileName,
        });

        await this.processTranscript(transcriptEvent, 'manual');
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
   * Process a transcript through the LangGraph pipeline
   */
  private async processTranscript(
    transcriptEvent: TranscriptFileEvent,
    triggerType: 'added' | 'updated' | 'manual'
  ): Promise<void> {
    logger.info(
      `🔄 Processing transcript: ${transcriptEvent.fileName} (${triggerType})`
    );

    try {
      // Check if LangGraph service is ready
      if (!this.langGraphService.isReady()) {
        logger.warn('⚠️ LangGraph service not ready, skipping processing');
        return;
      }

      // Process through LangGraph pipeline
      const result: ProcessingResult =
        await this.langGraphService.processTranscript(transcriptEvent);

      if (result.processed) {
        logger.info('✅ Transcript processed successfully', {
          fileName: transcriptEvent.fileName,
          evidenceId: result.evidenceId,
          personaClassifications: result.personaClassifications.length,
          embeddings: result.embeddings.length,
        });

        // Find the best persona classification for the IPC event
        let bestClassification: PersonaClassification | null = null;
        if (result.personaClassifications.length > 0) {
          bestClassification = result.personaClassifications.reduce(
            (best, current) => {
              return current.confidence > best.confidence ? current : best;
            }
          );
        }

        if (bestClassification) {
          // Emit IPC event to renderer process (Feature 3.4)
          this.emitToRenderer('transcript-ingested', {
            evidenceId: result.evidenceId,
            personaId: bestClassification.personaId,
            content: transcriptEvent.content.substring(0, 500) + '...', // Truncated for IPC
          });

          logger.info('📡 IPC event emitted to renderer', {
            evidenceId: result.evidenceId,
            personaId: bestClassification.personaId,
          });
        }

        this.emit('transcript-processed', {
          transcriptEvent,
          result,
          triggerType,
        });
      } else {
        logger.error('❌ Transcript processing failed', {
          fileName: transcriptEvent.fileName,
          error: result.error,
        });

        this.emitToRenderer('error', {
          message: `Failed to process transcript: ${transcriptEvent.fileName}`,
          details: result.error,
        });
      }
    } catch (error) {
      logger.error('❌ Unexpected error during transcript processing', error);

      this.emitToRenderer('error', {
        message: `Unexpected error processing transcript: ${transcriptEvent.fileName}`,
        details: error,
      });
    }
  }

  /**
   * Emit IPC event to renderer process
   */
  private emitToRenderer<T extends keyof IPCEvents>(
    eventType: T,
    data: IPCEvents[T]
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(eventType, data);
      logger.debug(`📡 IPC event sent: ${eventType}`);
    } else {
      logger.warn('⚠️ No main window available for IPC communication');
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
    personasLoaded: boolean;
    interviewsDirectory: string;
    existingTranscripts: number;
  } {
    return {
      running: this.isRunning,
      watcherActive: this.interviewWatcher.isCurrentlyWatching(),
      langGraphReady: this.langGraphService.isReady(),
      personasLoaded: this.personaConfigLoader.isPersonasLoaded(),
      interviewsDirectory: this.interviewWatcher.getInterviewsDirectory(),
      existingTranscripts:
        this.interviewWatcher.getExistingTranscripts().length,
    };
  }

  /**
   * Stop the workflow orchestrator
   */
  async stop(): Promise<void> {
    logger.info('🛑 Stopping Workflow Orchestrator...');

    try {
      // Stop interview folder watcher
      await this.interviewWatcher.stopWatching();

      this.isRunning = false;
      logger.info('✅ Workflow Orchestrator stopped');

      this.emit('stopped');
    } catch (error) {
      logger.error('❌ Error stopping Workflow Orchestrator', error);
      throw error;
    }
  }

  /**
   * Check if orchestrator is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
