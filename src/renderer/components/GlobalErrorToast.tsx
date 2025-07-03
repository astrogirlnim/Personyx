/**
 * Global Error Toast Component
 * Phase 3.1.4 - Show global error toast for failed ingest events
 *
 * Displays global error notifications for failed import operations
 * Following Evidence Gate design system with risk red styling
 * Supports auto-dismiss, manual dismiss, and error queuing
 */

import { useState, useEffect, useCallback } from 'react';

// Error toast types for categorization
export type ErrorToastType =
  | 'ingest-error'
  | 'validation-error'
  | 'general-error';

// Error toast data structure
export interface ErrorToast {
  id: string;
  type: ErrorToastType;
  title: string;
  message: string;
  timestamp: Date;
  dismissible?: boolean;
  autoDismissMs?: number;
}

// Props for GlobalErrorToast component
interface GlobalErrorToastProps {
  toasts: ErrorToast[];
  onDismiss: (toastId: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Individual toast item component
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ErrorToast;
  onDismiss: (toastId: string) => void;
}): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (toast.autoDismissMs && toast.autoDismissMs > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [toast.autoDismissMs]);

  // Show animation on mount
  useEffect(() => {
    // Small delay to trigger entrance animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsRemoving(true);
    // Wait for exit animation before removing
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }, [toast.id, onDismiss]);

  // Get error icon based on type
  const getErrorIcon = () => {
    switch (toast.type) {
      case 'ingest-error':
        return (
          <svg
            className="w-5 h-5 text-risk-red"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'validation-error':
        return (
          <svg
            className="w-5 h-5 text-risk-red"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-risk-red"
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
        );
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-200 ease-out
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        bg-risk-red/10 dark:bg-risk-red-dark/10 
        border-l-4 border-risk-red dark:border-risk-red-dark
        rounded-dr-md shadow-dr-sm
        p-4 mb-3 max-w-sm w-full
        backdrop-blur-sm
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Error Icon */}
        <div className="flex-shrink-0 mt-0.5">{getErrorIcon()}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-body-sm font-medium text-risk-red dark:text-risk-red-dark mb-1">
            {toast.title}
          </h4>
          <p className="text-caption text-slate dark:text-slate-dark leading-relaxed">
            {toast.message}
          </p>
          <p className="text-micro text-steel dark:text-steel-dark mt-2">
            {toast.timestamp.toLocaleTimeString()}
          </p>
        </div>

        {/* Dismiss Button */}
        {toast.dismissible !== false && (
          <button
            onClick={handleDismiss}
            className="
              flex-shrink-0 p-1 rounded-full 
              hover:bg-risk-red/20 dark:hover:bg-risk-red-dark/20 
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-risk-red/50
            "
            title="Dismiss"
          >
            <svg
              className="w-4 h-4 text-steel dark:text-steel-dark hover:text-risk-red dark:hover:text-risk-red-dark"
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
        )}
      </div>
    </div>
  );
}

// Main GlobalErrorToast component
export function GlobalErrorToast({
  toasts,
  onDismiss,
  position = 'top-right',
}: GlobalErrorToastProps): JSX.Element | null {
  // Don't render if no toasts
  if (toasts.length === 0) {
    return null;
  }

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-6 left-6';
      case 'bottom-right':
        return 'bottom-6 right-6';
      case 'bottom-left':
        return 'bottom-6 left-6';
      default:
        return 'top-6 right-6';
    }
  };

  return (
    <div
      className={`
        fixed z-50 pointer-events-none
        ${getPositionClasses()}
      `}
    >
      <div className="space-y-3 pointer-events-auto">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

// Utility function to create error toasts
export function createErrorToast(
  type: ErrorToastType,
  title: string,
  message: string,
  options: {
    dismissible?: boolean;
    autoDismissMs?: number;
  } = {}
): ErrorToast {
  return {
    id: `error-toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    timestamp: new Date(),
    dismissible: options.dismissible !== false, // Default to true
    autoDismissMs: options.autoDismissMs || 5000, // Default 5 seconds
  };
}

// Predefined error toast creators for common scenarios
export const ErrorToastCreators = {
  // PRD import failures
  prdImportFailed: (fileName: string, error: string): ErrorToast =>
    createErrorToast(
      'ingest-error',
      'PRD Import Failed',
      `Failed to import "${fileName}": ${error}`,
      { autoDismissMs: 7000 }
    ),

  // Transcript import failures
  transcriptImportFailed: (fileName: string, error: string): ErrorToast =>
    createErrorToast(
      'ingest-error',
      'Transcript Import Failed',
      `Failed to import "${fileName}": ${error}`,
      { autoDismissMs: 7000 }
    ),

  // File validation errors
  fileValidationFailed: (fileName: string, reason: string): ErrorToast =>
    createErrorToast(
      'validation-error',
      'File Validation Error',
      `"${fileName}" ${reason}`,
      { autoDismissMs: 6000 }
    ),

  // AI service errors
  aiServiceError: (service: string, error: string): ErrorToast =>
    createErrorToast('general-error', `${service} Service Error`, error, {
      autoDismissMs: 8000,
    }),

  // General application errors
  applicationError: (error: string): ErrorToast =>
    createErrorToast('general-error', 'Application Error', error, {
      autoDismissMs: 6000,
    }),
};
