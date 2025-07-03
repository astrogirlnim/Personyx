/**
 * Evidence Scores Utility Hook
 * Phase 4.3: Provides utility hook for components to access evidence scores
 * with debugging capabilities for file upload corruption investigation
 */

import { useState, useEffect, useCallback } from 'react';
import type { EvidenceScore } from '@shared/types';

interface EvidenceScoreDebugInfo {
  documentId: string | null;
  scoresCount: number;
  scores: EvidenceScore[];
  lastUpdated: Date | null;
  debugInfo: {
    sessionStartTime: Date;
    totalUpdates: number;
    uniqueDocuments: Set<string>;
    scoreHistory: Array<{
      timestamp: Date;
      documentId: string;
      scores: EvidenceScore[];
      source: 'import' | 'update' | 'cache';
    }>;
  };
}

export function useEvidenceScores(
  currentScores: EvidenceScore[],
  documentId?: string
): {
  scores: EvidenceScore[];
  maxScore: number | null;
  getScoreForPersona: (personaId: string) => EvidenceScore | null;
  debugInfo: EvidenceScoreDebugInfo;
  clearCache: () => void;
} {
  const [debugInfo, setDebugInfo] = useState<EvidenceScoreDebugInfo>({
    documentId: null,
    scoresCount: 0,
    scores: [],
    lastUpdated: null,
    debugInfo: {
      sessionStartTime: new Date(),
      totalUpdates: 0,
      uniqueDocuments: new Set(),
      scoreHistory: [],
    },
  });

  // Update debug info when scores change
  useEffect(() => {
    console.log('🔍 useEvidenceScores: Scores changed', {
      newScoresCount: currentScores.length,
      documentId,
      scores: currentScores.map(s => ({
        documentId: s.documentId,
        personaId: s.personaId,
        score: s.score,
      })),
    });

    setDebugInfo(prev => {
      const newUniqueDocuments = new Set(prev.debugInfo.uniqueDocuments);
      currentScores.forEach(score => newUniqueDocuments.add(score.documentId));

      const historyEntry = {
        timestamp: new Date(),
        documentId: documentId || 'unknown',
        scores: [...currentScores],
        source: 'update' as const,
      };

      return {
        documentId: documentId || null,
        scoresCount: currentScores.length,
        scores: [...currentScores],
        lastUpdated: new Date(),
        debugInfo: {
          ...prev.debugInfo,
          totalUpdates: prev.debugInfo.totalUpdates + 1,
          uniqueDocuments: newUniqueDocuments,
          scoreHistory: [...prev.debugInfo.scoreHistory, historyEntry].slice(
            -10
          ), // Keep last 10 entries
        },
      };
    });
  }, [currentScores, documentId]);

  // Filter scores by document if specified
  const filteredScores = documentId
    ? currentScores.filter(score => score.documentId === documentId)
    : currentScores;

  // Calculate max score
  const maxScore =
    filteredScores.length > 0
      ? Math.max(...filteredScores.map(s => s.score))
      : null;

  // Get score for specific persona
  const getScoreForPersona = useCallback(
    (personaId: string): EvidenceScore | null => {
      return (
        filteredScores.find(score => score.personaId === personaId) || null
      );
    },
    [filteredScores]
  );

  // Clear cache function for debugging
  const clearCache = useCallback(() => {
    console.log('🧹 useEvidenceScores: Clearing debug cache');
    setDebugInfo(prev => ({
      ...prev,
      debugInfo: {
        ...prev.debugInfo,
        scoreHistory: [],
        totalUpdates: 0,
        uniqueDocuments: new Set(),
      },
    }));
  }, []);

  return {
    scores: filteredScores,
    maxScore,
    getScoreForPersona,
    debugInfo,
    clearCache,
  };
}
