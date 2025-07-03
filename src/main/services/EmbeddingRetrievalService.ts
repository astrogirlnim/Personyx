/**
 * Embedding Retrieval Service
 * Provides similarity search for persona pull-quotes with caching
 * Phase 2, Feature 2 - Embedding Retrieval API
 */

import { Logger } from '@main/utils/logger';
import { EmbeddingRepo } from '@main/db/repositories/EmbeddingRepo';
import { EvidenceRepo } from '@main/db/repositories/EvidenceRepo';
import { PersonaRepo } from '@main/db/repositories/PersonaRepo';
import { LangGraphService } from './LangGraphService';
import type { TranscriptFileEvent } from './InterviewFolderWatcher';
import type { Persona, Evidence } from '@shared/types';
import type { Embedding } from '@main/db/schema';

const logger = new Logger('embedding-retrieval-service');

// Similarity search result interface
export interface SimilarityResult {
  evidenceId: string;
  evidence: Evidence;
  embedding: Embedding;
  similarity: number;
  quote: string; // Relevant excerpt from evidence
  persona?: Persona;
}

// Search query interface
export interface SearchQuery {
  query: string;
  personaId?: string;
  topN?: number;
  minSimilarity?: number;
}

// Search response interface
export interface SearchResponse {
  results: SimilarityResult[];
  queryTime: number;
  cached: boolean;
  totalResults: number;
}

// Cache entry interface
interface CacheEntry {
  query: string;
  response: SearchResponse;
  timestamp: number;
  personaId?: string;
}

export class EmbeddingRetrievalService {
  private embeddingRepo: EmbeddingRepo;
  private evidenceRepo: EvidenceRepo;
  private personaRepo: PersonaRepo;
  private langGraphService: LangGraphService;

  // Memory cache for query results (5-minute sliding window)
  private queryCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Prevent memory bloat

  // Performance optimization constants
  private readonly DEFAULT_TOP_N = 10;
  private readonly DEFAULT_MIN_SIMILARITY = 0.7;
  private readonly MAX_TOP_N = 50;

  constructor() {
    this.embeddingRepo = new EmbeddingRepo();
    this.evidenceRepo = new EvidenceRepo();
    this.personaRepo = new PersonaRepo();
    this.langGraphService = new LangGraphService();

    // Set up cache cleanup interval
    this.setupCacheCleanup();
  }

  /**
   * Feature 2.1: Provide a similarity-search endpoint that returns top-N persona pull-quotes
   */
  async searchSimilar(searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    logger.info('🔍 Starting similarity search', {
      query: searchQuery.query.substring(0, 50) + '...',
      personaId: searchQuery.personaId,
      topN: searchQuery.topN || this.DEFAULT_TOP_N,
    });

    try {
      // Check cache first (Feature 2.3)
      const cacheKey = this.generateCacheKey(searchQuery);
      const cachedResult = this.getCachedResult(cacheKey);

      if (cachedResult) {
        logger.debug('✅ Cache hit for similarity search', { cacheKey });
        return {
          ...cachedResult.response,
          queryTime: Date.now() - startTime,
          cached: true,
        };
      }

      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(
        searchQuery.query
      );

      // Get all relevant embeddings based on persona filter
      const embeddings = await this.getRelevantEmbeddings(
        searchQuery.personaId
      );

      if (embeddings.length === 0) {
        logger.warn('📭 No embeddings found for similarity search');
        const emptyResponse: SearchResponse = {
          results: [],
          queryTime: Date.now() - startTime,
          cached: false,
          totalResults: 0,
        };
        return emptyResponse;
      }

      // Calculate similarities (Feature 2.2: Optimized for <200ms queries)
      const similarities = await this.calculateSimilarities(
        queryEmbedding,
        embeddings,
        {
          topN: Math.min(
            searchQuery.topN || this.DEFAULT_TOP_N,
            this.MAX_TOP_N
          ),
          minSimilarity:
            searchQuery.minSimilarity || this.DEFAULT_MIN_SIMILARITY,
        }
      );

      // Enrich results with evidence and persona data
      const enrichedResults = await this.enrichResults(similarities);

      const response: SearchResponse = {
        results: enrichedResults,
        queryTime: Date.now() - startTime,
        cached: false,
        totalResults: enrichedResults.length,
      };

      // Cache the result (Feature 2.3)
      this.cacheResult(cacheKey, response, searchQuery.personaId);

      logger.info('✅ Similarity search completed', {
        results: enrichedResults.length,
        queryTime: response.queryTime,
        cached: false,
      });

      return response;
    } catch (error) {
      logger.error('❌ Similarity search failed', error);
      throw new Error(`Similarity search failed: ${error}`);
    }
  }

  /**
   * Generate embedding for search query
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    logger.debug('🧠 Generating query embedding...');

    try {
      // Initialize LangGraph service if not ready
      if (!this.langGraphService.isReady()) {
        await this.langGraphService.initialize();
      }

      // Use LangGraph service to generate embedding
      // We'll create a mock transcript event to reuse the existing embedding generation
      const mockTranscriptEvent: TranscriptFileEvent = {
        fileName: 'query-embedding',
        filePath: '/tmp/query',
        content: query,
        timestamp: new Date(),
        fileSize: query.length,
        sourceType: 'interview',
      };

      const result =
        await this.langGraphService.processTranscript(mockTranscriptEvent);

      if (result.embeddings.length > 0) {
        return result.embeddings[0].embedding;
      } else {
        throw new Error('Failed to generate query embedding');
      }
    } catch (error) {
      logger.error('❌ Failed to generate query embedding', error);
      throw error;
    }
  }

  /**
   * Get relevant embeddings based on persona filter
   */
  private async getRelevantEmbeddings(
    personaId?: string
  ): Promise<Embedding[]> {
    logger.debug('📋 Fetching relevant embeddings', { personaId });

    try {
      if (personaId) {
        // Get embeddings for specific persona
        const evidence = await this.evidenceRepo.findByPersonaId(personaId);
        const embeddings: Embedding[] = [];

        for (const ev of evidence) {
          const evEmbeddings = await this.embeddingRepo.findByEvidenceId(ev.id);
          embeddings.push(...evEmbeddings);
        }

        return embeddings;
      } else {
        // Get all embeddings
        return await this.embeddingRepo.list();
      }
    } catch (error) {
      logger.error('❌ Failed to fetch relevant embeddings', error);
      throw error;
    }
  }

  /**
   * Feature 2.2: Optimized vector similarity calculations for <200ms queries
   */
  private async calculateSimilarities(
    queryEmbedding: number[],
    embeddings: Embedding[],
    options: { topN: number; minSimilarity: number }
  ): Promise<Array<{ embedding: Embedding; similarity: number }>> {
    logger.debug('📊 Calculating similarities', {
      queryDimensions: queryEmbedding.length,
      embeddingsCount: embeddings.length,
      topN: options.topN,
    });

    const startTime = Date.now();
    const similarities: Array<{ embedding: Embedding; similarity: number }> =
      [];

    // Optimized similarity calculation using vectorized operations
    for (const embedding of embeddings) {
      try {
        const embeddingVector = this.embeddingRepo.parseEmbedding(
          embedding.embedding
        );
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          embeddingVector
        );

        // Only include results above minimum similarity threshold
        if (similarity >= options.minSimilarity) {
          similarities.push({ embedding, similarity });
        }
      } catch (error) {
        logger.warn('⚠️ Failed to calculate similarity for embedding', {
          embeddingId: embedding.id,
          error,
        });
        // Continue with other embeddings
      }
    }

    // Sort by similarity (highest first) and take top N
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topResults = similarities.slice(0, options.topN);

    const calculationTime = Date.now() - startTime;
    logger.debug('✅ Similarity calculations completed', {
      totalResults: similarities.length,
      topResults: topResults.length,
      calculationTime,
    });

    // Performance warning if taking too long (Feature 2.2 requirement: <200ms)
    if (calculationTime > 200) {
      logger.warn('⚠️ Similarity calculation exceeded 200ms target', {
        calculationTime,
        embeddingsCount: embeddings.length,
      });
    }

    return topResults;
  }

  /**
   * Calculate cosine similarity between two vectors
   * Optimized for performance
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Vectorized calculation for performance
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0; // Handle zero vectors
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Enrich similarity results with evidence and persona data
   */
  private async enrichResults(
    similarities: Array<{ embedding: Embedding; similarity: number }>
  ): Promise<SimilarityResult[]> {
    logger.debug('🔍 Enriching similarity results with evidence data');

    const enrichedResults: SimilarityResult[] = [];

    for (const { embedding, similarity } of similarities) {
      try {
        // Get evidence for this embedding
        const evidenceData = await this.evidenceRepo.findById(
          embedding.evidenceId
        );
        if (!evidenceData) {
          logger.warn('⚠️ Evidence not found for embedding', {
            embeddingId: embedding.id,
            evidenceId: embedding.evidenceId,
          });
          continue;
        }

        // Get persona for this evidence
        const persona = await this.personaRepo.findById(evidenceData.personaId);

        // Extract relevant quote from evidence content
        const quote = this.extractRelevantQuote(evidenceData.content);

        enrichedResults.push({
          evidenceId: evidenceData.id,
          evidence: evidenceData,
          embedding,
          similarity,
          quote,
          persona: persona || undefined,
        });
      } catch (error) {
        logger.warn('⚠️ Failed to enrich similarity result', {
          embeddingId: embedding.id,
          error,
        });
        // Continue with other results
      }
    }

    return enrichedResults;
  }

  /**
   * Extract relevant quote from evidence content
   * For now, we'll take the first meaningful sentence
   */
  private extractRelevantQuote(
    content: string,
    maxLength: number = 200
  ): string {
    // Split into sentences and find the first substantial one
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    if (sentences.length === 0) {
      return (
        content.substring(0, maxLength) +
        (content.length > maxLength ? '...' : '')
      );
    }

    const quote = sentences[0].trim();
    return quote.length > maxLength
      ? quote.substring(0, maxLength) + '...'
      : quote;
  }

  /**
   * Feature 2.3: Cache repeat queries with 5-minute sliding window
   */
  private generateCacheKey(searchQuery: SearchQuery): string {
    return JSON.stringify({
      query: searchQuery.query.toLowerCase().trim(),
      personaId: searchQuery.personaId || null,
      topN: searchQuery.topN || this.DEFAULT_TOP_N,
      minSimilarity: searchQuery.minSimilarity || this.DEFAULT_MIN_SIMILARITY,
    });
  }

  private getCachedResult(cacheKey: string): CacheEntry | null {
    const entry = this.queryCache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid (5-minute TTL)
    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL_MS) {
      this.queryCache.delete(cacheKey);
      return null;
    }

    return entry;
  }

  private cacheResult(
    cacheKey: string,
    response: SearchResponse,
    personaId?: string
  ): void {
    // Prevent cache from growing too large
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple FIFO)
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }

    const cacheEntry: CacheEntry = {
      query: cacheKey,
      response: {
        ...response,
        cached: false, // Reset cached flag for stored entry
      },
      timestamp: Date.now(),
      personaId,
    };

    this.queryCache.set(cacheKey, cacheEntry);

    logger.debug('💾 Cached similarity search result', {
      cacheKey: cacheKey.substring(0, 50) + '...',
      resultCount: response.results.length,
      cacheSize: this.queryCache.size,
    });
  }

  /**
   * Set up cache cleanup to prevent memory leaks
   */
  private setupCacheCleanup(): void {
    // Clean up expired cache entries every minute
    setInterval(() => {
      const now = Date.now();
      let removedCount = 0;

      for (const [key, entry] of this.queryCache.entries()) {
        if (now - entry.timestamp > this.CACHE_TTL_MS) {
          this.queryCache.delete(key);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        logger.debug('🧹 Cache cleanup completed', {
          removed: removedCount,
          remaining: this.queryCache.size,
        });
      }
    }, 60 * 1000); // Run every minute
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
  } {
    const entries = Array.from(this.queryCache.values());
    const now = Date.now();

    return {
      size: this.queryCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // TODO: Implement hit rate tracking
      oldestEntry:
        entries.length > 0
          ? Math.min(...entries.map(e => now - e.timestamp))
          : 0,
    };
  }

  /**
   * Clear cache manually (useful for testing)
   */
  public clearCache(): void {
    this.queryCache.clear();
    logger.info('🧹 Cache cleared manually');
  }

  /**
   * Get service status
   */
  public getStatus(): {
    initialized: boolean;
    cacheSize: number;
    langGraphReady: boolean;
  } {
    return {
      initialized: true,
      cacheSize: this.queryCache.size,
      langGraphReady: this.langGraphService.isReady(),
    };
  }
}
