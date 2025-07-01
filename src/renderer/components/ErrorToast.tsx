/**
 * ErrorToast Component - Phase 3.1 Feature 1.4
 * Global error toast for failed ingest events
 */

import React, { useEffect, useState } from 'react';

interface ErrorToastProps {
  message: string;
  onClose: () => void;
  autoCloseDelay?: number; // milliseconds
  type?: 'error' | 'warning' | 'info';
}

export function ErrorToast({
  message,
  onClose,
  autoCloseDelay = 5000,
  type = 'error',
}: ErrorToastProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Show toast with slide-in animation
    setIsVisible(true);

    // Auto-close timer
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, autoCloseDelay);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - 100 / (autoCloseDelay / 100);
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    return () => {
      clearTimeout(autoCloseTimer);
      clearInterval(progressInterval);
    };
  }, [autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    // Wait for slide-out animation before calling onClose
    setTimeout(onClose, 300);
  };

  // Get styling based on toast type
  const getToastStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-caution-amber dark:bg-caution-amber-dark',
          text: 'text-paper dark:text-paper-dark',
          icon: '⚠️',
          progressBg: 'bg-paper/30 dark:bg-paper-dark/30',
        };
      case 'info':
        return {
          bg: 'bg-evidence dark:bg-evidence-dark',
          text: 'text-paper dark:text-paper-dark',
          icon: 'ℹ️',
          progressBg: 'bg-paper/30 dark:bg-paper-dark/30',
        };
      case 'error':
      default:
        return {
          bg: 'bg-risk-red dark:bg-risk-red-dark',
          text: 'text-paper dark:text-paper-dark',
          icon: '❌',
          progressBg: 'bg-paper/30 dark:bg-paper-dark/30',
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`${styles.bg} rounded-dr-md shadow-dr-md border border-transparent min-w-[320px] max-w-[500px] overflow-hidden`}
      >
        {/* Main Content */}
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className="flex-shrink-0 text-lg">{styles.icon}</div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <div className={`text-body font-medium ${styles.text}`}>
                {type === 'error' && 'Error'}
                {type === 'warning' && 'Warning'}
                {type === 'info' && 'Notice'}
              </div>
              <div className={`text-body mt-1 ${styles.text} break-words`}>
                {message}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className={`flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.text}`}
              title="Close"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

          {/* Action buttons for specific error types */}
          {type === 'error' &&
            (message.includes('import') || message.includes('PRD')) && (
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => {
                    // Retry action could be implemented here
                    console.log('🔄 Retry action triggered');
                    handleClose();
                  }}
                  className={`text-caption px-3 py-1 rounded-dr-md border border-current hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.text}`}
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    // Help action could be implemented here
                    console.log('❓ Help action triggered');
                    handleClose();
                  }}
                  className={`text-caption px-3 py-1 rounded-dr-md border border-current hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.text}`}
                >
                  Get Help
                </button>
              </div>
            )}
        </div>

        {/* Progress Bar */}
        <div className={`h-1 ${styles.progressBg}`}>
          <div
            className="h-full bg-paper dark:bg-paper-dark transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
