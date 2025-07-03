/**
 * Transcript Import Modal Component
 * Phase 3.1.5 - Import Interview Transcript Modal
 *
 * Mirrors ImportPRDModal pattern but adapted for interview transcript files
 * Supports drag & drop + file picker for .md, .txt, .markdown files
 * Evidence Gate design system compliant
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface ProgressStage {
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
}

interface TranscriptImportResult {
  success: boolean;
  result?: {
    fileName: string;
    contentLength: number;
    timestamp: Date;
  };
  error?: string;
}

interface TranscriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null;
  initialFilePath?: string | null;
}

export function TranscriptImportModal({
  isOpen,
  onClose,
  initialFile = null,
  initialFilePath = null,
}: TranscriptImportModalProps): JSX.Element | null {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressStage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptImportResult | null>(null);
  const [shouldAutoImport, setShouldAutoImport] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressStages: ProgressStage[] = [
    { name: 'Validating file', status: 'pending' },
    { name: 'Reading content', status: 'pending' },
    { name: 'Sending to main process', status: 'pending' },
    { name: 'AI processing (embeddings & classification)', status: 'pending' },
    { name: 'Re-calculating evidence scores', status: 'pending' },
  ];

  // Reset state when modal opens/closes, or set initial file/path
  useEffect(() => {
    console.log('🎤 Transcript Modal useEffect triggered:', {
      isOpen,
      hasInitialFile: !!initialFile,
      hasInitialFilePath: !!initialFilePath,
      initialFileName: initialFile?.name,
      initialFilePath,
    });

    if (!isOpen) {
      console.log('🚪 Transcript modal closing - resetting state');
      setSelectedFile(null);
      setSelectedFilePath(null);
      setIsProcessing(false);
      setProgress([]);
      setError(null);
      setResult(null);
      setIsDragging(false);
    } else {
      console.log('🚪 Transcript modal opening');
      if (initialFile) {
        console.log('🔍 Setting initial file in transcript modal:', {
          name: initialFile.name,
          size: initialFile.size,
          type: initialFile.type,
        });
        setSelectedFile(initialFile);
        setSelectedFilePath(null);
        setError(null);
      } else if (initialFilePath) {
        console.log(
          '🔍 Setting initial file path in transcript modal:',
          initialFilePath
        );
        setSelectedFile(null);
        setSelectedFilePath(initialFilePath);
        setError(null);
      }
    }
  }, [isOpen, initialFile, initialFilePath]);

  const handleImport = useCallback(async () => {
    if (!selectedFile && !selectedFilePath) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    // Initialize progress stages
    const initialProgress = progressStages.map(stage => ({ ...stage }));
    setProgress(initialProgress);

    try {
      // Simulate progress updates for better UX
      const updateProgress = (
        stageIndex: number,
        status: ProgressStage['status'],
        message?: string
      ) => {
        setProgress(prev =>
          prev.map((stage, index) =>
            index === stageIndex
              ? { ...stage, status, message }
              : index < stageIndex
                ? { ...stage, status: 'complete' }
                : stage
          )
        );
      };

      // Stage 1: Validating file
      updateProgress(0, 'active');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateProgress(0, 'complete');

      // Stage 2: Reading content
      updateProgress(1, 'active');

      let importResult: TranscriptImportResult;

      if (selectedFile) {
        // Handle File object (from drag/drop or file picker)
        const fileContent = await selectedFile.text();

        updateProgress(1, 'complete');

        // Stage 3: Processing with main process
        updateProgress(2, 'active', 'Sending to main process...');
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(2, 'complete');

        // Stage 4: AI processing
        updateProgress(3, 'active', 'Processing with AI...');

        // Stage 5: Re-calculating evidence scores
        updateProgress(4, 'active', 'Re-calculating scores...');

        // Call the transcript import API
        importResult = (await window.electronAPI.importTranscript(
          fileContent
        )) as TranscriptImportResult;
      } else if (selectedFilePath) {
        // Handle file path (from tray drop)
        updateProgress(1, 'complete');

        // Stage 3: Processing with main process
        updateProgress(2, 'active', 'Sending to main process...');
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(2, 'complete');

        // Stage 4: AI processing
        updateProgress(3, 'active', 'Processing with AI...');

        // Stage 5: Re-calculating evidence scores
        updateProgress(4, 'active', 'Re-calculating scores...');

        // Call the transcript import API with file path
        importResult = (await window.electronAPI.importTranscript(
          selectedFilePath
        )) as TranscriptImportResult;
      } else {
        throw new Error('No file or file path selected');
      }

      updateProgress(4, 'complete');
      setResult(importResult);

      console.log('✅ Transcript import completed successfully:', importResult);
    } catch (error) {
      console.error('❌ Transcript import failed:', error);
      setError(`Import failed: ${error}`);

      // Mark current stage as error
      setProgress(prev =>
        prev.map(stage =>
          stage.status === 'active'
            ? { ...stage, status: 'error', message: 'Failed' }
            : stage
        )
      );
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, selectedFilePath, progressStages]);

  // Auto-start processing when file comes from tray drop
  useEffect(() => {
    if (
      isOpen &&
      !isProcessing &&
      !result &&
      (initialFile || initialFilePath) &&
      (selectedFile || selectedFilePath) &&
      !shouldAutoImport
    ) {
      console.log('🚀 Auto-starting transcript import for tray-dropped file');

      // Basic validation for File objects
      if (selectedFile) {
        if (selectedFile.size === 0) {
          console.log('❌ Auto-import cancelled - empty file');
          setError('File cannot be empty');
          return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
          console.log('❌ Auto-import cancelled - file too large');
          setError('File size must be less than 10MB');
          return;
        }
        const validExtensions = ['.md', '.txt', '.markdown'];
        const hasValidExtension = validExtensions.some(ext =>
          selectedFile.name.toLowerCase().endsWith(ext)
        );
        if (!hasValidExtension) {
          console.log('❌ Auto-import cancelled - invalid file type');
          setError(
            'Please select a valid transcript file (.md, .txt, or .markdown)'
          );
          return;
        }
      }

      // Trigger auto-import after a short delay to show the UI
      setTimeout(() => {
        setShouldAutoImport(true);
      }, 500);
    }
  }, [
    isOpen,
    selectedFile,
    selectedFilePath,
    initialFile,
    initialFilePath,
    isProcessing,
    result,
    shouldAutoImport,
  ]);

  // Handle auto-import trigger
  useEffect(() => {
    if (
      shouldAutoImport &&
      (selectedFile || selectedFilePath) &&
      !isProcessing
    ) {
      console.log('🚀 Executing transcript auto-import');
      setShouldAutoImport(false);
      handleImport();
    }
  }, [
    shouldAutoImport,
    selectedFile,
    selectedFilePath,
    isProcessing,
    handleImport,
  ]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    console.log('🔍 Validating transcript file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      isEmpty: file.size === 0,
    });

    // Validate file size first
    if (file.size === 0) {
      const errorMsg = 'File cannot be empty';
      console.log('❌ Empty transcript file detected:', errorMsg);
      setError(errorMsg);
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const errorMsg = 'File size must be less than 10MB';
      console.log('❌ Transcript file too large:', errorMsg);
      setError(errorMsg);
      return false;
    }

    // Validate file type for transcripts
    const validTypes = ['text/markdown', 'text/plain'];
    const validExtensions = ['.md', '.txt', '.markdown'];

    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    console.log('🔎 Transcript type validation:', {
      hasValidType,
      hasValidExtension,
      fileType: file.type,
      fileName: file.name,
    });

    if (!hasValidType && !hasValidExtension) {
      const errorMsg =
        'Please select a valid transcript file (.md, .txt, or .markdown)';
      console.log('❌ Invalid transcript file type:', errorMsg);
      setError(errorMsg);
      return false;
    }

    console.log('✅ Transcript file validation passed!');
    return true;
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      console.log('🔍 Transcript modal dataTransfer analysis:', {
        files: e.dataTransfer.files,
        filesLength: e.dataTransfer.files.length,
        items: e.dataTransfer.items,
        itemsLength: e.dataTransfer.items.length,
        types: e.dataTransfer.types,
      });

      // Method 1: Try standard files API
      let file: File | null = null;
      const files = Array.from(e.dataTransfer.files);

      if (files.length > 0) {
        file = files[0];
        console.log('✅ Got transcript file via files API:', file.name);
      }
      // Method 2: Try DataTransferItemList API
      else if (e.dataTransfer.items.length > 0) {
        console.log('🔄 Trying DataTransferItems API for transcript...');
        const items = Array.from(e.dataTransfer.items);

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          console.log(`📋 Transcript Item ${i}:`, {
            kind: item.kind,
            type: item.type,
          });

          if (item.kind === 'file') {
            const itemFile = item.getAsFile();
            if (itemFile) {
              file = itemFile;
              console.log('✅ Got transcript file via items API:', file.name);
              break;
            }
          }
          // Check for text/uri-list (file paths)
          else if (
            item.type === 'text/uri-list' ||
            item.type === 'text/plain'
          ) {
            try {
              const data = await new Promise<string>(resolve => {
                item.getAsString(resolve);
              });
              console.log('📝 Text data from transcript item:', data);

              // Check if it looks like a transcript file path
              if (
                data &&
                (data.includes('.md') ||
                  data.includes('.txt') ||
                  data.includes('.markdown'))
              ) {
                const filePath = data.replace('file://', '').trim();
                console.log('📂 Detected transcript file path:', filePath);
                setSelectedFilePath(filePath);
                setSelectedFile(null);
                setError(null);
                return;
              }
            } catch (error) {
              console.warn('⚠️ Error reading transcript text data:', error);
            }
          }
        }
      }

      // Method 3: Check for text data (file paths from external drops)
      if (!file) {
        console.log('🔄 Checking for text/uri-list data for transcript...');
        try {
          const uriData = e.dataTransfer.getData('text/uri-list');
          const textData = e.dataTransfer.getData('text/plain');

          console.log('📝 URI data for transcript:', uriData);
          console.log('📝 Text data for transcript:', textData);

          const pathData = uriData || textData;
          if (
            pathData &&
            (pathData.includes('.md') ||
              pathData.includes('.txt') ||
              pathData.includes('.markdown'))
          ) {
            const filePath = pathData.replace('file://', '').trim();
            console.log(
              '📂 Using transcript file path from text data:',
              filePath
            );
            setSelectedFilePath(filePath);
            setSelectedFile(null);
            setError(null);
            return;
          }
        } catch (error) {
          console.warn(
            '⚠️ Error reading transcript text data from dataTransfer:',
            error
          );
        }
      }

      // Process the file if we got one
      if (file) {
        console.log('🗂️ Dropped transcript file:', {
          name: file.name,
          size: file.size,
          type: file.type,
        });
        if (validateFile(file)) {
          setSelectedFile(file);
          setSelectedFilePath(null);
          setError(null);
        }
      } else {
        console.warn('⚠️ No transcript file data found in drop');
      }
    },
    [validateFile]
  );

  const handleFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        console.log('🔍 Selected transcript file:', {
          name: file.name,
          size: file.size,
          type: file.type,
        });
        if (validateFile(file)) {
          setSelectedFile(file);
          setError(null);
        }
        // Clear the input so the same file can be selected again
        e.target.value = '';
      }
    },
    [validateFile]
  );

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  console.log('🎭 Rendering Transcript Import Modal', {
    selectedFile: selectedFile?.name,
    selectedFilePath,
    isProcessing,
    hasFile: !!(selectedFile || selectedFilePath),
    renderingState:
      !selectedFile && !selectedFilePath && !result
        ? 'file-selection'
        : (selectedFile || selectedFilePath) && !result
          ? 'file-processing'
          : result
            ? 'success'
            : 'unknown',
  });

  return (
    <div className="fixed inset-0 bg-slate/50 dark:bg-slate-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-paper dark:bg-paper-dark rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-graphite dark:border-graphite-dark">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-persona dark:bg-persona-dark rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-paper dark:text-paper-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-h2 text-slate dark:text-slate-dark">
                Import Interview Transcript
              </h2>
              <p className="text-caption text-steel dark:text-steel-dark">
                Upload your interview transcript for evidence analysis
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5 text-slate dark:text-slate-dark"
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedFile && !selectedFilePath && !result ? (
            /* File Selection */
            <div className="space-y-6">
              <div
                className={`drop-zone interactive min-h-[300px] flex items-center justify-center cursor-pointer transition-all duration-200 ${
                  isDragging ? 'drag-over' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleFileSelect}
              >
                <div className="text-center">
                  <svg
                    className={`mx-auto h-16 w-16 mb-4 transition-colors drop-zone-icon ${
                      isDragging
                        ? 'text-persona dark:text-persona-dark'
                        : 'text-slate dark:text-slate-dark'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  <p
                    className={`text-body-lg font-medium mb-2 transition-colors drop-zone-text ${
                      isDragging
                        ? 'text-persona dark:text-persona-dark'
                        : 'text-slate dark:text-slate-dark'
                    }`}
                  >
                    {isDragging
                      ? 'Drop your transcript file here'
                      : 'Drag & drop your transcript file here'}
                  </p>
                  <p className="text-body text-steel dark:text-steel-dark mb-4">
                    or click to browse for .md, .txt, or .markdown files
                  </p>
                  <div className="text-caption text-steel dark:text-steel-dark space-y-1">
                    <p>• Maximum file size: 10MB</p>
                    <p>• Supported formats: Markdown (.md), Text (.txt)</p>
                    <p>
                      • Interview transcripts will be analyzed for persona
                      evidence
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.markdown,text/markdown,text/plain"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Error Display for File Selection */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-red-500"
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
                    <p className="text-body text-red-700 dark:text-red-300 font-medium">
                      {error}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* File Processing */
            <div className="space-y-6">
              {/* Selected File Info */}
              <div className="bg-graphite/5 dark:bg-graphite-dark/5 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-8 h-8 text-persona dark:text-persona-dark"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-body-lg font-medium text-slate dark:text-slate-dark">
                      {selectedFile?.name ||
                        (selectedFilePath
                          ? selectedFilePath.split('/').pop()
                          : 'Unknown file')}
                    </p>
                    <p className="text-caption text-steel dark:text-steel-dark">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB • ${selectedFile.type || 'Text file'}`
                        : selectedFilePath
                          ? `File path: ${selectedFilePath}`
                          : 'Unknown file type'}
                    </p>
                  </div>
                  {!isProcessing && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setSelectedFilePath(null);
                      }}
                      className="p-1 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
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
                  )}
                </div>
              </div>

              {/* Progress Stages */}
              {progress.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-body-lg font-medium text-slate dark:text-slate-dark">
                    Processing Progress
                  </h3>
                  <div className="space-y-2">
                    {progress.map((stage, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            stage.status === 'complete'
                              ? 'bg-persona text-paper'
                              : stage.status === 'active'
                                ? 'bg-evidence dark:bg-evidence-dark text-paper'
                                : stage.status === 'error'
                                  ? 'bg-red-500 text-paper'
                                  : 'bg-graphite dark:bg-graphite-dark text-steel dark:text-steel-dark'
                          }`}
                        >
                          {stage.status === 'complete' ? (
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : stage.status === 'active' ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-paper"></div>
                          ) : stage.status === 'error' ? (
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
                          ) : (
                            <span className="text-xs font-medium">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-body ${
                              stage.status === 'active'
                                ? 'text-evidence dark:text-evidence-dark font-medium'
                                : stage.status === 'complete'
                                  ? 'text-persona font-medium'
                                  : stage.status === 'error'
                                    ? 'text-red-500 font-medium'
                                    : 'text-steel dark:text-steel-dark'
                            }`}
                          >
                            {stage.name}
                          </p>
                          {stage.message && (
                            <p className="text-caption text-steel dark:text-steel-dark">
                              {stage.message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-5 h-5 text-red-500"
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
                    <p className="text-body text-red-700 dark:text-red-300 font-medium">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Success Result */}
              {result && result.success && (
                <div className="bg-persona-50 dark:bg-persona-900/20 border border-persona-200 dark:border-persona-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-body text-persona font-medium">
                      Transcript processed successfully!
                    </p>
                  </div>
                  <div className="text-caption text-steel dark:text-steel-dark space-y-1">
                    <p>• File: {result.result?.fileName}</p>
                    <p>
                      • Content: {result.result?.contentLength} characters
                      processed
                    </p>
                    <p>• Evidence extracted and scored for persona analysis</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-graphite dark:border-graphite-dark">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {(selectedFile || selectedFilePath) &&
                !isProcessing &&
                !result && (
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setSelectedFilePath(null);
                    }}
                    className="text-steel dark:text-steel-dark hover:text-slate dark:hover:text-slate-dark transition-colors"
                  >
                    ← Choose different file
                  </button>
                )}
            </div>
            <div className="flex space-x-3">
              {!isProcessing &&
                (result ? (
                  <button onClick={handleClose} className="btn-primary">
                    Done
                  </button>
                ) : selectedFile || selectedFilePath ? (
                  <button onClick={handleImport} className="btn-primary">
                    Import Transcript
                  </button>
                ) : (
                  <button onClick={handleClose} className="btn-secondary">
                    Cancel
                  </button>
                ))}
              {isProcessing && (
                <div className="flex items-center space-x-2 text-steel dark:text-steel-dark">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-evidence dark:border-evidence-dark"></div>
                  <span className="text-body">Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
