/**
 * Personyx Main App Component
 */

import React, { useEffect, useState } from 'react';
import { APP_NAME } from '@shared/constants';
import type { AppState } from '@shared/types';

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

  useEffect(() => {
    console.log('🚀 Personyx App component mounted');

    // TODO: Set up IPC communication with main process
    // TODO: Load initial data

    setAppState(prev => ({ ...prev, isReady: true }));
  }, []);

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
            <button className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors">
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
              <div className="drop-zone interactive min-h-[360px] flex items-center justify-center">
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
                {/* Ring Gauge - Empty State */}
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
                <button className="btn-primary">Import First PRD</button>
              </div>
            </div>

            {/* Personas Card */}
            <div className="card">
              <h3 className="text-h2 text-slate dark:text-slate-dark mb-4">
                Personas
              </h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="persona-pill">Solo Founder</span>
                  <span className="persona-pill">Agency Marketer</span>
                </div>
                <p className="text-caption text-steel dark:text-steel-dark">
                  Ready for evidence analysis
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
