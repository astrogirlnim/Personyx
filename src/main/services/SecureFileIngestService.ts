/**
 * Secure File Ingest Service
 * Handles PRD markdown file uploads with validation, processing, and embedding
 * Phase 2, Feature 3 - Secure File Ingest
 */

import { readFileSync, statSync } from 'fs';
import { extname, basename } from 'path';
import { Logger } from '@main/utils/logger';
import { ProductDocumentRepo } from '@main/db/repositories/ProductDocumentRepo';
import { EvidenceRepo } from '@main/db/repositories/EvidenceRepo';
import { EmbeddingRepo } from '@main/db/repositories/EmbeddingRepo';
import { EvidenceScoreService } from './EvidenceScoreService';
import { LangGraphService } from './LangGraphService';
import { PersonaRepo } from '@main/db/repositories/PersonaRepo';
import type { ProductDocument, EvidenceScore } from '@shared/types';
import type { BrowserWindow } from 'electron';

const logger = new Logger('secure-file-ingest');

// File validation configuration
export interface FileValidationConfig {
  maxSizeBytes: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
}

// File processing result
export interface FileIngestResult {
  success: boolean;
  documentId?: string;
  fileName?: string;
  fileSize?: number;
  sectionsExtracted?: number;
  chunksCreated?: number;
  embeddingsGenerated?: number;
  evidenceScores?: EvidenceScore[];
  processingTimeMs?: number;
  error?: string;
  validationErrors?: string[];
}

// Extracted section from PRD
interface PRDSection {
  title: string;
  content: string;
  level: number; // header level (1-6)
  order: number; // order in document
}

// Content chunk for embedding
interface ContentChunk {
  content: string;
  section: string;
  index: number;
  totalChunks: number;
  documentId: string;
}

export class SecureFileIngestService {
  private productDocumentRepo: ProductDocumentRepo;
  private evidenceRepo: EvidenceRepo;
  private embeddingRepo: EmbeddingRepo;
  private evidenceScoreService: EvidenceScoreService;
  private langGraphService: LangGraphService;
  private personaRepo: PersonaRepo;
  private mainWindow: BrowserWindow | null = null;

  // Configuration constants
  private readonly DEFAULT_CONFIG: FileValidationConfig = {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.md', '.txt', '.markdown'],
    allowedMimeTypes: ['text/markdown', 'text/plain'],
  };

  private readonly CHUNK_SIZE = 1000; // characters per chunk
  private readonly CHUNK_OVERLAP = 200; // character overlap between chunks

  constructor() {
    this.productDocumentRepo = new ProductDocumentRepo();
    this.evidenceRepo = new EvidenceRepo();
    this.embeddingRepo = new EmbeddingRepo();
    this.evidenceScoreService = new EvidenceScoreService();
    this.langGraphService = new LangGraphService();
    this.personaRepo = new PersonaRepo();
  }

  /**
   * Set the main window for event emission
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    logger.debug('🪟 Main window set for PRD event emission');
  }

  /**
   * Feature 3.1 & 3.2: Accept and validate PRD file uploads
   */
  async ingestPRDFile(
    filePath: string,
    config: Partial<FileValidationConfig> = {}
  ): Promise<FileIngestResult> {
    const startTime = Date.now();

    logger.info('📄 Starting PRD file ingest', {
      filePath: basename(filePath),
      configOverrides: Object.keys(config),
    });

    try {
      // Step 1: Validate file (Feature 3.2)
      const validationResult = this.validateFile(filePath, config);
      if (!validationResult.valid) {
        logger.warn('❌ File validation failed', {
          filePath: basename(filePath),
          errors: validationResult.errors,
        });
        return {
          success: false,
          error: 'File validation failed',
          validationErrors: validationResult.errors,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Step 2: Read and parse file content
      const fileContent = this.readFileContent(filePath);
      const fileName = basename(filePath);
      const fileSize = statSync(filePath).size;

      logger.info('📖 File content loaded', {
        fileName,
        fileSize,
        contentLength: fileContent.length,
      });

      // Step 3: Extract sections from PRD (Feature 3.3)
      const sections = this.extractPRDSections(fileContent);
      logger.debug(`📋 Extracted ${sections.length} sections from PRD`);

      // Step 4: Store product document
      const document = await this.storeProductDocument(
        fileName,
        fileContent,
        filePath,
        sections
      );

      // Step 5: Process content - chunk and embed (Feature 3.3)
      const chunks = this.createContentChunks(sections, document.id);
      logger.debug(`🧩 Created ${chunks.length} content chunks`);

      const embeddings = await this.generateEmbeddings(chunks);
      logger.debug(`🧠 Generated ${embeddings.length} embeddings`);

      // Step 6: Store evidence and embeddings
      await this.storeEvidenceAndEmbeddings(document, chunks, embeddings);

      // Step 7: Calculate evidence scores (Feature 3.4)
      const evidenceScores = await this.calculateEvidenceScores(document.id);
      logger.debug(`📊 Calculated ${evidenceScores.length} evidence scores`);

      // Step 8: Emit PRDImported event (Feature 3.4)
      await this.emitPRDImportedEvent(document, evidenceScores);

      const result: FileIngestResult = {
        success: true,
        documentId: document.id,
        fileName,
        fileSize,
        sectionsExtracted: sections.length,
        chunksCreated: chunks.length,
        embeddingsGenerated: embeddings.length,
        evidenceScores,
        processingTimeMs: Date.now() - startTime,
      };

      logger.info('✅ PRD file ingested successfully', {
        documentId: document.id,
        fileName,
        processingTimeMs: result.processingTimeMs,
      });

      return result;
    } catch (error) {
      logger.error('❌ PRD file ingest failed', error);
      return {
        success: false,
        error: `File ingest failed: ${error}`,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Feature 3.2: Validate file type and size
   */
  private validateFile(
    filePath: string,
    configOverrides: Partial<FileValidationConfig> = {}
  ): { valid: boolean; errors: string[] } {
    const config = { ...this.DEFAULT_CONFIG, ...configOverrides };
    const errors: string[] = [];

    logger.debug('🔍 Validating file', {
      filePath: basename(filePath),
      maxSizeBytes: config.maxSizeBytes,
      allowedExtensions: config.allowedExtensions,
    });

    try {
      // Check if file exists and is readable
      const stats = statSync(filePath);

      // Validate file size
      if (stats.size > config.maxSizeBytes) {
        errors.push(
          `File size ${stats.size} bytes exceeds maximum ${config.maxSizeBytes} bytes`
        );
      }

      if (stats.size === 0) {
        errors.push('File is empty');
      }

      // Validate file extension
      const extension = extname(filePath).toLowerCase();
      if (!config.allowedExtensions.includes(extension)) {
        errors.push(
          `File extension '${extension}' not allowed. Allowed: ${config.allowedExtensions.join(', ')}`
        );
      }

      // Validate it's actually a file (not directory)
      if (!stats.isFile()) {
        errors.push('Path is not a file');
      }

      logger.debug('🔍 File validation completed', {
        filePath: basename(filePath),
        valid: errors.length === 0,
        errorCount: errors.length,
      });

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      logger.error('❌ File validation error', error);
      errors.push(`File access error: ${error}`);
      return {
        valid: false,
        errors,
      };
    }
  }

  /**
   * Read file content with error handling
   */
  private readFileContent(filePath: string): string {
    try {
      logger.debug('📖 Reading file content', { filePath: basename(filePath) });
      const content = readFileSync(filePath, 'utf-8');
      logger.debug('✅ File content read successfully', {
        contentLength: content.length,
      });
      return content;
    } catch (error) {
      logger.error('❌ Failed to read file content', error);
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  /**
   * Feature 3.3: Extract sections from PRD markdown
   */
  private extractPRDSections(content: string): PRDSection[] {
    logger.debug('📋 Extracting sections from PRD content');

    const sections: PRDSection[] = [];
    const lines = content.split('\n');
    let currentSection: PRDSection | null = null;
    let sectionOrder = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for markdown headers (# ## ### etc.)
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.content = currentSection.content.trim();
          sections.push(currentSection);
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();

        currentSection = {
          title,
          content: '',
          level,
          order: sectionOrder++,
        };

        logger.debug(`📋 Found section: ${title} (level ${level})`);
      } else if (currentSection && line) {
        // Add content to current section
        currentSection.content += line + '\n';
      }
    }

    // Add final section
    if (currentSection) {
      currentSection.content = currentSection.content.trim();
      sections.push(currentSection);
    }

    // If no sections found, create one with all content
    if (sections.length === 0) {
      sections.push({
        title: 'Document Content',
        content: content.trim(),
        level: 1,
        order: 0,
      });
    }

    logger.info(`📋 Extracted ${sections.length} sections from PRD`, {
      sectionTitles: sections.map(s => s.title),
    });

    return sections;
  }

  /**
   * Store product document in database
   */
  private async storeProductDocument(
    fileName: string,
    content: string,
    filePath: string,
    sections: PRDSection[]
  ): Promise<ProductDocument> {
    logger.debug('💾 Storing product document', { fileName });

    const title = this.extractDocumentTitle(fileName, sections);

    const dbDocument = await this.productDocumentRepo.create({
      title,
      content,
      filePath,
      type: 'prd',
    });

    // Convert database type to shared type
    const document: ProductDocument = {
      ...dbDocument,
      filePath: dbDocument.filePath ?? undefined,
      type: dbDocument.type as 'prd' | 'requirements' | 'spec',
      evidenceScore: dbDocument.evidenceScore ?? undefined,
    };

    logger.info('✅ Product document stored', {
      documentId: document.id,
      title,
    });

    return document;
  }

  /**
   * Extract document title from filename or sections
   */
  private extractDocumentTitle(
    fileName: string,
    sections: PRDSection[]
  ): string {
    // Try to find title from first section
    if (sections.length > 0 && sections[0].level === 1) {
      return sections[0].title;
    }

    // Fall back to filename without extension
    return fileName.replace(/\.[^/.]+$/, '');
  }

  /**
   * Feature 3.3: Create content chunks for embedding
   */
  private createContentChunks(
    sections: PRDSection[],
    documentId: string
  ): ContentChunk[] {
    logger.debug('🧩 Creating content chunks for embedding');

    const chunks: ContentChunk[] = [];
    let globalIndex = 0;

    for (const section of sections) {
      const sectionChunks = this.chunkText(section.content, section.title);

      for (const chunkContent of sectionChunks) {
        chunks.push({
          content: chunkContent,
          section: section.title,
          index: globalIndex++,
          totalChunks: 0, // Will be set after all chunks are created
          documentId,
        });
      }
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    logger.debug(`🧩 Created ${chunks.length} content chunks`);
    return chunks;
  }

  /**
   * Chunk text into overlapping segments
   */
  private chunkText(text: string, sectionTitle: string): string[] {
    if (text.length <= this.CHUNK_SIZE) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.CHUNK_SIZE, text.length);
      let chunk = text.slice(start, end);

      // Add section context to chunk
      chunk = `Section: ${sectionTitle}\n\n${chunk}`;

      chunks.push(chunk);
      start += this.CHUNK_SIZE - this.CHUNK_OVERLAP;
    }

    return chunks;
  }

  /**
   * Feature 3.3: Generate embeddings for content chunks
   */
  private async generateEmbeddings(
    chunks: ContentChunk[]
  ): Promise<Array<{ chunkIndex: number; embedding: number[] }>> {
    logger.debug('🧠 Generating embeddings for content chunks');

    // Initialize LangGraph service if not ready
    if (!this.langGraphService.isReady()) {
      await this.langGraphService.initialize();
    }

    const embeddings: Array<{ chunkIndex: number; embedding: number[] }> = [];

    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      logger.debug(
        `🧠 Processing embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`
      );

      for (const chunk of batch) {
        try {
          // Use LangGraph service to generate embedding only (no classification needed for PRD chunks)
          const result = await this.langGraphService.generateEmbeddingsOnly(
            chunk.content,
            chunk.index
          );

          if (result.length > 0) {
            embeddings.push({
              chunkIndex: chunk.index,
              embedding: result[0].embedding,
            });
            logger.debug(`✅ Generated embedding for chunk ${chunk.index}`);
          }
        } catch (error) {
          logger.error(
            `❌ Failed to generate embedding for chunk ${chunk.index}`,
            error
          );
          // Continue processing other chunks
        }
      }

      // Small delay between batches to be respectful to API
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info(
      `🧠 Generated ${embeddings.length}/${chunks.length} embeddings`
    );
    return embeddings;
  }

  /**
   * Store evidence and embeddings in database
   */
  private async storeEvidenceAndEmbeddings(
    document: ProductDocument,
    chunks: ContentChunk[],
    embeddings: Array<{ chunkIndex: number; embedding: number[] }>
  ): Promise<void> {
    logger.debug('💾 Storing evidence and embeddings');

    // Get all personas for evidence association
    const personas = await this.personaRepo.list();

    for (const chunk of chunks) {
      // Find corresponding embedding
      const embeddingData = embeddings.find(e => e.chunkIndex === chunk.index);
      if (!embeddingData) {
        logger.warn(`⚠️ No embedding found for chunk ${chunk.index}`);
        continue;
      }

      // Create evidence entry for each persona (PRD is relevant to all personas)
      for (const persona of personas) {
        try {
          const evidence = await this.evidenceRepo.create({
            personaId: persona.id,
            content: chunk.content,
            source: document.title,
            sourceType: 'prd',
            timestamp: new Date(),
            tags: JSON.stringify([
              'prd',
              'requirements',
              chunk.section.toLowerCase(),
            ]),
            importance: 8, // PRD content is high importance
          });

          // Store embedding linked to evidence
          await this.embeddingRepo.create({
            evidenceId: evidence.id,
            embedding: JSON.stringify(embeddingData.embedding),
            model: 'text-embedding-3-small',
            dimensions: embeddingData.embedding.length,
            chunkIndex: chunk.index,
            chunkCount: chunk.totalChunks,
          });

          logger.debug(
            `💾 Stored evidence and embedding for persona ${persona.name}, chunk ${chunk.index}`
          );
        } catch (error) {
          logger.error(
            `❌ Failed to store evidence/embedding for persona ${persona.id}, chunk ${chunk.index}`,
            error
          );
        }
      }
    }

    logger.info('✅ Evidence and embeddings stored successfully');
  }

  /**
   * Feature 3.4: Calculate evidence scores after import
   */
  private async calculateEvidenceScores(
    documentId: string
  ): Promise<EvidenceScore[]> {
    logger.debug('📊 Calculating evidence scores for imported PRD');

    const personas = await this.personaRepo.list();
    const evidenceScores: EvidenceScore[] = [];

    for (const persona of personas) {
      try {
        const calculationResult =
          await this.evidenceScoreService.calculateEvidenceScore(
            documentId,
            persona.id
          );

        // Convert CalculationResult to EvidenceScore by persisting it
        const evidenceScore =
          await this.evidenceScoreService.persistEvidenceScore(
            documentId,
            persona.id,
            calculationResult
          );

        evidenceScores.push(evidenceScore);
        logger.debug(
          `📊 Evidence score calculated for ${persona.name}: ${evidenceScore.score}`
        );
      } catch (error) {
        logger.error(
          `❌ Failed to calculate evidence score for persona ${persona.id}`,
          error
        );
      }
    }

    logger.info(`📊 Calculated ${evidenceScores.length} evidence scores`);
    return evidenceScores;
  }

  /**
   * Feature 3.4: Emit PRDImported event
   */
  private async emitPRDImportedEvent(
    document: ProductDocument,
    evidenceScores: EvidenceScore[]
  ): Promise<void> {
    logger.info('📢 Emitting PRDImported event', {
      documentId: document.id,
      scoresCount: evidenceScores.length,
    });

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('prd-imported', {
        documentId: document.id,
        title: document.title,
        evidenceScores,
      });
      logger.debug('✅ PRDImported event emitted to renderer');
    } else {
      logger.warn(
        '⚠️ Cannot emit PRDImported event - main window not available'
      );
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    langGraphReady: boolean;
    defaultConfig: FileValidationConfig;
  } {
    return {
      initialized: true,
      langGraphReady: this.langGraphService.isReady(),
      defaultConfig: this.DEFAULT_CONFIG,
    };
  }
}
