/**
 * Personyx Main App Component - Phase 3.1 Tray UI Core Screens
 * Features: Chat with Persona, Import PRD Modal, Evidence Score Banner, Error Toast
 */

import React, { useEffect, useState, useCallback } from 'react';
import { APP_NAME } from '@shared/constants';
import type {
  AppState,
  Persona,
  EvidenceScore,
  ImportResult,
} from '@shared/types';

// Component imports
import { PersonaChat } from './components/PersonaChat';
import { ImportPRDModal } from './components/ImportPRDModal';
import { EvidenceScoreBanner } from './components/EvidenceScoreBanner';
import { ErrorToast } from './components/ErrorToast';

export function App(): JSX.Element {
  const [appState, setAppState] = useState<AppState>({
    isReady: false,
    personas: [],
    recentScores: [],
    settings: {
      theme: 'system',
      autoUpdate: true,
      notifications: true,
      evidenceRetentionDays: 30,
    },
  });

  // UI state for Phase 3.1 features
  const [showPersonaChat, setShowPersonaChat] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [latestEvidenceScores, setLatestEvidenceScores] = useState<
    EvidenceScore[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Load initial data and set up IPC listeners
  useEffect(() => {
    console.log('🚀 Personyx App component mounted');

    const initializeApp = async () => {
      try {
        // Load personas from backend
        console.log('👥 Loading personas...');
        const personas = (await window.electronAPI.getPersonas()) as Persona[];
        console.log('✅ Personas loaded:', personas.length);

        setAppState(prev => ({
          ...prev,
          personas,
          isReady: true,
        }));

        // Set up IPC event listeners for real-time updates
        setupIPCListeners();

        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        setError('Failed to initialize application. Please restart Personyx.');
      }
    };

    initializeApp();

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeAllListeners('evidence-score-updated');
      window.electronAPI.removeAllListeners('prd-imported');
      window.electronAPI.removeAllListeners('error');
    };
  }, []);

  // Set up IPC event listeners for real-time updates
  const setupIPCListeners = useCallback(() => {
    console.log('📡 Setting up IPC listeners...');

    // Listen for evidence score updates (Feature 1.3)
    window.electronAPI.onEvidenceScoreUpdated((data: unknown) => {
      console.log('📊 Evidence score updated:', data);
      const parsedData = data as { scores?: EvidenceScore[] };
      setLatestEvidenceScores(parsedData.scores || []);

      // Trigger score pulse animation
      setTimeout(() => {
        const scoreElement = document.querySelector('.evidence-score');
        if (scoreElement) {
          scoreElement.classList.add('score-pulse');
          setTimeout(() => scoreElement.classList.remove('score-pulse'), 400);
        }
      }, 100);
    });

    // Listen for PRD import completion (Feature 1.2 & 1.3)
    window.electronAPI.onPRDImported((data: unknown) => {
      console.log('📄 PRD imported successfully:', data);
      const parsedData = data as { evidenceScores?: EvidenceScore[] };
      setImporting(false);
      setImportProgress(100);
      setLatestEvidenceScores(parsedData.evidenceScores || []);
      setShowImportModal(false);

      // Reset progress after animation
      setTimeout(() => setImportProgress(0), 2000);
    });

    // Listen for errors (Feature 1.4)
    window.electronAPI.onError((error: unknown) => {
      console.error('❌ IPC Error received:', error);
      const parsedError = error as { message?: string };
      setError(parsedError.message || 'An unexpected error occurred');
      setImporting(false);
      setImportProgress(0);
    });

    console.log('✅ IPC listeners set up complete');
  }, []);

  // Handle PRD file import (Feature 1.2)
  const handleImportPRD = useCallback(async () => {
    console.log('📄 Starting PRD import via file dialog...');
    setImporting(true);
    setImportProgress(0);
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Use the native file dialog to select and import a file
      console.log('📂 Opening native file dialog...');

      const result = (await window.electronAPI.openFileDialog()) as {
        canceled: boolean;
        filePath?: string;
        importResult?: ImportResult;
      };

      clearInterval(progressInterval);

      if (result.canceled) {
        console.log('📂 File dialog was canceled');
        setImporting(false);
        setImportProgress(0);
        return;
      }

      if (result.importResult?.success) {
        console.log('✅ PRD import successful:', result.importResult);
        setImportProgress(100);
        // PRD imported event will be triggered automatically by backend
      } else {
        throw new Error(result.importResult?.error || 'Import failed');
      }
    } catch (error) {
      console.error('❌ PRD import failed:', error);
      setError(
        `Failed to import PRD: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setImporting(false);
      setImportProgress(0);
    }
  }, []);

  // Calculate average evidence score for display
  const averageScore =
    latestEvidenceScores.length > 0
      ? Math.round(
          latestEvidenceScores.reduce((sum, score) => sum + score.score, 0) /
            latestEvidenceScores.length
        )
      : null;

  if (!appState.isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mist dark:bg-mist-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-evidence dark:border-evidence-dark mx-auto mb-4"></div>
          <h2 className="text-body-lg text-slate dark:text-slate-dark">
            Loading {APP_NAME}...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist dark:bg-mist-dark p-6">
      {/* Evidence Gate Layout */}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-h1 text-slate dark:text-slate-dark relative">
                {APP_NAME}
                <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-evidence dark:bg-evidence-dark"></div>
              </h1>
            </div>
            <button
              className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
              onClick={() =>
                setAppState(prev => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    theme: prev.settings.theme === 'dark' ? 'light' : 'dark',
                  },
                }))
              }
              title="Toggle theme"
            >
              <svg
                className="w-6 h-6 text-slate dark:text-slate-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Evidence Score Banner - Feature 1.3 */}
        {latestEvidenceScores.length > 0 && (
          <EvidenceScoreBanner
            scores={latestEvidenceScores}
            averageScore={averageScore}
          />
        )}

        {/* Evidence Gate Hero */}
        <div className="mb-8">
          <div className="text-center">
            <h2 className="text-display text-slate dark:text-slate-dark mb-2">
              Evidence Gate
            </h2>
            <p className="text-body text-steel dark:text-steel-dark">
              Trust-worthy analysis, front-and-centre
            </p>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Import PRD Card - Spans 8 columns on desktop */}
          <div className="lg:col-span-8">
            <div className="card">
              <h2 className="text-h2 text-slate dark:text-slate-dark mb-4">
                Import PRD
              </h2>
              <div
                className="drop-zone interactive min-h-[360px] flex items-center justify-center"
                onClick={() => setShowImportModal(true)}
              >
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 mb-4 text-slate dark:text-slate-dark drop-zone-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-body-lg font-medium mb-2 text-slate dark:text-slate-dark">
                    Drop your PRD here
                  </p>
                  <p className="text-body text-slate dark:text-slate-dark">
                    or click to browse for .md or .txt files
                  </p>
                  {importing && (
                    <div className="mt-4">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                      <p className="text-caption text-steel dark:text-steel-dark mt-2">
                        Processing... {Math.round(importProgress)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Spans 4 columns on desktop */}
          <div className="lg:col-span-4 space-y-6">
            {/* Evidence Scores Card */}
            <div className="card">
              <h3 className="text-h2 text-slate dark:text-slate-dark mb-4">
                Evidence Scores
              </h3>
              <div className="text-center">
                {averageScore !== null ? (
                  // Loaded state with actual score
                  <div className="w-40 h-40 mx-auto mb-4 relative">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-graphite dark:text-graphite-dark"
                        strokeDasharray="439.8"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className={`evidence-score ${
                          averageScore >= 80
                            ? 'text-persona'
                            : averageScore >= 60
                              ? 'text-caution-amber'
                              : 'text-risk-red'
                        } dark:${
                          averageScore >= 80
                            ? 'text-persona-dark'
                            : averageScore >= 60
                              ? 'text-caution-amber-dark'
                              : 'text-risk-red-dark'
                        }`}
                        strokeDasharray="439.8"
                        strokeDashoffset={439.8 - (439.8 * averageScore) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-slate dark:text-slate-dark">
                          {averageScore}
                        </div>
                        <div className="text-caption text-steel dark:text-steel-dark">
                          Average Score
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Empty state
                  <div className="w-40 h-40 mx-auto mb-4 relative">
                    <svg className="w-40 h-40 transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-graphite dark:text-graphite-dark"
                        strokeDasharray="439.8"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-caption text-slate dark:text-slate-dark">
                          No PRDs analysed yet
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="btn-primary mb-4"
                  onClick={() => setShowImportModal(true)}
                >
                  {averageScore !== null
                    ? 'Import Another PRD'
                    : 'Import First PRD'}
                </button>

                {/* Chat with Persona button - Feature 1.1 */}
                <button
                  className="btn-secondary w-full"
                  onClick={() => setShowPersonaChat(true)}
                  disabled={appState.personas.length === 0}
                >
                  💬 Chat with Persona
                </button>
              </div>
            </div>

            {/* Personas Card */}
            <div className="card">
              <h3 className="text-h2 text-slate dark:text-slate-dark mb-4">
                Personas
              </h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {appState.personas.map(persona => (
                    <span key={persona.id} className="persona-pill">
                      {persona.name}
                    </span>
                  ))}
                </div>
                <p className="text-caption text-steel dark:text-steel-dark">
                  {appState.personas.length > 0
                    ? 'Ready for evidence analysis'
                    : 'Loading personas...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Components - Phase 3.1 Features */}

      {/* Feature 1.1: Chat with Persona Modal */}
      {showPersonaChat && (
        <PersonaChat
          personas={appState.personas}
          onClose={() => setShowPersonaChat(false)}
          onError={setError}
        />
      )}

      {/* Feature 1.2: Import PRD Modal */}
      {showImportModal && (
        <ImportPRDModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportPRD}
          importing={importing}
          progress={importProgress}
          onError={setError}
        />
      )}

      {/* Feature 1.4: Global Error Toast */}
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}
    </div>
  );
}
