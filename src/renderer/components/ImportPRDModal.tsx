/**
 * ImportPRDModal Component - Phase 3.1 Feature 1.2
 * Import PRD modal with drag-and-drop and progress bar
 */

import React, { useState, useCallback, useRef } from 'react';

interface ImportPRDModalProps {
  onClose: () => void;
  onImport: () => Promise<void>;
  importing: boolean;
  progress: number;
  onError: (message: string) => void;
}

export function ImportPRDModal({
  onClose,
  onImport,
  importing,
  progress,
  onError,
}: ImportPRDModalProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported file types
  const supportedTypes = ['.md', '.txt', '.markdown'];
  const supportedMimeTypes = ['text/markdown', 'text/plain'];

  // Validate file type
  const validateFile = useCallback(
    (file: File): boolean => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidExtension = supportedTypes.includes(extension);
      const isValidMime =
        supportedMimeTypes.includes(file.type) || file.type === '';

      if (!isValidExtension && !isValidMime) {
        onError(
          `Invalid file type. Please select a ${supportedTypes.join(', ')} file.`
        );
        return false;
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        onError('File is too large. Please select a file smaller than 10MB.');
        return false;
      }

      // Check if file is not empty
      if (file.size === 0) {
        onError('File is empty. Please select a valid PRD document.');
        return false;
      }

      return true;
    },
    [onError]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      console.log('📄 File selected:', file.name, file.type, file.size);

      if (validateFile(file)) {
        setSelectedFile(file);
        console.log('✅ File validated successfully');
      }
    },
    [validateFile]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only remove drag state if leaving the drop zone completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // Handle browse button click
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle import button click
  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    try {
      await onImport();
    } catch (error) {
      console.error('❌ Import failed:', error);
      // Error handling is done in the parent component
    }
  }, [selectedFile, onImport]);

  // Close modal (only if not importing)
  const handleClose = useCallback(() => {
    if (!importing) {
      onClose();
    }
  }, [importing, onClose]);

  // Get file size string
  const getFileSizeString = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-paper dark:bg-paper-dark rounded-dr-md shadow-dr-md w-full max-w-lg m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-graphite dark:border-graphite-dark">
          <h2 className="text-h2 text-slate dark:text-slate-dark">
            📄 Import PRD Document
          </h2>
          {!importing && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 rounded-full transition-colors"
              title="Close"
            >
              <svg
                className="w-5 h-5 text-steel dark:text-steel-dark"
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

        {/* Content */}
        <div className="p-6">
          {!importing ? (
            <>
              {/* Drop Zone */}
              <div
                className={`drop-zone min-h-[200px] flex items-center justify-center cursor-pointer transition-all duration-200 ${
                  isDragOver ? 'drag-over' : ''
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
              >
                <div className="text-center">
                  <svg
                    className={`mx-auto h-16 w-16 mb-4 drop-zone-icon transition-colors ${
                      isDragOver
                        ? 'text-evidence dark:text-evidence-dark'
                        : 'text-steel dark:text-steel-dark'
                    }`}
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
                  <p
                    className={`text-body-lg font-medium mb-2 transition-colors ${
                      isDragOver
                        ? 'text-evidence dark:text-evidence-dark'
                        : 'text-slate dark:text-slate-dark'
                    }`}
                  >
                    {isDragOver
                      ? 'Drop your PRD here'
                      : 'Drag & drop your PRD here'}
                  </p>
                  <p className="text-body text-steel dark:text-steel-dark mb-4">
                    or click to browse for files
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-caption text-steel dark:text-steel-dark">
                    {supportedTypes.map((type, index) => (
                      <span
                        key={type}
                        className="bg-mist dark:bg-mist-dark px-2 py-1 rounded"
                      >
                        {type}
                        {index < supportedTypes.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={supportedTypes.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Selected file info */}
              {selectedFile && (
                <div className="mt-4 p-4 bg-mist dark:bg-mist-dark rounded-dr-md border border-graphite dark:border-graphite-dark">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <svg
                        className="w-8 h-8 text-evidence dark:text-evidence-dark"
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
                      <div>
                        <p className="text-body font-medium text-slate dark:text-slate-dark">
                          {selectedFile.name}
                        </p>
                        <p className="text-caption text-steel dark:text-steel-dark">
                          {getFileSizeString(selectedFile.size)} • Modified{' '}
                          {selectedFile.lastModified
                            ? new Date(
                                selectedFile.lastModified
                              ).toLocaleDateString()
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-1 hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 rounded-full transition-colors"
                      title="Remove file"
                    >
                      <svg
                        className="w-4 h-4 text-steel dark:text-steel-dark"
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
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import PRD
                </button>
              </div>
            </>
          ) : (
            /* Import Progress */
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <svg
                  className="w-16 h-16 text-graphite dark:text-graphite-dark"
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-evidence dark:border-evidence-dark border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>

              <h3 className="text-body-lg font-medium text-slate dark:text-slate-dark mb-2">
                Processing PRD Document
              </h3>
              <p className="text-body text-steel dark:text-steel-dark mb-6">
                {selectedFile?.name}
              </p>

              {/* Progress Bar */}
              <div className="progress-bar mb-4">
                <div
                  className="progress-fill transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between text-caption text-steel dark:text-steel-dark mb-6">
                <span>Processing...</span>
                <span>{Math.round(progress)}%</span>
              </div>

              <div className="space-y-2 text-caption text-steel dark:text-steel-dark">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-evidence dark:bg-evidence-dark rounded-full animate-pulse"></div>
                  <span>Extracting content sections</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div
                    className="w-2 h-2 bg-evidence dark:bg-evidence-dark rounded-full animate-pulse"
                    style={{ animationDelay: '0.5s' }}
                  ></div>
                  <span>Generating embeddings</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div
                    className="w-2 h-2 bg-evidence dark:bg-evidence-dark rounded-full animate-pulse"
                    style={{ animationDelay: '1s' }}
                  ></div>
                  <span>Calculating evidence scores</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
