/**
 * Personyx Main App Component
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { APP_NAME } from '../shared/constants';
import type {
  AppState,
  Persona,
  ChatResponse,
  ImportResult,
  EvidenceScore,
} from '../shared/types';
import EvidenceScoreGauge from './components/EvidenceScoreGauge';

// Chat Window Component
interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
}

function ChatWindow({
  isOpen,
  onClose,
  personas,
}: ChatWindowProps): JSX.Element | null {
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with first persona if available
  useEffect(() => {
    if (personas.length > 0 && !selectedPersona) {
      setSelectedPersona(personas[0].id);
    }
  }, [personas, selectedPersona]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedPersona || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message to chat history immediately
    const userChatEntry = {
      message: userMessage,
      sources: [],
      persona: null,
      timestamp: new Date(),
      isUser: true, // Flag to identify user messages
    };
    setChatHistory(prev => [...prev, userChatEntry]);

    setIsLoading(true);

    try {
      // Send message via IPC
      const response = (await window.electronAPI.chatWithPersona(
        selectedPersona,
        userMessage,
        '' // Could include current PRD context later
      )) as ChatResponse;

      // Add persona response to chat history
      setChatHistory(prev => [
        ...prev,
        {
          message: response.message,
          sources: response.sources,
          persona: response.persona,
          timestamp: response.timestamp,
          isUser: false, // Flag to identify persona responses
        },
      ]);
    } catch (error) {
      console.error('Chat failed:', error);
      // Add error message to chat
      setChatHistory(prev => [
        ...prev,
        {
          message:
            'Sorry, there was an error processing your message. Please try again.',
          sources: [],
          persona: personas.find(p => p.id === selectedPersona) || personas[0],
          timestamp: new Date(),
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const selectedPersonaData = personas.find(p => p.id === selectedPersona);

  return (
    <div className="fixed inset-0 bg-slate/50 dark:bg-slate-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-paper dark:bg-paper-dark rounded-lg shadow-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-graphite dark:border-graphite-dark">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-persona rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {selectedPersonaData?.name.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <h2 className="text-h2 text-slate dark:text-slate-dark">
                Chat with Persona
              </h2>
              <p className="text-caption text-steel dark:text-steel-dark">
                {selectedPersonaData?.name || 'Select a persona'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
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

        {/* Persona Selector */}
        <div className="p-4 border-b border-graphite dark:border-graphite-dark">
          <label className="block text-body text-slate dark:text-slate-dark mb-2">
            Select Persona:
          </label>
          <select
            value={selectedPersona}
            onChange={e => setSelectedPersona(e.target.value)}
            className="w-full p-2 rounded-md border border-graphite dark:border-graphite-dark bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:border-evidence dark:focus:border-evidence-dark focus:outline-none"
          >
            {personas.map(persona => (
              <option key={persona.id} value={persona.id}>
                {persona.name} - {persona.description}
              </option>
            ))}
          </select>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="text-center text-steel dark:text-steel-dark">
              <p className="mb-2">
                👋 Start a conversation with {selectedPersonaData?.name}
              </p>
              <p className="text-caption">
                Ask questions about user needs, pain points, or get insights for
                your PRD.
              </p>
            </div>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={index} className="space-y-3">
                {/* Message */}
                <div
                  className={`flex space-x-3 ${chat.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      chat.isUser
                        ? 'bg-evidence dark:bg-evidence-dark'
                        : 'bg-persona'
                    }`}
                  >
                    <span className="text-sm font-bold text-white">
                      {chat.isUser ? 'U' : chat.persona?.name.charAt(0) || 'P'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`rounded-lg p-3 ${
                        chat.isUser
                          ? 'bg-evidence/10 dark:bg-evidence-dark/10 border border-evidence/20 dark:border-evidence-dark/20'
                          : 'bg-graphite/10 dark:bg-graphite-dark/10'
                      }`}
                    >
                      <p className="text-body text-slate dark:text-slate-dark whitespace-pre-wrap">
                        {chat.message}
                      </p>
                    </div>
                    {!chat.isUser && chat.sources.length > 0 && (
                      <div className="mt-2">
                        <p className="text-caption text-steel dark:text-steel-dark mb-1">
                          Sources:
                        </p>
                        <div className="space-y-1">
                          {chat.sources.slice(0, 3).map((source, idx) => (
                            <div
                              key={idx}
                              className="text-caption text-steel dark:text-steel-dark bg-graphite/5 dark:bg-graphite-dark/5 p-2 rounded border-l-2 border-evidence dark:border-evidence-dark"
                            >
                              "{source.content.substring(0, 100)}..."
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-persona rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  {selectedPersonaData?.name.charAt(0) || 'P'}
                </span>
              </div>
              <div className="flex-1">
                <div className="bg-graphite/10 dark:bg-graphite-dark/10 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-persona"></div>
                    <p className="text-body text-steel dark:text-steel-dark">
                      {selectedPersonaData?.name} is thinking...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-graphite dark:border-graphite-dark">
          <div className="flex space-x-2">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${selectedPersonaData?.name || 'persona'} anything...`}
              className="flex-1 p-2 border border-graphite dark:border-graphite-dark rounded-md bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:border-evidence dark:focus:border-evidence-dark focus:outline-none resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="px-4 py-2 bg-evidence dark:bg-evidence-dark text-paper dark:text-paper-dark rounded-md hover:bg-evidence/90 dark:hover:bg-evidence-dark/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          <p className="text-caption text-steel dark:text-steel-dark mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

// Import PRD Modal Component
interface ImportPRDModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File | null; // Add support for pre-selected file
  initialFilePath?: string | null; // Add support for file paths from tray
}

interface ProgressStage {
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
}

function ImportPRDModal({
  isOpen,
  onClose,
  initialFile = null, // Accept initial file
  initialFilePath = null, // Accept initial file path from tray
}: ImportPRDModalProps): JSX.Element | null {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressStage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [shouldAutoImport, setShouldAutoImport] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progressStages: ProgressStage[] = [
    { name: 'Validating file', status: 'pending' },
    { name: 'Reading content', status: 'pending' },
    { name: 'Extracting sections', status: 'pending' },
    { name: 'Generating embeddings', status: 'pending' },
    { name: 'Calculating evidence scores', status: 'pending' },
  ];

  // Reset state when modal opens/closes, or set initial file/path
  useEffect(() => {
    console.log('🔄 Modal useEffect triggered:', {
      isOpen,
      hasInitialFile: !!initialFile,
      hasInitialFilePath: !!initialFilePath,
      initialFileName: initialFile?.name,
      initialFilePath,
    });

    if (!isOpen) {
      console.log('🚪 Import modal closing - resetting state');
      setSelectedFile(null);
      setSelectedFilePath(null);
      setIsProcessing(false);
      setProgress([]);
      setError(null);
      setResult(null);
      setIsDragging(false);
    } else {
      console.log('🚪 Import modal opening');
      // Set initial file if provided
      if (initialFile) {
        console.log('🔍 Setting initial file in modal:', {
          name: initialFile.name,
          size: initialFile.size,
          type: initialFile.type,
        });
        setSelectedFile(initialFile);
        setSelectedFilePath(null);
        setError(null);
      } else if (initialFilePath) {
        console.log('🔍 Setting initial file path in modal:', initialFilePath);
        setSelectedFile(null);
        setSelectedFilePath(initialFilePath);
        setError(null);
      } else {
        console.log('🔍 No initial file or path provided');
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

      let importResult: ImportResult;

      if (selectedFile) {
        // Handle File object (from drag/drop or file picker)
        const fileContent = await selectedFile.text();

        updateProgress(1, 'complete');

        // Stage 3: Processing with main process
        updateProgress(2, 'active', 'Sending to main process...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UI feedback
        updateProgress(2, 'complete');

        // Stage 4: Generating embeddings
        updateProgress(3, 'active', 'Processing with AI...');

        // Stage 5: Calculating evidence scores
        updateProgress(4, 'active', 'Calculating scores...');

        // Call the actual IPC handler with file content
        importResult = (await window.electronAPI.importPRD(
          fileContent
        )) as ImportResult;
      } else if (selectedFilePath) {
        // Handle file path (from tray drop)
        updateProgress(1, 'complete');

        // Stage 3: Processing with main process
        updateProgress(2, 'active', 'Sending to main process...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UI feedback
        updateProgress(2, 'complete');

        // Stage 4: Generating embeddings
        updateProgress(3, 'active', 'Processing with AI...');

        // Stage 5: Calculating evidence scores
        updateProgress(4, 'active', 'Calculating scores...');

        // Call the actual IPC handler with file path
        importResult = (await window.electronAPI.importPRD(
          selectedFilePath
        )) as ImportResult;
      } else {
        throw new Error('No file or file path selected');
      }

      updateProgress(4, 'complete');

      setResult(importResult);

      // TODO: Add success notification and update app state
      console.log('✅ PRD import completed successfully:', importResult);
    } catch (error) {
      console.error('Import failed:', error);
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
      console.log('🚀 Auto-starting import for tray-dropped file');

      // Basic validation for File objects - detailed validation will happen in handleImport
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
          setError('Please select a valid PRD file (.md, .txt, or .markdown)');
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
      console.log('🚀 Executing auto-import');
      setShouldAutoImport(false); // Reset the flag
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
    console.log('🔍 Validating file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      isEmpty: file.size === 0,
    });

    // Validate file size first (including empty files)
    if (file.size === 0) {
      const errorMsg = 'File cannot be empty';
      console.log('❌ Empty file detected:', errorMsg);
      setError(errorMsg);
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const errorMsg = 'File size must be less than 10MB';
      console.log('❌ File too large:', errorMsg);
      setError(errorMsg);
      return false;
    }

    // Validate file type
    const validTypes = ['text/markdown', 'text/plain'];
    const validExtensions = ['.md', '.txt', '.markdown'];

    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    console.log('🔎 Type validation:', {
      hasValidType,
      hasValidExtension,
      fileType: file.type,
      fileName: file.name,
    });

    if (!hasValidType && !hasValidExtension) {
      const errorMsg =
        'Please select a valid PRD file (.md, .txt, or .markdown)';
      console.log('❌ Invalid file type:', errorMsg);
      setError(errorMsg);
      return false;
    }

    console.log('✅ File validation passed!');
    return true;
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      console.log('🔍 Import modal dataTransfer analysis:', {
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
        console.log('✅ Got file via files API in modal:', file.name);
      }
      // Method 2: Try DataTransferItemList API
      else if (e.dataTransfer.items.length > 0) {
        console.log('🔄 Trying DataTransferItems API in modal...');
        const items = Array.from(e.dataTransfer.items);

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          console.log(`📋 Modal Item ${i}:`, {
            kind: item.kind,
            type: item.type,
          });

          if (item.kind === 'file') {
            const itemFile = item.getAsFile();
            if (itemFile) {
              file = itemFile;
              console.log('✅ Got file via items API in modal:', file.name);
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
              console.log('📝 Text data from modal item:', data);

              // Check if it looks like a file path
              if (
                data &&
                (data.includes('.md') ||
                  data.includes('.txt') ||
                  data.includes('.markdown'))
              ) {
                const filePath = data.replace('file://', '').trim();
                console.log('📂 Detected file path in modal:', filePath);
                setSelectedFilePath(filePath);
                setSelectedFile(null);
                setError(null);
                return;
              }
            } catch (error) {
              console.warn('⚠️ Error reading text data in modal:', error);
            }
          }
        }
      }

      // Method 3: Check for text data (file paths from external drops)
      if (!file) {
        console.log('🔄 Checking for text/uri-list data in modal...');
        try {
          const uriData = e.dataTransfer.getData('text/uri-list');
          const textData = e.dataTransfer.getData('text/plain');

          console.log('📝 URI data in modal:', uriData);
          console.log('📝 Text data in modal:', textData);

          const pathData = uriData || textData;
          if (
            pathData &&
            (pathData.includes('.md') ||
              pathData.includes('.txt') ||
              pathData.includes('.markdown'))
          ) {
            const filePath = pathData.replace('file://', '').trim();
            console.log(
              '📂 Using file path from text data in modal:',
              filePath
            );
            setSelectedFilePath(filePath);
            setSelectedFile(null);
            setError(null);
            return;
          }
        } catch (error) {
          console.warn(
            '⚠️ Error reading text data from dataTransfer in modal:',
            error
          );
        }
      }

      // Process the file if we got one
      if (file) {
        console.log('🗂️ Dropped file in modal:', {
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
        console.warn('⚠️ No file data found in modal drop');
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
        console.log('🔍 Selected file:', {
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

  console.log('🎭 Rendering Import PRD Modal', {
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
            <div className="w-8 h-8 bg-evidence dark:bg-evidence-dark rounded-full flex items-center justify-center">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-h2 text-slate dark:text-slate-dark">
                Import PRD
              </h2>
              <p className="text-caption text-steel dark:text-steel-dark">
                Upload your Product Requirements Document
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
                        ? 'text-evidence dark:text-evidence-dark'
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p
                    className={`text-body-lg font-medium mb-2 transition-colors drop-zone-text ${
                      isDragging
                        ? 'text-evidence dark:text-evidence-dark'
                        : 'text-slate dark:text-slate-dark'
                    }`}
                  >
                    {isDragging
                      ? 'Drop your PRD file here'
                      : 'Drag & drop your PRD file here'}
                  </p>
                  <p className="text-body text-steel dark:text-steel-dark mb-4">
                    or click to browse for .md, .txt, or .markdown files
                  </p>
                  <div className="text-caption text-steel dark:text-steel-dark space-y-1">
                    <p>• Maximum file size: 10MB</p>
                    <p>• Supported formats: Markdown (.md), Text (.txt)</p>
                    <p>• File will be processed securely on your device</p>
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
          ) : (selectedFile || selectedFilePath) && !result ? (
            /* File Processing */
            <div className="space-y-6">
              {/* Selected File Info */}
              <div className="bg-graphite/5 dark:bg-graphite-dark/5 rounded-lg p-4">
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
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : stage.status === 'active' ? (
                            <div className="animate-spin rounded-full h-3 w-3 border border-paper border-t-transparent"></div>
                          ) : stage.status === 'error' ? (
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <span className="text-xs font-bold">
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
            </div>
          ) : result ? (
            /* Success State */
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-persona rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-paper"
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
              </div>
              <div>
                <h3 className="text-h2 text-slate dark:text-slate-dark mb-2">
                  PRD Imported Successfully!
                </h3>
                <p className="text-body text-steel dark:text-steel-dark">
                  Your PRD has been processed and evidence scores have been
                  calculated.
                </p>
              </div>
              {result?.evidenceScores && result.evidenceScores.length > 0 && (
                <div className="bg-graphite/5 dark:bg-graphite-dark/5 rounded-lg p-4">
                  <p className="text-body-lg font-medium text-slate dark:text-slate-dark mb-2">
                    Evidence Scores Generated
                  </p>
                  <p className="text-caption text-steel dark:text-steel-dark">
                    {result.evidenceScores.length} persona
                    {result.evidenceScores.length !== 1 ? 's' : ''} analyzed
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Actions */}
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
                    Import PRD
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
      aiService: {
        provider: 'local',
        localApiKey: undefined,
        cloudSubscription: undefined,
      },
    },
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCardDragging, setIsCardDragging] = useState(false);
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [trayFilePath, setTrayFilePath] = useState<string | null>(null);

  // Evidence Score state
  const [currentEvidenceScores, setCurrentEvidenceScores] = useState<
    EvidenceScore[]
  >([]);

  useEffect(() => {
    console.log('🚀 Personyx App component mounted');

    // Initialize app state
    const initializeApp = async () => {
      try {
        // Load personas
        const personas = (await window.electronAPI.getPersonas()) as Persona[];
        console.log('📋 Loaded personas:', personas);

        setAppState(prev => ({
          ...prev,
          isReady: true,
          personas: personas || [],
        }));
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAppState(prev => ({ ...prev, isReady: true }));
      }
    };

    initializeApp();
  }, []);

  // Handle keyboard shortcuts and IPC events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsChatOpen(true);
      }
      // Ctrl/Cmd + O to open import modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        setIsImportModalOpen(true);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        if (isChatOpen) {
          setIsChatOpen(false);
        } else if (isImportModalOpen) {
          setIsImportModalOpen(false);
        }
      }
    };

    // Listen for tray-triggered events
    const handleOpenChatWindow = () => {
      setIsChatOpen(true);
    };

    // TODO: Use this handler when tray import functionality is added
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleOpenImportModal = () => {
      setIsImportModalOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);

    // Set up IPC listeners for opening windows from tray
    if (window.electronAPI) {
      window.electronAPI.onOpenChatWindow(handleOpenChatWindow);
      window.electronAPI.onOpenImportModalWithFile(data => {
        console.log(
          '🗂️ Opening import modal from tray file drop:',
          data.filePath
        );
        setDraggedFile(null); // Clear any existing dragged file
        setTrayFilePath(data.filePath); // Store the tray file path
        setIsImportModalOpen(true);
      });
      window.electronAPI.onOpenImportModalWithFileContent(data => {
        console.log(
          '📄 Opening import modal from tray file content drop:',
          data.fileName
        );
        // Create a File object from the content
        const file = new File([data.fileContent], data.fileName, {
          type: data.fileName.endsWith('.md') ? 'text/markdown' : 'text/plain',
        });
        setTrayFilePath(null); // Clear any existing tray file path
        setDraggedFile(file); // Set the file object created from content
        setIsImportModalOpen(true);
      });

      // Listen for evidence score events
      window.electronAPI.onPRDImported((data: unknown) => {
        console.log(
          '📊 PRD imported with evidence scores:',
          JSON.stringify(data, null, 2)
        );
        const typedData = data as {
          evidenceScores?: EvidenceScore[];
          documentId: string;
        };
        if (typedData.evidenceScores && typedData.evidenceScores.length > 0) {
          console.log('🔄 Setting evidence scores from PRD import:', {
            scoresCount: typedData.evidenceScores.length,
            scores: typedData.evidenceScores.map(s => ({
              documentId: s.documentId,
              personaId: s.personaId,
              score: s.score,
            })),
          });
          setCurrentEvidenceScores(typedData.evidenceScores);
        }
      });

      window.electronAPI.onEvidenceScoreUpdated((data: unknown) => {
        console.log(
          '📈 Evidence score updated - RAW DATA:',
          JSON.stringify(data, null, 2)
        );

        // Enhanced data validation and logging
        const typedData = data as {
          scores?: EvidenceScore[];
          documentId: string;
        };

        console.log('📈 Evidence score updated - PARSED DATA:', {
          hasScores: !!typedData.scores,
          scoresLength: typedData.scores?.length || 0,
          documentId: typedData.documentId,
          scoresData: typedData.scores?.map(s => ({
            id: s.id,
            documentId: s.documentId,
            personaId: s.personaId,
            score: s.score,
            evidenceCount: s.evidenceCount,
          })),
        });

        if (typedData.scores && typedData.scores.length > 0) {
          console.log('🔄 BEFORE state update - Current evidence scores:', {
            currentScoresCount: currentEvidenceScores.length,
            currentScores: currentEvidenceScores.map(s => ({
              documentId: s.documentId,
              personaId: s.personaId,
              score: s.score,
            })),
          });

          setCurrentEvidenceScores(prev => {
            // Replace scores for the same document/persona combinations
            const newScores = [...prev];

            typedData.scores!.forEach((newScore: EvidenceScore) => {
              console.log('🔍 Processing new score:', {
                newScoreId: newScore.id,
                documentId: newScore.documentId,
                personaId: newScore.personaId,
                score: newScore.score,
              });

              const existingIndex = newScores.findIndex(
                score =>
                  score.documentId === newScore.documentId &&
                  score.personaId === newScore.personaId
              );

              if (existingIndex >= 0) {
                console.log('🔄 UPDATING existing score at index:', {
                  index: existingIndex,
                  oldScore: newScores[existingIndex].score,
                  newScore: newScore.score,
                });
                newScores[existingIndex] = newScore;
              } else {
                console.log('➕ ADDING new score to array');
                newScores.push(newScore);
              }
            });

            console.log('🔄 AFTER state update - New evidence scores:', {
              newScoresCount: newScores.length,
              newScores: newScores.map(s => ({
                documentId: s.documentId,
                personaId: s.personaId,
                score: s.score,
              })),
              maxScore:
                newScores.length > 0
                  ? Math.max(...newScores.map(s => s.score))
                  : null,
            });

            return newScores;
          });
        } else {
          console.warn(
            '⚠️ Evidence score update event received but no valid scores found:',
            {
              rawData: data,
              typedData,
              hasScores: !!typedData.scores,
              scoresLength: typedData.scores?.length,
            }
          );
        }
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Note: electronAPI listeners are automatically cleaned up by preload script
    };
  }, [isChatOpen, isImportModalOpen]);

  // Debug evidence scores state changes
  useEffect(() => {
    console.log('🎯 Current Evidence Scores State Changed:', {
      scoresCount: currentEvidenceScores.length,
      scores: currentEvidenceScores.map(s => ({
        id: s.id,
        documentId: s.documentId,
        personaId: s.personaId,
        score: s.score,
        lastCalculated: s.lastCalculated,
      })),
      maxScore:
        currentEvidenceScores.length > 0
          ? Math.max(...currentEvidenceScores.map(s => s.score))
          : null,
    });
  }, [currentEvidenceScores]);

  // Handle drag and drop for the main import card
  const handleCardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Drag over main card');
    setIsCardDragging(true);
  }, []);

  const handleCardDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      console.log('🎯 Drag leave main card');
      setIsCardDragging(false);
    }
  }, []);

  const handleCardDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Drop on main card');
    setIsCardDragging(false);

    console.log('🔍 Full dataTransfer analysis:', {
      files: e.dataTransfer.files,
      filesLength: e.dataTransfer.files.length,
      items: e.dataTransfer.items,
      itemsLength: e.dataTransfer.items.length,
      types: e.dataTransfer.types,
      effectAllowed: e.dataTransfer.effectAllowed,
      dropEffect: e.dataTransfer.dropEffect,
    });

    // Method 1: Try standard files API
    let file: File | null = null;
    const files = Array.from(e.dataTransfer.files);
    console.log('📦 Files array:', files);

    if (files.length > 0) {
      file = files[0];
      console.log('✅ Got file via files API:', file.name);
    }
    // Method 2: Try DataTransferItemList API
    else if (e.dataTransfer.items.length > 0) {
      console.log('🔄 Trying DataTransferItems API...');
      const items = Array.from(e.dataTransfer.items);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`📋 Item ${i}:`, { kind: item.kind, type: item.type });

        if (item.kind === 'file') {
          const itemFile = item.getAsFile();
          if (itemFile) {
            file = itemFile;
            console.log('✅ Got file via items API:', file.name);
            break;
          }
        }
        // Check for text/uri-list (file paths)
        else if (item.type === 'text/uri-list' || item.type === 'text/plain') {
          try {
            const data = await new Promise<string>(resolve => {
              item.getAsString(resolve);
            });
            console.log('📝 Text data from item:', data);

            // Check if it looks like a file path
            if (
              data &&
              (data.includes('.md') ||
                data.includes('.txt') ||
                data.includes('.markdown'))
            ) {
              const filePath = data.replace('file://', '').trim();
              console.log('📂 Detected file path:', filePath);
              setTrayFilePath(filePath);
              setIsImportModalOpen(true);
              return;
            }
          } catch (error) {
            console.warn('⚠️ Error reading text data:', error);
          }
        }
      }
    }

    // Method 3: Check for text data (file paths from external drops)
    if (!file) {
      console.log('🔄 Checking for text/uri-list data...');
      try {
        const uriData = e.dataTransfer.getData('text/uri-list');
        const textData = e.dataTransfer.getData('text/plain');

        console.log('📝 URI data:', uriData);
        console.log('📝 Text data:', textData);

        const pathData = uriData || textData;
        if (
          pathData &&
          (pathData.includes('.md') ||
            pathData.includes('.txt') ||
            pathData.includes('.markdown'))
        ) {
          const filePath = pathData.replace('file://', '').trim();
          console.log('📂 Using file path from text data:', filePath);
          setTrayFilePath(filePath);
          setIsImportModalOpen(true);
          return;
        }
      } catch (error) {
        console.warn('⚠️ Error reading text data from dataTransfer:', error);
      }
    }

    // Process the file if we got one
    if (file) {
      console.log('📎 Processing file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      });

      // Validate file type
      const validExtensions = ['.md', '.txt', '.markdown'];
      const hasValidExtension = validExtensions.some(ext =>
        file.name.toLowerCase().endsWith(ext)
      );

      if (hasValidExtension && file.size <= 10 * 1024 * 1024) {
        console.log('✅ File validated, opening modal');
        setDraggedFile(file);
        setIsImportModalOpen(true);
      } else {
        console.warn('⚠️ Invalid file:', {
          hasValidExtension,
          size: file.size,
        });
        alert(
          'Please drop a valid markdown file (.md, .txt, .markdown) under 10MB'
        );
      }
    } else {
      console.warn('⚠️ No file data found - opening modal as fallback');
      // Open modal without file - user can use file picker
      setIsImportModalOpen(true);
    }
  }, []);

  // Handle drag and drop for the entire app (fallback)
  const handleAppDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 App-level drag over');
  }, []);

  const handleAppDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 App-level drop');

    console.log('🔍 App-level dataTransfer:', {
      files: e.dataTransfer.files,
      filesLength: e.dataTransfer.files.length,
      types: e.dataTransfer.types,
    });

    // If the drop didn't happen on the main card, handle it here
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      console.log('📎 File dropped on app:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const validExtensions = ['.md', '.txt', '.markdown'];
      const hasValidExtension = validExtensions.some(ext =>
        file.name.toLowerCase().endsWith(ext)
      );

      if (hasValidExtension && file.size <= 10 * 1024 * 1024) {
        console.log('✅ File validated, opening modal with file:', file.name);
        setDraggedFile(file);
        setIsImportModalOpen(true);
      }
    } else {
      console.warn('⚠️ No files found in app-level drop event');
    }
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
    <div
      className="min-h-screen bg-mist dark:bg-mist-dark p-6"
      onDragOver={handleAppDragOver}
      onDrop={handleAppDrop}
    >
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
            <div className="flex items-center space-x-2">
              {/* Import PRD Button */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
                title="Import PRD (Ctrl+O)"
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
              {/* Chat Button */}
              <button
                onClick={() => setIsChatOpen(true)}
                className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
                title="Chat with Persona (Ctrl+K)"
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
              {/* Dark Mode Toggle */}
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
              <div
                className={`drop-zone interactive min-h-[360px] flex items-center justify-center cursor-pointer transition-all duration-200 ${
                  isCardDragging ? 'drag-over' : ''
                }`}
                onClick={() => setIsImportModalOpen(true)}
                onDragOver={handleCardDragOver}
                onDragLeave={handleCardDragLeave}
                onDrop={handleCardDrop}
              >
                <div className="text-center">
                  <svg
                    className={`mx-auto h-12 w-12 mb-4 transition-colors drop-zone-icon ${
                      isCardDragging
                        ? 'text-evidence dark:text-evidence-dark'
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p
                    className={`text-body-lg font-medium mb-2 transition-colors drop-zone-text ${
                      isCardDragging
                        ? 'text-evidence dark:text-evidence-dark'
                        : 'text-slate dark:text-slate-dark'
                    }`}
                  >
                    {isCardDragging
                      ? 'Drop your PRD file here'
                      : 'Drop your PRD here'}
                  </p>
                  <p className="text-body text-slate dark:text-slate-dark mb-2">
                    or click to import .md or .txt files
                  </p>
                  <p className="text-caption text-steel dark:text-steel-dark">
                    Ctrl+O to open import dialog
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Spans 4 columns on desktop */}
          <div className="lg:col-span-4 space-y-6">
            {/* Evidence Scores Card */}
            <div
              className="card"
              tabIndex={0}
              role="region"
              aria-label="Evidence scores for imported PRDs"
            >
              <h3 className="text-h2 text-slate dark:text-slate-dark mb-4">
                Evidence Scores
              </h3>
              <div className="text-center">
                {/* Evidence Score Gauge */}
                <EvidenceScoreGauge
                  score={
                    currentEvidenceScores.length > 0
                      ? (() => {
                          const maxScore = Math.max(
                            ...currentEvidenceScores.map(s => s.score)
                          );
                          console.log(
                            '🎯 Evidence Score Calculation for Gauge:',
                            {
                              currentEvidenceScoresCount:
                                currentEvidenceScores.length,
                              allScores: currentEvidenceScores.map(s => ({
                                documentId: s.documentId,
                                personaId: s.personaId,
                                score: s.score,
                              })),
                              maxScore,
                            }
                          );
                          return maxScore;
                        })()
                      : null
                  }
                  className="mb-4"
                />

                {/* Status Text and Actions */}
                {currentEvidenceScores.length > 0 ? (
                  <div>
                    <p className="text-body text-steel dark:text-steel-dark mb-2">
                      {currentEvidenceScores.length} persona
                      {currentEvidenceScores.length !== 1 ? 's' : ''} analyzed
                    </p>
                    <p className="text-caption text-steel dark:text-steel-dark mb-4">
                      Highest score:{' '}
                      {Math.max(
                        ...currentEvidenceScores.map(s => s.score)
                      ).toFixed(0)}
                      /100
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-body text-steel dark:text-steel-dark mb-4">
                      No PRDs analysed yet
                    </p>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="btn-primary"
                    >
                      Import First PRD
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Personas Card */}
            <div className="card">
              <h3 className="text-h2 text-slate dark:text-slate-dark mb-4">
                Personas
              </h3>
              <div className="space-y-3">
                {appState.personas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {appState.personas.map(persona => (
                      <span key={persona.id} className="persona-pill">
                        {persona.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-body text-steel dark:text-steel-dark">
                    Loading personas...
                  </p>
                )}
                <p className="text-caption text-steel dark:text-steel-dark">
                  Ready for evidence analysis
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ChatWindow
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        personas={appState.personas}
      />

      <ImportPRDModal
        isOpen={isImportModalOpen}
        onClose={() => {
          console.log('🚪 Closing import modal - clearing state');
          setIsImportModalOpen(false);
          setDraggedFile(null); // Clear dragged file when modal closes
          setTrayFilePath(null); // Clear tray file path when modal closes
        }}
        initialFile={draggedFile}
        initialFilePath={trayFilePath}
      />
    </div>
  );
}
