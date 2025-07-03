/**
 * Evidence Score Service - Core scoring algorithm for PRD-persona evidence matching
 * Calculates 0-100 evidence scores based on recency, coverage, and relevance heuristics
 */

import { BrowserWindow } from 'electron';
import { createHash } from 'crypto';
import { EvidenceScoreRepo } from '@main/db/repositories/EvidenceScoreRepo';
import { EvidenceRepo } from '@main/db/repositories/EvidenceRepo';
import { PersonaRepo } from '@main/db/repositories/PersonaRepo';
import { ProductDocumentRepo } from '@main/db/repositories/ProductDocumentRepo';
import { Logger } from '@main/utils/logger';
import type {
  EvidenceScore as DbEvidenceScore,
  Evidence as DbEvidence,
  Persona as DbPersona,
  ProductDocument as DbProductDocument,
} from '@main/db/schema';
import type {
  EvidenceScore,
  Evidence,
  Persona,
  ProductDocument,
} from '@shared/types';

const logger = new Logger('evidence-score-service');

export interface ScoreBreakdown {
  recency: number; // 0-100: Evidence freshness score
  coverage: number; // 0-100: How much persona needs are covered
  relevance: number; // 0-100: How relevant evidence is to persona
}

export interface CalculationResult {
  score: number; // 0-100: Overall evidence score
  breakdown: ScoreBreakdown;
  evidenceCount: number;
  topQuotes: string[];
}

export class EvidenceScoreService {
  private evidenceScoreRepo: EvidenceScoreRepo;
  private evidenceRepo: EvidenceRepo;
  private personaRepo: PersonaRepo;
  private productDocumentRepo: ProductDocumentRepo;
  private mainWindow: BrowserWindow | null;

  // Scoring weights (must sum to 1.0)
  private static readonly WEIGHTS = {
    recency: 0.05, // 5% weight for recency (minimal - good evidence doesn't expire)
    coverage: 0.55, // 55% weight for coverage (most important - does evidence cover persona needs)
    relevance: 0.4, // 40% weight for relevance (how well evidence relates to this specific PRD)
  };

  // Scoring thresholds
  private static readonly THRESHOLDS = {
    minEvidenceForHighScore: 5, // Need at least 5 evidence items for score > 80
    maxAgeForFullRecency: 30, // Days - evidence older than 30 days gets reduced recency score
    minQuotesForTopList: 3, // Minimum quotes to include in top quotes
    maxTopQuotes: 5, // Maximum top quotes to return
  };

  constructor(mainWindow: BrowserWindow | null = null) {
    this.evidenceScoreRepo = new EvidenceScoreRepo();
    this.evidenceRepo = new EvidenceRepo();
    this.personaRepo = new PersonaRepo();
    this.productDocumentRepo = new ProductDocumentRepo();
    this.mainWindow = mainWindow;
  }

  /**
   * Convert database Evidence to shared Evidence type
   */
  private convertDbEvidence(dbEvidence: DbEvidence): Evidence {
    let tags: string[] = [];

    try {
      // FIX: Handle both JSON array format and already-parsed array format
      if (Array.isArray(dbEvidence.tags)) {
        // Tags are already an array (common with newer data)
        tags = dbEvidence.tags.filter(
          tag => typeof tag === 'string' && tag.length > 0
        );
        logger.debug('✅ Tags already parsed as array', {
          evidenceId: dbEvidence.id,
          tagsArray: tags,
          originalType: 'array',
        });
      } else if (typeof dbEvidence.tags === 'string') {
        // Tags are a string (JSON or comma-separated)
        if (dbEvidence.tags.startsWith('[')) {
          // JSON array format
          tags = JSON.parse(dbEvidence.tags);
          logger.debug('✅ Parsed JSON tags', {
            evidenceId: dbEvidence.id,
            tagsArray: tags,
            originalType: 'json-string',
          });
        } else {
          // Legacy comma-separated format
          tags = dbEvidence.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
          logger.debug('✅ Parsed comma-separated tags', {
            evidenceId: dbEvidence.id,
            tagsArray: tags,
            originalType: 'comma-separated-string',
          });
        }
      } else {
        logger.warn('⚠️ Unknown tags format, using empty array', {
          evidenceId: dbEvidence.id,
          tagsValue: dbEvidence.tags,
          tagsType: typeof dbEvidence.tags,
        });
        tags = [];
      }
    } catch (error) {
      logger.warn('⚠️ Failed to parse evidence tags, using empty array', {
        evidenceId: dbEvidence.id,
        tagsValue: dbEvidence.tags,
        error: error instanceof Error ? error.message : String(error),
      });
      tags = [];
    }

    // 🐛🐛🐛 ENHANCED DEBUGGING FOR TIMESTAMP CONVERSION 🐛🐛🐛
    logger.info('🐛 [DEBUG] STARTING TIMESTAMP CONVERSION', {
      evidenceId: dbEvidence.id,
      originalTimestamp: dbEvidence.timestamp,
      timestampType: typeof dbEvidence.timestamp,
      timestampConstructor: dbEvidence.timestamp?.constructor?.name,
      isDate: false, // timestamp is always a number in database
      isNumber: typeof dbEvidence.timestamp === 'number',
      isString: typeof dbEvidence.timestamp === 'string',
      rawValue: dbEvidence.timestamp,
    });

    // FIX: Enhanced timestamp conversion with better validation and debugging
    let timestamp: Date;
    try {
      logger.debug('🔍 Converting timestamp', {
        evidenceId: dbEvidence.id,
        originalTimestamp: dbEvidence.timestamp,
        timestampType: typeof dbEvidence.timestamp,
        isDate: false, // timestamp is always a number in database
        timestampConstructor: dbEvidence.timestamp?.constructor?.name,
      });

      // Database always returns timestamp as number (Unix seconds)
      if (typeof dbEvidence.timestamp === 'number') {
        logger.info('🐛 [DEBUG] Number timestamp detected', {
          evidenceId: dbEvidence.id,
          numberValue: dbEvidence.timestamp,
          isInteger: Number.isInteger(dbEvidence.timestamp),
          isFinite: Number.isFinite(dbEvidence.timestamp),
        });

        // Unix timestamp (seconds or milliseconds)
        let timestampMs: number;
        if (dbEvidence.timestamp > 1000000000000) {
          // Already in milliseconds
          timestampMs = dbEvidence.timestamp;
          logger.info('🐛 [DEBUG] Timestamp already in milliseconds', {
            evidenceId: dbEvidence.id,
            timestampMs: timestampMs,
          });
        } else {
          // In seconds, convert to milliseconds
          timestampMs = dbEvidence.timestamp * 1000;
          logger.info('🐛 [DEBUG] Converting seconds to milliseconds', {
            evidenceId: dbEvidence.id,
            originalSeconds: dbEvidence.timestamp,
            convertedMs: timestampMs,
          });
        }

        timestamp = new Date(timestampMs);
        const resultTimeMs = timestamp.getTime();
        logger.info('🐛 [DEBUG] Created Date from number', {
          evidenceId: dbEvidence.id,
          inputMs: timestampMs,
          resultTimeMs: resultTimeMs,
          isNaN: isNaN(resultTimeMs),
          dateString: timestamp.toString(),
        });

        if (isNaN(resultTimeMs)) {
          throw new Error(`Invalid Unix timestamp: ${dbEvidence.timestamp}`);
        }

        logger.debug('✅ Converted Unix timestamp to Date', {
          evidenceId: dbEvidence.id,
          unixTimestamp: dbEvidence.timestamp,
          timestampMs: timestampMs,
          convertedDate: timestamp.toISOString(),
        });
      } else if (typeof dbEvidence.timestamp === 'string') {
        logger.info('🐛 [DEBUG] String timestamp detected', {
          evidenceId: dbEvidence.id,
          stringValue: dbEvidence.timestamp,
          stringLength: (dbEvidence.timestamp as string).length,
        });

        // ISO date string
        timestamp = new Date(dbEvidence.timestamp);
        const resultTimeMs = timestamp.getTime();
        logger.info('🐛 [DEBUG] Created Date from string', {
          evidenceId: dbEvidence.id,
          inputString: dbEvidence.timestamp,
          resultTimeMs: resultTimeMs,
          isNaN: isNaN(resultTimeMs),
          dateString: timestamp.toString(),
        });

        if (isNaN(resultTimeMs)) {
          throw new Error(`Invalid ISO date string: ${dbEvidence.timestamp}`);
        }

        logger.debug('✅ Parsed ISO date string to Date', {
          evidenceId: dbEvidence.id,
          isoString: dbEvidence.timestamp,
          convertedDate: timestamp.toISOString(),
        });
      } else {
        logger.error('🐛 [DEBUG] Unknown timestamp format', {
          evidenceId: dbEvidence.id,
          timestampValue: dbEvidence.timestamp,
          timestampType: typeof dbEvidence.timestamp,
          isNull: dbEvidence.timestamp === null,
          isUndefined: dbEvidence.timestamp === undefined,
        });
        // Unknown format
        throw new Error(
          `Unknown timestamp format: ${typeof dbEvidence.timestamp} - ${dbEvidence.timestamp}`
        );
      }

      // 🐛🐛🐛 FINAL VALIDATION WITH ENHANCED DEBUGGING 🐛🐛🐛
      const finalTimeMs = timestamp.getTime();
      logger.info('🐛 [DEBUG] FINAL TIMESTAMP VALIDATION', {
        evidenceId: dbEvidence.id,
        finalDate: timestamp,
        finalTimeMs: finalTimeMs,
        isNaN: isNaN(finalTimeMs),
        dateString: timestamp.toString(),
        isoString: isNaN(finalTimeMs)
          ? 'CANNOT_CONVERT'
          : timestamp.toISOString(),
      });

      // Final validation: ensure the Date object is valid and reasonable
      if (isNaN(finalTimeMs)) {
        throw new Error('Final Date object validation failed (NaN)');
      }

      // Check if timestamp is reasonable (not too far in the past or future)
      const now = new Date();
      const minDate = new Date('2020-01-01'); // Reasonable minimum date
      const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year in future

      if (timestamp < minDate || timestamp > maxDate) {
        logger.warn(
          '⚠️ Timestamp is outside reasonable range, but using it anyway',
          {
            evidenceId: dbEvidence.id,
            timestamp: timestamp.toISOString(),
            minDate: minDate.toISOString(),
            maxDate: maxDate.toISOString(),
          }
        );
      }

      logger.info('🐛 [DEBUG] TIMESTAMP CONVERSION SUCCESS', {
        evidenceId: dbEvidence.id,
        finalTimestamp: timestamp.toISOString(),
        finalTimeMs: finalTimeMs,
      });
    } catch (error) {
      // Last resort fallback with detailed logging
      const fallbackTimestamp = new Date();
      logger.error(
        '❌ Timestamp conversion failed, using current date as fallback',
        {
          evidenceId: dbEvidence.id,
          originalTimestamp: dbEvidence.timestamp,
          originalType: typeof dbEvidence.timestamp,
          isDate: false, // timestamp is always a number in database
          dateGetTime: 'N/A', // timestamp is stored as Unix seconds
          error: error instanceof Error ? error.message : String(error),
          fallbackDate: fallbackTimestamp.toISOString(),
        }
      );
      timestamp = fallbackTimestamp;
    }

    const result: Evidence = {
      id: dbEvidence.id,
      personaId: dbEvidence.personaId,
      content: dbEvidence.content,
      source: dbEvidence.source,
      sourceType: dbEvidence.sourceType as
        | 'interview'
        | 'prd'
        | 'feedback'
        | 'other',
      timestamp: timestamp,
      tags,
      sentiment: dbEvidence.sentiment as
        | 'positive'
        | 'negative'
        | 'neutral'
        | undefined,
      importance: dbEvidence.importance,
    };

    logger.info('🐛 [DEBUG] CONVERTED EVIDENCE COMPLETE', {
      evidenceId: result.id,
      timestampInResult: result.timestamp.toISOString(),
      timestampMs: result.timestamp.getTime(),
    });

    return result;
  }

  /**
   * Convert database Persona to shared Persona type
   */
  private convertDbPersona(dbPersona: DbPersona): Persona {
    let keywords: string[] = [];

    try {
      // Handle both JSON array format and comma-separated string format
      if (dbPersona.keywords.startsWith('[')) {
        keywords = JSON.parse(dbPersona.keywords);
      } else {
        // Legacy format: comma-separated string
        keywords = dbPersona.keywords
          .split(',')
          .map(kw => kw.trim())
          .filter(kw => kw.length > 0);
      }
    } catch (error) {
      logger.warn('⚠️ Failed to parse persona keywords, using empty array', {
        personaId: dbPersona.id,
        keywordsValue: dbPersona.keywords,
        error: error instanceof Error ? error.message : String(error),
      });
      keywords = [];
    }

    return {
      id: dbPersona.id,
      name: dbPersona.name,
      description: dbPersona.description,
      primaryGoal: dbPersona.primaryGoal,
      mainPainPoint: dbPersona.mainPainPoint,
      keywords,
      createdAt: dbPersona.createdAt,
      updatedAt: dbPersona.updatedAt,
    };
  }

  /**
   * Convert database ProductDocument to shared ProductDocument type
   */
  private convertDbProductDocument(
    dbDocument: DbProductDocument
  ): ProductDocument {
    return {
      id: dbDocument.id,
      title: dbDocument.title,
      content: dbDocument.content,
      filePath: dbDocument.filePath ?? undefined,
      type: dbDocument.type as 'prd' | 'requirements' | 'spec',
      uploadedAt: dbDocument.uploadedAt,
      lastModified: dbDocument.lastModified,
      evidenceScore: dbDocument.evidenceScore ?? undefined,
    };
  }

  /**
   * Convert database EvidenceScore to shared EvidenceScore type
   */
  private convertDbEvidenceScore(dbScore: DbEvidenceScore): EvidenceScore {
    return {
      id: dbScore.id,
      documentId: dbScore.documentId,
      personaId: dbScore.personaId,
      score: dbScore.score,
      evidenceCount: dbScore.evidenceCount,
      lastCalculated: dbScore.lastCalculated,
      topQuotes: JSON.parse(dbScore.topQuotes),
      breakdown: {
        recency: dbScore.breakdownRecency,
        coverage: dbScore.breakdownCoverage,
        relevance: dbScore.breakdownRelevance,
      },
    };
  }

  /**
   * Calculate evidence score for a PRD-persona combination
   * Main entry point for scoring algorithm
   */
  async calculateEvidenceScore(
    prdId: string,
    personaId: string
  ): Promise<CalculationResult> {
    try {
      logger.info('🎯 Calculating evidence score', { prdId, personaId });

      // Validate inputs exist (repositories already return converted types)
      const document = await this.productDocumentRepo.findById(prdId);
      if (!document) {
        throw new Error(`Product document not found: ${prdId}`);
      }

      const persona = await this.personaRepo.findById(personaId);
      if (!persona) {
        throw new Error(`Persona not found: ${personaId}`);
      }

      // 🐛 CRITICAL DEBUG: Log the EXACT document content being scored
      logger.info('🐛 [CRITICAL DEBUG] Document content being scored:', {
        documentId: document.id,
        documentTitle: document.title,
        contentLength: document.content.length,
        contentPreview: document.content.substring(0, 300),
        contentLines: document.content.split('\n').slice(0, 10),
        contentHash: createHash('md5').update(document.content).digest('hex'),
        contentFirstWords: document.content
          .toLowerCase()
          .split(/\W+/)
          .filter(w => w.length > 2)
          .slice(0, 20),
      });

      logger.debug('📄 PRD Details', {
        prdId,
        title: document.title,
        contentLength: document.content.length,
        type: document.type,
      });

      logger.debug('👤 Persona Details', {
        personaId,
        name: persona.name,
        keywords: persona.keywords,
        primaryGoal: persona.primaryGoal,
      });

      // Get relevant evidence for this persona (already in shared types)
      const allEvidence = await this.evidenceRepo.findByPersonaId(personaId);
      logger.debug(
        `📊 Found ${allEvidence.length} evidence items for persona`,
        {
          personaId,
          personaName: persona.name,
          evidenceIds: allEvidence.map(e => e.id),
          evidenceImportances: allEvidence.map(e => e.importance),
          evidenceTypes: allEvidence.map(e => e.sourceType),
        }
      );

      // Filter evidence relevant to this PRD (based on content similarity)
      const convertedDocument = this.convertDbProductDocument(document);

      // 🐛 CRITICAL DEBUG: Verify converted document content
      logger.info('🐛 [CRITICAL DEBUG] Converted document for filtering:', {
        originalContentLength: document.content.length,
        convertedContentLength: convertedDocument.content.length,
        contentMatches: document.content === convertedDocument.content,
        convertedContentPreview: convertedDocument.content.substring(0, 200),
        convertedContentHash: createHash('md5')
          .update(convertedDocument.content)
          .digest('hex'),
      });

      const relevantEvidence = await this.filterRelevantEvidence(
        allEvidence,
        convertedDocument,
        persona
      );

      logger.info(
        `🔍 Filtered to ${relevantEvidence.length} relevant evidence items`,
        {
          prdId,
          personaId,
          filteredEvidenceIds: relevantEvidence.map(e => e.id),
          filteredImportances: relevantEvidence.map(e => e.importance),
        }
      );

      // Calculate score components
      const breakdown = await this.calculateScoreBreakdown(
        relevantEvidence,
        persona,
        convertedDocument
      );

      // Calculate final weighted score
      const finalScore = this.calculateWeightedScore(breakdown);

      // Extract top quotes for insights
      const topQuotes = this.extractTopQuotes(relevantEvidence);

      const result: CalculationResult = {
        score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
        breakdown: {
          recency: Math.round(breakdown.recency * 100) / 100,
          coverage: Math.round(breakdown.coverage * 100) / 100,
          relevance: Math.round(breakdown.relevance * 100) / 100,
        },
        evidenceCount: relevantEvidence.length,
        topQuotes,
      };

      logger.info('✅ Evidence score calculated successfully', {
        prdId,
        personaId,
        score: result.score,
        evidenceCount: result.evidenceCount,
        breakdown: result.breakdown,
        finalScoreBeforeRounding: finalScore,
      });

      return result;
    } catch (error) {
      logger.error('❌ Failed to calculate evidence score', error);
      throw error;
    }
  }

  /**
   * Persist calculated score to database
   */
  async persistEvidenceScore(
    prdId: string,
    personaId: string,
    calculation: CalculationResult
  ): Promise<EvidenceScore> {
    try {
      logger.info('💾 Persisting evidence score to database', {
        prdId,
        personaId,
        score: calculation.score,
      });

      // Check if score already exists
      const existingScore =
        await this.evidenceScoreRepo.findByDocumentAndPersona(prdId, personaId);

      let savedScore: EvidenceScore;

      if (existingScore) {
        // Update existing score
        logger.debug('📝 Updating existing evidence score', {
          scoreId: existingScore.id,
        });

        const updatedScore = await this.evidenceScoreRepo.update(
          existingScore.id,
          {
            score: calculation.score,
            evidenceCount: calculation.evidenceCount,
            topQuotes: JSON.stringify(calculation.topQuotes),
            breakdownRecency: calculation.breakdown.recency,
            breakdownCoverage: calculation.breakdown.coverage,
            breakdownRelevance: calculation.breakdown.relevance,
          }
        );

        if (!updatedScore) {
          throw new Error('Failed to update evidence score');
        }
        savedScore = this.convertDbEvidenceScore(updatedScore);
      } else {
        // Create new score
        logger.debug('➕ Creating new evidence score record');

        const createdScore = await this.evidenceScoreRepo.create({
          documentId: prdId,
          personaId: personaId,
          score: calculation.score,
          evidenceCount: calculation.evidenceCount,
          topQuotes: JSON.stringify(calculation.topQuotes),
          breakdownRecency: calculation.breakdown.recency,
          breakdownCoverage: calculation.breakdown.coverage,
          breakdownRelevance: calculation.breakdown.relevance,
        });

        savedScore = this.convertDbEvidenceScore(createdScore);
      }

      logger.info('✅ Evidence score persisted successfully', {
        scoreId: savedScore.id,
        score: savedScore.score,
      });

      // Emit evidence-score-updated event for real-time UI updates
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('evidence-score-updated', {
          documentId: prdId,
          scores: [savedScore],
        });
        logger.debug('📢 Emitted evidence-score-updated event', {
          documentId: prdId,
          score: savedScore.score,
        });
      } else {
        logger.warn(
          '⚠️ Cannot emit evidence-score-updated - main window not available'
        );
      }

      return savedScore;
    } catch (error) {
      logger.error('❌ Failed to persist evidence score', error);
      throw error;
    }
  }

  /**
   * Calculate and persist evidence score in one operation
   * This is the main public method for Phase 2.1.2 requirement
   */
  async calculateAndPersistScore(
    prdId: string,
    personaId: string
  ): Promise<EvidenceScore> {
    const calculation = await this.calculateEvidenceScore(prdId, personaId);
    return await this.persistEvidenceScore(prdId, personaId, calculation);
  }

  /**
   * Filter evidence that's relevant to the PRD content
   * Uses keyword matching and importance scoring
   */
  private async filterRelevantEvidence(
    allEvidence: Evidence[],
    document: ProductDocument,
    _persona: Persona
  ): Promise<Evidence[]> {
    const personaKeywords = _persona.keywords.map((k: string) =>
      k.toLowerCase()
    );

    logger.debug('🔍 PERSONA KEYWORDS:', {
      personaId: _persona.id,
      keywords: personaKeywords,
    });

    // BUGFIX: Exclude PRD-sourced evidence from scoring calculation
    // PRD content should be scored AGAINST existing evidence, not treated as evidence itself
    const nonPRDEvidence = allEvidence.filter(
      evidence => evidence.sourceType !== 'prd'
    );

    logger.debug(
      `🔍 Filtering evidence: ${allEvidence.length} total, ${nonPRDEvidence.length} non-PRD evidence`,
      {
        totalEvidence: allEvidence.length,
        nonPRDEvidence: nonPRDEvidence.length,
        prdEvidenceFiltered: allEvidence.length - nonPRDEvidence.length,
      }
    );

    const filteredEvidence = nonPRDEvidence.filter(evidence => {
      // Always include high-importance evidence (8+)
      if (evidence.importance >= 8) {
        logger.debug(
          `✅ Including high-importance evidence: ${evidence.id} (importance: ${evidence.importance})`
        );
        return true;
      }

      // Check if evidence content contains persona keywords
      const evidenceText = evidence.content.toLowerCase();
      const hasKeywordMatch = personaKeywords.some(keyword =>
        evidenceText.includes(keyword)
      );

      // Check if evidence mentions topics from the PRD
      const hasContentRelevance = this.checkContentRelevance(
        evidence.content,
        document.content
      );

      const includeEvidence =
        (hasKeywordMatch || hasContentRelevance) && evidence.importance >= 5;

      logger.debug(`🔍 Evidence filtering: ${evidence.id}`, {
        importance: evidence.importance,
        hasKeywordMatch,
        hasContentRelevance,
        included: includeEvidence,
        content: evidence.content.substring(0, 100) + '...',
        tags: evidence.tags,
      });

      return includeEvidence;
    });

    logger.debug(
      `🎯 FINAL FILTERED EVIDENCE COUNT: ${filteredEvidence.length}`,
      {
        personaId: _persona.id,
        evidenceIds: filteredEvidence.map(e => e.id),
        evidenceImportances: filteredEvidence.map(e => e.importance),
      }
    );

    return filteredEvidence;
  }

  /**
   * Check if evidence content is relevant to PRD content
   * Simple heuristic based on common words and phrases
   */
  private checkContentRelevance(
    evidenceContent: string,
    prdContent: string
  ): boolean {
    // 🐛 CRITICAL DEBUG: Log the EXACT PRD content being analyzed
    logger.info('🐛 [CRITICAL DEBUG] checkContentRelevance called with:', {
      evidenceContentLength: evidenceContent.length,
      evidenceContentPreview: evidenceContent.substring(0, 150),
      prdContentLength: prdContent.length,
      prdContentPreview: prdContent.substring(0, 150),
      prdContentHash: createHash('md5')
        .update(prdContent)
        .digest('hex')
        .substring(0, 8),
      prdContentFirstWords: prdContent
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 2)
        .slice(0, 15),
    });

    const evidence = evidenceContent.toLowerCase();
    const prd = prdContent.toLowerCase();

    // Extract meaningful words (longer than 3 chars, not common stopwords)
    const stopwords = new Set([
      'the',
      'and',
      'for',
      'are',
      'but',
      'not',
      'you',
      'all',
      'can',
      'had',
      'her',
      'was',
      'one',
      'our',
      'out',
      'day',
      'get',
      'has',
      'him',
      'his',
      'how',
      'man',
      'new',
      'now',
      'old',
      'see',
      'two',
      'way',
      'who',
      'boy',
      'did',
      'its',
      'let',
      'put',
      'say',
      'she',
      'too',
      'use',
    ]);

    const prdWords = prd
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopwords.has(word))
      .slice(0, 20); // Limit to first 20 meaningful words

    // 🐛 ENHANCED DEBUG: Log the exact content analysis
    logger.info('🐛 [CRITICAL DEBUG] PRD Content Analysis for Scoring:', {
      prdContentLength: prdContent.length,
      prdContentPreview: prdContent.substring(0, 300),
      prdContentLines: prdContent.split('\n').slice(0, 5),
      prdLowercase: prd.substring(0, 300),
      allPrdWords: prd
        .split(/\W+/)
        .filter(word => word.length > 3)
        .slice(0, 50),
      filteredPrdWords: prdWords,
      evidenceContentPreview: evidenceContent.substring(0, 100),
      prdHash: createHash('md5').update(prdContent).digest('hex'),
    });

    // Check how many PRD words appear in evidence
    const matches = prdWords.filter(word => evidence.includes(word));
    const relevanceScore = matches.length / prdWords.length;
    const isRelevant = relevanceScore >= 0.1;

    logger.debug('🔍 Content relevance check:', {
      prdWords: prdWords.slice(0, 10), // Show first 10 words
      matches: matches.slice(0, 5), // Show first 5 matches
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      isRelevant,
      evidencePreview: evidence.substring(0, 100) + '...',
    });

    return isRelevant;
  }

  /**
   * Calculate the three score components: recency, coverage, relevance
   */
  private async calculateScoreBreakdown(
    evidence: Evidence[],
    persona: Persona,
    document: ProductDocument
  ): Promise<ScoreBreakdown> {
    const recency = this.calculateRecencyScore(evidence);
    const coverage = this.calculateCoverageScore(evidence, persona);
    const relevance = this.calculateRelevanceScore(evidence, persona, document);

    logger.debug('📊 Score breakdown calculated', {
      recency,
      coverage,
      relevance,
      evidenceCount: evidence.length,
    });

    return { recency, coverage, relevance };
  }

  /**
   * Calculate recency score (0-100) based on evidence age
   */
  private calculateRecencyScore(evidence: Evidence[]): number {
    if (evidence.length === 0) {
      logger.debug('🔍 RECENCY CALCULATION: No evidence provided, returning 0');
      return 0;
    }

    const now = new Date();
    const maxAge = EvidenceScoreService.THRESHOLDS.maxAgeForFullRecency;

    logger.debug('🔍 RECENCY CALCULATION START', {
      evidenceCount: evidence.length,
      now: now.toISOString(),
      nowTimestamp: now.getTime(),
      maxAgeThreshold: maxAge,
      evidenceTimestamps: evidence.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        timestampISO: e.timestamp.toISOString(),
        timestampMs: e.timestamp.getTime(),
        isValidDate: !isNaN(e.timestamp.getTime()),
      })),
    });

    // 🐛🐛🐛 ENHANCED DEBUGGING FOR RECENCY CALCULATION 🐛🐛🐛
    logger.info('🐛 [DEBUG] RECENCY CALCULATION - INPUT EVIDENCE ANALYSIS', {
      evidenceCount: evidence.length,
      evidenceDetails: evidence.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        timestampConstructor: e.timestamp?.constructor?.name,
        timestampType: typeof e.timestamp,
        isDate: e.timestamp instanceof Date,
        timestampString: e.timestamp ? e.timestamp.toString() : 'NULL',
        timestampMs: e.timestamp ? e.timestamp.getTime() : 'NULL',
        isNaN: e.timestamp ? isNaN(e.timestamp.getTime()) : 'NULL',
      })),
    });

    const recencyScores = evidence.map(item => {
      try {
        logger.info('🐛 [DEBUG] PROCESSING EVIDENCE ITEM FOR RECENCY', {
          evidenceId: item.id,
          timestamp: item.timestamp,
          timestampType: typeof item.timestamp,
          isDate: item.timestamp instanceof Date,
          timestampConstructor: item.timestamp?.constructor?.name,
        });

        // Enhanced timestamp validation before calculation
        if (!item.timestamp) {
          logger.error(`❌ Missing timestamp for evidence ${item.id}`, {
            evidenceId: item.id,
            timestamp: item.timestamp,
          });
          return 50; // Fallback score for missing timestamps
        }

        if (!(item.timestamp instanceof Date)) {
          logger.error(`❌ Invalid timestamp object for evidence ${item.id}`, {
            evidenceId: item.id,
            timestamp: item.timestamp,
            timestampType: typeof item.timestamp,
            isDate: false,
          });
          return 50; // Fallback score for invalid timestamps
        }

        // 🐛🐛🐛 CRITICAL DEBUG POINT - WHERE THE ERROR OCCURS 🐛🐛🐛
        logger.info('🐛 [DEBUG] BEFORE getTime() CALL', {
          evidenceId: item.id,
          timestamp: item.timestamp,
          timestampString: item.timestamp.toString(),
        });

        const itemTimeMs = item.timestamp.getTime();

        logger.info('🐛 [DEBUG] AFTER getTime() CALL', {
          evidenceId: item.id,
          itemTimeMs: itemTimeMs,
          isNaN: isNaN(itemTimeMs),
        });

        const nowTimeMs = now.getTime();

        if (isNaN(itemTimeMs) || isNaN(nowTimeMs)) {
          logger.error(`❌ NaN timestamp detected for evidence ${item.id}`, {
            evidenceId: item.id,
            itemTimeMs: itemTimeMs,
            nowTimeMs: nowTimeMs,
            timestamp: item.timestamp,
            timestampISO: 'CANNOT_CONVERT_TO_ISO',
          });
          return 50; // Fallback score for NaN timestamps
        }

        // 🐛🐛🐛 CRITICAL DEBUG POINT - BEFORE toISOString() CALL 🐛🐛🐛
        logger.info('🐛 [DEBUG] BEFORE toISOString() CALL', {
          evidenceId: item.id,
          timestamp: item.timestamp,
          itemTimeMs: itemTimeMs,
          isValidTime: !isNaN(itemTimeMs),
        });

        let timestampISO: string;
        try {
          timestampISO = item.timestamp.toISOString();
          logger.info('🐛 [DEBUG] toISOString() SUCCESS', {
            evidenceId: item.id,
            timestampISO: timestampISO,
          });
        } catch (isoError) {
          logger.error('🐛 [DEBUG] toISOString() FAILED', {
            evidenceId: item.id,
            error:
              isoError instanceof Error ? isoError.message : String(isoError),
            timestamp: item.timestamp,
            timestampString: item.timestamp.toString(),
            itemTimeMs: itemTimeMs,
          });
          return 50; // Fallback score for toISOString errors
        }

        const timeDiffMs = nowTimeMs - itemTimeMs;
        const ageInDays = timeDiffMs / (1000 * 60 * 60 * 24);

        logger.debug(`🕐 Age calculation for evidence ${item.id}`, {
          evidenceId: item.id,
          nowTimeMs: nowTimeMs,
          itemTimeMs: itemTimeMs,
          timeDiffMs: timeDiffMs,
          ageInDays: ageInDays,
          isValidAgeInDays: !isNaN(ageInDays),
          isPositiveAge: ageInDays >= 0,
        });

        if (isNaN(ageInDays)) {
          logger.error(
            `❌ NaN detected in ageInDays calculation for evidence ${item.id}`,
            {
              evidenceId: item.id,
              timestamp: item.timestamp,
              timestampISO: timestampISO,
              timestampGetTime: itemTimeMs,
              nowGetTime: nowTimeMs,
              nowISO: now.toISOString(),
              timeDiff: timeDiffMs,
            }
          );
          return 50; // Fallback score for invalid age calculations
        }

        // Handle negative age (future timestamps)
        if (ageInDays < 0) {
          logger.warn(`⚠️ Future timestamp detected for evidence ${item.id}`, {
            evidenceId: item.id,
            ageInDays: ageInDays,
            timestamp: timestampISO,
            now: now.toISOString(),
          });
          return 100; // Treat future evidence as fresh
        }

        let score: number;
        if (ageInDays <= maxAge) {
          // Full score for fresh evidence
          score = 100;
          logger.debug(
            `✅ Fresh evidence: ${item.id} (${ageInDays.toFixed(1)} days old) = 100 score`
          );
        } else {
          // Decay score based on age (exponential decay)
          score = Math.max(10, 100 * Math.exp(-ageInDays / maxAge));
          logger.debug(
            `📉 Aged evidence: ${item.id} (${ageInDays.toFixed(1)} days old) = ${score.toFixed(1)} score`
          );
        }

        // Final score validation
        if (isNaN(score) || score < 0 || score > 100) {
          logger.error(`❌ Invalid score calculated for evidence ${item.id}`, {
            evidenceId: item.id,
            calculatedScore: score,
            ageInDays: ageInDays,
            maxAge: maxAge,
          });
          return 50; // Fallback score
        }

        logger.info(
          '🐛 [DEBUG] EVIDENCE RECENCY SCORE CALCULATED SUCCESSFULLY',
          {
            evidenceId: item.id,
            finalScore: score,
            ageInDays: ageInDays,
          }
        );

        return score;
      } catch (error) {
        logger.error(`❌ Error calculating recency for evidence ${item.id}`, {
          evidenceId: item.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: item.timestamp,
          stack: error instanceof Error ? error.stack : undefined,
        });
        return 50; // Fallback score for errors
      }
    });

    logger.debug('📊 Individual recency scores calculated', {
      recencyScores: recencyScores.map((score, index) => ({
        evidenceId: evidence[index].id,
        recencyScore: score,
        importance: evidence[index].importance,
        isValidScore: !isNaN(score) && score >= 0 && score <= 100,
      })),
    });

    // Weight by importance and return average
    let weightedScore = 0;
    let totalWeight = 0;

    evidence.forEach((item, index) => {
      const score = recencyScores[index];
      const importance = item.importance;

      // Validate importance value
      if (isNaN(importance) || importance <= 0) {
        logger.warn(`⚠️ Invalid importance for evidence ${item.id}`, {
          evidenceId: item.id,
          importance: importance,
          using: 1,
        });
        // Use importance of 1 as fallback
        const weightedValue = score * 1;
        weightedScore += weightedValue;
        totalWeight += 1;
        logger.debug(
          `⚖️ Weighting (corrected): ${item.id} score=${score} * importance=1 = ${weightedValue}`
        );
      } else {
        const weightedValue = score * importance;
        weightedScore += weightedValue;
        totalWeight += importance;
        logger.debug(
          `⚖️ Weighting: ${item.id} score=${score} * importance=${importance} = ${weightedValue}`
        );
      }
    });

    const finalRecencyScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    logger.debug('🔍 RECENCY CALCULATION COMPLETE', {
      weightedScore,
      totalWeight,
      finalRecencyScore,
      isValidFinalScore:
        !isNaN(finalRecencyScore) &&
        finalRecencyScore >= 0 &&
        finalRecencyScore <= 100,
      evidenceCount: evidence.length,
    });

    // Final validation and fallback
    if (
      isNaN(finalRecencyScore) ||
      finalRecencyScore < 0 ||
      finalRecencyScore > 100
    ) {
      logger.error('❌ CRITICAL: Final recency score is invalid!', {
        finalRecencyScore,
        weightedScore,
        totalWeight,
        evidenceCount: evidence.length,
        recencyScores,
        evidenceImportances: evidence.map(e => e.importance),
      });
      return 0; // Safe fallback to prevent NaN propagation
    }

    logger.info('🐛 [DEBUG] RECENCY CALCULATION FINAL SUCCESS', {
      finalRecencyScore,
      evidenceCount: evidence.length,
    });

    return finalRecencyScore;
  }

  /**
   * Calculate coverage score (0-100) based on how well evidence covers persona needs
   * Note: Currently uses evidence quantity/diversity metrics, persona-specific logic can be added later
   */
  private calculateCoverageScore(
    evidence: Evidence[],
    _persona: Persona // eslint-disable-line @typescript-eslint/no-unused-vars
  ): number {
    if (evidence.length === 0) return 0;

    // Base score starts low and increases with evidence count
    const baseScore = Math.min(70, evidence.length * 15); // Max 70 from count alone

    // Bonus for diverse evidence types
    const sourceTypes = new Set(evidence.map(e => e.sourceType));
    const diversityBonus = Math.min(15, sourceTypes.size * 5);

    // Bonus for high-importance evidence
    const highImportanceCount = evidence.filter(e => e.importance >= 8).length;
    const qualityBonus = Math.min(15, highImportanceCount * 3);

    // Penalty if we don't have enough evidence for high confidence
    const minEvidenceThreshold =
      EvidenceScoreService.THRESHOLDS.minEvidenceForHighScore;
    const confidencePenalty =
      evidence.length < minEvidenceThreshold
        ? (minEvidenceThreshold - evidence.length) * 5
        : 0;

    const coverageScore = Math.max(
      0,
      baseScore + diversityBonus + qualityBonus - confidencePenalty
    );

    return Math.min(100, coverageScore);
  }

  /**
   * Calculate relevance score (0-100) based on keyword and content matching
   */
  private calculateRelevanceScore(
    evidence: Evidence[],
    _persona: Persona,
    _document: ProductDocument
  ): number {
    if (evidence.length === 0) return 0;

    const personaKeywords = _persona.keywords.map(k => k.toLowerCase());

    const relevanceScores = evidence.map(item => {
      let score = 0;
      const evidenceText = item.content.toLowerCase();

      // Score based on persona keyword matches
      const keywordMatches = personaKeywords.filter(keyword =>
        evidenceText.includes(keyword)
      ).length;
      score += Math.min(40, keywordMatches * 10); // Up to 40 points for keywords

      // Score based on PRD content relevance
      if (this.checkContentRelevance(item.content, _document.content)) {
        score += 30; // 30 points for content relevance
      }

      // Score based on evidence importance
      score += Math.min(30, item.importance * 3); // Up to 30 points for importance

      return Math.min(100, score);
    });

    // Return weighted average based on importance
    const weightedScore = evidence.reduce((sum, item, index) => {
      return sum + relevanceScores[index] * item.importance;
    }, 0);

    const totalWeight = evidence.reduce(
      (sum, item) => sum + item.importance,
      0
    );

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Calculate final weighted score from breakdown components
   */
  private calculateWeightedScore(breakdown: ScoreBreakdown): number {
    const weights = EvidenceScoreService.WEIGHTS;

    const weightedScore =
      breakdown.recency * weights.recency +
      breakdown.coverage * weights.coverage +
      breakdown.relevance * weights.relevance;

    return Math.max(0, Math.min(100, weightedScore));
  }

  /**
   * Extract top quotes from evidence for insights
   */
  private extractTopQuotes(evidence: Evidence[]): string[] {
    if (evidence.length === 0) return [];

    // Sort by importance and recency, then take best quotes
    const sortedEvidence = evidence
      .filter(e => e.content.length > 20) // Filter out very short content
      .sort((a, b) => {
        // Primary sort: importance (descending)
        if (a.importance !== b.importance) {
          return b.importance - a.importance;
        }
        // Secondary sort: recency (newer first)
        return b.timestamp.getTime() - a.timestamp.getTime();
      })
      .slice(0, EvidenceScoreService.THRESHOLDS.maxTopQuotes);

    return sortedEvidence.map(e => {
      // Truncate long quotes to first 200 characters
      const quote =
        e.content.length > 200
          ? `${e.content.substring(0, 200)}...`
          : e.content;

      return quote.trim();
    });
  }
}
