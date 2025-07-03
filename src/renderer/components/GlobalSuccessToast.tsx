/**
 * Global Success Toast Component
 * Phase 3.1.7 - Show success toast "Transcript analysed – evidence added" on completion
 *
 * Displays global success notifications for successful transcript processing
 * Following Evidence Gate design system with persona green styling
 * Supports auto-dismiss, manual dismiss, and success queuing
 */

import { useState, useEffect, useCallback } from 'react';

// Success toast types for categorization
export type SuccessToastType =
  | 'transcript-success'
  | 'evidence-success'
  | 'general-success';

// Success toast data structure
export interface SuccessToast {
  id: string;
  type: SuccessToastType;
  title: string;
  message: string;
  timestamp: Date;
  dismissible?: boolean;
  autoDismissMs?: number;
  // Additional data for context
  fileName?: string;
  evidenceCount?: number;
  personasAffected?: string[];
  processingTime?: number;
}

// Props for GlobalSuccessToast component
interface GlobalSuccessToastProps {
  toasts: SuccessToast[];
  onDismiss: (toastId: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Individual toast item component
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: SuccessToast;
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

  // Get success icon based on type
  const getSuccessIcon = () => {
    switch (toast.type) {
      case 'transcript-success':
        return (
          <svg
            className="w-5 h-5 text-persona"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'evidence-success':
        return (
          <svg
            className="w-5 h-5 text-persona"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-persona"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        );
    }
  };

  // Format processing time for display
  const formatProcessingTime = (time?: number) => {
    if (!time) return '';
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className={`
        transform transition-all duration-200 ease-out
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        bg-persona/10 dark:bg-persona/15 
        border-l-4 border-persona
        rounded-dr-md shadow-dr-sm
        p-4 mb-3 max-w-sm w-full
        backdrop-blur-sm
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Success Icon */}
        <div className="flex-shrink-0 mt-0.5">{getSuccessIcon()}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-body-sm font-medium text-persona mb-1">
            {toast.title}
          </h4>
          <p className="text-caption text-slate dark:text-slate-dark leading-relaxed">
            {toast.message}
          </p>

          {/* Success details */}
          {(toast.evidenceCount ||
            toast.personasAffected?.length ||
            toast.processingTime) && (
            <div className="mt-2 text-micro text-steel dark:text-steel-dark space-y-1">
              {toast.evidenceCount && (
                <div className="flex items-center space-x-1">
                  <svg
                    className="w-3 h-3"
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
                  <span>{toast.evidenceCount} evidence items</span>
                </div>
              )}
              {toast.personasAffected?.length && (
                <div className="flex items-center space-x-1">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                  <span>{toast.personasAffected.length} personas affected</span>
                </div>
              )}
              {toast.processingTime && (
                <div className="text-micro text-steel dark:text-steel-dark">
                  Processed in {formatProcessingTime(toast.processingTime)}
                </div>
              )}
            </div>
          )}

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
              hover:bg-persona/20 dark:hover:bg-persona/25 
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-persona/50
            "
            title="Dismiss"
            aria-label="Dismiss success notification"
          >
            <svg
              className="w-4 h-4 text-steel dark:text-steel-dark hover:text-persona"
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

// Main GlobalSuccessToast component
export function GlobalSuccessToast({
  toasts,
  onDismiss,
  position = 'top-right',
}: GlobalSuccessToastProps): JSX.Element | null {
  // Don't render if no toasts
  if (toasts.length === 0) {
    return null;
  }

  // Position classes based on position prop
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div
      className={`
        fixed ${getPositionClasses()}
        z-50 pointer-events-none
        max-w-sm w-full
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

// Helper function to create success toast
export function createSuccessToast(
  type: SuccessToastType,
  title: string,
  message: string,
  options: {
    dismissible?: boolean;
    autoDismissMs?: number;
    fileName?: string;
    evidenceCount?: number;
    personasAffected?: string[];
    processingTime?: number;
  } = {}
): SuccessToast {
  return {
    id: `success-toast-${Date.now()}-${Math.random()}`,
    type,
    title,
    message,
    timestamp: new Date(),
    dismissible: options.dismissible ?? true,
    autoDismissMs: options.autoDismissMs ?? 6000, // 6 seconds default for success
    fileName: options.fileName,
    evidenceCount: options.evidenceCount,
    personasAffected: options.personasAffected,
    processingTime: options.processingTime,
  };
}

// Helper function to create transcript success toast
export function createTranscriptSuccessToast(
  fileName: string,
  evidenceCount: number,
  personasAffected: string[],
  processingTime: number
): SuccessToast {
  return createSuccessToast(
    'transcript-success',
    'Transcript Analysed',
    `Evidence added • ${evidenceCount} items • ${personasAffected.length} personas affected`,
    {
      fileName,
      evidenceCount,
      personasAffected,
      processingTime,
      autoDismissMs: 6000, // 6 seconds for transcript success
    }
  );
}
