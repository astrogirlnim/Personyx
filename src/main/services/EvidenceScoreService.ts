/**
 * Evidence Score Service - Core scoring algorithm for PRD-persona evidence matching
 * Calculates 0-100 evidence scores based on recency, coverage, and relevance heuristics
 */

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

  // Scoring weights (must sum to 1.0)
  private static readonly WEIGHTS = {
    recency: 0.25, // 25% weight for recency
    coverage: 0.4, // 40% weight for coverage (most important)
    relevance: 0.35, // 35% weight for relevance
  };

  // Scoring thresholds
  private static readonly THRESHOLDS = {
    minEvidenceForHighScore: 5, // Need at least 5 evidence items for score > 80
    maxAgeForFullRecency: 30, // Days - evidence older than 30 days gets reduced recency score
    minQuotesForTopList: 3, // Minimum quotes to include in top quotes
    maxTopQuotes: 5, // Maximum top quotes to return
  };

  constructor() {
    this.evidenceScoreRepo = new EvidenceScoreRepo();
    this.evidenceRepo = new EvidenceRepo();
    this.personaRepo = new PersonaRepo();
    this.productDocumentRepo = new ProductDocumentRepo();
  }

  /**
   * Convert database Evidence to shared Evidence type
   */
  private convertDbEvidence(dbEvidence: DbEvidence): Evidence {
    return {
      id: dbEvidence.id,
      personaId: dbEvidence.personaId,
      content: dbEvidence.content,
      source: dbEvidence.source,
      sourceType: dbEvidence.sourceType as
        | 'interview'
        | 'prd'
        | 'feedback'
        | 'other',
      timestamp: dbEvidence.timestamp,
      tags: JSON.parse(dbEvidence.tags),
      sentiment: dbEvidence.sentiment as
        | 'positive'
        | 'negative'
        | 'neutral'
        | undefined,
      importance: dbEvidence.importance,
    };
  }

  /**
   * Convert database Persona to shared Persona type
   */
  private convertDbPersona(dbPersona: DbPersona): Persona {
    return {
      id: dbPersona.id,
      name: dbPersona.name,
      description: dbPersona.description,
      primaryGoal: dbPersona.primaryGoal,
      mainPainPoint: dbPersona.mainPainPoint,
      keywords: JSON.parse(dbPersona.keywords),
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

      // Get relevant evidence for this persona and convert to shared types
      const dbEvidence = await this.evidenceRepo.findByPersonaId(personaId);
      const allEvidence = dbEvidence.map(e => this.convertDbEvidence(e));
      logger.debug(
        `📊 Found ${allEvidence.length} evidence items for persona`,
        {
          personaId,
          personaName: persona.name,
        }
      );

      // Filter evidence relevant to this PRD (based on content similarity)
      const convertedDocument = this.convertDbProductDocument(document);
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

    return allEvidence.filter(evidence => {
      // Always include high-importance evidence (8+)
      if (evidence.importance >= 8) {
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

      // Include if it has keyword match OR content relevance AND importance >= 5
      return (
        (hasKeywordMatch || hasContentRelevance) && evidence.importance >= 5
      );
    });
  }

  /**
   * Check if evidence content is relevant to PRD content
   * Simple heuristic based on common words and phrases
   */
  private checkContentRelevance(
    evidenceContent: string,
    prdContent: string
  ): boolean {
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

    // Check how many PRD words appear in evidence
    const matches = prdWords.filter(word => evidence.includes(word));

    // Relevant if at least 20% of key PRD words appear in evidence
    return matches.length / prdWords.length >= 0.2;
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
    if (evidence.length === 0) return 0;

    const now = new Date();
    const maxAge = EvidenceScoreService.THRESHOLDS.maxAgeForFullRecency;

    const recencyScores = evidence.map(item => {
      const ageInDays =
        (now.getTime() - item.timestamp.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays <= maxAge) {
        // Full score for fresh evidence
        return 100;
      } else {
        // Decay score based on age (50% at 60 days, 25% at 90 days, etc.)
        return Math.max(10, 100 * Math.exp(-ageInDays / maxAge));
      }
    });

    // Weight by importance and return average
    const weightedScore = evidence.reduce((sum, item, index) => {
      return sum + recencyScores[index] * item.importance;
    }, 0);

    const totalWeight = evidence.reduce(
      (sum, item) => sum + item.importance,
      0
    );

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
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
