/**
 * PersonaPulse Main App Component
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
    console.log('🚀 PersonaPulse App component mounted');

    // TODO: Set up IPC communication with main process
    // TODO: Load initial data

    setAppState(prev => ({ ...prev, isReady: true }));
  }, []);

  if (!appState.isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mist-grey dark:bg-mist-grey-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-evidence-blue dark:border-evidence-blue-dark mx-auto mb-4"></div>
          <h2 className="text-body-lg text-slate dark:text-slate-dark">
            Loading {APP_NAME}...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist-grey dark:bg-mist-grey-dark">
      {/* Header */}
      <header className="bg-paper-white dark:bg-paper-white-dark shadow-dr-sm border-b border-graphite dark:border-graphite-dark">
        <div className="px-lg py-md">
          <h1 className="text-h1 text-slate dark:text-slate-dark">
            {APP_NAME}
          </h1>
          <p className="text-caption text-steel dark:text-steel-dark">
            Evidence-based PRD analysis
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-lg py-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2xl">
          {/* Import Section */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-h2 text-slate dark:text-slate-dark mb-lg">
                📄 Import PRD
              </h2>
              <div className="drop-zone interactive">
                <div className="text-steel dark:text-steel-dark drop-zone-text">
                  <svg
                    className="mx-auto h-12 w-12 mb-md drop-zone-icon"
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
                  <p className="text-body-lg font-medium mb-sm">
                    Drop your PRD here
                  </p>
                  <p className="text-body">
                    or click to browse for .md or .txt files
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-lg">
            {/* Evidence Scores */}
            <div className="card">
              <h3 className="text-h2 text-slate dark:text-slate-dark mb-lg">
                📊 Evidence Scores
              </h3>
              <div className="text-center text-steel dark:text-steel-dark">
                <p className="text-body">No PRDs analyzed yet</p>
                <div className="mt-md">
                  <button className="btn-primary">Import First PRD</button>
                </div>
              </div>
            </div>

            {/* Personas */}
            <div className="card">
              <h3 className="text-h2 text-slate dark:text-slate-dark mb-lg">
                👥 Personas
              </h3>
              <div className="text-center text-steel dark:text-steel-dark">
                <div className="space-y-sm">
                  <div className="score-badge medium">Solo Founder</div>
                  <div className="score-badge medium">Agency Marketer</div>
                </div>
                <p className="text-caption mt-md">
                  Ready for evidence analysis
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
