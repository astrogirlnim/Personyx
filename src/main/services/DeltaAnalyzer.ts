/**
 * DeltaAnalyzer - Analyzes transcript content for persona attribute changes
 * Phase 2.7: Automatic Persona Evolution
 *
 * Uses LLM analysis to detect changes in persona goals, pain points, and terminology
 * from interview transcript content.
 */

import { Logger } from '@main/utils/logger';
import { LangGraphService } from './LangGraphService';
import type { Persona } from '@shared/types';

const logger = new Logger('delta-analyzer');

// Configuration for delta analysis
export const EVOLUTION_CONFIG = {
  deltaThreshold: 0.6, // Minimum confidence for persona updates (60%)
  newPersonaThreshold: 0.8, // Minimum confidence for creating new personas (80%)
  maxKeywords: 12, // Maximum number of keywords to track per persona
  minContentLength: 50, // Minimum content length for analysis
  maxContentLength: 2000, // Maximum content length for analysis
};

export interface DeltaResult {
  personaId: string;
  confidence: number;
  changes: PersonaChanges;
  reasoning: string;
  isSignificant: boolean; // True if changes meet threshold for action
}

export interface PersonaChanges {
  goalChanges: KeywordDelta;
  painPointChanges: KeywordDelta;
  terminologyChanges: KeywordDelta;
  overallConfidence: number;
}

export interface KeywordDelta {
  additions: string[];
  removals: string[];
  confidence: number;
  reasoning: string;
}

export interface ExtractedPhrases {
  goals: string[];
  painPoints: string[];
  terminology: string[];
  confidence: number;
  reasoning: string;
}

export class DeltaAnalyzer {
  private langGraphService: LangGraphService;

  constructor() {
    this.langGraphService = new LangGraphService();
    logger.debug('🔬 DeltaAnalyzer initialized');
  }

  /**
   * Extract key phrases from content using LLM analysis
   * @param content Text content to analyze
   * @returns Promise<ExtractedPhrases> Extracted phrases with confidence
   */
  async extractKeyPhrases(content: string): Promise<ExtractedPhrases> {
    logger.debug('🔍 Extracting key phrases from content', {
      contentLength: content.length,
      preview: content.substring(0, 100) + '...',
    });

    // Validate content length
    if (content.length < EVOLUTION_CONFIG.minContentLength) {
      logger.warn('⚠️ Content too short for meaningful analysis', {
        contentLength: content.length,
        minRequired: EVOLUTION_CONFIG.minContentLength,
      });
      return this.getEmptyExtractedPhrases('Content too short for analysis');
    }

    if (content.length > EVOLUTION_CONFIG.maxContentLength) {
      content = content.substring(0, EVOLUTION_CONFIG.maxContentLength);
      logger.debug('✂️ Content truncated for analysis', {
        newLength: content.length,
        maxAllowed: EVOLUTION_CONFIG.maxContentLength,
      });
    }

    try {
      // Ensure LangGraph service is ready
      if (!this.langGraphService.isReady()) {
        await this.langGraphService.initialize();
      }

      // Create analysis prompt for persona attribute extraction
      const analysisPrompt = this.buildExtractionPrompt(content);

      // Use LangGraph service's internal OpenAI for analysis
      const analysisResult = await this.performLLMAnalysis(analysisPrompt);

      // Parse the LLM response into structured data
      const extractedPhrases = this.parseExtractionResponse(
        analysisResult.content
      );

      logger.info('✅ Key phrases extracted successfully', {
        goalsCount: extractedPhrases.goals.length,
        painPointsCount: extractedPhrases.painPoints.length,
        terminologyCount: extractedPhrases.terminology.length,
        confidence: extractedPhrases.confidence,
      });

      return extractedPhrases;
    } catch (error) {
      logger.error('❌ Failed to extract key phrases', {
        error: error instanceof Error ? error.message : String(error),
        contentLength: content.length,
      });

      return this.getEmptyExtractedPhrases(
        'Analysis failed due to technical error'
      );
    }
  }

  /**
   * Compute difference between existing persona and extracted phrases
   * @param persona Existing persona to compare against
   * @param phrases Newly extracted phrases
   * @returns DeltaResult Analysis of changes with confidence scores
   */
  computeDiff(persona: Persona, phrases: ExtractedPhrases): DeltaResult {
    logger.debug('🔍 Computing persona delta', {
      personaId: persona.id,
      personaName: persona.name,
      phrasesExtracted: {
        goals: phrases.goals.length,
        painPoints: phrases.painPoints.length,
        terminology: phrases.terminology.length,
      },
    });

    try {
      // Analyze changes in each category
      const goalChanges = this.computeKeywordDelta(
        this.extractGoalKeywords(persona),
        phrases.goals,
        'goals'
      );

      const painPointChanges = this.computeKeywordDelta(
        this.extractPainPointKeywords(persona),
        phrases.painPoints,
        'pain points'
      );

      const terminologyChanges = this.computeKeywordDelta(
        persona.keywords || [],
        phrases.terminology,
        'terminology'
      );

      // Calculate overall confidence based on individual changes
      const overallConfidence = this.calculateOverallConfidence([
        goalChanges.confidence,
        painPointChanges.confidence,
        terminologyChanges.confidence,
      ]);

      const changes: PersonaChanges = {
        goalChanges,
        painPointChanges,
        terminologyChanges,
        overallConfidence,
      };

      // Generate reasoning for the changes
      const reasoning = this.generateChangeReasoning(changes, phrases);

      // Determine if changes are significant enough for action
      const isSignificant =
        overallConfidence >= EVOLUTION_CONFIG.deltaThreshold;

      const result: DeltaResult = {
        personaId: persona.id,
        confidence: overallConfidence,
        changes,
        reasoning,
        isSignificant,
      };

      logger.info('✅ Persona delta computed', {
        personaId: persona.id,
        overallConfidence,
        isSignificant,
        totalAdditions:
          goalChanges.additions.length +
          painPointChanges.additions.length +
          terminologyChanges.additions.length,
        totalRemovals:
          goalChanges.removals.length +
          painPointChanges.removals.length +
          terminologyChanges.removals.length,
      });

      return result;
    } catch (error) {
      logger.error('❌ Failed to compute persona delta', {
        personaId: persona.id,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        personaId: persona.id,
        confidence: 0,
        changes: {
          goalChanges: this.getEmptyKeywordDelta('Computation failed'),
          painPointChanges: this.getEmptyKeywordDelta('Computation failed'),
          terminologyChanges: this.getEmptyKeywordDelta('Computation failed'),
          overallConfidence: 0,
        },
        reasoning: 'Failed to compute changes due to technical error',
        isSignificant: false,
      };
    }
  }

  /**
   * Perform LLM analysis using OpenAI through LangGraph service
   * @private
   */
  private async performLLMAnalysis(
    prompt: string
  ): Promise<{ content: string }> {
    try {
      // Use LangGraph's private classifyLocalContent method as inspiration
      // but create a simple analysis approach for now

      // For MVP, we'll use a simplified heuristic approach until we have proper LLM integration
      logger.debug(
        '🤖 Performing heuristic analysis (LLM integration pending)',
        {
          promptLength: prompt.length,
        }
      );

      // Extract content from the prompt for heuristic analysis
      const contentMatch = prompt.match(
        /CONTENT TO ANALYZE:\s*([\s\S]*?)\s*ANALYSIS:/
      );
      const content = contentMatch ? contentMatch[1].trim() : '';

      if (!content) {
        throw new Error('No content found in analysis prompt');
      }

      // Simple heuristic extraction
      const goals = this.extractGoalsHeuristic(content);
      const painPoints = this.extractPainPointsHeuristic(content);
      const terminology = this.extractTerminologyHeuristic(content);

      const heuristicResult = {
        goals,
        painPoints,
        terminology,
        confidence: 0.7, // Moderate confidence for heuristic analysis
        reasoning:
          'Heuristic analysis based on keyword patterns and content structure',
      };

      const response = JSON.stringify(heuristicResult, null, 2);

      logger.debug('✅ Heuristic analysis completed', {
        goalsFound: goals.length,
        painPointsFound: painPoints.length,
        terminologyFound: terminology.length,
      });

      return { content: response };
    } catch (error) {
      logger.error('❌ Failed to perform LLM analysis', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty result on error
      const emptyResult = {
        goals: [],
        painPoints: [],
        terminology: [],
        confidence: 0,
        reasoning: 'Analysis failed due to technical error',
      };

      return { content: JSON.stringify(emptyResult) };
    }
  }

  /**
   * Heuristic goal extraction based on keyword patterns
   * @private
   */
  private extractGoalsHeuristic(content: string): string[] {
    const goalPatterns = [
      /\b(?:want to|need to|goal is|objective|trying to|aim to|hope to)\s+([^.!?]{10,50})/gi,
      /\b(?:achieve|accomplish|deliver|build|create|develop)\s+([^.!?]{10,50})/gi,
      /\b(?:success|target|milestone|outcome)\s+([^.!?]{10,50})/gi,
    ];

    const goals = new Set<string>();

    for (const pattern of goalPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const goal = match[1].trim().toLowerCase();
          if (goal.length > 5 && goal.length < 30) {
            goals.add(goal);
            if (goals.size >= 5) break; // Limit to 5 goals
          }
        }
      }
    }

    return Array.from(goals);
  }

  /**
   * Heuristic pain point extraction based on keyword patterns
   * @private
   */
  private extractPainPointsHeuristic(content: string): string[] {
    const painPatterns = [
      /\b(?:problem|issue|challenge|difficulty|struggle|frustration)\s+(?:with|is|was)\s+([^.!?]{10,50})/gi,
      /\b(?:can't|cannot|unable to|hard to|difficult to)\s+([^.!?]{10,50})/gi,
      /\b(?:hate|dislike|annoying|frustrating|painful)\s+([^.!?]{10,50})/gi,
    ];

    const painPoints = new Set<string>();

    for (const pattern of painPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const pain = match[1].trim().toLowerCase();
          if (pain.length > 5 && pain.length < 30) {
            painPoints.add(pain);
            if (painPoints.size >= 5) break; // Limit to 5 pain points
          }
        }
      }
    }

    return Array.from(painPoints);
  }

  /**
   * Heuristic terminology extraction based on technical terms and tools
   * @private
   */
  private extractTerminologyHeuristic(content: string): string[] {
    const termPatterns = [
      /\b[A-Z][a-z]+(?:[A-Z][a-z]*)*\b/g, // CamelCase terms
      /\b[a-z]+[-_][a-z]+(?:[-_][a-z]+)*\b/g, // kebab-case/snake_case
      /\b(?:using|with|via|through)\s+([A-Za-z0-9-_]{3,20})\b/gi,
      /\b[A-Z]{2,10}\b/g, // Acronyms
    ];

    const terminology = new Set<string>();

    for (const pattern of termPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const term = (match[1] || match[0]).trim().toLowerCase();
        if (term.length >= 3 && term.length <= 15) {
          // Filter out common words
          if (!this.isCommonWord(term)) {
            terminology.add(term);
            if (terminology.size >= 8) break; // Limit to 8 terms
          }
        }
      }
    }

    return Array.from(terminology);
  }

  /**
   * Check if a word is too common to be useful terminology
   * @private
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
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
      'that',
      'with',
      'have',
      'this',
      'will',
      'your',
      'from',
      'they',
      'know',
      'want',
      'been',
      'good',
      'much',
      'some',
      'time',
      'very',
      'when',
      'come',
      'here',
      'just',
      'like',
      'long',
      'make',
      'many',
      'over',
      'such',
      'take',
      'than',
      'them',
      'well',
      'were',
      'would',
      'there',
      'could',
      'other',
      'after',
      'first',
      'never',
      'these',
      'think',
      'where',
      'being',
      'every',
      'great',
      'might',
      'shall',
      'still',
      'those',
      'under',
      'while',
    ]);

    return commonWords.has(word.toLowerCase());
  }

  /**
   * Build prompt for LLM-based phrase extraction
   * @private
   */
  private buildExtractionPrompt(content: string): string {
    return `
You are analyzing interview transcript content to extract persona-relevant information. 
Please analyze the following content and extract:

1. GOALS: What does this person want to achieve? (business goals, personal objectives, desired outcomes)
2. PAIN POINTS: What problems, frustrations, or challenges do they face?
3. TERMINOLOGY: What specific terms, tools, processes, or concepts do they mention?

Please respond in this exact JSON format:
{
  "goals": ["goal1", "goal2", ...],
  "painPoints": ["pain1", "pain2", ...],
  "terminology": ["term1", "term2", ...],
  "confidence": 0.85,
  "reasoning": "Brief explanation of analysis"
}

Keep each item concise (2-5 words). Focus on actionable insights. Confidence should be 0-1.

CONTENT TO ANALYZE:
${content}

ANALYSIS:`;
  }

  /**
   * Parse LLM response into structured ExtractedPhrases
   * @private
   */
  private parseExtractionResponse(response: string): ExtractedPhrases {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      const extractedPhrases: ExtractedPhrases = {
        goals: Array.isArray(parsed.goals)
          ? parsed.goals.slice(0, EVOLUTION_CONFIG.maxKeywords)
          : [],
        painPoints: Array.isArray(parsed.painPoints)
          ? parsed.painPoints.slice(0, EVOLUTION_CONFIG.maxKeywords)
          : [],
        terminology: Array.isArray(parsed.terminology)
          ? parsed.terminology.slice(0, EVOLUTION_CONFIG.maxKeywords)
          : [],
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0.5,
        reasoning:
          typeof parsed.reasoning === 'string'
            ? parsed.reasoning
            : 'No reasoning provided',
      };

      logger.debug('✅ LLM response parsed successfully', {
        goalsExtracted: extractedPhrases.goals.length,
        painPointsExtracted: extractedPhrases.painPoints.length,
        terminologyExtracted: extractedPhrases.terminology.length,
        confidence: extractedPhrases.confidence,
      });

      return extractedPhrases;
    } catch (error) {
      logger.error('❌ Failed to parse LLM extraction response', {
        error: error instanceof Error ? error.message : String(error),
        response: response.substring(0, 200) + '...',
      });

      return this.getEmptyExtractedPhrases('Failed to parse LLM response');
    }
  }

  /**
   * Compute keyword delta between existing and new keywords
   * @private
   */
  private computeKeywordDelta(
    existing: string[],
    newKeywords: string[],
    category: string
  ): KeywordDelta {
    const existingLower = existing.map(k => k.toLowerCase());
    const newLower = newKeywords.map(k => k.toLowerCase());

    // Find additions (in new but not in existing)
    const additions = newKeywords.filter(
      keyword => !existingLower.includes(keyword.toLowerCase())
    );

    // Find removals (in existing but not in new) - only significant if new list is substantial
    const removals =
      newKeywords.length >= 3
        ? existing.filter(keyword => !newLower.includes(keyword.toLowerCase()))
        : [];

    // Calculate confidence based on the significance of changes
    const totalChanges = additions.length + removals.length;
    const changeRatio =
      totalChanges / Math.max(existing.length, newKeywords.length, 1);
    const confidence = Math.min(0.9, changeRatio * 2); // Scale and cap confidence

    const reasoning = this.generateKeywordDeltaReasoning(
      additions,
      removals,
      category
    );

    return {
      additions,
      removals,
      confidence,
      reasoning,
    };
  }

  /**
   * Extract goal-related keywords from persona
   * @private
   */
  private extractGoalKeywords(persona: Persona): string[] {
    const goalText = persona.primaryGoal.toLowerCase();
    const words = goalText.split(/\s+/).filter(word => word.length > 3);
    return words.slice(0, 8); // Limit to most relevant words
  }

  /**
   * Extract pain point related keywords from persona
   * @private
   */
  private extractPainPointKeywords(persona: Persona): string[] {
    const painText = persona.mainPainPoint.toLowerCase();
    const words = painText.split(/\s+/).filter(word => word.length > 3);
    return words.slice(0, 8); // Limit to most relevant words
  }

  /**
   * Calculate overall confidence from individual confidences
   * @private
   */
  private calculateOverallConfidence(confidences: number[]): number {
    const validConfidences = confidences.filter(c => c > 0);
    if (validConfidences.length === 0) return 0;

    // Weighted average with higher weight on higher confidences
    const weightedSum = validConfidences.reduce(
      (sum, conf) => sum + conf * conf,
      0
    );
    const weightSum = validConfidences.reduce((sum, conf) => sum + conf, 0);

    return weightSum > 0 ? weightedSum / weightSum : 0;
  }

  /**
   * Generate human-readable reasoning for changes
   * @private
   */
  private generateChangeReasoning(
    changes: PersonaChanges,
    phrases: ExtractedPhrases
  ): string {
    const insights = [];

    if (changes.goalChanges.additions.length > 0) {
      insights.push(
        `New goals identified: ${changes.goalChanges.additions.join(', ')}`
      );
    }

    if (changes.painPointChanges.additions.length > 0) {
      insights.push(
        `New pain points found: ${changes.painPointChanges.additions.join(', ')}`
      );
    }

    if (changes.terminologyChanges.additions.length > 0) {
      insights.push(
        `New terminology: ${changes.terminologyChanges.additions.join(', ')}`
      );
    }

    if (insights.length === 0) {
      return 'No significant changes detected in this transcript';
    }

    return `Analysis of interview transcript revealed: ${insights.join('; ')}. Original reasoning: ${phrases.reasoning}`;
  }

  /**
   * Generate reasoning for keyword delta changes
   * @private
   */
  private generateKeywordDeltaReasoning(
    additions: string[],
    removals: string[],
    category: string
  ): string {
    if (additions.length === 0 && removals.length === 0) {
      return `No changes detected in ${category}`;
    }

    const parts = [];
    if (additions.length > 0) {
      parts.push(`${additions.length} new ${category} identified`);
    }
    if (removals.length > 0) {
      parts.push(`${removals.length} existing ${category} no longer mentioned`);
    }

    return parts.join(', ');
  }

  /**
   * Helper: Get empty ExtractedPhrases with error message
   * @private
   */
  private getEmptyExtractedPhrases(reasoning: string): ExtractedPhrases {
    return {
      goals: [],
      painPoints: [],
      terminology: [],
      confidence: 0,
      reasoning,
    };
  }

  /**
   * Helper: Get empty KeywordDelta with error message
   * @private
   */
  private getEmptyKeywordDelta(reasoning: string): KeywordDelta {
    return {
      additions: [],
      removals: [],
      confidence: 0,
      reasoning,
    };
  }
}
