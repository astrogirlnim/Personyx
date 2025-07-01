/**
 * Interview Folder Watcher
 * Monitors /interviews directory for new transcript files and triggers processing
 * Phase 1, Feature 3.1 - n8n-style file watching using chokidar
 */

import { watch, FSWatcher } from 'chokidar';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { app } from 'electron';
import { Logger } from '@main/utils/logger';
import { EventEmitter } from 'events';

const logger = new Logger('interview-folder-watcher');

export interface TranscriptFileEvent {
  filePath: string;
  fileName: string;
  content: string;
  fileSize: number;
  timestamp: Date;
  sourceType: 'interview';
}

export class InterviewFolderWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private interviewsPath: string;
  private isWatching = false;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB max file size
  private readonly supportedExtensions = ['.md', '.txt', '.markdown'];

  constructor() {
    super();
    this.interviewsPath = this.getInterviewsPath();
    this.ensureInterviewsDirectory();
  }

  /**
   * Get the interviews directory path
   */
  private getInterviewsPath(): string {
    const userDataPath = app.getPath('userData');
    return join(userDataPath, 'interviews');
  }

  /**
   * Ensure the interviews directory exists
   */
  private ensureInterviewsDirectory(): void {
    if (!existsSync(this.interviewsPath)) {
      mkdirSync(this.interviewsPath, { recursive: true });
      logger.info('📁 Created interviews directory', {
        path: this.interviewsPath,
      });
    }
  }

  /**
   * Start watching the interviews directory
   */
  public startWatching(): void {
    if (this.isWatching) {
      logger.warn('⚠️ Already watching interviews directory');
      return;
    }

    logger.info('👀 Starting interview folder watcher', {
      path: this.interviewsPath,
      extensions: this.supportedExtensions,
    });

    try {
      this.watcher = watch(this.interviewsPath, {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        depth: 2, // Allow subdirectories
        ignoreInitial: true, // Don't trigger for existing files
        awaitWriteFinish: {
          stabilityThreshold: 2000, // Wait 2 seconds after last change
          pollInterval: 100,
        },
      });

      // File added event
      this.watcher.on('add', (filePath: string) => {
        this.handleFileAdded(filePath);
      });

      // File changed event (for updates to existing transcripts)
      this.watcher.on('change', (filePath: string) => {
        this.handleFileChanged(filePath);
      });

      // Error handling
      this.watcher.on('error', (err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('❌ Interview folder watcher error', error);
        this.emit('error', error);
      });

      // Ready event
      this.watcher.on('ready', () => {
        logger.info('✅ Interview folder watcher ready');
        this.isWatching = true;
        this.emit('ready');
      });
    } catch (error) {
      logger.error('❌ Failed to start interview folder watcher', error);
      throw error;
    }
  }

  /**
   * Stop watching the interviews directory
   */
  public async stopWatching(): Promise<void> {
    if (!this.isWatching || !this.watcher) {
      logger.warn('⚠️ Interview folder watcher not currently running');
      return;
    }

    logger.info('🛑 Stopping interview folder watcher');

    try {
      await this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      logger.info('✅ Interview folder watcher stopped');
      this.emit('stopped');
    } catch (error) {
      logger.error('❌ Error stopping interview folder watcher', error);
      throw error;
    }
  }

  /**
   * Handle new file added to interviews directory
   */
  private handleFileAdded(filePath: string): void {
    logger.info('📄 New file detected in interviews directory', { filePath });

    if (!this.isValidTranscriptFile(filePath)) {
      logger.debug('⏭️ Skipping file - not a valid transcript format', {
        filePath,
      });
      return;
    }

    try {
      const transcriptEvent = this.processTranscriptFile(filePath);
      logger.info('✅ Transcript file processed successfully', {
        fileName: transcriptEvent.fileName,
        size: transcriptEvent.fileSize,
      });

      // Emit event for LangGraph pipeline to pick up
      this.emit('transcript-added', transcriptEvent);
    } catch (error) {
      logger.error('❌ Failed to process transcript file', { error, filePath });
      this.emit('file-error', { filePath, error });
    }
  }

  /**
   * Handle file changed in interviews directory
   */
  private handleFileChanged(filePath: string): void {
    logger.info('📝 File changed in interviews directory', { filePath });

    if (!this.isValidTranscriptFile(filePath)) {
      return;
    }

    try {
      const transcriptEvent = this.processTranscriptFile(filePath);
      logger.info('✅ Updated transcript file processed', {
        fileName: transcriptEvent.fileName,
        size: transcriptEvent.fileSize,
      });

      // Emit event for LangGraph pipeline to reprocess
      this.emit('transcript-updated', transcriptEvent);
    } catch (error) {
      logger.error('❌ Failed to process updated transcript file', {
        error,
        filePath,
      });
      this.emit('file-error', { filePath, error });
    }
  }

  /**
   * Check if file is a valid transcript file
   */
  private isValidTranscriptFile(filePath: string): boolean {
    // Check file extension
    const ext = extname(filePath).toLowerCase();
    if (!this.supportedExtensions.includes(ext)) {
      return false;
    }

    // Check if file exists and is readable
    if (!existsSync(filePath)) {
      logger.debug('📭 File does not exist', { filePath });
      return false;
    }

    // Check file size
    try {
      const stats = statSync(filePath);
      if (stats.size > this.maxFileSize) {
        logger.warn('⚠️ File too large, skipping', {
          filePath,
          size: stats.size,
          maxSize: this.maxFileSize,
        });
        return false;
      }

      if (stats.size === 0) {
        logger.debug('📭 Empty file, skipping', { filePath });
        return false;
      }
    } catch (error) {
      logger.error('❌ Error reading file stats', { error, filePath });
      return false;
    }

    return true;
  }

  /**
   * Process a transcript file and create event data
   */
  private processTranscriptFile(filePath: string): TranscriptFileEvent {
    logger.debug('🔄 Processing transcript file', { filePath });

    try {
      // Read file content
      const content = readFileSync(filePath, 'utf8');
      const stats = statSync(filePath);
      const fileName = basename(filePath);

      // Validate content is not empty after trimming
      const trimmedContent = content.trim();
      if (trimmedContent.length === 0) {
        throw new Error('File content is empty');
      }

      // Create event data
      const transcriptEvent: TranscriptFileEvent = {
        filePath,
        fileName,
        content: trimmedContent,
        fileSize: stats.size,
        timestamp: new Date(),
        sourceType: 'interview',
      };

      logger.debug('✅ Transcript file processed', {
        fileName,
        contentLength: trimmedContent.length,
        size: stats.size,
      });

      return transcriptEvent;
    } catch (error) {
      logger.error('❌ Failed to process transcript file', { error, filePath });
      throw new Error(`Failed to process transcript file: ${error}`);
    }
  }

  /**
   * Get current watching status
   */
  public isCurrentlyWatching(): boolean {
    return this.isWatching;
  }

  /**
   * Get interviews directory path
   */
  public getInterviewsDirectory(): string {
    return this.interviewsPath;
  }

  /**
   * Get list of existing transcript files
   */
  public getExistingTranscripts(): string[] {
    try {
      const files = readdirSync(this.interviewsPath);

      return files.filter((file: string) => {
        const filePath = join(this.interviewsPath, file);
        return this.isValidTranscriptFile(filePath);
      });
    } catch (error) {
      logger.error('❌ Error reading existing transcripts', error);
      return [];
    }
  }

  /**
   * Manually trigger processing of an existing file
   */
  public async processExistingFile(
    fileName: string
  ): Promise<TranscriptFileEvent | null> {
    const filePath = join(this.interviewsPath, fileName);

    if (!this.isValidTranscriptFile(filePath)) {
      logger.warn('⚠️ Invalid transcript file', { fileName });
      return null;
    }

    try {
      const transcriptEvent = this.processTranscriptFile(filePath);
      this.emit('transcript-manual', transcriptEvent);
      return transcriptEvent;
    } catch (error) {
      logger.error('❌ Failed to manually process file', { error, fileName });
      throw error;
    }
  }
}
