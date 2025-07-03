/**
 * LocalStorage Utilities for Evidence Score Persistence
 * Phase 4.2: Persist last imported PRD ID & scores in localStorage for session restore
 * Also provides debugging capabilities for file upload corruption investigation
 */

import type { EvidenceScore, ProductDocument } from '@shared/types';

const STORAGE_KEYS = {
  LAST_IMPORTED_PRD: 'personyx:lastImportedPRD',
  EVIDENCE_SCORES: 'personyx:evidenceScores',
  SESSION_DEBUG: 'personyx:sessionDebug',
  FILE_UPLOAD_DEBUG: 'personyx:fileUploadDebug',
} as const;

export interface LastImportedPRD {
  documentId: string;
  title: string;
  importedAt: string; // ISO date string
  fileName: string;
  fileSize: number;
  contentHash?: string; // For debugging content corruption
}

export interface SessionDebugInfo {
  sessionId: string;
  startTime: string; // ISO date string
  fileUploads: Array<{
    timestamp: string;
    fileName: string;
    fileSize: number;
    contentPreview: string; // First 200 chars for debugging
    documentId: string;
    scores: Array<{
      documentId: string;
      personaId: string;
      score: number;
    }>;
  }>;
  scoreUpdates: Array<{
    timestamp: string;
    documentId: string;
    scores: Array<{
      documentId: string;
      personaId: string;
      score: number;
    }>;
    trigger: 'import' | 'update' | 'manual';
  }>;
}

/**
 * Generate a simple hash of file content for debugging
 */
function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Phase 4.2: Persist last imported PRD information
 */
export function saveLastImportedPRD(
  document: ProductDocument,
  fileName: string,
  fileSize: number,
  fileContent?: string
): void {
  try {
    const lastImported: LastImportedPRD = {
      documentId: document.id,
      title: document.title,
      importedAt: new Date().toISOString(),
      fileName,
      fileSize,
      contentHash: fileContent ? generateContentHash(fileContent) : undefined,
    };

    localStorage.setItem(
      STORAGE_KEYS.LAST_IMPORTED_PRD,
      JSON.stringify(lastImported)
    );

    console.log('💾 Saved last imported PRD to localStorage:', {
      documentId: document.id,
      fileName,
      contentHash: lastImported.contentHash,
    });
  } catch (error) {
    console.error('❌ Failed to save last imported PRD:', error);
  }
}

/**
 * Phase 4.2: Retrieve last imported PRD information
 */
export function getLastImportedPRD(): LastImportedPRD | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_IMPORTED_PRD);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as LastImportedPRD;
    console.log('📖 Retrieved last imported PRD from localStorage:', {
      documentId: parsed.documentId,
      fileName: parsed.fileName,
      importedAt: parsed.importedAt,
      contentHash: parsed.contentHash,
    });

    return parsed;
  } catch (error) {
    console.error('❌ Failed to retrieve last imported PRD:', error);
    return null;
  }
}

/**
 * Phase 4.2: Persist evidence scores for session restore
 */
export function saveEvidenceScores(scores: EvidenceScore[]): void {
  try {
    const scoresData = {
      scores,
      savedAt: new Date().toISOString(),
      scoresCount: scores.length,
    };

    localStorage.setItem(
      STORAGE_KEYS.EVIDENCE_SCORES,
      JSON.stringify(scoresData)
    );

    console.log('💾 Saved evidence scores to localStorage:', {
      scoresCount: scores.length,
      documentIds: Array.from(new Set(scores.map(s => s.documentId))),
    });
  } catch (error) {
    console.error('❌ Failed to save evidence scores:', error);
  }
}

/**
 * Phase 4.2: Retrieve persisted evidence scores
 */
export function getEvidenceScores(): EvidenceScore[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EVIDENCE_SCORES);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    const scores = parsed.scores || [];

    console.log('📖 Retrieved evidence scores from localStorage:', {
      scoresCount: scores.length,
      savedAt: parsed.savedAt,
    });

    // Convert date strings back to Date objects
    return scores.map((score: EvidenceScore & { lastCalculated: string }) => ({
      ...score,
      lastCalculated: new Date(score.lastCalculated),
    }));
  } catch (error) {
    console.error('❌ Failed to retrieve evidence scores:', error);
    return [];
  }
}

/**
 * File Upload Debugging: Track file uploads for corruption investigation
 */
export function logFileUpload(
  fileName: string,
  fileSize: number,
  fileContent: string,
  documentId: string,
  scores: EvidenceScore[]
): void {
  try {
    const sessionDebug = getSessionDebugInfo();

    const uploadEntry = {
      timestamp: new Date().toISOString(),
      fileName,
      fileSize,
      contentPreview: fileContent.substring(0, 200),
      documentId,
      scores: scores.map(s => ({
        documentId: s.documentId,
        personaId: s.personaId,
        score: s.score,
      })),
    };

    sessionDebug.fileUploads.push(uploadEntry);

    // Keep only last 10 uploads
    sessionDebug.fileUploads = sessionDebug.fileUploads.slice(-10);

    localStorage.setItem(
      STORAGE_KEYS.SESSION_DEBUG,
      JSON.stringify(sessionDebug)
    );

    console.log('🐛 Logged file upload for debugging:', {
      fileName,
      documentId,
      contentHash: generateContentHash(fileContent),
      scoresGenerated: scores.length,
    });
  } catch (error) {
    console.error('❌ Failed to log file upload:', error);
  }
}

/**
 * Generate a cryptographically secure random session ID
 */
function generateSecureSessionId(): string {
  // Use crypto.getRandomValues for secure random bytes
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);

  // Convert to base-36 string (similar to Math.random().toString(36))
  return Array.from(array)
    .map(b => b.toString(36))
    .join('')
    .substring(0, 15);
}

/**
 * Get session debug information
 */
export function getSessionDebugInfo(): SessionDebugInfo {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION_DEBUG);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('❌ Failed to retrieve session debug info:', error);
  }

  // Create new session
  const newSession: SessionDebugInfo = {
    sessionId: generateSecureSessionId(),
    startTime: new Date().toISOString(),
    fileUploads: [],
    scoreUpdates: [],
  };

  try {
    localStorage.setItem(
      STORAGE_KEYS.SESSION_DEBUG,
      JSON.stringify(newSession)
    );
  } catch (error) {
    console.error('❌ Failed to save new session debug info:', error);
  }

  return newSession;
}

/**
 * Log evidence score updates for debugging
 */
export function logScoreUpdate(
  documentId: string,
  scores: EvidenceScore[],
  trigger: 'import' | 'update' | 'manual'
): void {
  try {
    const sessionDebug = getSessionDebugInfo();

    const updateEntry = {
      timestamp: new Date().toISOString(),
      documentId,
      scores: scores.map(s => ({
        documentId: s.documentId,
        personaId: s.personaId,
        score: s.score,
      })),
      trigger,
    };

    sessionDebug.scoreUpdates.push(updateEntry);

    // Keep only last 20 updates
    sessionDebug.scoreUpdates = sessionDebug.scoreUpdates.slice(-20);

    localStorage.setItem(
      STORAGE_KEYS.SESSION_DEBUG,
      JSON.stringify(sessionDebug)
    );

    console.log('🐛 Logged score update for debugging:', {
      documentId,
      trigger,
      scoresCount: scores.length,
    });
  } catch (error) {
    console.error('❌ Failed to log score update:', error);
  }
}

/**
 * Get file upload debug information for corruption investigation
 */
export function getFileUploadDebugInfo(): SessionDebugInfo['fileUploads'] {
  const sessionDebug = getSessionDebugInfo();
  return sessionDebug.fileUploads;
}

/**
 * Clear all debug information
 */
export function clearDebugInfo(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION_DEBUG);
    localStorage.removeItem(STORAGE_KEYS.FILE_UPLOAD_DEBUG);
    console.log('🧹 Cleared all debug information');
  } catch (error) {
    console.error('❌ Failed to clear debug info:', error);
  }
}

/**
 * Clear all persisted data
 */
export function clearAllPersistedData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🧹 Cleared all persisted Personyx data');
  } catch (error) {
    console.error('❌ Failed to clear persisted data:', error);
  }
}
