/**
 * LangGraph Service
 * Handles transcript embedding and persona classification using OpenAI or Personyx Cloud
 * Phase 1, Feature 3.2 - Build a LangGraph pipeline to embed transcripts and classify by persona
 * Phase 2.5, Feature 5.4 - Add logic to select between local and cloud embedding at runtime
 */

import OpenAI from 'openai';
import { Logger } from '@main/utils/logger';
import { PersonaRepo } from '@main/db/repositories/PersonaRepo';
import { EvidenceRepo } from '@main/db/repositories/EvidenceRepo';
import { EmbeddingRepo } from '@main/db/repositories/EmbeddingRepo';
import { getToken } from '@main/security/tokenVault';
import { PersonyxCloudService } from './PersonyxCloudService';
import type { Persona, AIServiceProvider } from '@shared/types';
import type { TranscriptFileEvent } from './InterviewFolderWatcher';

const logger = new Logger('langgraph-service');

export interface ChunkData {
  content: string;
  index: number;
  totalChunks: number;
  filePath: string;
  fileName: string;
}

export interface PersonaClassification {
  personaId: string;
  confidence: number;
  reasoning: string;
  keywords: string[];
}

export interface ProcessingResult {
  evidenceId: string;
  personaClassifications: PersonaClassification[];
  embeddings: Array<{
    chunkIndex: number;
    embedding: number[];
    model: string;
    dimensions: number;
  }>;
  processed: boolean;
  error?: string;
}

export class LangGraphService {
  private openai: OpenAI | null = null;
  private cloudService: PersonyxCloudService | null = null;
  private currentProvider: AIServiceProvider = 'local';
  private personaRepo: PersonaRepo;
  private evidenceRepo: EvidenceRepo;
  private embeddingRepo: EmbeddingRepo;
  private isInitialized = false;

  // Configuration constants
  private readonly CHUNK_SIZE = 1000; // tokens per chunk
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private readonly EMBEDDING_DIMENSIONS = 1536;
  private readonly CLASSIFICATION_MODEL = 'gpt-4o-mini';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // ms

  constructor() {
    this.personaRepo = new PersonaRepo();
    this.evidenceRepo = new EvidenceRepo();
    this.embeddingRepo = new EmbeddingRepo();
    this.cloudService = new PersonyxCloudService();
  }

  /**
   * Initialize the LangGraph service with hybrid AI provider support
   */
  async initialize(provider?: AIServiceProvider): Promise<void> {
    logger.info('🔧 Initializing LangGraph service...');

    try {
      // Determine which provider to use
      this.currentProvider = provider || 'local';
      logger.info(`🎯 Using AI provider: ${this.currentProvider}`);

      if (this.currentProvider === 'local') {
        await this.initializeLocalProvider();
      } else if (this.currentProvider === 'cloud') {
        await this.initializeCloudProvider();
      } else {
        throw new Error(`Unknown AI provider: ${this.currentProvider}`);
      }

      this.isInitialized = true;
      logger.info('✅ LangGraph service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize LangGraph service', error);
      throw error;
    }
  }

  /**
   * Initialize local OpenAI provider
   */
  private async initializeLocalProvider(): Promise<void> {
    logger.debug('🔧 Initializing local OpenAI provider...');

    // Get OpenAI API key from secure token vault
    const apiKey = await getToken('openai');

    if (!apiKey) {
      logger.warn(
        '⚠️ No OpenAI API key found - LangGraph service limited functionality'
      );
      return;
    }

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: apiKey,
    });

    // Test the connection
    await this.testOpenAIConnection();

    logger.info('✅ Local OpenAI provider initialized');
  }

  /**
   * Initialize cloud provider
   */
  private async initializeCloudProvider(): Promise<void> {
    logger.debug('🔧 Initializing Personyx Cloud provider...');

    // Get Personyx Cloud API key from secure token vault
    const apiKey = await getToken('firebase-cloud');

    if (!apiKey) {
      logger.warn(
        '⚠️ No Personyx Cloud API key found - falling back to local provider'
      );
      this.currentProvider = 'local';
      await this.initializeLocalProvider();
      return;
    }

    if (!this.cloudService) {
      this.cloudService = new PersonyxCloudService();
    }

    // Initialize cloud service
    await this.cloudService.initialize(apiKey);

    logger.info('✅ Personyx Cloud provider initialized');
  }

  /**
   * Switch AI provider at runtime
   */
  async switchProvider(provider: AIServiceProvider): Promise<void> {
    logger.info(
      `🔄 Switching AI provider from ${this.currentProvider} to ${provider}`
    );

    try {
      this.currentProvider = provider;

      if (provider === 'local') {
        await this.initializeLocalProvider();
      } else if (provider === 'cloud') {
        await this.initializeCloudProvider();
      }

      logger.info('✅ AI provider switched successfully');
    } catch (error) {
      logger.error('❌ Failed to switch AI provider', error);
      throw error;
    }
  }

  /**
   * Test OpenAI API connection
   */
  private async testOpenAIConnection(): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      logger.debug('🔍 Testing OpenAI API connection...');

      // Simple test embedding to verify connection
      const testResponse = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: 'test connection',
      });

      if (testResponse.data.length > 0) {
        logger.debug('✅ OpenAI API connection test successful');
      } else {
        throw new Error('Empty response from OpenAI API');
      }
    } catch (error) {
      logger.error('❌ OpenAI API connection test failed', error);
      throw new Error(`OpenAI API connection failed: ${error}`);
    }
  }

  /**
   * Process a transcript file through the LangGraph pipeline
   */
  async processTranscript(
    transcriptEvent: TranscriptFileEvent
  ): Promise<ProcessingResult> {
    logger.info('🔄 Processing transcript through LangGraph pipeline', {
      fileName: transcriptEvent.fileName,
      contentLength: transcriptEvent.content.length,
    });

    if (!this.isInitialized || !this.openai) {
      logger.error('❌ LangGraph service not initialized');
      return {
        evidenceId: '',
        personaClassifications: [],
        embeddings: [],
        processed: false,
        error: 'LangGraph service not initialized',
      };
    }

    try {
      // Step 1: Chunk the content
      const chunks = this.chunkContent(transcriptEvent);
      logger.debug(`📝 Content chunked into ${chunks.length} pieces`);

      // Step 2: Generate embeddings for each chunk
      const embeddings = await this.generateEmbeddings(chunks);
      logger.debug(`🧠 Generated ${embeddings.length} embeddings`);

      // Step 3: Classify content by persona
      const personaClassifications = await this.classifyByPersona(
        transcriptEvent.content,
        chunks
      );
      logger.debug(
        `🎯 Generated ${personaClassifications.length} persona classifications`
      );

      // Step 4: Store evidence and embeddings to database
      const evidenceId = await this.storeEvidence(
        transcriptEvent,
        personaClassifications,
        embeddings
      );
      logger.info('✅ Transcript processed successfully', { evidenceId });

      return {
        evidenceId,
        personaClassifications,
        embeddings,
        processed: true,
      };
    } catch (error) {
      logger.error('❌ Failed to process transcript', error);
      return {
        evidenceId: '',
        personaClassifications: [],
        embeddings: [],
        processed: false,
        error: String(error),
      };
    }
  }

  /**
   * Chunk content into smaller pieces for embedding
   */
  private chunkContent(transcriptEvent: TranscriptFileEvent): ChunkData[] {
    const content = transcriptEvent.content;
    const chunks: ChunkData[] = [];

    // Simple word-based chunking (could be improved with token-aware chunking)
    const words = content.split(/\s+/);
    const wordsPerChunk = Math.floor(this.CHUNK_SIZE * 0.75); // Conservative estimate

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkContent = chunkWords.join(' ');

      chunks.push({
        content: chunkContent,
        index: Math.floor(i / wordsPerChunk),
        totalChunks: Math.ceil(words.length / wordsPerChunk),
        filePath: transcriptEvent.filePath,
        fileName: transcriptEvent.fileName,
      });
    }

    return chunks;
  }

  /**
   * Generate embeddings for content chunks using current AI provider
   */
  private async generateEmbeddings(chunks: ChunkData[]): Promise<
    Array<{
      chunkIndex: number;
      embedding: number[];
      model: string;
      dimensions: number;
    }>
  > {
    logger.debug(
      `🧠 Generating embeddings using ${this.currentProvider} provider`
    );

    if (this.currentProvider === 'local') {
      return await this.generateLocalEmbeddings(chunks);
    } else if (this.currentProvider === 'cloud') {
      return await this.generateCloudEmbeddings(chunks);
    } else {
      throw new Error(`Unknown AI provider: ${this.currentProvider}`);
    }
  }

  /**
   * Generate embeddings using local OpenAI API
   */
  private async generateLocalEmbeddings(chunks: ChunkData[]): Promise<
    Array<{
      chunkIndex: number;
      embedding: number[];
      model: string;
      dimensions: number;
    }>
  > {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const embeddings = [];

    for (const chunk of chunks) {
      try {
        logger.debug(
          `🧠 Generating local embedding for chunk ${chunk.index + 1}/${chunk.totalChunks}`
        );

        const response = await this.retryWithBackoff(async () => {
          return await this.openai!.embeddings.create({
            model: this.EMBEDDING_MODEL,
            input: chunk.content,
          });
        });

        if (response.data.length > 0) {
          embeddings.push({
            chunkIndex: chunk.index,
            embedding: response.data[0].embedding,
            model: this.EMBEDDING_MODEL,
            dimensions: this.EMBEDDING_DIMENSIONS,
          });
        }
      } catch (error) {
        logger.error('❌ Failed to generate local embedding for chunk', {
          chunkIndex: chunk.index,
          error,
        });
        // Continue processing other chunks even if one fails
      }
    }

    return embeddings;
  }

  /**
   * Generate embeddings using Personyx Cloud API
   */
  private async generateCloudEmbeddings(chunks: ChunkData[]): Promise<
    Array<{
      chunkIndex: number;
      embedding: number[];
      model: string;
      dimensions: number;
    }>
  > {
    if (!this.cloudService) {
      throw new Error('Personyx Cloud service not initialized');
    }

    try {
      logger.debug(
        `🧠 Generating cloud embeddings for ${chunks.length} chunks`
      );

      // Prepare texts for batch processing
      const texts = chunks.map(chunk => chunk.content);

      const response = await this.cloudService.generateEmbeddings({
        texts,
        model: this.EMBEDDING_MODEL,
        dimensions: this.EMBEDDING_DIMENSIONS,
      });

      // Map response back to chunk format
      const embeddings = response.embeddings.map((embedding, index) => ({
        chunkIndex: chunks[index].index,
        embedding,
        model: response.model,
        dimensions: response.dimensions,
      }));

      logger.debug(`✅ Generated ${embeddings.length} cloud embeddings`);
      return embeddings;
    } catch (error) {
      logger.error('❌ Failed to generate cloud embeddings', error);
      throw error;
    }
  }

  /**
   * Classify content by persona using current AI provider
   */
  private async classifyByPersona(
    content: string,
    _chunks: ChunkData[]
  ): Promise<PersonaClassification[]> {
    logger.debug(
      `🎯 Classifying content using ${this.currentProvider} provider`
    );

    if (this.currentProvider === 'local') {
      return await this.classifyLocalContent(content);
    } else if (this.currentProvider === 'cloud') {
      return await this.classifyCloudContent(content);
    } else {
      throw new Error(`Unknown AI provider: ${this.currentProvider}`);
    }
  }

  /**
   * Classify content using local OpenAI API
   */
  private async classifyLocalContent(
    content: string
  ): Promise<PersonaClassification[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Get available personas
    const personas = await this.personaRepo.list();

    if (personas.length === 0) {
      logger.warn('⚠️ No personas available for classification');
      return [];
    }

    logger.debug(
      `🎯 Classifying content locally against ${personas.length} personas`
    );

    const classifications: PersonaClassification[] = [];

    for (const persona of personas) {
      try {
        logger.debug(`🎯 Classifying against persona: ${persona.name}`);

        const prompt = this.buildClassificationPrompt(persona, content);

        const response = await this.retryWithBackoff(async () => {
          return await this.openai!.chat.completions.create({
            model: this.CLASSIFICATION_MODEL,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert at analyzing user feedback and interviews to classify them by user personas. Respond only with valid JSON.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.1,
            max_tokens: 500,
          });
        });

        const result = this.parseClassificationResponse(
          response.choices[0].message.content || ''
        );

        if (result) {
          classifications.push({
            personaId: persona.id,
            confidence: result.confidence,
            reasoning: result.reasoning,
            keywords: result.keywords,
          });
        }
      } catch (error) {
        logger.error('❌ Failed to classify content for persona', {
          personaId: persona.id,
          error,
        });
        // Continue with other personas
      }
    }

    return classifications;
  }

  /**
   * Classify content using Personyx Cloud API
   */
  private async classifyCloudContent(
    content: string
  ): Promise<PersonaClassification[]> {
    if (!this.cloudService) {
      throw new Error('Personyx Cloud service not initialized');
    }

    try {
      // Get available personas
      const personas = await this.personaRepo.list();

      if (personas.length === 0) {
        logger.warn('⚠️ No personas available for classification');
        return [];
      }

      logger.debug(
        `🎯 Classifying content via cloud against ${personas.length} personas`
      );

      // Prepare personas for cloud API
      const cloudPersonas = personas.map(persona => ({
        id: persona.id,
        name: persona.name,
        description: persona.description,
        keywords:
          typeof persona.keywords === 'string'
            ? JSON.parse(persona.keywords)
            : persona.keywords,
      }));

      const response = await this.cloudService.classifyContent({
        content,
        personas: cloudPersonas,
      });

      logger.debug(
        `✅ Generated ${response.classifications.length} cloud classifications`
      );
      return response.classifications;
    } catch (error) {
      logger.error('❌ Failed to classify content via cloud', error);
      throw error;
    }
  }

  /**
   * Build classification prompt for a persona
   */
  private buildClassificationPrompt(persona: Persona, content: string): string {
    // Parse keywords if they come from database as JSON string
    const keywords =
      typeof persona.keywords === 'string'
        ? JSON.parse(persona.keywords)
        : persona.keywords;

    return `
Analyze this interview transcript and determine how well it matches the following user persona:

**Persona: ${persona.name}**
- Description: ${persona.description}
- Primary Goal: ${persona.primaryGoal}
- Main Pain Point: ${persona.mainPainPoint}
- Keywords: ${Array.isArray(keywords) ? keywords.join(', ') : ''}

**Interview Content:**
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Respond with a JSON object containing:
{
  "confidence": <number between 0-100>,
  "reasoning": "<brief explanation of why this matches or doesn't match the persona>",
  "keywords": ["<relevant keywords found in the content>"]
}

Be specific about pain points, goals, and language patterns that indicate this persona.
`;
  }

  /**
   * Parse classification response from OpenAI
   */
  private parseClassificationResponse(response: string): {
    confidence: number;
    reasoning: string;
    keywords: string[];
  } | null {
    try {
      // Extract JSON from response (may have extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
        reasoning: parsed.reasoning || '',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      };
    } catch (error) {
      logger.error('❌ Failed to parse classification response', {
        response,
        error,
      });
      return null;
    }
  }

  /**
   * Store evidence and embeddings to database
   */
  private async storeEvidence(
    transcriptEvent: TranscriptFileEvent,
    classifications: PersonaClassification[],
    embeddings: Array<{
      chunkIndex: number;
      embedding: number[];
      model: string;
      dimensions: number;
    }>
  ): Promise<string> {
    // Find the best persona classification
    const bestClassification = classifications.reduce(
      (best, current) => {
        return current.confidence > (best?.confidence || 0) ? current : best;
      },
      null as PersonaClassification | null
    );

    if (!bestClassification) {
      throw new Error('No valid persona classification found');
    }

    // Create evidence record
    const evidence = await this.evidenceRepo.create({
      personaId: bestClassification.personaId,
      content: transcriptEvent.content,
      source: transcriptEvent.fileName,
      sourceType: 'interview',
      timestamp: transcriptEvent.timestamp,
      tags: JSON.stringify(bestClassification.keywords),
      sentiment: null, // Could be enhanced with sentiment analysis
      importance: Math.round(bestClassification.confidence / 10), // 1-10 scale
    });

    // Store embeddings
    for (const embeddingData of embeddings) {
      await this.embeddingRepo.create({
        evidenceId: evidence.id,
        embedding: this.embeddingRepo.serializeEmbedding(
          embeddingData.embedding
        ),
        model: embeddingData.model,
        dimensions: embeddingData.dimensions,
        chunkIndex: embeddingData.chunkIndex,
        chunkCount: embeddings.length,
      });
    }

    logger.info('💾 Evidence and embeddings stored successfully', {
      evidenceId: evidence.id,
      personaId: bestClassification.personaId,
      confidence: bestClassification.confidence,
      embeddingsCount: embeddings.length,
    });

    return evidence.id;
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(operation: () => Promise<T>): Promise<T> {
    let lastError;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.MAX_RETRIES) {
          break;
        }

        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
        logger.debug(
          `⏳ Retrying operation in ${delay}ms (attempt ${attempt}/${this.MAX_RETRIES})`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if service is ready for processing
   */
  public isReady(): boolean {
    return this.isInitialized && this.openai !== null;
  }

  /**
   * Get service status
   */
  public getStatus(): {
    initialized: boolean;
    currentProvider: AIServiceProvider;
    hasLocalKey: boolean;
    hasCloudKey: boolean;
    model: string;
    embeddingDimensions: number;
  } {
    return {
      initialized: this.isInitialized,
      currentProvider: this.currentProvider,
      hasLocalKey: this.openai !== null,
      hasCloudKey: this.cloudService?.getStatus().hasApiKey || false,
      model: this.CLASSIFICATION_MODEL,
      embeddingDimensions: this.EMBEDDING_DIMENSIONS,
    };
  }
}
