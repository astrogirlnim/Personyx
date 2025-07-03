/**
 * Transcript Ingest Service
 * Handles interview transcript processing and evidence generation
 * Phase 2, Feature 6: Interview Evidence Generator
 */

import { BrowserWindow } from 'electron';
import { Logger } from '@main/utils/logger';
import { EvidenceRepo } from '@main/db/repositories/EvidenceRepo';
import { EmbeddingRepo } from '@main/db/repositories/EmbeddingRepo';
import { PersonaRepo } from '@main/db/repositories/PersonaRepo';
import { EvidenceScoreService } from './EvidenceScoreService';
import {
  LangGraphService,
  type PersonaClassification,
} from './LangGraphService';
import { EmbeddingProviderManager } from './EmbeddingProviderManager';
import { PersonaEvolutionService } from './PersonaEvolutionService';
import { PersonaManagerService } from './PersonaManagerService';
import { ActivityLogService } from './ActivityLogService';
import type { Evidence, Persona } from '@shared/types';
import type { TranscriptFileEvent } from './InterviewFolderWatcher';

const logger = new Logger('transcript-ingest-service');

export interface TranscriptChunk {
  content: string;
  chunkIndex: number;
  totalChunks: number;
  wordCount: number;
}

export interface ChunkClassificationResult {
  chunk: TranscriptChunk;
  classification: PersonaClassification;
  embedding: number[];
  confidence: number;
}

export interface TranscriptIngestResult {
  transcriptFileName: string;
  totalChunks: number;
  processedChunks: number;
  evidenceCreated: string[]; // evidence IDs
  personasAffected: string[]; // persona IDs
  processingTime: number; // milliseconds
}

export class TranscriptIngestService {
  private evidenceRepo: EvidenceRepo;
  private embeddingRepo: EmbeddingRepo;
  private personaRepo: PersonaRepo;
  private evidenceScoreService: EvidenceScoreService;
  private langGraphService: LangGraphService;
  private embeddingManager: EmbeddingProviderManager;
  private personaEvolutionService: PersonaEvolutionService | null = null;
  private mainWindow: BrowserWindow | null;
  private isInitialized = false;

  // Processing configuration
  private static readonly CHUNK_CONFIG = {
    maxChunkSize: 1000, // Max characters per chunk
    minChunkSize: 50, // Min characters per chunk
    overlapSize: 100, // Character overlap between chunks
    sentenceBoundary: true, // Prefer sentence boundaries for splits
  };

  private static readonly PROCESSING_CONFIG = {
    minConfidenceThreshold: 0.3, // Minimum confidence to create evidence
    batchSize: 5, // Process chunks in batches
    retryAttempts: 2, // Retry failed classifications
    timeoutMs: 30000, // 30 second timeout per chunk
  };

  constructor(mainWindow: BrowserWindow | null = null) {
    this.evidenceRepo = new EvidenceRepo();
    this.embeddingRepo = new EmbeddingRepo();
    this.personaRepo = new PersonaRepo();
    this.evidenceScoreService = new EvidenceScoreService(mainWindow);
    this.langGraphService = new LangGraphService();
    this.embeddingManager = new EmbeddingProviderManager();
    this.mainWindow = mainWindow;
  }

  /**
   * Initialize the transcript ingest service
   * Sets up embedding providers and language processing
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('🔧 Initializing TranscriptIngestService...');

    try {
      // Initialize LangGraph service for persona classification
      if (!this.langGraphService.isReady()) {
        await this.langGraphService.initialize();
      }

      // Initialize and auto-select the best available embedding provider
      await this.embeddingManager.autoSelectProvider();

      logger.info('✅ Embedding provider configured', {
        activeProvider: this.embeddingManager.getActiveProviderType(),
        availableProviders: this.embeddingManager.getAvailableProviders(),
      });

      this.isInitialized = true;
      logger.info('✅ TranscriptIngestService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize TranscriptIngestService', error);
      throw error;
    }
  }

  /**
   * Feature 6.1: Main entry point for transcript processing
   * Processes a transcript file and generates evidence with embeddings
   */
  async processTranscript(
    transcriptEvent: TranscriptFileEvent
  ): Promise<TranscriptIngestResult> {
    const startTime = Date.now();

    logger.info('🎤 Starting transcript processing', {
      fileName: transcriptEvent.fileName,
      contentLength: transcriptEvent.content.length,
      sourceType: transcriptEvent.sourceType,
      timestamp: transcriptEvent.timestamp.toISOString(),
    });

    try {
      // Ensure service is initialized before processing
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Feature 6.2: Extract and chunk transcript text
      const chunks = await this.chunkTranscriptText(transcriptEvent.content);
      logger.info(`📄 Transcript chunked into ${chunks.length} segments`, {
        fileName: transcriptEvent.fileName,
        totalChunks: chunks.length,
        avgChunkSize: Math.round(
          chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length
        ),
      });

      // Feature 6.3: Classify chunks by persona and generate embeddings
      const classificationResults = await this.classifyAndEmbedChunks(
        chunks,
        transcriptEvent.fileName
      );

      // Feature 6.4: Persist evidence rows with embeddings
      const evidenceIds = await this.persistEvidenceAndEmbeddings(
        classificationResults,
        transcriptEvent
      );

      // Feature 6.5: Trigger evidence score recalculation
      const personasAffected = Array.from(
        new Set(classificationResults.map(r => r.classification.personaId))
      );
      await this.recalculateEvidenceScores(personasAffected);

      // Phase 2.7: Trigger persona evolution analysis
      await this.triggerPersonaEvolution({
        transcriptFileName: transcriptEvent.fileName,
        totalChunks: chunks.length,
        processedChunks: classificationResults.length,
        evidenceCreated: evidenceIds,
        personasAffected,
        processingTime: 0, // Will be calculated later
      });

      const processingTime = Date.now() - startTime;

      const result: TranscriptIngestResult = {
        transcriptFileName: transcriptEvent.fileName,
        totalChunks: chunks.length,
        processedChunks: classificationResults.length,
        evidenceCreated: evidenceIds,
        personasAffected,
        processingTime,
      };

      logger.info('✅ Transcript processing completed successfully', {
        ...result,
        successRate: `${classificationResults.length}/${chunks.length}`,
      });

      // Emit transcript-imported event
      this.emitTranscriptImported(result);

      return result;
    } catch (error) {
      logger.error('❌ Failed to process transcript', {
        fileName: transcriptEvent.fileName,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Feature 6.2: Extract and chunk transcript text into analysable blocks
   * Intelligently splits transcript while preserving context
   */
  private async chunkTranscriptText(
    content: string
  ): Promise<TranscriptChunk[]> {
    logger.debug('📝 Chunking transcript text', {
      contentLength: content.length,
      maxChunkSize: TranscriptIngestService.CHUNK_CONFIG.maxChunkSize,
    });

    const chunks: TranscriptChunk[] = [];
    const config = TranscriptIngestService.CHUNK_CONFIG;

    // Clean and normalize text
    const normalizedContent = content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
      .trim();

    // Split on paragraph boundaries first (double newlines)
    const paragraphs = normalizedContent
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 0);

    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();

      // If paragraph alone exceeds max chunk size, split it further
      if (trimmedParagraph.length > config.maxChunkSize) {
        // Save current chunk if it has content
        if (currentChunk.length >= config.minChunkSize) {
          chunks.push(this.createChunk(currentChunk.trim(), chunkIndex++, 0));
          currentChunk = '';
        }

        // Split large paragraph by sentences
        const sentences = this.splitIntoSentences(trimmedParagraph);
        let sentenceChunk = '';

        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length > config.maxChunkSize) {
            if (sentenceChunk.length >= config.minChunkSize) {
              chunks.push(
                this.createChunk(sentenceChunk.trim(), chunkIndex++, 0)
              );
            }
            sentenceChunk = sentence;
          } else {
            sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          }
        }

        // Add remaining sentence chunk
        if (sentenceChunk.length >= config.minChunkSize) {
          chunks.push(this.createChunk(sentenceChunk.trim(), chunkIndex++, 0));
        }
      } else {
        // Check if adding this paragraph would exceed chunk size
        if (
          currentChunk.length + trimmedParagraph.length >
          config.maxChunkSize
        ) {
          // Save current chunk and start new one
          if (currentChunk.length >= config.minChunkSize) {
            chunks.push(this.createChunk(currentChunk.trim(), chunkIndex++, 0));
          }
          currentChunk = trimmedParagraph;
        } else {
          // Add paragraph to current chunk
          currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
        }
      }
    }

    // Add final chunk
    if (currentChunk.length >= config.minChunkSize) {
      chunks.push(this.createChunk(currentChunk.trim(), chunkIndex++, 0));
    }

    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => (chunk.totalChunks = totalChunks));

    logger.debug('✅ Transcript chunking complete', {
      totalChunks,
      avgChunkSize: Math.round(
        chunks.reduce((sum, c) => sum + c.content.length, 0) / totalChunks
      ),
      chunkSizes: chunks.map(c => c.content.length),
    });

    return chunks;
  }

  /**
   * Helper: Create a transcript chunk object
   */
  private createChunk(
    content: string,
    chunkIndex: number,
    totalChunks: number
  ): TranscriptChunk {
    return {
      content,
      chunkIndex,
      totalChunks,
      wordCount: content.split(/\s+/).length,
    };
  }

  /**
   * Helper: Split text into sentences for better chunking
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be enhanced with NLP libraries
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + (text.includes(s + '.') ? '.' : ''));
  }

  /**
   * Feature 6.3: Classify chunks by persona and generate embeddings
   */
  private async classifyAndEmbedChunks(
    chunks: TranscriptChunk[],
    fileName: string
  ): Promise<ChunkClassificationResult[]> {
    logger.info('🤖 Starting chunk classification and embedding', {
      totalChunks: chunks.length,
      fileName,
    });

    const results: ChunkClassificationResult[] = [];
    const config = TranscriptIngestService.PROCESSING_CONFIG;

    // Load available personas for classification
    const personas = await this.personaRepo.list();
    logger.debug(`📊 Loaded ${personas.length} personas for classification`, {
      personaIds: personas.map(p => p.id),
      personaNames: personas.map(p => p.name),
    });

    // Process chunks in batches to avoid overwhelming the API
    for (let i = 0; i < chunks.length; i += config.batchSize) {
      const batch = chunks.slice(i, i + config.batchSize);
      logger.debug(
        `🔄 Processing batch ${Math.floor(i / config.batchSize) + 1}`,
        {
          batchSize: batch.length,
          batchRange: `${i + 1}-${i + batch.length}`,
        }
      );

      const batchResults = await Promise.allSettled(
        batch.map(chunk =>
          this.classifyAndEmbedSingleChunk(chunk, personas, fileName)
        )
      );

      // Process batch results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const chunk = batch[j];

        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
          logger.debug('✅ Chunk classified successfully', {
            chunkIndex: chunk.chunkIndex,
            personaId: result.value.classification.personaId,
            confidence: result.value.confidence,
          });
        } else {
          logger.warn('⚠️ Chunk classification failed', {
            chunkIndex: chunk.chunkIndex,
            error:
              result.status === 'rejected' ? result.reason : 'Unknown error',
          });
        }
      }

      // Add delay between batches to respect rate limits
      if (i + config.batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('✅ Chunk classification and embedding complete', {
      totalChunks: chunks.length,
      successfulClassifications: results.length,
      successRate: `${Math.round((results.length / chunks.length) * 100)}%`,
    });

    return results;
  }

  /**
   * Classify and embed a single chunk
   */
  private async classifyAndEmbedSingleChunk(
    chunk: TranscriptChunk,
    personas: Persona[],
    fileName: string
  ): Promise<ChunkClassificationResult | null> {
    try {
      // Generate embedding for the chunk
      const embeddingResult = await this.embeddingManager.generateEmbedding(
        chunk.content
      );

      // Classify chunk against personas using LangGraph private method
      // Note: We use the private classifyLocalContent method as it exists in LangGraphService
      const classifications = await this.langGraphService[
        'classifyLocalContent'
      ](chunk.content);

      // Find best classification
      const bestClassification = classifications.reduce(
        (
          best: PersonaClassification | null,
          current: PersonaClassification
        ) => {
          return current.confidence > (best?.confidence || 0) ? current : best;
        },
        null as PersonaClassification | null
      );

      if (
        !bestClassification ||
        bestClassification.confidence <
          TranscriptIngestService.PROCESSING_CONFIG.minConfidenceThreshold
      ) {
        logger.debug('🚫 Chunk classification below threshold', {
          chunkIndex: chunk.chunkIndex,
          bestConfidence: bestClassification?.confidence || 0,
          threshold:
            TranscriptIngestService.PROCESSING_CONFIG.minConfidenceThreshold,
        });
        return null;
      }

      return {
        chunk,
        classification: bestClassification,
        embedding: embeddingResult.embedding, // Extract embedding array from result
        confidence: bestClassification.confidence,
      };
    } catch (error) {
      logger.error('❌ Failed to classify and embed chunk', {
        chunkIndex: chunk.chunkIndex,
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Feature 6.4: Persist evidence rows with embeddings to SQLite
   */
  private async persistEvidenceAndEmbeddings(
    results: ChunkClassificationResult[],
    transcriptEvent: TranscriptFileEvent
  ): Promise<string[]> {
    logger.info('💾 Persisting evidence and embeddings to database', {
      resultCount: results.length,
      fileName: transcriptEvent.fileName,
    });

    const evidenceIds: string[] = [];

    for (const result of results) {
      try {
        // Create evidence record
        const evidence = await this.evidenceRepo.create({
          personaId: result.classification.personaId,
          content: result.chunk.content,
          source: transcriptEvent.fileName,
          sourceType: 'interview',
          timestamp: transcriptEvent.timestamp,
          tags: result.classification.keywords || [],
          sentiment: null, // Could be enhanced with sentiment analysis
          importance: Math.max(
            1,
            Math.min(10, Math.round(result.confidence * 10))
          ), // 1-10 scale based on confidence
        });

        // Create embedding record
        await this.embeddingRepo.create({
          evidenceId: evidence.id,
          embedding: this.embeddingRepo.serializeEmbedding(result.embedding),
          model: 'text-embedding-3-small', // Default embedding model
          dimensions: result.embedding.length,
          chunkIndex: result.chunk.chunkIndex,
          chunkCount: result.chunk.totalChunks,
        });

        evidenceIds.push(evidence.id);

        // Emit evidence-created event
        this.emitEvidenceCreated(evidence, result);

        logger.debug('✅ Evidence and embedding persisted', {
          evidenceId: evidence.id,
          personaId: result.classification.personaId,
          chunkIndex: result.chunk.chunkIndex,
          importance: evidence.importance,
        });
      } catch (error) {
        logger.error('❌ Failed to persist evidence/embedding', {
          chunkIndex: result.chunk.chunkIndex,
          personaId: result.classification.personaId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('✅ Evidence persistence complete', {
      totalResults: results.length,
      persistedEvidence: evidenceIds.length,
      successRate: `${Math.round((evidenceIds.length / results.length) * 100)}%`,
    });

    return evidenceIds;
  }

  /**
   * Feature 6.5: Trigger evidence score recalculation and broadcast updates
   */
  private async recalculateEvidenceScores(personaIds: string[]): Promise<void> {
    logger.info('📊 Triggering evidence score recalculation', {
      affectedPersonas: personaIds.length,
      personaIds,
    });

    try {
      // Get all PRDs to recalculate scores for
      const productDocuments =
        await this.evidenceScoreService['productDocumentRepo'].list();

      for (const personaId of personaIds) {
        for (const document of productDocuments) {
          try {
            // Recalculate score for this PRD-persona combination
            await this.evidenceScoreService.calculateAndPersistScore(
              document.id,
              personaId
            );

            logger.debug('✅ Evidence score recalculated', {
              documentId: document.id,
              personaId,
              documentTitle: document.title,
            });
          } catch (error) {
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
      });
    } catch (error) {
      logger.error('❌ Evidence score recalculation failed', {
        personaIds,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Emit transcript-imported IPC event
   */
  private emitTranscriptImported(result: TranscriptIngestResult): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('transcript-imported', result);
      logger.debug('📢 Emitted transcript-imported event', {
        fileName: result.transcriptFileName,
        evidenceCreated: result.evidenceCreated.length,
      });
    } else {
      logger.warn(
        '⚠️ Cannot emit transcript-imported - main window not available'
      );
    }
  }

  /**
   * Emit evidence-created IPC event for individual evidence
   */
  private emitEvidenceCreated(
    evidence: Evidence,
    result: ChunkClassificationResult
  ): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const payload = {
        evidenceId: evidence.id,
        personaId: evidence.personaId,
        content: evidence.content,
        source: evidence.source,
        confidence: result.confidence,
        chunkIndex: result.chunk.chunkIndex,
        timestamp: evidence.timestamp.toISOString(),
      };

      this.mainWindow.webContents.send('evidence-created', payload);
      logger.debug('📢 Emitted evidence-created event', {
        evidenceId: evidence.id,
        personaId: evidence.personaId,
      });
    } else {
      logger.warn(
        '⚠️ Cannot emit evidence-created - main window not available'
      );
    }
  }

  /**
   * Phase 2.7: Trigger persona evolution analysis after transcript processing
   * @private
   */
  private async triggerPersonaEvolution(
    transcriptResult: TranscriptIngestResult
  ): Promise<void> {
    try {
      // Initialize persona evolution service if not already done
      if (!this.personaEvolutionService) {
        // For simplicity, create minimal dependencies for PersonaEvolutionService
        // In a production system, these would be injected via dependency injection
        const personaManagerService = new PersonaManagerService(
          new ActivityLogService(),
          this.evidenceScoreService
        );
        const activityLogService = new ActivityLogService();

        this.personaEvolutionService = new PersonaEvolutionService(
          personaManagerService,
          activityLogService
        );

        await this.personaEvolutionService.initialize();
      }

      logger.info('🧬 Triggering persona evolution analysis', {
        transcriptFileName: transcriptResult.transcriptFileName,
        evidenceCreated: transcriptResult.evidenceCreated.length,
      });

      // Trigger persona evolution
      const evolutionResult =
        await this.personaEvolutionService.evolveFromTranscript(
          transcriptResult
        );

      if (evolutionResult.success && evolutionResult.totalChanges > 0) {
        logger.info('✅ Persona evolution completed with changes', {
          personasUpdated: evolutionResult.personasUpdated.length,
          personasCreated: evolutionResult.personasCreated.length,
          totalChanges: evolutionResult.totalChanges,
        });

        // Emit persona-evolved event if any changes were made
        this.emitPersonaEvolved(evolutionResult);
      } else {
        logger.debug('📊 Persona evolution completed with no changes', {
          reason: evolutionResult.error || 'No significant changes detected',
        });
      }
    } catch (error) {
      logger.error('❌ Persona evolution analysis failed', {
        transcriptFileName: transcriptResult.transcriptFileName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw error to avoid breaking the main transcript processing flow
    }
  }

  /**
   * Emit persona-evolved IPC event
   * @private
   */
  private emitPersonaEvolved(evolutionResult: {
    personasUpdated: string[];
    personasCreated: string[];
    totalChanges: number;
  }): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('persona-evolved', {
        personasUpdated: evolutionResult.personasUpdated,
        personasCreated: evolutionResult.personasCreated,
        totalChanges: evolutionResult.totalChanges,
        timestamp: new Date().toISOString(),
      });

      logger.debug('📢 Emitted persona-evolved event', {
        personasUpdated: evolutionResult.personasUpdated.length,
        personasCreated: evolutionResult.personasCreated.length,
      });
    } else {
      logger.warn('⚠️ Cannot emit persona-evolved - main window not available');
    }
  }

  /**
   * Get processing statistics for monitoring
   */
  getProcessingStats(): {
    isReady: boolean;
    servicesReady: {
      langGraph: boolean;
      embeddings: boolean;
      database: boolean;
    };
    configuration: typeof TranscriptIngestService.CHUNK_CONFIG &
      typeof TranscriptIngestService.PROCESSING_CONFIG;
  } {
    return {
      isReady: this.isInitialized && this.langGraphService.isReady(),
      servicesReady: {
        langGraph: this.langGraphService.isReady(),
        embeddings:
          this.isInitialized &&
          this.embeddingManager.getActiveProviderType() !== null,
        database: true, // Assume database is ready if service instantiated
      },
      configuration: {
        ...TranscriptIngestService.CHUNK_CONFIG,
        ...TranscriptIngestService.PROCESSING_CONFIG,
      },
    };
  }
}
