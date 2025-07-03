/**
 * Activity Log Panel Component
 * Phase 3.1.6: Activity Log Implementation
 * Displays all app activities with filtering, search, and pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  ActivityLog,
  ActivityLogFilter,
  ActivityLogStats,
  ActivityLogType,
} from '../../shared/types';

interface ActivityLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityLogData {
  entries: ActivityLog[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTIVITY_TYPE_COLORS = {
  'import-success': 'text-persona bg-persona/10 border-persona/20',
  'import-error':
    'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800',
  'score-update': 'text-evidence bg-evidence/10 border-evidence/20',
  'general-activity':
    'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700',
};

const ACTIVITY_TYPE_ICONS = {
  'import-success': '✅',
  'import-error': '❌',
  'score-update': '📊',
  'general-activity': '📝',
};

export function ActivityLogPanel({
  isOpen,
  onClose,
}: ActivityLogPanelProps): JSX.Element | null {
  const [activityData, setActivityData] = useState<ActivityLogData | null>(
    null
  );
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch activity log data
  const fetchActivityLog = useCallback(
    async (page = 1, search = '', type = 'all') => {
      try {
        setLoading(true);
        setError(null);

        const filter: ActivityLogFilter = {};
        if (search.trim()) {
          filter.search = search.trim();
        }
        if (type !== 'all') {
          filter.type = type as ActivityLogType;
        }

        console.log('🔍 Fetching activity log with filter:', { page, filter });

        const result = (await window.electronAPI.getActivityLog({
          page,
          limit: 20,
          filter,
        })) as ActivityLogData;

        console.log('✅ Activity log data received:', result);
        setActivityData(result);
      } catch (err) {
        console.error('❌ Failed to fetch activity log:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch activity log'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch activity log stats
  const fetchStats = useCallback(async () => {
    try {
      const result =
        (await window.electronAPI.getActivityLogStats()) as ActivityLogStats;
      console.log('📊 Activity log stats received:', result);
      setStats(result);
    } catch (err) {
      console.error('❌ Failed to fetch activity log stats:', err);
    }
  }, []);

  // Clear activity log
  const handleClearLog = useCallback(async () => {
    if (
      !confirm(
        'Are you sure you want to clear all activity log entries? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await window.electronAPI.clearActivityLog();
      console.log('✅ Activity log cleared');

      // Refresh data
      await Promise.all([
        fetchActivityLog(1, searchTerm, typeFilter),
        fetchStats(),
      ]);
    } catch (err) {
      console.error('❌ Failed to clear activity log:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to clear activity log'
      );
    } finally {
      setLoading(false);
    }
  }, [fetchActivityLog, fetchStats, searchTerm, typeFilter]);

  // Export activity log
  const handleExport = useCallback(
    async (format: 'csv' | 'json') => {
      try {
        const filter: ActivityLogFilter = {};
        if (searchTerm.trim()) {
          filter.search = searchTerm.trim();
        }
        if (typeFilter !== 'all') {
          filter.type = typeFilter as ActivityLogType;
        }

        const result = (await window.electronAPI.exportActivityLog(
          format,
          filter
        )) as {
          success: boolean;
          data: string;
        };

        if (result.success) {
          // Create download link
          const blob = new Blob([result.data], {
            type: format === 'csv' ? 'text/csv' : 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `activity-log-${new Date().toISOString().split('T')[0]}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          console.log(`✅ Activity log exported as ${format.toUpperCase()}`);
        }
      } catch (err) {
        console.error(`❌ Failed to export activity log as ${format}:`, err);
        setError(
          err instanceof Error
            ? err.message
            : `Failed to export activity log as ${format}`
        );
      }
    },
    [searchTerm, typeFilter]
  );

  // Handle search
  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      setCurrentPage(1);
      fetchActivityLog(1, term, typeFilter);
    },
    [fetchActivityLog, typeFilter]
  );

  // Handle type filter change
  const handleTypeFilter = useCallback(
    (type: string) => {
      setTypeFilter(type);
      setCurrentPage(1);
      fetchActivityLog(1, searchTerm, type);
    },
    [fetchActivityLog, searchTerm]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      fetchActivityLog(page, searchTerm, typeFilter);
    },
    [fetchActivityLog, searchTerm, typeFilter]
  );

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: string | Date) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (isOpen) {
      fetchActivityLog();
      fetchStats();
    }
  }, [isOpen, fetchActivityLog, fetchStats]);

  // Listen for activity log updates
  useEffect(() => {
    if (!isOpen) return;

    const handleActivityUpdate = (data: unknown) => {
      console.log('📢 Activity log update received:', data);
      // Refresh current page
      fetchActivityLog(currentPage, searchTerm, typeFilter);
      fetchStats();
    };

    window.electronAPI.onActivityLogUpdated(handleActivityUpdate);

    // Note: cleanup is handled by the parent component
    return () => {
      console.log('🧹 Activity log panel cleanup');
    };
  }, [
    isOpen,
    currentPage,
    searchTerm,
    typeFilter,
    fetchActivityLog,
    fetchStats,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-paper dark:bg-slate-800 rounded-lg shadow-md w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-graphite dark:border-slate-600">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              📝 Activity Log
            </h2>
            {stats && (
              <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                <span>{stats.totalActivities} total</span>
                <span>{stats.todayActivities} today</span>
                <span>{stats.successRate.toFixed(1)}% success</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Export buttons */}
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
              disabled={loading}
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
              disabled={loading}
            >
              Export JSON
            </button>

            {/* Clear button */}
            <button
              onClick={handleClearLog}
              className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded transition-colors"
              disabled={loading}
            >
              Clear All
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
            >
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-graphite dark:border-slate-600">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-graphite dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-evidence/20 focus:border-evidence dark:bg-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={e => handleTypeFilter(e.target.value)}
              className="px-3 py-2 border border-graphite dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-evidence/20 focus:border-evidence dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="all">All Types</option>
              <option value="import-success">Import Success</option>
              <option value="import-error">Import Error</option>
              <option value="score-update">Score Update</option>
              <option value="general-activity">General</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evidence"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && activityData && (
            <>
              {activityData.entries.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No activity log entries found</p>
                  {(searchTerm || typeFilter !== 'all') && (
                    <p className="text-sm mt-2">
                      Try adjusting your search or filter criteria
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {activityData.entries.map(entry => (
                    <div
                      key={entry.id}
                      className="bg-mist dark:bg-slate-700 rounded-lg p-4 border border-graphite dark:border-slate-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {/* Type icon */}
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${ACTIVITY_TYPE_COLORS[entry.type]}`}
                          >
                            {ACTIVITY_TYPE_ICONS[entry.type]}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                {entry.title}
                              </h3>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full border ${ACTIVITY_TYPE_COLORS[entry.type]}`}
                              >
                                {entry.type.replace('-', ' ')}
                              </span>
                            </div>

                            {entry.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                {entry.description}
                              </p>
                            )}

                            {/* Metadata */}
                            {entry.metadata && (
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-500">
                                {entry.metadata.fileName && (
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    📄 {entry.metadata.fileName}
                                  </span>
                                )}
                                {entry.metadata.evidenceCount !== undefined && (
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    📊 {entry.metadata.evidenceCount} evidence
                                  </span>
                                )}
                                {entry.metadata.personasAffected &&
                                  entry.metadata.personasAffected.length >
                                    0 && (
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                      👥{' '}
                                      {entry.metadata.personasAffected.length}{' '}
                                      personas
                                    </span>
                                  )}
                                {entry.metadata.processingTime && (
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    ⏱️ {entry.metadata.processingTime}ms
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-500 ml-4">
                          {formatTimestamp(entry.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && activityData && activityData.totalPages > 1 && (
          <div className="border-t border-graphite dark:border-slate-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing page {activityData.page} of {activityData.totalPages}(
                {activityData.totalCount} total entries)
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from(
                    { length: Math.min(5, activityData.totalPages) },
                    (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            page === currentPage
                              ? 'bg-evidence text-white'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= activityData.totalPages}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
