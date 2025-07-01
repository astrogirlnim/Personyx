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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Loading {APP_NAME}...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {APP_NAME}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Evidence-based PRD analysis
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Import Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📄 Import PRD
              </h2>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  <svg
                    className="mx-auto h-12 w-12 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-lg font-medium mb-2">Drop your PRD here</p>
                  <p className="text-sm">
                    or click to browse for .md or .txt files
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Evidence Scores */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📊 Evidence Scores
              </h3>
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No PRDs analyzed yet</p>
              </div>
            </div>

            {/* Personas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                👥 Personas
              </h3>
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">Loading personas...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
